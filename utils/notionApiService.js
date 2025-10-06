/**
 * Notion API 直接调用服务
 * 不依赖云函数，直接调用Notion API
 */

class NotionApiService {
  constructor() {
    this.baseUrl = 'https://api.notion.com/v1'
    this.version = '2022-06-28'
  }

  // 调用Notion API
  async callApi(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Authorization': `Bearer ${options.apiKey}`,
      'Notion-Version': this.version,
      'Content-Type': 'application/json',
      ...options.headers
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: options.method || 'GET',
        header: headers,
        data: options.data,
        success: (response) => {
          console.log('Notion API响应:', response.statusCode, response.data)
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({
              success: true,
              data: response.data
            })
          } else {
            const errorMsg = response.data?.message || JSON.stringify(response.data) || '请求失败'
            console.error('Notion API错误:', response.statusCode, errorMsg)
            resolve({
              success: false,
              error: `HTTP ${response.statusCode}: ${errorMsg}`
            })
          }
        },
        fail: (error) => {
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败'
          })
        }
      })
    })
  }

  // 测试Notion连接并初始化数据库结构
  async testConnection(apiKey, databaseId) {
    try {
      // 测试用户信息
      const userResult = await this.callApi('/users/me', {
        apiKey: apiKey
      })

      if (!userResult.success) {
        return {
          success: false,
          error: 'API密钥无效: ' + userResult.error
        }
      }

      // 测试数据库访问
      const dbResult = await this.callApi(`/databases/${databaseId}`, {
        apiKey: apiKey
      })

      if (!dbResult.success) {
        return {
          success: false,
          error: '数据库访问失败: ' + dbResult.error
        }
      }

      // 初始化数据库结构
      console.log('开始初始化数据库结构...')
      const initResult = await this.initializeDatabaseStructure(apiKey, databaseId, dbResult.data)
      
      if (!initResult.success) {
        console.warn('数据库结构初始化失败，但可以继续使用:', initResult.error)
      } else {
        console.log('数据库结构初始化成功')
      }

      return {
        success: true,
        message: '连接成功！数据库结构已初始化',
        user: userResult.data,
        database: dbResult.data,
        initialized: initResult.success
      }
    } catch (error) {
      return {
        success: false,
        error: '连接测试失败: ' + error.message
      }
    }
  }

  // 初始化数据库结构
  async initializeDatabaseStructure(apiKey, databaseId, currentDatabase) {
    try {
      const currentProperties = currentDatabase.properties || {}
      
      // 定义需要的字段结构
      const requiredProperties = {
        'Content': {
          type: 'rich_text',
          rich_text: {}
        },
        'Type': {
          type: 'select',
          select: {
            options: [
              { name: 'Text', color: 'blue' },
              { name: 'Voice', color: 'green' }
            ]
          }
        },
        'Created': {
          type: 'date',
          date: {}
        },
        // 注释掉自动创建的属性，让用户手动在Notion中创建需要的属性
        // 'Time Period': {
        //   type: 'select',
        //   select: {
        //     options: [
        //       { name: '早晨', color: 'orange' },
        //       { name: '上午', color: 'yellow' },
        //       { name: '中午', color: 'orange' },
        //       { name: '下午', color: 'blue' },
        //       { name: '晚上', color: 'purple' },
        //       { name: '规划', color: 'green' },
        //       { name: '休息', color: 'gray' }
        //     ]
        //   }
        // },
        // 'Category': {
        //   type: 'select',
        //   select: {
        //     options: [
        //       { name: '生活', color: 'green' },
        //       { name: '工作', color: 'blue' },
        //       { name: '学习', color: 'purple' },
        //       { name: '成长', color: 'orange' },
        //       { name: '理财', color: 'yellow' },
        //       { name: '健康', color: 'red' },
        //       { name: '社交', color: 'pink' },
        //       { name: '目标', color: 'brown' },
        //       { name: '想法', color: 'gray' },
        //       { name: '心情', color: 'default' }
        //     ]
        //   }
        // },
        'Tags': {
          type: 'multi_select',
          multi_select: {
            options: [
              { name: '重要', color: 'red' },
              { name: '紧急', color: 'orange' },
              { name: '完成', color: 'green' },
              { name: '待办', color: 'yellow' },
              { name: '想法', color: 'purple' },
              { name: '总结', color: 'blue' },
              { name: '灵感', color: 'pink' },
              { name: '反思', color: 'gray' }
            ]
          }
        },
        'Planning': {
          type: 'checkbox',
          checkbox: {}
        },
        'Sync Status': {
          type: 'select',
          select: {
            options: [
              { name: 'synced', color: 'green' },
              { name: 'pending', color: 'yellow' },
              { name: 'failed', color: 'red' }
            ]
          }
        }
      }

      // 检查哪些字段需要添加
      const propertiesToAdd = {}
      for (const [name, config] of Object.entries(requiredProperties)) {
        if (!currentProperties[name]) {
          propertiesToAdd[name] = config
          console.log(`需要添加字段: ${name}`)
        }
      }

      // 如果没有需要添加的字段，直接返回成功
      if (Object.keys(propertiesToAdd).length === 0) {
        console.log('数据库结构已完整，无需添加字段')
        return { success: true, message: '数据库结构已完整' }
      }

      // 更新数据库结构
      const updateResult = await this.callApi(`/databases/${databaseId}`, {
        apiKey: apiKey,
        method: 'PATCH',
        data: {
          properties: propertiesToAdd
        }
      })

      if (updateResult.success) {
        console.log(`成功添加${Object.keys(propertiesToAdd).length}个字段`)
        return {
          success: true,
          message: `成功初始化数据库，添加了${Object.keys(propertiesToAdd).length}个字段`,
          addedFields: Object.keys(propertiesToAdd)
        }
      } else {
        return {
          success: false,
          error: '更新数据库结构失败: ' + updateResult.error
        }
      }
    } catch (error) {
      console.error('初始化数据库结构异常:', error)
      return {
        success: false,
        error: '初始化失败: ' + error.message
      }
    }
  }

  // 创建页面到数据库
  async createPage(apiKey, databaseId, pageData) {
    const endpoint = '/pages'
    const data = {
      parent: {
        type: 'database_id',
        database_id: databaseId
      },
      properties: pageData.properties,
      children: pageData.children || []
    }

    return await this.callApi(endpoint, {
      apiKey: apiKey,
      method: 'POST',
      data: data
    })
  }

  // 查询数据库
  async queryDatabase(apiKey, databaseId, filter = {}) {
    const endpoint = `/databases/${databaseId}/query`
    
    return await this.callApi(endpoint, {
      apiKey: apiKey,
      method: 'POST',
      data: filter
    })
  }

  // 同步备忘录到Notion
  async syncMemoToNotion(apiKey, databaseId, memo) {
    try {
      console.log('开始同步备忘录到Notion:', memo)
      
      // 构建完整的Notion页面数据
      const pageData = {
        parent: {
          type: 'database_id',
          database_id: databaseId
        },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: memo.content.substring(0, 50) + (memo.content.length > 50 ? '...' : '')
                }
              }
            ]
          },
          'Content': {
            rich_text: [
              {
                text: {
                  content: memo.content || ''
                }
              }
            ]
          },
          'Type': {
            select: {
              name: memo.type === 'voice' ? 'Voice' : 'Text'
            }
          },
          'Created': {
            date: {
              start: new Date(memo.timestamp).toISOString()
            }
          },
          // 注释掉不存在的属性，避免同步错误
          // 'Time Period': {
          //   select: {
          //     name: this.getTimePeriod(memo)
          //   }
          // },
          // 'Category': {
          //   select: {
          //     name: this.getCategory(memo)
          //   }
          // },
          'Planning': {
            checkbox: memo.isPlanning || false
          },
          'Sync Status': {
            select: {
              name: 'synced'
            }
          }
        }
      }

      // 添加标签（如果有）
      if (memo.tags && memo.tags.length > 0) {
        pageData.properties['Tags'] = {
          multi_select: memo.tags.map(tag => ({ name: tag }))
        }
      }

      console.log('构建的页面数据:', JSON.stringify(pageData, null, 2))

      const result = await this.createPage(apiKey, databaseId, pageData)
      
      console.log('创建页面结果:', result)
      
      if (result.success) {
        return {
          success: true,
          message: '同步成功',
          notionPageId: result.data.id
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('同步备忘录异常:', error)
      return {
        success: false,
        error: '同步失败: ' + error.message
      }
    }
  }

  // 从Notion获取备忘录
  async getMemoListFromNotion(apiKey, databaseId) {
    try {
      const result = await this.queryDatabase(apiKey, databaseId, {
        sorts: [
          {
            property: 'Created',
            direction: 'descending'
          }
        ]
      })

      if (result.success) {
        const memos = result.data.results.map(page => {
          const properties = page.properties
          return {
            id: page.id,
            content: properties.Content?.rich_text?.[0]?.text?.content || '',
            type: properties.Type?.select?.name?.toLowerCase() || 'text',
            timestamp: new Date(properties.Created?.date?.start || page.created_time).getTime(),
            tags: properties.Tags?.multi_select?.map(tag => tag.name) || [],
            isPlanning: properties.Planning?.checkbox || false,
            notionPageId: page.id,
            syncStatus: 'synced'
          }
        })

        return {
          success: true,
          memos: memos
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      return {
        success: false,
        error: '获取数据失败: ' + error.message
      }
    }
  }

  // 批量同步备忘录
  async batchSyncMemos(apiKey, databaseId, memos) {
    let successCount = 0
    let failCount = 0
    const errors = []

    for (const memo of memos) {
      try {
        const result = await this.syncMemoToNotion(apiKey, databaseId, memo)
        if (result.success) {
          successCount++
        } else {
          failCount++
          errors.push(`${memo.content.substring(0, 20)}...: ${result.error}`)
        }
      } catch (error) {
        failCount++
        errors.push(`${memo.content.substring(0, 20)}...: ${error.message}`)
      }
    }

    return {
      success: successCount > 0,
      syncedCount: successCount,
      failedCount: failCount,
      errors: errors,
      message: `成功同步 ${successCount} 条，失败 ${failCount} 条`
    }
  }

  // 删除Notion页面
  async deletePage(apiKey, pageId) {
    const endpoint = `/pages/${pageId}`
    
    return await this.callApi(endpoint, {
      apiKey: apiKey,
      method: 'PATCH',
      data: {
        archived: true  // Notion通过设置archived为true来删除页面
      }
    })
  }

  // 删除备忘录从Notion
  async deleteMemoFromNotion(apiKey, memo) {
    try {
      console.log('开始从Notion删除备忘录:', memo)
      
      // 检查备忘录是否有notionPageId
      if (!memo.notionPageId) {
        console.log('备忘录没有notionPageId，无需从Notion删除')
        return {
          success: true,
          message: '备忘录未同步到Notion，删除完成'
        }
      }

      const result = await this.deletePage(apiKey, memo.notionPageId)
      
      console.log('删除Notion页面结果:', result)
      
      if (result.success) {
        return {
          success: true,
          message: '已从Notion删除'
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('从Notion删除备忘录异常:', error)
      return {
        success: false,
        error: '删除失败: ' + error.message
      }
    }
  }

  // 智能识别内容分类
  getCategory(memo) {
    const content = memo.content.toLowerCase()
    
    // 工作相关关键词
    const workKeywords = ['工作', '项目', '会议', '同事', '客户', '业务', '任务', '汇报', '加班', '绩效', '考核']
    if (workKeywords.some(keyword => content.includes(keyword))) {
      return '工作'
    }
    
    // 学习相关关键词  
    const studyKeywords = ['学习', '学到', '课程', '书', '知识', '技能', '培训', '考试', '阅读', '笔记']
    if (studyKeywords.some(keyword => content.includes(keyword))) {
      return '学习'
    }
    
    // 成长相关关键词
    const growthKeywords = ['反思', '总结', '成长', '进步', '改进', '提升', '收获', '感悟', '经验', '教训']
    if (growthKeywords.some(keyword => content.includes(keyword))) {
      return '成长'
    }
    
    // 理财相关关键词
    const financeKeywords = ['理财', '投资', '消费', '买', '花费', '存钱', '基金', '股票', '财务', '预算']
    if (financeKeywords.some(keyword => content.includes(keyword))) {
      return '理财'
    }
    
    // 健康相关关键词
    const healthKeywords = ['健康', '运动', '锻炼', '跑步', '健身', '饮食', '吃', '睡觉', '休息', '医生']
    if (healthKeywords.some(keyword => content.includes(keyword))) {
      return '健康'
    }
    
    // 社交相关关键词
    const socialKeywords = ['朋友', '聚会', '聊天', '约', '见面', '社交', '聚餐', '派对', '活动', '相处']
    if (socialKeywords.some(keyword => content.includes(keyword))) {
      return '社交'
    }
    
    // 目标相关关键词
    const goalKeywords = ['目标', '计划', '打算', '准备', '要做', '完成', '达成', '实现', '规划']
    if (goalKeywords.some(keyword => content.includes(keyword)) || memo.isPlanning) {
      return '目标'
    }
    
    // 心情相关关键词
    const moodKeywords = ['开心', '难过', '生气', '焦虑', '紧张', '兴奋', '失落', '感觉', '心情', '情绪']
    if (moodKeywords.some(keyword => content.includes(keyword))) {
      return '心情'
    }
    
    // 想法相关关键词
    const ideaKeywords = ['想法', '想到', '思考', '觉得', '认为', '想起', '突然', '灵感', '想象']
    if (ideaKeywords.some(keyword => content.includes(keyword))) {
      return '想法'
    }
    
    // 默认返回生活
    return '生活'
  }

  // 根据时间和类型获取时间段
  getTimePeriod(memo) {
    // 如果是规划记录，直接返回规划
    if (memo.isPlanning) {
      return '规划'
    }

    const date = new Date(memo.timestamp)
    const hour = date.getHours()

    // 根据小时判断时间段
    if (hour >= 5 && hour < 9) {
      return '早晨'    // 5:00-8:59
    } else if (hour >= 9 && hour < 12) {
      return '上午'    // 9:00-11:59
    } else if (hour >= 12 && hour < 14) {
      return '中午'    // 12:00-13:59
    } else if (hour >= 14 && hour < 18) {
      return '下午'    // 14:00-17:59
    } else if (hour >= 18 && hour < 23) {
      return '晚上'    // 18:00-22:59
    } else {
      return '休息'    // 23:00-4:59
    }
  }

}

// 创建全局实例
const notionApiService = new NotionApiService()

module.exports = notionApiService