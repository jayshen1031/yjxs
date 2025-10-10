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

  // 测试Notion连接并初始化双数据库结构
  async testConnection(apiKey, parentPageId = null) {
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

      console.log('API密钥验证成功，用户:', userResult.data.name)

      // 如果提供了parentPageId，测试访问权限
      if (parentPageId) {
        const pageResult = await this.callApi(`/pages/${parentPageId}`, {
          apiKey: apiKey
        })

        if (!pageResult.success) {
          return {
            success: false,
            error: '无法访问指定页面: ' + pageResult.error
          }
        }
      }

      return {
        success: true,
        message: 'Notion连接验证成功',
        user: userResult.data
      }
    } catch (error) {
      return {
        success: false,
        error: '连接测试失败: ' + error.message
      }
    }
  }

  // 自动创建四数据库架构
  async createQuadDatabases(apiKey, parentPageId) {
    try {
      console.log('开始自动创建四数据库架构...')

      // 1. 创建目标库
      const goalsDbResult = await this.createGoalsDatabase(apiKey, parentPageId)
      if (!goalsDbResult.success) {
        return {
          success: false,
          error: '创建目标库失败: ' + goalsDbResult.error
        }
      }
      console.log('目标库创建成功:', goalsDbResult.databaseId)

      // 2. 创建待办库（关联目标库）
      const todosDbResult = await this.createTodosDatabase(
        apiKey,
        parentPageId,
        goalsDbResult.databaseId
      )
      if (!todosDbResult.success) {
        return {
          success: false,
          error: '创建待办库失败: ' + todosDbResult.error
        }
      }
      console.log('待办库创建成功:', todosDbResult.databaseId)

      // 3. 创建主记录表
      const mainDbResult = await this.createMainRecordsDatabase(apiKey, parentPageId)
      if (!mainDbResult.success) {
        return {
          success: false,
          error: '创建主记录表失败: ' + mainDbResult.error
        }
      }
      console.log('主记录表创建成功:', mainDbResult.databaseId)

      // 4. 创建活动明细表（关联所有其他表）
      const activityDbResult = await this.createActivityDetailsDatabase(
        apiKey,
        parentPageId,
        mainDbResult.databaseId,
        goalsDbResult.databaseId,
        todosDbResult.databaseId
      )
      if (!activityDbResult.success) {
        return {
          success: false,
          error: '创建活动明细表失败: ' + activityDbResult.error
        }
      }
      console.log('活动明细表创建成功:', activityDbResult.databaseId)

      // 5. 添加反向关联和Rollup字段
      await this.addRelationsAndRollups(
        apiKey,
        mainDbResult.databaseId,
        activityDbResult.databaseId,
        goalsDbResult.databaseId,
        todosDbResult.databaseId
      )

      return {
        success: true,
        message: '四数据库创建成功',
        goalsDatabaseId: goalsDbResult.databaseId,
        todosDatabaseId: todosDbResult.databaseId,
        mainDatabaseId: mainDbResult.databaseId,
        activityDatabaseId: activityDbResult.databaseId,
        tables: ['goals', 'todos', 'main', 'activity']
      }
    } catch (error) {
      console.error('创建四数据库异常:', error)
      return {
        success: false,
        error: '创建失败: ' + error.message
      }
    }
  }

  // 自动创建双数据库架构（保持向后兼容）
  async createDualDatabases(apiKey, parentPageId) {
    // 重定向到四数据库创建
    return await this.createQuadDatabases(apiKey, parentPageId)
  }

  // 初始化数据库结构
  async initializeDatabaseStructure(apiKey, databaseId, currentDatabase) {
    try {
      const currentProperties = currentDatabase.properties || {}

      // 定义需要的字段结构
      const requiredProperties = {
        'User ID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Record Date': {
          type: 'date',
          date: {}
        },
        'Start Time': {
          type: 'rich_text',
          rich_text: {}
        },
        'End Time': {
          type: 'rich_text',
          rich_text: {}
        },
        'Valuable Content': {
          type: 'rich_text',
          rich_text: {}
        },
        'Valuable Activities': {
          type: 'rich_text',
          rich_text: {}
        },
        'Valuable Minutes': {
          type: 'number',
          number: {
            format: 'number'
          }
        },
        'Neutral Content': {
          type: 'rich_text',
          rich_text: {}
        },
        'Neutral Activities': {
          type: 'rich_text',
          rich_text: {}
        },
        'Neutral Minutes': {
          type: 'number',
          number: {
            format: 'number'
          }
        },
        'Wasteful Content': {
          type: 'rich_text',
          rich_text: {}
        },
        'Wasteful Activities': {
          type: 'rich_text',
          rich_text: {}
        },
        'Wasteful Minutes': {
          type: 'number',
          number: {
            format: 'number'
          }
        },
        'Total Minutes': {
          type: 'number',
          number: {
            format: 'number'
          }
        },
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
        'Is Planning': {
          type: 'checkbox',
          checkbox: {}
        },
        'Goal ID': {
          type: 'rich_text',
          rich_text: {}
        },
        'Type': {
          type: 'select',
          select: {
            options: [
              { name: 'normal', color: 'blue' },
              { name: 'planning', color: 'orange' }
            ]
          }
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

  // 创建目标库
  async createGoalsDatabase(apiKey, parentPageId) {
    const databaseData = {
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          text: {
            content: '语寄心声 - 目标库'
          }
        }
      ],
      properties: {
        'Goal Name': {
          title: {}
        },
        'Category': {
          select: {
            options: [
              { name: '人生目标', color: 'red' },
              { name: '年度目标', color: 'orange' },
              { name: '季度目标', color: 'yellow' },
              { name: '月度目标', color: 'green' },
              { name: '周目标', color: 'blue' }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              { name: '未开始', color: 'gray' },
              { name: '进行中', color: 'blue' },
              { name: '已完成', color: 'green' },
              { name: '已暂停', color: 'yellow' },
              { name: '已取消', color: 'red' }
            ]
          }
        },
        'Progress': {
          number: {
            format: 'percent'
          }
        },
        'Start Date': {
          date: {}
        },
        'Target Date': {
          date: {}
        },
        'Priority': {
          select: {
            options: [
              { name: '高', color: 'red' },
              { name: '中', color: 'yellow' },
              { name: '低', color: 'gray' }
            ]
          }
        },
        'Description': {
          rich_text: {}
        },
        'Tags': {
          multi_select: {
            options: [
              { name: '工作', color: 'blue' },
              { name: '学习', color: 'purple' },
              { name: '生活', color: 'green' },
              { name: '健康', color: 'pink' },
              { name: '财务', color: 'orange' },
              { name: '社交', color: 'yellow' }
            ]
          }
        }
        // Note: Related Todos, Related Activities, Total Time 等反向关联和Rollup字段会在后续添加
      }
    }

    return await this.createDatabase(databaseData, apiKey)
  }

  // 创建待办库
  async createTodosDatabase(apiKey, parentPageId, goalsDatabaseId) {
    const databaseData = {
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          text: {
            content: '语寄心声 - 待办库'
          }
        }
      ],
      properties: {
        'Todo Name': {
          title: {}
        },
        'Todo Type': {
          select: {
            options: [
              { name: '目标导向', color: 'blue' },
              { name: '临时待办', color: 'gray' },
              { name: '习惯养成', color: 'green' },
              { name: '紧急处理', color: 'red' }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              { name: '待办', color: 'gray' },
              { name: '进行中', color: 'blue' },
              { name: '已完成', color: 'green' },
              { name: '已取消', color: 'red' }
            ]
          }
        },
        'Priority': {
          select: {
            options: [
              { name: '紧急重要', color: 'red' },
              { name: '重要不紧急', color: 'orange' },
              { name: '紧急不重要', color: 'yellow' },
              { name: '不紧急不重要', color: 'gray' }
            ]
          }
        },
        'Scope': {
          select: {
            options: [
              { name: '今日', color: 'orange' },
              { name: '近期', color: 'blue' }
            ]
          }
        },
        'Related Goal': {
          relation: {
            database_id: goalsDatabaseId,
            type: 'dual_property',
            dual_property: {
              synced_property_name: 'Related Todos'
            }
          }
        },
        'Due Date': {
          date: {}
        },
        'Estimated Minutes': {
          number: {
            format: 'number'
          }
        },
        'Description': {
          rich_text: {}
        },
        'Tags': {
          multi_select: {
            options: [
              { name: '工作', color: 'blue' },
              { name: '学习', color: 'purple' },
              { name: '生活', color: 'green' },
              { name: '健康', color: 'pink' },
              { name: '紧急', color: 'red' },
              { name: '重要', color: 'orange' }
            ]
          }
        }
        // Note: Related Activities, Actual Time 等反向关联和Rollup字段会在后续添加
      }
    }

    return await this.createDatabase(databaseData, apiKey)
  }

  // 创建主记录表
  async createMainRecordsDatabase(apiKey, parentPageId) {
    const databaseData = {
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          text: {
            content: '语寄心声 - 主记录'
          }
        }
      ],
      properties: {
        'Name': {
          title: {}
        },
        'User ID': {
          rich_text: {}
        },
        'Record Date': {
          date: {}
        },
        'Start Time': {
          rich_text: {}
        },
        'End Time': {
          rich_text: {}
        },
        'Type': {
          select: {
            options: [
              { name: 'normal', color: 'blue' },
              { name: 'planning', color: 'orange' }
            ]
          }
        },
        'Is Planning': {
          checkbox: {}
        },
        'Summary': {
          rich_text: {}
        },
        'Tags': {
          multi_select: {
            options: [
              { name: '工作', color: 'blue' },
              { name: '学习', color: 'purple' },
              { name: '生活', color: 'green' },
              { name: '重要', color: 'red' },
              { name: '紧急', color: 'orange' }
            ]
          }
        },
        'Sync Status': {
          select: {
            options: [
              { name: 'synced', color: 'green' },
              { name: 'pending', color: 'yellow' },
              { name: 'failed', color: 'red' }
            ]
          }
        }
        // Note: Activities relation 和 Rollup 字段会在 addRollupFieldsToMainDatabase 中添加
      }
    }

    return await this.createDatabase(databaseData, apiKey)
  }

  // 创建活动明细表
  async createActivityDetailsDatabase(apiKey, parentPageId, mainDatabaseId, goalsDatabaseId = null, todosDatabaseId = null) {
    const properties = {
      'Activity Name': {
        title: {}
      },
      'Minutes': {
        number: {
          format: 'number'
        }
      },
      'Value Type': {
        select: {
          options: [
            { name: '有价值', color: 'green' },
            { name: '中性', color: 'gray' },
            { name: '低效', color: 'red' }
          ]
        }
      },
      'Record': {
        relation: {
          database_id: mainDatabaseId,
          type: 'dual_property',
          dual_property: {
            synced_property_name: 'Activities'
          }
        }
      },
      'User ID': {
        rich_text: {}
      },
      'Record Date': {
        date: {}
      },
      'Description': {
        rich_text: {}
      },
      'Tags': {
        multi_select: {
          options: [
            { name: '工作', color: 'blue' },
            { name: '学习', color: 'purple' },
            { name: '生活', color: 'green' },
            { name: '心情', color: 'pink' },
            { name: '想法', color: 'yellow' },
            { name: '计划', color: 'orange' },
            { name: '总结', color: 'gray' },
            { name: '感悟', color: 'red' }
          ]
        }
      }
    }

    // 如果提供了目标库ID，添加关联字段
    if (goalsDatabaseId) {
      properties['Related Goal'] = {
        relation: {
          database_id: goalsDatabaseId,
          type: 'dual_property',
          dual_property: {
            synced_property_name: 'Related Activities'
          }
        }
      }
      properties['Contribution Type'] = {
        select: {
          options: [
            { name: '直接推进', color: 'green' },
            { name: '间接支持', color: 'blue' },
            { name: '学习准备', color: 'purple' },
            { name: '无关', color: 'gray' }
          ]
        }
      }
    }

    // 如果提供了待办库ID，添加关联字段
    if (todosDatabaseId) {
      properties['Related Todo'] = {
        relation: {
          database_id: todosDatabaseId,
          type: 'dual_property',
          dual_property: {
            synced_property_name: 'Related Activities'
          }
        }
      }
    }

    const databaseData = {
      parent: {
        type: 'page_id',
        page_id: parentPageId
      },
      title: [
        {
          text: {
            content: '语寄心声 - 活动明细'
          }
        }
      ],
      properties: properties
    }

    return await this.createDatabase(databaseData, apiKey)
  }

  // 添加关联和Rollup字段（四数据库架构）
  async addRelationsAndRollups(apiKey, mainDatabaseId, activityDatabaseId, goalsDatabaseId, todosDatabaseId) {
    try {
      console.log('开始添加反向关联和Rollup字段...')

      // 1. 主记录表添加Rollup字段
      await this.callApi(`/databases/${mainDatabaseId}`, {
        apiKey: apiKey,
        method: 'PATCH',
        data: {
          properties: {
            'Total Minutes': {
              rollup: {
                relation_property_name: 'Activities',
                rollup_property_name: 'Minutes',
                function: 'sum'
              }
            }
          }
        }
      })
      console.log('主记录表Rollup字段添加完成')

      // 2. 目标库添加Rollup字段
      await this.callApi(`/databases/${goalsDatabaseId}`, {
        apiKey: apiKey,
        method: 'PATCH',
        data: {
          properties: {
            'Total Time Invested': {
              rollup: {
                relation_property_name: 'Related Activities',
                rollup_property_name: 'Minutes',
                function: 'sum'
              }
            },
            'Total Todos': {
              rollup: {
                relation_property_name: 'Related Todos',
                rollup_property_name: 'Todo Name',
                function: 'count'
              }
            }
          }
        }
      })
      console.log('目标库Rollup字段添加完成')

      // 3. 待办库添加Rollup字段
      await this.callApi(`/databases/${todosDatabaseId}`, {
        apiKey: apiKey,
        method: 'PATCH',
        data: {
          properties: {
            'Actual Time': {
              rollup: {
                relation_property_name: 'Related Activities',
                rollup_property_name: 'Minutes',
                function: 'sum'
              }
            }
          }
        }
      })
      console.log('待办库Rollup字段添加完成')

      return { success: true, message: '所有关联和Rollup字段添加完成' }
    } catch (error) {
      console.error('添加关联和Rollup字段失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 添加Rollup字段到主记录表（保持向后兼容）
  async addRollupFieldsToMainDatabase(apiKey, mainDatabaseId, activityDatabaseId) {
    try {
      const updateResult = await this.callApi(`/databases/${mainDatabaseId}`, {
        apiKey: apiKey,
        method: 'PATCH',
        data: {
          properties: {
            'Total Minutes': {
              rollup: {
                relation_property_name: 'Activities',
                rollup_property_name: 'Minutes',
                function: 'sum'
              }
            }
          }
        }
      })

      console.log('Rollup字段添加结果:', updateResult.success ? '成功' : '失败')
      return updateResult
    } catch (error) {
      console.error('添加Rollup字段失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 创建Notion数据库
  async createDatabase(databaseData, apiKey) {
    const endpoint = '/databases'
    
    // 尝试创建数据库
    const result = await this.callApi(endpoint, {
      apiKey: apiKey,
      method: 'POST',
      data: databaseData
    })
    
    if (result.success) {
      return {
        success: true,
        databaseId: result.data.id,
        message: '数据库创建成功',
        data: result.data
      }
    } else {
      return {
        success: false,
        error: result.error
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

  // 创建Notion页面（通用方法）
  async createPageGeneric(pageData, apiKey) {
    const endpoint = '/pages'
    
    const result = await this.callApi(endpoint, {
      apiKey: apiKey,
      method: 'POST',
      data: pageData
    })
    
    if (result.success) {
      return {
        success: true,
        pageId: result.data.id,
        message: '页面创建成功',
        data: result.data
      }
    } else {
      return {
        success: false,
        error: result.error
      }
    }
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

  // 创建主记录（双表模式）
  async createMainRecord(apiKey, mainDatabaseId, memo) {
    try {
      console.log('创建主记录到主记录表...')

      // 生成摘要文本
      const generateSummary = (memo) => {
        const parts = []

        if (memo.valuableTimeEntries && memo.valuableTimeEntries.length > 0) {
          const count = memo.valuableTimeEntries.length
          const total = memo.valuableTimeEntries.reduce((sum, e) => sum + (e.minutes || 0), 0)
          parts.push(`有价值活动${count}个(${total}分钟)`)
        }

        if (memo.neutralTimeEntries && memo.neutralTimeEntries.length > 0) {
          const count = memo.neutralTimeEntries.length
          const total = memo.neutralTimeEntries.reduce((sum, e) => sum + (e.minutes || 0), 0)
          parts.push(`中性活动${count}个(${total}分钟)`)
        }

        if (memo.wastefulTimeEntries && memo.wastefulTimeEntries.length > 0) {
          const count = memo.wastefulTimeEntries.length
          const total = memo.wastefulTimeEntries.reduce((sum, e) => sum + (e.minutes || 0), 0)
          parts.push(`低效活动${count}个(${total}分钟)`)
        }

        return parts.join('；') || '无活动记录'
      }

      const pageData = {
        parent: {
          type: 'database_id',
          database_id: mainDatabaseId
        },
        properties: {
          'Name': {
            title: [{
              text: { content: memo.id || `memo_${Date.now()}` }
            }]
          },
          'User ID': {
            rich_text: [{
              text: { content: memo.userId || 'default_user' }
            }]
          },
          'Record Date': {
            date: {
              start: new Date(memo.timestamp).toISOString().split('T')[0]
            }
          },
          'Start Time': {
            rich_text: [{
              text: { content: memo.startTime || '' }
            }]
          },
          'End Time': {
            rich_text: [{
              text: { content: memo.endTime || '' }
            }]
          },
          'Type': {
            select: {
              name: memo.recordMode || (memo.isPlanning ? 'planning' : 'normal')
            }
          },
          'Is Planning': {
            checkbox: memo.isPlanning || false
          },
          'Summary': {
            rich_text: [{
              text: { content: generateSummary(memo) }
            }]
          },
          'Sync Status': {
            select: { name: 'synced' }
          }
        }
      }

      // 添加标签
      if (memo.tags && memo.tags.length > 0) {
        pageData.properties['Tags'] = {
          multi_select: memo.tags.map(tag => ({ name: tag }))
        }
      }

      const result = await this.createPage(apiKey, mainDatabaseId, pageData)

      if (result.success) {
        console.log('主记录创建成功:', result.data.id)
        return {
          success: true,
          mainRecordId: result.data.id
        }
      } else {
        console.error('主记录创建失败:', result.error)
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('创建主记录异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 创建活动记录（双表模式）
  async createActivityRecords(apiKey, activityDatabaseId, mainRecordId, memo) {
    try {
      console.log('创建活动记录到活动明细表...')

      // 收集所有活动
      const activities = []

      // 有价值的活动
      if (memo.valuableTimeEntries && memo.valuableTimeEntries.length > 0) {
        memo.valuableTimeEntries.forEach(entry => {
          activities.push({
            activityName: entry.activity || '未命名活动',
            minutes: entry.minutes || 0,
            valueType: '有价值',
            description: entry.description || '',
            tags: entry.tags || []
          })
        })
      }

      // 中性活动
      if (memo.neutralTimeEntries && memo.neutralTimeEntries.length > 0) {
        memo.neutralTimeEntries.forEach(entry => {
          activities.push({
            activityName: entry.activity || '未命名活动',
            minutes: entry.minutes || 0,
            valueType: '中性',
            description: entry.description || '',
            tags: entry.tags || []
          })
        })
      }

      // 低效活动
      if (memo.wastefulTimeEntries && memo.wastefulTimeEntries.length > 0) {
        memo.wastefulTimeEntries.forEach(entry => {
          activities.push({
            activityName: entry.activity || '未命名活动',
            minutes: entry.minutes || 0,
            valueType: '低效',
            description: entry.description || '',
            tags: entry.tags || []
          })
        })
      }

      console.log(`准备创建${activities.length}条活动记录`)

      // 批量创建活动记录
      const results = []
      for (const activity of activities) {
        const activityData = {
          parent: {
            type: 'database_id',
            database_id: activityDatabaseId
          },
          properties: {
            'Activity Name': {
              title: [{
                text: { content: activity.activityName }
              }]
            },
            'Minutes': {
              number: activity.minutes
            },
            'Value Type': {
              select: { name: activity.valueType }
            },
            'Record': {
              relation: [{
                id: mainRecordId
              }]
            },
            'User ID': {
              rich_text: [{
                text: { content: memo.userId || 'default_user' }
              }]
            },
            'Record Date': {
              date: {
                start: new Date(memo.timestamp).toISOString().split('T')[0]
              }
            }
          }
        }

        if (activity.description) {
          activityData.properties['Description'] = {
            rich_text: [{
              text: { content: activity.description }
            }]
          }
        }

        if (activity.tags && activity.tags.length > 0) {
          activityData.properties['Tags'] = {
            multi_select: activity.tags.map(tag => ({ name: tag }))
          }
        }

        const result = await this.createPage(apiKey, activityDatabaseId, activityData)
        results.push(result)
      }

      const successCount = results.filter(r => r.success).length
      console.log(`活动记录创建完成: 成功${successCount}/${activities.length}`)

      return {
        success: successCount > 0,
        total: activities.length,
        successCount: successCount,
        failedCount: activities.length - successCount
      }
    } catch (error) {
      console.error('创建活动记录异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 同步备忘录到Notion（双表模式）
  async syncMemoToNotionDualTable(apiKey, mainDatabaseId, activityDatabaseId, memo) {
    try {
      console.log('开始双表模式同步备忘录到Notion:', memo.id)

      // 第1步：创建主记录
      const mainRecordResult = await this.createMainRecord(apiKey, mainDatabaseId, memo)

      if (!mainRecordResult.success) {
        return {
          success: false,
          error: '创建主记录失败: ' + mainRecordResult.error
        }
      }

      const mainRecordId = mainRecordResult.mainRecordId

      // 第2步：创建活动记录
      const activityResult = await this.createActivityRecords(
        apiKey,
        activityDatabaseId,
        mainRecordId,
        memo
      )

      if (!activityResult.success) {
        console.warn('活动记录创建失败，但主记录已创建:', activityResult.error)
        return {
          success: true,  // 主记录创建成功就算成功
          mainRecordId: mainRecordId,
          warning: '部分活动记录创建失败: ' + activityResult.error
        }
      }

      console.log('双表同步完成:', {
        mainRecordId,
        activities: activityResult.successCount
      })

      return {
        success: true,
        mainRecordId: mainRecordId,
        activityCount: activityResult.successCount,
        message: `同步成功：主记录1条，活动${activityResult.successCount}条`
      }
    } catch (error) {
      console.error('双表同步异常:', error)
      return {
        success: false,
        error: '双表同步失败: ' + error.message
      }
    }
  }

  // 同步备忘录到Notion（单表模式 - 兼容旧版）
  async syncMemoToNotion(apiKey, databaseId, memo) {
    try {
      console.log('开始单表模式同步备忘录到Notion:', memo)

      // 格式化活动列表为字符串
      const formatActivities = (entries) => {
        if (!entries || entries.length === 0) return ''
        return entries.map(e => `${e.activity}(${e.minutes}分钟)`).join(', ')
      }

      // 计算总分钟数
      const calculateTotalMinutes = (entries) => {
        if (!entries || entries.length === 0) return 0
        return entries.reduce((sum, e) => sum + (e.minutes || 0), 0)
      }

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
                  content: memo.id || `memo_${Date.now()}`
                }
              }
            ]
          },
          'User ID': {
            rich_text: [
              {
                text: {
                  content: memo.userId || 'default_user'
                }
              }
            ]
          },
          'Record Date': {
            date: {
              start: new Date(memo.timestamp).toISOString().split('T')[0]
            }
          },
          'Type': {
            select: {
              name: memo.recordMode || (memo.isPlanning ? 'planning' : 'normal')
            }
          },
          'Is Planning': {
            checkbox: memo.isPlanning || false
          },
          'Sync Status': {
            select: {
              name: 'synced'
            }
          }
        }
      }

      // 如果有时间信息
      if (memo.startTime) {
        pageData.properties['Start Time'] = {
          rich_text: [
            {
              text: {
                content: memo.startTime
              }
            }
          ]
        }
      }

      if (memo.endTime) {
        pageData.properties['End Time'] = {
          rich_text: [
            {
              text: {
                content: memo.endTime
              }
            }
          ]
        }
      }

      // 有价值的活动
      if (memo.valuableContent) {
        pageData.properties['Valuable Content'] = {
          rich_text: [
            {
              text: {
                content: memo.valuableContent
              }
            }
          ]
        }
      }

      if (memo.valuableTimeEntries && memo.valuableTimeEntries.length > 0) {
        pageData.properties['Valuable Activities'] = {
          rich_text: [
            {
              text: {
                content: formatActivities(memo.valuableTimeEntries)
              }
            }
          ]
        }
        pageData.properties['Valuable Minutes'] = {
          number: calculateTotalMinutes(memo.valuableTimeEntries)
        }
      }

      // 中性活动
      if (memo.neutralContent) {
        pageData.properties['Neutral Content'] = {
          rich_text: [
            {
              text: {
                content: memo.neutralContent
              }
            }
          ]
        }
      }

      if (memo.neutralTimeEntries && memo.neutralTimeEntries.length > 0) {
        pageData.properties['Neutral Activities'] = {
          rich_text: [
            {
              text: {
                content: formatActivities(memo.neutralTimeEntries)
              }
            }
          ]
        }
        pageData.properties['Neutral Minutes'] = {
          number: calculateTotalMinutes(memo.neutralTimeEntries)
        }
      }

      // 低效活动
      if (memo.wastefulContent) {
        pageData.properties['Wasteful Content'] = {
          rich_text: [
            {
              text: {
                content: memo.wastefulContent
              }
            }
          ]
        }
      }

      if (memo.wastefulTimeEntries && memo.wastefulTimeEntries.length > 0) {
        pageData.properties['Wasteful Activities'] = {
          rich_text: [
            {
              text: {
                content: formatActivities(memo.wastefulTimeEntries)
              }
            }
          ]
        }
        pageData.properties['Wasteful Minutes'] = {
          number: calculateTotalMinutes(memo.wastefulTimeEntries)
        }
      }

      // 计算总时间
      const totalMinutes =
        calculateTotalMinutes(memo.valuableTimeEntries) +
        calculateTotalMinutes(memo.neutralTimeEntries) +
        calculateTotalMinutes(memo.wastefulTimeEntries)

      if (totalMinutes > 0) {
        pageData.properties['Total Minutes'] = {
          number: totalMinutes
        }
      }

      // 添加标签（如果有）
      if (memo.tags && memo.tags.length > 0) {
        pageData.properties['Tags'] = {
          multi_select: memo.tags.map(tag => ({ name: tag }))
        }
      }

      // 添加目标ID（如果有）
      if (memo.goalId) {
        pageData.properties['Goal ID'] = {
          rich_text: [
            {
              text: {
                content: memo.goalId
              }
            }
          ]
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
            property: 'Record Date',
            direction: 'descending'
          }
        ]
      })

      if (result.success) {
        // 解析活动字符串为数组
        const parseActivities = (activitiesStr) => {
          if (!activitiesStr) return []
          // 格式: "活动1(30分钟), 活动2(15分钟)"
          return activitiesStr.split(', ').map(entry => {
            const match = entry.match(/^(.+)\((\d+)分钟\)$/)
            if (match) {
              return {
                activity: match[1],
                minutes: parseInt(match[2])
              }
            }
            return null
          }).filter(e => e !== null)
        }

        const memos = result.data.results.map(page => {
          const properties = page.properties
          const recordDate = properties['Record Date']?.date?.start

          return {
            id: properties.Name?.title?.[0]?.text?.content || page.id,
            userId: properties['User ID']?.rich_text?.[0]?.text?.content || 'default_user',
            timestamp: recordDate ? new Date(recordDate).getTime() : new Date(page.created_time).getTime(),
            startTime: properties['Start Time']?.rich_text?.[0]?.text?.content || '',
            endTime: properties['End Time']?.rich_text?.[0]?.text?.content || '',

            // 有价值的活动
            valuableContent: properties['Valuable Content']?.rich_text?.[0]?.text?.content || '',
            valuableTimeEntries: parseActivities(properties['Valuable Activities']?.rich_text?.[0]?.text?.content),

            // 中性活动
            neutralContent: properties['Neutral Content']?.rich_text?.[0]?.text?.content || '',
            neutralTimeEntries: parseActivities(properties['Neutral Activities']?.rich_text?.[0]?.text?.content),

            // 低效活动
            wastefulContent: properties['Wasteful Content']?.rich_text?.[0]?.text?.content || '',
            wastefulTimeEntries: parseActivities(properties['Wasteful Activities']?.rich_text?.[0]?.text?.content),

            recordMode: properties.Type?.select?.name || 'normal',
            isPlanning: properties['Is Planning']?.checkbox || false,
            tags: properties.Tags?.multi_select?.map(tag => tag.name) || [],
            goalId: properties['Goal ID']?.rich_text?.[0]?.text?.content || '',

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

  // 删除备忘录从Notion（包含级联删除Activity Details）
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

      // 1. 级联删除关联的Activity Details（如果有配置）
      if (memo.activityDatabaseId) {
        console.log('查询关联的Activity Details...')
        const queryResult = await this.callApi('/databases/' + memo.activityDatabaseId + '/query', {
          apiKey: apiKey,
          method: 'POST',
          data: {
            filter: {
              property: 'Record',
              relation: {
                contains: memo.notionPageId
              }
            }
          }
        })

        if (queryResult.success && queryResult.data && queryResult.data.results) {
          const activities = queryResult.data.results
          console.log(`找到 ${activities.length} 条关联的Activity Details，开始删除...`)

          // 批量删除所有Activity Details
          for (const activity of activities) {
            await this.deletePage(apiKey, activity.id)
            console.log('已删除Activity Detail:', activity.id)
          }
        } else {
          console.log('未找到关联的Activity Details或查询失败')
        }
      } else {
        console.log('未配置activityDatabaseId，跳过Activity Details删除')
      }

      // 2. 删除Main Record
      console.log('删除Main Record:', memo.notionPageId)
      const result = await this.deletePage(apiKey, memo.notionPageId)

      console.log('删除Notion页面结果:', result)

      if (result.success) {
        return {
          success: true,
          message: '已从Notion删除（包含关联的活动明细）'
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

  // 同步目标到Notion
  async syncGoalToNotion(apiKey, goalsDatabaseId, goal) {
    try {
      console.log('开始同步目标到Notion...', goal.id)

      const pageData = {
        parent: {
          type: 'database_id',
          database_id: goalsDatabaseId
        },
        properties: {
          'Goal Name': {
            title: [{
              text: { content: goal.title || '未命名目标' }
            }]
          },
          'Category': {
            select: { name: goal.category || '月度目标' }
          },
          'Status': {
            select: { name: this.mapGoalStatus(goal.status) }
          },
          'Progress': {
            number: (goal.progress || 0) / 100
          },
          'Priority': {
            select: { name: goal.priority || '中' }
          }
        }
      }

      // 添加描述
      if (goal.description) {
        pageData.properties['Description'] = {
          rich_text: [{
            text: { content: goal.description.substring(0, 2000) }
          }]
        }
      }

      // 添加开始日期
      if (goal.startDate) {
        pageData.properties['Start Date'] = {
          date: {
            start: new Date(goal.startDate).toISOString().split('T')[0]
          }
        }
      }

      // 添加目标日期
      if (goal.targetDate) {
        pageData.properties['Target Date'] = {
          date: {
            start: goal.targetDate
          }
        }
      }

      // 添加标签
      if (goal.tags && goal.tags.length > 0) {
        pageData.properties['Tags'] = {
          multi_select: goal.tags.map(tag => ({ name: tag }))
        }
      }

      const result = await this.createPageGeneric(pageData, apiKey)

      if (result.success) {
        return {
          success: true,
          pageId: result.pageId,
          message: '目标同步成功'
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('同步目标到Notion异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 同步待办到Notion
  async syncTodoToNotion(apiKey, todosDatabaseId, todo, goals = []) {
    try {
      console.log('开始同步待办到Notion...', todo.id)

      const pageData = {
        parent: {
          type: 'database_id',
          database_id: todosDatabaseId
        },
        properties: {
          'Todo Name': {
            title: [{
              text: { content: todo.title || '未命名待办' }
            }]
          },
          'Todo Type': {
            select: { name: todo.type || '临时待办' }
          },
          'Status': {
            select: { name: this.mapTodoStatus(todo.status) }
          },
          'Priority': {
            select: { name: todo.priority || '重要不紧急' }
          },
          'Scope': {
            select: { name: todo.scope || '近期' }
          }
        }
      }

      // 添加描述
      if (todo.description) {
        pageData.properties['Description'] = {
          rich_text: [{
            text: { content: todo.description.substring(0, 2000) }
          }]
        }
      }

      // 添加截止日期
      if (todo.dueDate) {
        pageData.properties['Due Date'] = {
          date: {
            start: todo.dueDate
          }
        }
      }

      // 添加预计时间
      if (todo.estimatedMinutes) {
        pageData.properties['Estimated Minutes'] = {
          number: todo.estimatedMinutes
        }
      }

      // 添加标签
      if (todo.tags && todo.tags.length > 0) {
        pageData.properties['Tags'] = {
          multi_select: todo.tags.map(tag => ({ name: tag }))
        }
      }

      // 添加关联目标（如果有）
      if (todo.relatedGoalId && goals.length > 0) {
        const relatedGoal = goals.find(g => g.id === todo.relatedGoalId)
        if (relatedGoal && relatedGoal.notionPageId) {
          pageData.properties['Related Goal'] = {
            relation: [{
              id: relatedGoal.notionPageId
            }]
          }
        }
      }

      const result = await this.createPageGeneric(pageData, apiKey)

      if (result.success) {
        return {
          success: true,
          pageId: result.pageId,
          message: '待办同步成功'
        }
      } else {
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('同步待办到Notion异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 映射目标状态到Notion
  mapGoalStatus(status) {
    const statusMap = {
      'active': '进行中',
      'completed': '已完成',
      'paused': '已暂停',
      'cancelled': '已取消'
    }
    return statusMap[status] || '未开始'
  }

  // 映射待办状态到Notion
  mapTodoStatus(status) {
    const statusMap = {
      '待办': '待办',
      '进行中': '进行中',
      '已完成': '已完成',
      '已取消': '已取消'
    }
    return statusMap[status] || '待办'
  }

  /**
   * 诊断数据库结构 - 获取数据库的所有字段信息
   * @param {string} apiKey - Notion API密钥
   * @param {string} databaseId - 数据库ID
   * @returns {Promise} 包含数据库结构信息的对象
   */
  async getDatabaseSchema(apiKey, databaseId) {
    try {
      console.log('正在获取数据库结构:', databaseId)

      const result = await this.callApi(`/databases/${databaseId}`, {
        apiKey: apiKey,
        method: 'GET'
      })

      if (!result.success) {
        return {
          success: false,
          error: '获取数据库信息失败: ' + result.error
        }
      }

      const database = result.data
      const properties = database.properties || {}

      // 提取字段名和类型
      const fields = Object.keys(properties).map(name => ({
        name: name,
        type: properties[name].type,
        id: properties[name].id
      }))

      return {
        success: true,
        databaseId: databaseId,
        title: database.title?.[0]?.text?.content || '(无标题)',
        fields: fields,
        fieldNames: Object.keys(properties),
        totalFields: fields.length
      }
    } catch (error) {
      console.error('获取数据库结构异常:', error)
      return {
        success: false,
        error: '获取数据库结构失败: ' + error.message
      }
    }
  }

  /**
   * 查询主记录表（前端直接调用，绕过云函数）
   * @param {string} apiKey - Notion API Key
   * @param {string} databaseId - 主记录表数据库ID
   * @param {string} userEmail - 用户邮箱
   * @param {object} options - 查询选项（limit, startDate, endDate等）
   */
  async queryMainRecords(apiKey, databaseId, userEmail, options = {}) {
    try {
      console.log('前端直接查询主记录表:', databaseId, '用户邮箱:', userEmail)

      // 构建过滤条件
      const filter = {
        property: 'User ID',
        rich_text: {
          equals: userEmail
        }
      }

      // 构建查询参数
      const queryData = {
        filter: filter,
        sorts: [
          {
            property: 'Record Date',
            direction: 'descending'
          }
        ]
      }

      // 添加分页限制
      if (options.limit) {
        queryData.page_size = options.limit
      }

      console.log('🔍 Notion查询参数:', JSON.stringify(queryData, null, 2))

      const result = await this.queryDatabase(apiKey, databaseId, queryData)

      console.log('📥 Notion查询结果:', {
        success: result.success,
        error: result.error,
        resultCount: result.data?.results?.length || 0
      })

      if (!result.success) {
        throw new Error(result.error || '查询主记录表失败')
      }

      // 解析结果（兼容多种字段名）
      const records = result.data.results.map(page => {
        const props = page.properties

        // 获取类型字段（支持不同的字段名）
        let recordType = '日常记录'
        if (props['Type']?.select?.name) {
          // 如果Type是planning/normal，需要转换
          const typeValue = props['Type'].select.name
          recordType = typeValue === 'planning' ? '明日规划' : '日常记录'
        } else if (props['Record Type']?.select?.name) {
          recordType = props['Record Type'].select.name
        }

        return {
          id: page.id,
          title: props['Name']?.title?.[0]?.text?.content || props['Title']?.title?.[0]?.text?.content || '',
          content: props['Summary']?.rich_text?.[0]?.text?.content || props['Content']?.rich_text?.[0]?.text?.content || '',
          date: props['Record Date']?.date?.start || props['Date']?.date?.start || '',
          recordType: recordType,
          timePeriod: props['Time Period']?.select?.name || '',
          tags: props['Tags']?.multi_select?.map(tag => tag.name) || [],
          userId: props['User ID']?.rich_text?.[0]?.text?.content || ''
        }
      })

      console.log(`✅ 查询到 ${records.length} 条主记录`)

      // 🔍 如果没有找到记录，尝试诊断查询（获取前5条记录看看数据库是否有数据）
      if (records.length === 0) {
        console.log('⚠️ 未找到匹配的记录，执行诊断查询...')
        const diagnosticQuery = {
          sorts: [{ property: 'Record Date', direction: 'descending' }],
          page_size: 5
        }
        const diagnosticResult = await this.queryDatabase(apiKey, databaseId, diagnosticQuery)

        if (diagnosticResult.success && diagnosticResult.data.results.length > 0) {
          console.log('🔍 数据库中存在记录，但不匹配当前用户邮箱')
          console.log('🔍 数据库中的User ID示例:')
          diagnosticResult.data.results.forEach((page, index) => {
            const storedUserId = page.properties['User ID']?.rich_text?.[0]?.text?.content || '(无User ID)'
            console.log(`  ${index + 1}. ${storedUserId}`)
          })
          console.log('🔍 当前查询的邮箱:', userEmail)
          console.log('💡 提示: User ID不匹配可能的原因:')
          console.log('   1. 记录是用其他邮箱创建的')
          console.log('   2. User ID字段格式不一致（空格、大小写等）')
        } else {
          console.log('🔍 数据库为空，没有任何记录')
        }
      }

      return {
        success: true,
        records: records,
        total: result.data.results.length
      }
    } catch (error) {
      console.error('查询主记录表异常:', error)
      return {
        success: false,
        error: '查询主记录表失败: ' + error.message
      }
    }
  }

  /**
   * 查询活动明细表（前端直接调用，绕过云函数）
   * @param {string} apiKey - Notion API Key
   * @param {string} databaseId - 活动明细表数据库ID
   * @param {string} userEmail - 用户邮箱
   * @param {object} options - 查询选项
   */
  async queryActivities(apiKey, databaseId, userEmail, options = {}) {
    try {
      console.log('前端直接查询活动明细表:', databaseId, '用户邮箱:', userEmail)

      // 构建过滤条件
      const filter = {
        property: 'User ID',
        rich_text: {
          equals: userEmail
        }
      }

      // 构建查询参数
      const queryData = {
        filter: filter,
        sorts: [
          {
            property: 'Record Date',  // 使用实际存在的字段
            direction: 'descending'
          }
        ]
      }

      // 添加分页限制
      if (options.limit) {
        queryData.page_size = options.limit
      }

      const result = await this.queryDatabase(apiKey, databaseId, queryData)

      if (!result.success) {
        throw new Error(result.error || '查询活动明细表失败')
      }

      // 解析结果（使用实际的字段名）
      const activities = result.data.results.map(page => {
        const props = page.properties
        return {
          id: page.id,
          name: props['Activity Name']?.title?.[0]?.text?.content || '',
          description: props['Description']?.rich_text?.[0]?.text?.content || '',
          startTime: props['Record Date']?.date?.start || '',  // 使用Record Date作为startTime
          endTime: props['Record Date']?.date?.start || '',    // 同样使用Record Date
          duration: props['Minutes']?.number || 0,              // 使用Minutes字段
          activityType: props['Value Type']?.select?.name || '', // 使用Value Type字段
          tags: props['Tags']?.multi_select?.map(tag => tag.name) || [],
          userId: props['User ID']?.rich_text?.[0]?.text?.content || ''
        }
      })

      console.log(`查询到 ${activities.length} 条活动明细`)

      return {
        success: true,
        activities: activities,
        total: result.data.results.length
      }
    } catch (error) {
      console.error('查询活动明细表异常:', error)
      return {
        success: false,
        error: '查询活动明细表失败: ' + error.message
      }
    }
  }
}

// 创建全局实例
const notionApiService = new NotionApiService()

module.exports = notionApiService