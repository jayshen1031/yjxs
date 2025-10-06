/**
 * Notion同步模块
 * 通过后端API服务器处理与Notion的集成和数据同步
 */

const userManager = require('./userManager.js')
const apiService = require('./apiService.js')

class NotionSync {
  constructor() {
    this.isConnected = false
    this.syncQueue = []
    this.syncInProgress = false
    this.lastSyncTime = 0
    this.retryCount = 0
    this.maxRetries = 3
  }

  // 初始化Notion连接
  async initializeConnection(apiKey, databaseId) {
    try {
      // 通过后端API测试连接
      const result = await apiService.testNotionConnection(apiKey, databaseId)
      
      if (result.success) {
        this.isConnected = true
        console.log('Notion连接成功')
        
        // 保存用户配置到后端
        const currentUser = userManager.getCurrentUser()
        if (currentUser) {
          await apiService.saveUserConfig(currentUser.id, {
            apiKey,
            databaseId,
            syncEnabled: true
          })
        }
        
        // 启动待处理数据同步
        setTimeout(() => {
          this.syncPendingData()
        }, 1000)
        
        return { 
          success: true, 
          message: 'Notion连接成功',
          data: result.data
        }
      } else {
        this.isConnected = false
        return { 
          success: false, 
          error: result.error || 'Notion连接失败'
        }
      }
    } catch (error) {
      console.error('Notion初始化失败:', error)
      this.isConnected = false
      return { success: false, error: error.message }
    }
  }

  // 测试Notion连接
  async testConnection(apiKey, databaseId) {
    try {
      if (!apiKey || !databaseId) {
        throw new Error('API Key或Database ID不能为空')
      }

      // 测试API连接
      const connectionTest = await notionAPI.testConnection()
      if (!connectionTest.success) {
        throw new Error(`API连接失败: ${connectionTest.error}`)
      }

      // 检查数据库结构
      const dbStructure = await this.checkDatabaseStructure(databaseId)
      if (!dbStructure.isValid) {
        console.warn('数据库结构不完整，但可以继续使用')
      }

      return true
    } catch (error) {
      console.error('Notion连接测试失败:', error)
      return false
    }
  }

  // 检查Notion数据库结构
  async checkDatabaseStructure(databaseId) {
    // 期望的数据库字段结构
    const expectedFields = [
      { name: 'Name', type: 'title' },  // Notion默认标题字段
      { name: 'content', type: 'rich_text' },
      { name: 'type', type: 'select' },
      { name: 'user_id', type: 'rich_text' },
      { name: 'is_planning', type: 'checkbox' },
      { name: 'tags', type: 'multi_select' },
      { name: 'audio_url', type: 'url' },
      { name: 'sync_status', type: 'select' }
    ]

    try {
      // 调用真实的Notion API获取数据库结构
      const result = await notionAPI.validateDatabaseStructure(databaseId, expectedFields)
      return {
        isValid: result.isValid,
        validationResults: result.validationResults,
        database: result.database,
        message: result.message
      }
    } catch (error) {
      console.error('数据库结构验证失败:', error)
      return {
        isValid: false,
        error: error.message,
        message: '数据库结构验证失败'
      }
    }
  }

