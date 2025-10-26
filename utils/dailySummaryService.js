/**
 * 今日总结服务
 * 负责收集今日数据并调用AI生成总结
 */

const notionApiService = require('./notionApiService.js')
const userManager = require('./userManager.js')
const { generateDailySummaryPrompt, generateQuickSummaryPrompt } = require('./dailySummaryPrompt.js')

/**
 * 获取今日完整数据
 * @returns {Promise<Object>} 今日数据对象
 */
async function getTodayFullData() {
  try {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('用户未登录')
    }

    const notionConfig = currentUser.notionConfig
    if (!notionConfig || !notionConfig.apiKey) {
      throw new Error('Notion未配置')
    }

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    console.log('📅 获取今日数据:', {
      start: todayStart.toISOString(),
      end: todayEnd.toISOString()
    })

    // 1. 获取今日主记录
    const mainDatabaseId = notionConfig.databases?.mainRecords || notionConfig.mainDatabaseId
    const mainRecordsResult = await notionApiService.queryMainRecords(
      notionConfig.apiKey,
      mainDatabaseId,
      currentUser.email,
      {}
    )

    if (!mainRecordsResult.success) {
      throw new Error('获取主记录失败: ' + mainRecordsResult.error)
    }

    // 筛选今日记录
    const todayMainRecords = mainRecordsResult.records.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate >= todayStart && recordDate < todayEnd
    }).sort((a, b) => {
      // 按时间升序排序
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    console.log('📋 今日主记录数量:', todayMainRecords.length)

    // 2. 获取今日活动明细
    const activityDatabaseId = notionConfig.databases?.activityDetails || notionConfig.activityDatabaseId
    const activitiesResult = await notionApiService.queryActivities(
      notionConfig.apiKey,
      activityDatabaseId,
      currentUser.email,
      {}
    )

    if (!activitiesResult.success) {
      throw new Error('获取活动明细失败: ' + activitiesResult.error)
    }

    // 筛选今日活动（通过关联的主记录ID）
    const todayRecordIds = new Set(todayMainRecords.map(r => r.id))
    const todayActivities = activitiesResult.activities.filter(activity => {
      return todayRecordIds.has(activity.relatedMainRecordId)
    }).sort((a, b) => {
      // 如果有具体时间，按时间排序；否则按创建顺序
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime)
      }
      return 0
    })

    console.log('⏱️ 今日活动明细数量:', todayActivities.length)

    // 3. 获取关联的目标和待办信息（可选）
    const goalIds = new Set()
    const todoIds = new Set()
    todayActivities.forEach(act => {
      if (act.relatedGoalId) goalIds.add(act.relatedGoalId)
      if (act.relatedTodoId) todoIds.add(act.relatedTodoId)
    })

    // TODO: 如果需要，可以批量获取目标和待办的详细信息
    // 现在先使用ID作为标识

    // 4. 计算统计数据
    const stats = calculateDailyStats(todayActivities)

    console.log('📊 今日统计数据:', stats)

    return {
      mainRecords: todayMainRecords.map(record => ({
        id: record.id,
        content: record.content,
        timestamp: new Date(record.date).getTime(),
        recordType: record.recordType,
        startTime: record.startTime,
        endTime: record.endTime,
        title: record.title
      })),
      activities: todayActivities.map(activity => ({
        name: activity.name,
        duration: activity.duration,
        activityType: activity.activityType,
        startTime: activity.startTime,
        endTime: activity.endTime,
        relatedGoalId: activity.relatedGoalId,
        relatedTodoId: activity.relatedTodoId
      })),
      stats: stats,
      date: today
    }
  } catch (error) {
    console.error('❌ 获取今日数据失败:', error)
    throw error
  }
}

/**
 * 计算今日统计数据
 */
function calculateDailyStats(activities) {
  let totalMinutes = 0
  let valuableMinutes = 0
  let neutralMinutes = 0
  let wastefulMinutes = 0

  activities.forEach(activity => {
    const duration = activity.duration || 0
    totalMinutes += duration

    const type = activity.activityType || ''
    if (type.includes('有价值') || type === 'valuable') {
      valuableMinutes += duration
    } else if (type.includes('低效') || type === 'wasteful') {
      wastefulMinutes += duration
    } else {
      neutralMinutes += duration
    }
  })

  return {
    totalMinutes,
    valuableMinutes,
    neutralMinutes,
    wastefulMinutes,
    activityCount: activities.length
  }
}

/**
 * 生成今日总结
 * @param {string} summaryType - 'full' | 'quick'
 * @returns {Promise<Object>} { success, summary, prompt, data }
 */
async function generateDailySummary(summaryType = 'full') {
  try {
    console.log('🤖 开始生成今日总结，类型:', summaryType)

    // 1. 获取今日数据
    const todayData = await getTodayFullData()

    if (todayData.activities.length === 0) {
      return {
        success: false,
        error: '今日暂无活动记录，无法生成总结'
      }
    }

    // 2. 生成提示词
    const prompt = summaryType === 'quick'
      ? generateQuickSummaryPrompt(todayData)
      : generateDailySummaryPrompt(todayData)

    console.log('📝 生成的提示词长度:', prompt.length)

    // 3. 调用AI生成总结
    // TODO: 这里需要集成实际的AI服务（豆包、通义千问等）
    // 现在先返回提示词供用户查看
    return {
      success: true,
      summary: null, // AI生成的总结会放在这里
      prompt: prompt,
      data: todayData,
      message: '提示词已生成，待集成AI服务'
    }
  } catch (error) {
    console.error('❌ 生成今日总结失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 保存总结到Notion（作为一条特殊的记录）
 */
async function saveSummaryToNotion(summary) {
  try {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('用户未登录')
    }

    const notionConfig = currentUser.notionConfig
    const mainDatabaseId = notionConfig.databases?.mainRecords || notionConfig.mainDatabaseId

    // 创建一条"今日总结"类型的记录
    const pageData = {
      parent: { database_id: mainDatabaseId },
      properties: {
        'Title': {  // ✅ 修正：Name → Title
          title: [{ text: { content: `📊 今日总结 - ${new Date().toLocaleDateString()}` } }]
        },
        'Content': {  // ✅ 修正：Summary → Content
          rich_text: [{ text: { content: summary } }]
        },
        'Date': {  // ✅ 修正：Record Date → Date
          date: { start: new Date().toISOString().split('T')[0] }
        },
        'Record Type': {
          select: { name: '每日总结' }  // ✅ 修正：今日总结 → 每日总结（与schema一致）
        },
        'User ID': {
          rich_text: [{ text: { content: currentUser.email } }]
        }
      }
    }

    const result = await notionApiService.createPageGeneric(pageData, notionConfig.apiKey)

    if (result.success) {
      console.log('✅ 总结已保存到Notion')
      return { success: true, pageId: result.pageId }
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('❌ 保存总结失败:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  getTodayFullData,
  generateDailySummary,
  saveSummaryToNotion,
  calculateDailyStats
}
