/**
 * Notion 七数据库创建器
 * 完整实现七数据库架构的创建
 * 1. Goals（目标库）
 * 2. Todos（待办库）
 * 3. Main Records（主记录表）
 * 4. Activity Details（活动明细表）
 * 5. Daily Status（每日状态库）
 * 6. Happy Things（开心库）
 * 7. Quotes（箴言库）
 */

const notionApiService = require('./notionApiService.js')

class NotionQuadDatabaseCreator {
  constructor(apiKey, parentPageId) {
    this.apiKey = apiKey
    this.parentPageId = parentPageId
    this.service = notionApiService
  }

  /**
   * 创建完整的七数据库架构
   */
  async createAll() {
    try {
      console.log('========================================')
      console.log('开始创建Notion七数据库架构')
      console.log('========================================')

      // Step 1: 创建目标库（Goals）
      console.log('\n[1/7] 创建目标库...')
      const goalsDb = await this.createGoalsDatabase()
      console.log('✅ 目标库创建成功:', goalsDb.id)

      // Step 2: 创建待办库（Todos），关联目标库
      console.log('\n[2/7] 创建待办库...')
      const todosDb = await this.createTodosDatabase(goalsDb.id)
      console.log('✅ 待办库创建成功:', todosDb.id)

      // Step 3: 创建主记录表（Main Records），关联待办库
      console.log('\n[3/7] 创建主记录表...')
      const mainDb = await this.createMainRecordsDatabase(todosDb.id)
      console.log('✅ 主记录表创建成功:', mainDb.id)

      // Step 4: 创建活动明细表（Activity Details），关联所有表
      console.log('\n[4/7] 创建活动明细表...')
      const activityDb = await this.createActivityDetailsDatabase(
        goalsDb.id,
        todosDb.id,
        mainDb.id
      )
      console.log('✅ 活动明细表创建成功:', activityDb.id)

      // Step 5: 创建每日状态库（Daily Status）- 独立数据库
      console.log('\n[5/7] 创建每日状态库...')
      const dailyStatusDb = await this.createDailyStatusDatabase()
      console.log('✅ 每日状态库创建成功:', dailyStatusDb.id)

      // Step 6: 创建开心库（Happy Things）- 独立数据库
      console.log('\n[6/7] 创建开心库...')
      const happyThingsDb = await this.createHappyThingsDatabase()
      console.log('✅ 开心库创建成功:', happyThingsDb.id)

      // Step 7: 创建箴言库（Quotes）- 独立数据库
      console.log('\n[7/7] 创建箴言库...')
      const quotesDb = await this.createQuotesDatabase()
      console.log('✅ 箴言库创建成功:', quotesDb.id)

      // Step 8: 更新目标库的自关联（Parent/Sub Goals）
      console.log('\n[8/9] 更新目标库自关联关系...')
      await this.updateGoalsSelfRelation(goalsDb.id)
      console.log('✅ 自关联更新成功')

      // Step 9: 更新待办库的自关联（Blocking/Blocked By）
      console.log('\n[9/9] 更新待办库自关联关系...')
      await this.updateTodosSelfRelation(todosDb.id)
      console.log('✅ 自关联更新成功')

      console.log('\n========================================')
      console.log('✅ 七数据库架构创建完成！')
      console.log('========================================')
      console.log('目标库ID:', goalsDb.id)
      console.log('待办库ID:', todosDb.id)
      console.log('主记录表ID:', mainDb.id)
      console.log('活动明细表ID:', activityDb.id)
      console.log('每日状态库ID:', dailyStatusDb.id)
      console.log('开心库ID:', happyThingsDb.id)
      console.log('箴言库ID:', quotesDb.id)

      return {
        success: true,
        databases: {
          goals: goalsDb.id,
          todos: todosDb.id,
          mainRecords: mainDb.id,
          activityDetails: activityDb.id,
          dailyStatus: dailyStatusDb.id,
          happyThings: happyThingsDb.id,
          quotes: quotesDb.id
        }
      }
    } catch (error) {
      console.error('❌ 创建失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 1. 创建目标库（Goals Database）
   */
  async createGoalsDatabase() {
    const schema = {
      parent: { page_id: this.parentPageId },
      title: [{ text: { content: '🎯 Goals - 目标库' } }],
      properties: {
        'Name': { title: {} },
        'Description': { rich_text: {} },
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
        'Type': {
          select: {
            options: [
              { name: '事业', color: 'blue' },
              { name: '健康', color: 'green' },
              { name: '财务', color: 'yellow' },
              { name: '学习', color: 'purple' },
              { name: '人际', color: 'pink' },
              { name: '兴趣', color: 'orange' },
              { name: '家庭', color: 'red' }
            ]
          }
        },
        'Start Date': { date: {} },
        'Target Date': { date: {} },
        'Actual Completion Date': { date: {} },
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
        'Progress': { number: { format: 'percent' } },
        'Is Quantifiable': { checkbox: {} },
        'Target Value': { number: {} },
        'Current Value': { number: {} },
        'Unit': { rich_text: {} },
        'Priority': {
          select: {
            options: [
              { name: '高', color: 'red' },
              { name: '中', color: 'yellow' },
              { name: '低', color: 'gray' }
            ]
          }
        },
        'Importance': {
          select: {
            options: [
              { name: '核心', color: 'red' },
              { name: '重要', color: 'yellow' },
              { name: '辅助', color: 'gray' }
            ]
          }
        },
        'User ID': { rich_text: {} },
        'Tags': { multi_select: { options: [] } },
        'Notes': { rich_text: {} }
      }
    }

    const result = await this.service.callApi('/databases', {
      apiKey: this.apiKey,
      method: 'POST',
      data: schema
    })

    if (!result.success) {
      throw new Error('创建目标库失败: ' + result.error)
    }

    return result.data
  }

  /**
   * 2. 创建待办库（Todos Database）
   */
  async createTodosDatabase(goalsDatabaseId) {
    const schema = {
      parent: { page_id: this.parentPageId },
      title: [{ text: { content: '✅ Todos - 待办事项库' } }],
      properties: {
        'Title': { title: {} },
        'Description': { rich_text: {} },
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
        'Category': {
          select: {
            options: [
              { name: '工作', color: 'blue' },
              { name: '学习', color: 'purple' },
              { name: '生活', color: 'green' },
              { name: '健康', color: 'red' },
              { name: '社交', color: 'pink' },
              { name: '杂事', color: 'gray' }
            ]
          }
        },
        'Due Date': { date: {} },
        'Planned Date': { date: {} },
        'Start Time': { rich_text: {} },
        'Estimated Duration': { number: {} },
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
        'Energy Level': {
          select: {
            options: [
              { name: '高精力', color: 'red' },
              { name: '中精力', color: 'yellow' },
              { name: '低精力', color: 'gray' }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              { name: '待办', color: 'gray' },
              { name: '进行中', color: 'blue' },
              { name: '已完成', color: 'green' },
              { name: '已取消', color: 'red' },
              { name: '延期', color: 'yellow' }
            ]
          }
        },
        'Is Completed': { checkbox: {} },
        'Completion Progress': { number: { format: 'percent' } },
        'Related Goal': {
          relation: {
            database_id: goalsDatabaseId
          }
        },
        'Recurrence': {
          select: {
            options: [
              { name: '无', color: 'gray' },
              { name: '每日', color: 'blue' },
              { name: '每周', color: 'green' },
              { name: '每月', color: 'yellow' },
              { name: '自定义', color: 'purple' }
            ]
          }
        },
        'Reminder': { checkbox: {} },
        'Reminder Time': { date: {} },
        'User ID': { rich_text: {} },
        'Tags': { multi_select: { options: [] } },
        'Difficulty': {
          select: {
            options: [
              { name: '简单', color: 'green' },
              { name: '中等', color: 'yellow' },
              { name: '困难', color: 'red' }
            ]
          }
        }
      }
    }

    const result = await this.service.callApi('/databases', {
      apiKey: this.apiKey,
      method: 'POST',
      data: schema
    })

    if (!result.success) {
      throw new Error('创建待办库失败: ' + result.error)
    }

    return result.data
  }

  /**
   * 3. 创建主记录表（Main Records Database）
   */
  async createMainRecordsDatabase(todosDatabaseId) {
    const schema = {
      parent: { page_id: this.parentPageId },
      title: [{ text: { content: '📝 Main Records - 主记录表' } }],
      properties: {
        'Title': { title: {} },
        'Content': { rich_text: {} },
        'Date': { date: {} },
        'Record Type': {
          select: {
            options: [
              { name: '日常记录', color: 'blue' },
              { name: '明日规划', color: 'orange' },
              { name: '每日总结', color: 'purple' },
              { name: '灵感记录', color: 'yellow' }
            ]
          }
        },
        'Time Period': {
          select: {
            options: [
              { name: '早晨', color: 'orange' },
              { name: '上午', color: 'yellow' },
              { name: '中午', color: 'red' },
              { name: '下午', color: 'blue' },
              { name: '晚上', color: 'purple' },
              { name: '规划', color: 'green' }
            ]
          }
        },
        'Valuable Activities': { rich_text: {} },
        'Neutral Activities': { rich_text: {} },
        'Wasteful Activities': { rich_text: {} },
        'Value Score': { number: {} },
        'Related Todos': {
          relation: {
            database_id: todosDatabaseId
          }
        },
        'User ID': { rich_text: {} },
        'Tags': { multi_select: { options: [] } },
        'Mood': {
          select: {
            options: [
              { name: '😊 开心', color: 'green' },
              { name: '😌 平静', color: 'blue' },
              { name: '😕 迷茫', color: 'gray' },
              { name: '😔 沮丧', color: 'red' },
              { name: '💪 充满动力', color: 'orange' }
            ]
          }
        }
      }
    }

    const result = await this.service.callApi('/databases', {
      apiKey: this.apiKey,
      method: 'POST',
      data: schema
    })

    if (!result.success) {
      throw new Error('创建主记录表失败: ' + result.error)
    }

    return result.data
  }

  /**
   * 4. 创建活动明细表（Activity Details Database）
   */
  async createActivityDetailsDatabase(goalsDatabaseId, todosDatabaseId, mainRecordsDatabaseId) {
    const schema = {
      parent: { page_id: this.parentPageId },
      title: [{ text: { content: '⏱️ Activity Details - 活动明细表' } }],
      properties: {
        'Name': { title: {} },
        'Description': { rich_text: {} },
        'Start Time': { date: {} },
        'End Time': { date: {} },
        'Duration': { number: {} },
        'Activity Type': {
          select: {
            options: [
              { name: '工作', color: 'blue' },
              { name: '学习', color: 'purple' },
              { name: '运动', color: 'red' },
              { name: '休息', color: 'green' },
              { name: '社交', color: 'pink' },
              { name: '娱乐', color: 'yellow' },
              { name: '杂事', color: 'gray' }
            ]
          }
        },
        'Contribution Type': {
          select: {
            options: [
              { name: '完成待办', color: 'green' },
              { name: '推进目标', color: 'blue' },
              { name: '学习提升', color: 'purple' },
              { name: '休息恢复', color: 'yellow' }
            ]
          }
        },
        'Value Rating': {
          select: {
            options: [
              { name: '高价值', color: 'green' },
              { name: '中等价值', color: 'yellow' },
              { name: '低价值', color: 'red' }
            ]
          }
        },
        'Related Goal': {
          relation: {
            database_id: goalsDatabaseId
          }
        },
        'Related Todo': {
          relation: {
            database_id: todosDatabaseId
          }
        },
        'Related Main Record': {
          relation: {
            database_id: mainRecordsDatabaseId
          }
        },
        'User ID': { rich_text: {} },
        'Tags': { multi_select: { options: [] } },
        'Notes': { rich_text: {} }
      }
    }

    const result = await this.service.callApi('/databases', {
      apiKey: this.apiKey,
      method: 'POST',
      data: schema
    })

    if (!result.success) {
      throw new Error('创建活动明细表失败: ' + result.error)
    }

    return result.data
  }

  /**
   * 更新目标库的自关联关系（Parent Goal / Sub Goals）
   */
  async updateGoalsSelfRelation(goalsDatabaseId) {
    // Notion API暂时不支持通过API创建双向自关联
    // 需要在Notion界面手动创建这两个属性
    console.log('⚠️ 注意：目标库的Parent Goal和Sub Goals需要在Notion界面手动创建')
    console.log('   1. 打开目标库')
    console.log('   2. 添加Relation属性 "Sub Goals"，关联到自身数据库')
    console.log('   3. 添加Relation属性 "Parent Goal"，关联到自身数据库')
    return true
  }

  /**
   * 更新待办库的自关联关系（Blocking Todos / Blocked By）
   */
  async updateTodosSelfRelation(todosDatabaseId) {
    console.log('⚠️ 注意：待办库的Blocking Todos和Blocked By需要在Notion界面手动创建')
    console.log('   1. 打开待办库')
    console.log('   2. 添加Relation属性 "Blocking Todos"，关联到自身数据库')
    console.log('   3. 添加Relation属性 "Blocked By"，关联到自身数据库')
    return true
  }

  /**
   * 5. 创建每日状态库（Daily Status Database）
   */
  async createDailyStatusDatabase() {
    const schema = {
      parent: { page_id: this.parentPageId },
      title: [{ text: { content: '📊 语寄心声 - 每日状态库 (Daily Status)' } }],
      properties: {
        'Date': { title: {} },
        'Full Date': { date: {} },
        'Mood': {
          select: {
            options: [
              { name: '😊 开心', color: 'green' },
              { name: '💪 充满动力', color: 'blue' },
              { name: '😌 平静', color: 'default' },
              { name: '😕 迷茫', color: 'gray' },
              { name: '😔 沮丧', color: 'brown' },
              { name: '😰 焦虑', color: 'orange' },
              { name: '😴 疲惫', color: 'yellow' },
              { name: '😤 压力大', color: 'red' }
            ]
          }
        },
        'Energy Level': {
          select: {
            options: [
              { name: '🔋 充沛', color: 'green' },
              { name: '⚡ 良好', color: 'blue' },
              { name: '🔌 一般', color: 'yellow' },
              { name: '🪫 疲惫', color: 'orange' },
              { name: '💤 耗尽', color: 'red' }
            ]
          }
        },
        'Stress Level': {
          select: {
            options: [
              { name: '😌 无压力', color: 'green' },
              { name: '🙂 轻微', color: 'blue' },
              { name: '😐 中等', color: 'yellow' },
              { name: '😰 较高', color: 'orange' },
              { name: '😫 非常高', color: 'red' }
            ]
          }
        },
        'Wake Up Time': { rich_text: {} },
        'Bed Time': { rich_text: {} },
        'Sleep Hours': { number: { format: 'number' } },
        'Sleep Quality': {
          select: {
            options: [
              { name: '😴 很好', color: 'green' },
              { name: '🙂 良好', color: 'blue' },
              { name: '😐 一般', color: 'yellow' },
              { name: '😕 较差', color: 'orange' },
              { name: '😣 很差', color: 'red' }
            ]
          }
        },
        'Weight': { number: { format: 'number' } },
        'Water Intake': { number: { format: 'number' } },
        'Exercise Duration': { number: { format: 'number' } },
        'Exercise Type': {
          multi_select: {
            options: [
              { name: '🏃 跑步', color: 'blue' },
              { name: '🚴 骑行', color: 'green' },
              { name: '🏊 游泳', color: 'purple' },
              { name: '🏋️ 力量训练', color: 'red' },
              { name: '🧘 瑜伽', color: 'pink' },
              { name: '🚶 散步', color: 'default' }
            ]
          }
        },
        'Meals': {
          multi_select: {
            options: [
              { name: '🌅 早餐', color: 'yellow' },
              { name: '☀️ 午餐', color: 'orange' },
              { name: '🌙 晚餐', color: 'purple' },
              { name: '🍎 加餐', color: 'green' }
            ]
          }
        },
        'Diet Notes': { rich_text: {} },
        'Meditation': { checkbox: {} },
        'Meditation Duration': { number: { format: 'number' } },
        'Reading': { checkbox: {} },
        'Reading Duration': { number: { format: 'number' } },
        'Notes': { rich_text: {} },
        'Highlights': { rich_text: {} },
        'User ID': { rich_text: {} }
      }
    }

    const result = await this.service.callApi('/databases', {
      apiKey: this.apiKey,
      method: 'POST',
      data: schema
    })

    if (!result.success) {
      throw new Error('创建每日状态库失败: ' + result.error)
    }

    return result.data
  }

  /**
   * 创建开心库（Happy Things Database）
   */
  async createHappyThingsDatabase() {
    const { HappyThingsDatabaseSchema } = require('./notionDatabaseSetup.js')

    const schema = {
      parent: { page_id: this.parentPageId },
      title: [{ text: { content: HappyThingsDatabaseSchema.title } }],
      properties: HappyThingsDatabaseSchema.properties
    }

    const result = await this.service.callApi('/databases', {
      apiKey: this.apiKey,
      method: 'POST',
      data: schema
    })

    if (!result.success) {
      throw new Error('创建开心库失败: ' + result.error)
    }

    return result.data
  }

  /**
   * 创建箴言库（Quotes Database）
   */
  async createQuotesDatabase() {
    const { QuotesDatabaseSchema } = require('./notionDatabaseSetup.js')

    const schema = {
      parent: { page_id: this.parentPageId },
      title: [{ text: { content: QuotesDatabaseSchema.title } }],
      properties: QuotesDatabaseSchema.properties
    }

    const result = await this.service.callApi('/databases', {
      apiKey: this.apiKey,
      method: 'POST',
      data: schema
    })

    if (!result.success) {
      throw new Error('创建箴言库失败: ' + result.error)
    }

    return result.data
  }
}

/**
 * 快速创建七数据库（控制台调用）
 */
async function createQuadDatabases(apiKey, parentPageId) {
  const creator = new NotionQuadDatabaseCreator(apiKey, parentPageId)
  return await creator.createAll()
}

module.exports = {
  NotionQuadDatabaseCreator,
  createQuadDatabases
}