  // 同步备忘录到Notion
  async syncMemoToNotion(memo) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !this.isUserNotionEnabled(currentUser.id)) {
      return { success: false, error: '用户未配置Notion集成' }
    }

    try {
      // 通过后端API同步
      const result = await apiService.syncMemoToNotion(currentUser.id, memo)
      
      if (result.success) {
        // 更新本地同步状态
        this.updateLocalSyncStatus(memo.id, 'synced', result.data.pageId)
        return { 
          success: true, 
          pageId: result.data.pageId,
          message: result.data.message
        }
      } else {
        // 添加到同步队列等待重试
        this.addToSyncQueue(memo)
        return { 
          success: false, 
          error: result.error 
        }
      }
    } catch (error) {
      console.error('同步到Notion失败:', error)
      this.addToSyncQueue(memo)
      return { success: false, error: error.message }
    }
  }

  // 从Notion同步数据到本地
  async syncFromNotion() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !this.isUserNotionEnabled(currentUser.id)) {
      return { success: false, error: '用户未配置Notion集成' }
    }

    try {
      // 通过后端API获取Notion数据
      const result = await apiService.getMemoListFromNotion(currentUser.id)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      const notionMemos = result.data.memos
      const localMemos = userManager.getUserMemos()
      
      let syncedCount = 0
      let updatedCount = 0
      
      for (const memo of notionMemos) {
        const existingMemo = localMemos.find(m => m.notionPageId === memo.notionPageId)
        
        if (existingMemo) {
          // 检查是否需要更新
          if (this.shouldUpdateLocalMemo(existingMemo, memo)) {
            this.updateLocalMemo(existingMemo.id, memo)
            updatedCount++
          }
        } else {
          // 新增备忘录
          localMemos.push(memo)
          syncedCount++
        }
      }

      // 保存更新后的备忘录列表
      userManager.saveUserMemos(localMemos)
      this.lastSyncTime = Date.now()
      
      return {
        success: true,
        syncedCount,
        updatedCount,
        lastSyncTime: this.lastSyncTime,
        totalCount: result.data.count
      }
    } catch (error) {
      console.error('从Notion同步失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 批量同步待处理数据
  async syncPendingData() {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return
    }

    this.syncInProgress = true
    console.log(`开始同步${this.syncQueue.length}条待处理数据`)

    const results = []
    while (this.syncQueue.length > 0) {
      const memo = this.syncQueue.shift()
      const result = await this.syncMemoToNotion(memo)
      results.push({ memo: memo.id, result })
      
      // 避免频繁请求，添加延迟
      await this.delay(500)
    }

    this.syncInProgress = false
    console.log('批量同步完成:', results)
    return results
  }

  // 格式化备忘录为Notion页面格式
  formatMemoForNotion(memo, user) {
    // 生成标题（取内容前50个字符）
    const title = memo.content.length > 50 ? 
      memo.content.substring(0, 50) + '...' : 
      memo.content

    const pageData = {
      parent: {
        type: 'database_id',
        database_id: user.notionConfig.databaseId
      },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        content: {
          rich_text: [
            {
              text: {
                content: memo.content
              }
            }
          ]
        },
        type: {
          select: {
            name: memo.type || 'text'
          }
        },
        user_id: {
          rich_text: [
            {
              text: {
                content: user.id
              }
            }
          ]
        },
        is_planning: {
          checkbox: memo.isPlanning || false
        },
        tags: {
          multi_select: (memo.tags || []).map(tag => ({ name: tag }))
        },
        sync_status: {
          select: {
            name: 'synced'
          }
        }
      }
    }

    // 如果有音频URL，添加audio_url字段
    if (memo.audioPath) {
      pageData.properties.audio_url = {
        url: memo.audioPath
      }
    }

    return pageData
  }

  // 格式化Notion页面为备忘录格式
  formatNotionPageToMemo(page) {
    const properties = page.properties
    
    return {
      id: this.extractMemoId(page) || this.generateMemoId(),
      content: this.extractText(properties.content),
      type: properties.type?.select?.name || 'text',
      isPlanning: properties.is_planning?.checkbox || false,
      tags: properties.tags?.multi_select?.map(tag => tag.name) || [],
      timestamp: new Date(page.created_time).getTime(),
      audioPath: properties.audio_url?.url || null,
      syncStatus: 'synced',
      notionPageId: page.id
    }
  }

  // 查找现有页面
  async findExistingPage(memoId, userId) {
    try {
      const currentUser = userManager.getCurrentUser()
      // 通过content搜索现有页面（简化实现）
      const queryResult = await notionAPI.queryDatabase(currentUser.notionConfig.databaseId, {
        and: [
          {
            property: 'user_id',
            rich_text: {
              equals: userId
            }
          }
        ]
      })

      if (queryResult.success) {
        // 这里应该通过某种方式匹配memo ID
        // 暂时返回null，表示总是创建新页面
        return null
      }
      return null
    } catch (error) {
      console.error('查找现有页面失败:', error)
      return null
    }
  }

  // 添加到同步队列
  addToSyncQueue(memo) {
    // 避免重复添加
    const exists = this.syncQueue.find(item => item.id === memo.id)
    if (!exists) {
      this.syncQueue.push(memo)
    }
  }

  // 更新本地同步状态
  updateLocalSyncStatus(memoId, status, pageId = null) {
    const memos = userManager.getUserMemos()
    const memo = memos.find(m => m.id === memoId)
    if (memo) {
      memo.syncStatus = status
      if (pageId) {
        memo.notionPageId = pageId
      }
      userManager.saveUserMemos(memos)
    }
  }

  // 检查用户是否启用Notion
  isUserNotionEnabled(userId) {
    return userManager.isNotionConfigured(userId)
  }

  // 工具方法
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  extractText(richTextProperty) {
    if (!richTextProperty?.rich_text) return ''
    return richTextProperty.rich_text.map(text => text.text.content).join('')
  }

  extractMemoId(page) {
    // 从Notion页面中提取备忘录ID的逻辑
    // 暂时使用页面ID作为memo ID
    return 'notion_' + page.id.replace(/-/g, '')
  }

  generateMemoId() {
    return 'memo_' + Date.now().toString()
  }

  shouldUpdateLocalMemo(localMemo, notionMemo) {
    // 比较时间戳判断是否需要更新
    return new Date(localMemo.timestamp) < new Date(notionMemo.timestamp)
  }

  updateLocalMemo(memoId, updates) {
    const memos = userManager.getUserMemos()
    const index = memos.findIndex(m => m.id === memoId)
    if (index !== -1) {
      memos[index] = { ...memos[index], ...updates }
      userManager.saveUserMemos(memos)
    }
  }

  // 获取同步状态
  getSyncStatus() {
    return {
      isConnected: this.isConnected,
      syncInProgress: this.syncInProgress,
      pendingCount: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      retryCount: this.retryCount
    }
  }
}

// 创建全局同步管理器实例
const notionSync = new NotionSync()

module.exports = notionSync