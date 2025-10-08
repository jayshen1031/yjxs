/**
 * Notion同步模块
 * 通过后端API服务器处理与Notion的集成和数据同步
 */

const userManager = require('./userManager.js')
const apiService = require('./apiService.js')
const MarkdownHelper = require('./markdownHelper.js')

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
        
        const currentUser = userManager.getCurrentUser()
        let configData = {
          apiKey,
          databaseId,
          syncEnabled: true
        }
        
        // 检查是否需要创建时间投入数据库
        const migrationCheck = await this.checkAndHandleMigration(apiKey, currentUser)
        
        if (migrationCheck.timeInvestmentDbId) {
          configData.timeInvestmentDatabaseId = migrationCheck.timeInvestmentDbId
        }
        
        // 保存用户配置
        if (currentUser) {
          await apiService.saveUserConfig(currentUser.id, configData)
          userManager.configureNotion(currentUser.id, {
            enabled: true,
            ...configData
          })
        }
        
        // 启动待处理数据同步
        setTimeout(() => {
          this.syncPendingData()
        }, 1000)
        
        return { 
          success: true, 
          message: migrationCheck.message || 'Notion连接成功',
          data: {
            ...result.data,
            migration: migrationCheck
          }
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

  // 检查并处理迁移需求
  async checkAndHandleMigration(apiKey, currentUser) {
    try {
      // 如果用户已经配置了时间投入数据库，无需处理
      if (currentUser?.notionConfig?.timeInvestmentDatabaseId) {
        return {
          needed: false,
          message: '已配置双数据库架构',
          timeInvestmentDbId: currentUser.notionConfig.timeInvestmentDatabaseId
        }
      }

      // 检查是否有时间投入数据需要迁移
      const memos = userManager.getUserMemos()
      const hasTimeInvestmentData = memos.some(memo => 
        memo.valuableTimeEntries?.length > 0 || 
        memo.wastefulTimeEntries?.length > 0 ||
        memo.neutralTimeEntries?.length > 0
      )

      if (!hasTimeInvestmentData) {
        return {
          needed: false,
          message: '无时间投入数据，使用单数据库模式'
        }
      }

      // 有时间投入数据，尝试自动创建子数据库
      console.log('检测到时间投入数据，尝试自动升级到双数据库架构')
      const timeInvestmentDbResult = await this.createTimeInvestmentDatabase(apiKey)
      
      if (timeInvestmentDbResult.success) {
        // 创建成功，自动迁移现有数据
        await this.migrateExistingTimeInvestments(currentUser, timeInvestmentDbResult.databaseId)
        
        return {
          needed: true,
          success: true,
          message: '已自动升级到双数据库架构并迁移数据',
          timeInvestmentDbId: timeInvestmentDbResult.databaseId
        }
      } else {
        // 创建失败，启用兼容模式
        console.warn('子数据库创建失败，启用兼容模式:', timeInvestmentDbResult.error)
        
        userManager.configureNotion(currentUser.id, {
          legacyMode: true,
          timeInvestmentEnabled: false
        })
        
        return {
          needed: true,
          success: false,
          message: '兼容模式：继续使用单数据库架构',
          legacyMode: true
        }
      }
    } catch (error) {
      console.error('迁移检查失败:', error)
      
      // 出错时默认启用兼容模式
      if (currentUser) {
        userManager.configureNotion(currentUser.id, {
          legacyMode: true,
          timeInvestmentEnabled: false
        })
      }
      
      return {
        needed: false,
        error: error.message,
        message: '检查失败，使用兼容模式',
        legacyMode: true
      }
    }
  }

  // 迁移现有时间投入数据
  async migrateExistingTimeInvestments(user, timeInvestmentDbId) {
    try {
      const memos = userManager.getUserMemos()
      let migratedCount = 0
      
      for (const memo of memos) {
        if ((memo.valuableTimeEntries?.length > 0 || 
             memo.wastefulTimeEntries?.length > 0 ||
             memo.neutralTimeEntries?.length > 0) && 
             memo.notionPageId) {
          
          // 临时更新用户配置以包含时间投入数据库ID
          const tempUser = {
            ...user,
            notionConfig: {
              ...user.notionConfig,
              timeInvestmentDatabaseId: timeInvestmentDbId
            }
          }
          
          const result = await this.syncTimeInvestmentsToNotion(memo, tempUser)
          if (result.length > 0) {
            migratedCount += result.length
          }
        }
      }
      
      console.log(`成功迁移 ${migratedCount} 条时间投入记录`)
      return migratedCount
    } catch (error) {
      console.error('迁移现有数据失败:', error)
      return 0
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
    // 生成全局一致的记录ID作为标题，便于与子记录关联
    const recordId = this.generateRecordId(memo)
    const title = recordId

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
          rich_text: this.formatContentAsRichText(memo)
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

  // 生成全局一致的记录ID（用于主记录标题和子记录关联）
  generateRecordId(memo) {
    // 使用时间戳 + 用户ID + 随机数生成唯一ID
    const timestamp = new Date(memo.timestamp).toISOString().slice(0, 16).replace(/[-:T]/g, '')
    const userPart = memo.userId ? memo.userId.slice(-4) : '0000'
    const randomPart = Math.random().toString(36).substr(2, 4)
    
    return `REC_${timestamp}_${userPart}_${randomPart}`
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

  // 同步时间投入数据到子记录数据库
  async syncTimeInvestmentsToNotion(memo, user) {
    try {
      // 收集所有时间投入数据
      const timeInvestments = []
      
      // 处理有价值活动时间投入
      if (memo.valuableTimeEntries && memo.valuableTimeEntries.length > 0) {
        memo.valuableTimeEntries.forEach(entry => {
          timeInvestments.push({
            activity_name: this.standardizeActivityName(entry.activity),
            minutes: entry.minutes,
            value_category: 'valuable'
          })
        })
      }
      
      // 处理中性活动时间投入
      if (memo.neutralTimeEntries && memo.neutralTimeEntries.length > 0) {
        memo.neutralTimeEntries.forEach(entry => {
          timeInvestments.push({
            activity_name: this.standardizeActivityName(entry.activity),
            minutes: entry.minutes,
            value_category: 'neutral'
          })
        })
      }
      
      // 处理无价值活动时间投入
      if (memo.wastefulTimeEntries && memo.wastefulTimeEntries.length > 0) {
        memo.wastefulTimeEntries.forEach(entry => {
          timeInvestments.push({
            activity_name: this.standardizeActivityName(entry.activity),
            minutes: entry.minutes,
            value_category: 'wasteful'
          })
        })
      }
      
      // 如果没有时间投入数据，直接返回
      if (timeInvestments.length === 0) {
        return []
      }
      
      console.log('开始同步时间投入到子记录数据库:', timeInvestments)
      
      // 逐条创建时间投入记录
      const timeInvestmentPromises = timeInvestments.map(investment => 
        this.createTimeInvestmentRecord(investment, memo, user)
      )
      
      const results = await Promise.all(timeInvestmentPromises)
      console.log('时间投入记录同步完成:', results.length, '条')
      
      return results
    } catch (error) {
      console.error('同步时间投入到子记录数据库失败:', error)
      // 不抛出错误，避免影响主记录同步
      return []
    }
  }

  // 创建单条时间投入记录
  async createTimeInvestmentRecord(investment, memo, user) {
    try {
      // 生成全局记录ID用于关联
      const recordId = this.generateRecordId(memo)
      
      // 这里需要调用Notion API创建子记录
      // 注意：需要子记录数据库的database_id
      const timeInvestmentData = {
        parent: {
          type: 'database_id',
          database_id: user.notionConfig.timeInvestmentDatabaseId // 需要在用户配置中添加
        },
        properties: {
          'memo_record': {
            relation: [
              {
                id: memo.notionPageId // 主记录的Notion页面ID（保持关系字段）
              }
            ]
          },
          'memo_record_id': {
            rich_text: [
              {
                text: {
                  content: recordId // 全局一致的记录ID
                }
              }
            ]
          },
          'activity_name': {
            title: [
              {
                text: {
                  content: investment.activity_name
                }
              }
            ]
          },
          'minutes': {
            number: investment.minutes
          },
          'value_category': {
            select: {
              name: investment.value_category
            }
          },
          'user_id': {
            rich_text: [
              {
                text: {
                  content: user.id
                }
              }
            ]
          },
          'record_date': {
            date: {
              start: new Date(memo.timestamp).toISOString().split('T')[0]
            }
          }
        }
      }
      
      // 调用API创建记录
      const response = await apiService.createNotionPage(timeInvestmentData)
      
      if (response.success) {
        console.log('时间投入记录创建成功:', investment.activity_name, response.pageId)
        return response
      } else {
        console.error('时间投入记录创建失败:', investment.activity_name, response.error)
        return null
      }
    } catch (error) {
      console.error('创建时间投入记录异常:', investment.activity_name, error)
      return null
    }
  }

  // 标准化活动名称
  standardizeActivityName(activityName) {
    if (!activityName) return activityName
    
    // 常见活动名称标准化映射
    const standardMapping = {
      '写代码': '编程',
      '敲代码': '编程', 
      'coding': '编程',
      'programming': '编程',
      '看书': '阅读',
      '读书': '阅读',
      'reading': '阅读',
      '刷抖音': '刷短视频',
      '刷快手': '刷短视频',
      '看视频': '刷短视频',
      '玩手机': '刷手机',
      '看手机': '刷手机',
      '锻炼': '运动',
      '健身': '运动',
      'workout': '运动',
      'exercise': '运动'
    }
    
    // 转换为小写进行匹配
    const lowerName = activityName.toLowerCase().trim()
    
    // 查找标准化映射
    for (const [key, standardName] of Object.entries(standardMapping)) {
      if (lowerName.includes(key.toLowerCase())) {
        return standardName
      }
    }
    
    // 没找到映射，返回清理后的原名称
    return activityName.trim()
  }

  // 创建时间投入子数据库
  async createTimeInvestmentDatabase(apiKey) {
    try {
      console.log('开始创建时间投入子数据库')
      
      // 首先获取用户的工作区页面 - 使用当前主数据库的父页面
      const currentUser = userManager.getCurrentUser()
      if (!currentUser || !currentUser.notionConfig.databaseId) {
        throw new Error('用户未配置主数据库')
      }
      
      // 获取主数据库信息来获取父页面ID
      const notionApiService = require('./notionApiService.js')
      const dbInfo = await notionApiService.callApi(`/databases/${currentUser.notionConfig.databaseId}`, {
        apiKey: apiKey
      })
      
      if (!dbInfo.success) {
        throw new Error('无法获取主数据库信息: ' + dbInfo.error)
      }
      
      const parentPageId = dbInfo.data.parent?.page_id
      if (!parentPageId) {
        // 如果主数据库没有父页面，尝试使用工作区根页面
        // 对于个人账户，使用用户自己的页面
        throw new Error('无法确定父页面ID，请确保主数据库在一个页面中')
      }
      
      // 定义数据库结构
      const databaseData = {
        parent: {
          type: 'page_id',
          page_id: parentPageId
        },
        title: [
          {
            type: 'text',
            text: {
              content: '时间投入记录 - ' + (currentUser.name || currentUser.email)
            }
          }
        ],
        properties: {
          'activity_name': {
            title: {}
          },
          'memo_record': {
            relation: {
              database_id: currentUser.notionConfig.databaseId
            }
          },
          'memo_record_id': {
            rich_text: {}
          },
          'minutes': {
            number: {}
          },
          'value_category': {
            select: {
              options: [
                { name: 'valuable', color: 'green' },
                { name: 'wasteful', color: 'red' },
                { name: 'neutral', color: 'gray' }
              ]
            }
          },
          'user_id': {
            rich_text: {}
          },
          'record_date': {
            date: {}
          },
          'created_at': {
            created_time: {}
          }
        }
      }
      
      // 调用API创建数据库
      const response = await apiService.createNotionDatabase(databaseData, apiKey)
      
      if (response.success) {
        console.log('时间投入数据库创建成功:', response.databaseId)
        return {
          success: true,
          databaseId: response.databaseId,
          message: '时间投入数据库创建成功'
        }
      } else {
        console.error('时间投入数据库创建失败:', response.error)
        
        // 如果创建失败，可能是权限问题，提供简化的手动创建指引
        return {
          success: false,
          error: response.error,
          manualSetupRequired: true,
          message: '自动创建失败，请手动创建子数据库。请参考NOTION_DUAL_DATABASE_SETUP.md文档'
        }
      }
    } catch (error) {
      console.error('创建时间投入数据库异常:', error)
      return {
        success: false,
        error: error.message,
        manualSetupRequired: true,
        message: '自动创建失败，请手动创建子数据库'
      }
    }
  }

  // 格式化记录内容为富文本
  formatContentAsRichText(memo) {
    // 合并所有内容类型的文本
    let fullContent = ''
    
    // 处理规划模式
    if (memo.recordMode === 'planning') {
      return MarkdownHelper.convertToNotionRichText(memo.textContent || memo.content || '')
    }
    
    // 处理正常模式的三类内容
    if (memo.recordMode === 'normal') {
      const sections = []
      
      if (memo.valuableContent) {
        sections.push(`## 🌟 有价值的活动\n${memo.valuableContent}`)
      }
      
      if (memo.neutralContent) {
        sections.push(`## 😐 中性的活动\n${memo.neutralContent}`)
      }
      
      if (memo.wastefulContent) {
        sections.push(`## 🗑️ 低效的活动\n${memo.wastefulContent}`)
      }
      
      fullContent = sections.join('\n\n')
      
      // 添加时间投入统计摘要
      const timeStats = []
      if (memo.totalValuableMinutes > 0) {
        timeStats.push(`有价值活动: ${memo.totalValuableMinutes}分钟`)
      }
      if (memo.totalNeutralMinutes > 0) {
        timeStats.push(`中性活动: ${memo.totalNeutralMinutes}分钟`)
      }
      if (memo.totalWastefulMinutes > 0) {
        timeStats.push(`低效活动: ${memo.totalWastefulMinutes}分钟`)
      }
      
      if (timeStats.length > 0) {
        fullContent += `\n\n---\n**时间投入统计:** ${timeStats.join(', ')}`
      }
    }
    
    // 如果没有分类内容，使用原始内容
    if (!fullContent && memo.content) {
      fullContent = memo.content
    }
    
    // 自动格式化并转换为Notion富文本
    const formattedContent = MarkdownHelper.autoFormat(fullContent)
    return MarkdownHelper.convertToNotionRichText(formattedContent)
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