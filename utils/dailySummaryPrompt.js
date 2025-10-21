/**
 * 今日总结提示词生成器
 * 用于生成发送给AI的提示词，让AI总结今日活动
 */

/**
 * 生成今日总结的提示词
 * @param {Object} todayData - 今日完整数据
 * @returns {string} - AI提示词
 */
function generateDailySummaryPrompt(todayData) {
  const { mainRecords, activities, stats } = todayData

  // 构建时间线文本
  let timelineText = '## 今日时间线（按时间顺序）\n\n'

  activities.forEach((activity, index) => {
    const timeRange = activity.startTime && activity.endTime
      ? `${activity.startTime}-${activity.endTime}`
      : `${activity.duration}分钟`

    const typeEmoji = getActivityTypeEmoji(activity.activityType)
    const goalInfo = activity.relatedGoal ? `[目标: ${activity.relatedGoal}]` : ''
    const todoInfo = activity.relatedTodo ? `[待办: ${activity.relatedTodo}]` : ''

    timelineText += `${index + 1}. ${typeEmoji} ${timeRange} - ${activity.name} ${goalInfo}${todoInfo}\n`
  })

  // 构建统计摘要
  const statsText = `
## 今日数据统计

- 总投入时间: ${stats.totalMinutes}分钟 (${(stats.totalMinutes / 60).toFixed(1)}小时)
- ✅ 有价值活动: ${stats.valuableMinutes}分钟 (${((stats.valuableMinutes / stats.totalMinutes) * 100).toFixed(1)}%)
- ⚪ 中性活动: ${stats.neutralMinutes}分钟 (${((stats.neutralMinutes / stats.totalMinutes) * 100).toFixed(1)}%)
- ❌ 低效活动: ${stats.wastefulMinutes}分钟 (${((stats.wastefulMinutes / stats.totalMinutes) * 100).toFixed(1)}%)
- 活动总数: ${stats.activityCount}个
`

  // 构建主记录内容
  let recordsText = '\n## 今日记录内容\n\n'
  mainRecords.forEach((record, index) => {
    const typeLabel = record.recordType === '明日规划' ? '【明日规划】' : '【日常记录】'
    recordsText += `${index + 1}. ${typeLabel} ${record.content}\n\n`
  })

  // 完整提示词
  const prompt = `
请根据以下今日活动数据，生成一份简洁、有洞察力的今日总结报告：

${timelineText}

${statsText}

${recordsText}

---

请按照以下格式生成总结：

## 📊 今日概览
[用1-2句话概括今天的整体情况]

## ⭐ 今日亮点
[列出2-3个今日做得好的地方，有价值的活动和成果]

## 💡 改进建议
[基于低效活动和时间分配，给出1-2条改进建议]

## 📈 时间利用分析
[分析时间分配的合理性，哪些活动占用时间最多]

## 🎯 目标进展
[如果有关联目标，总结目标的推进情况]

## 🔮 明日展望
[如果有明日规划记录，提炼关键待办事项；如果没有，建议明天重点关注的方向]

---

要求：
1. 语言简洁、客观、有建设性
2. 基于数据说话，用百分比和具体数字
3. 突出用户的成就，同时温和地指出改进空间
4. 语气积极向上，鼓励用户持续记录
5. 总结长度控制在300-500字
`

  return prompt
}

/**
 * 获取活动类型对应的emoji
 */
function getActivityTypeEmoji(activityType) {
  if (!activityType) return '⚪'

  if (activityType.includes('有价值') || activityType === 'valuable') {
    return '✅'
  } else if (activityType.includes('低效') || activityType === 'wasteful') {
    return '❌'
  } else {
    return '⚪'
  }
}

/**
 * 生成简化版总结提示词（用于快速总结）
 */
function generateQuickSummaryPrompt(todayData) {
  const { activities, stats } = todayData

  const activitiesText = activities.map((act, i) =>
    `${i + 1}. ${act.name} (${act.duration}分钟)`
  ).join('\n')

  return `
请用3句话总结今天的活动：

今日活动列表：
${activitiesText}

统计数据：
- 总时长: ${stats.totalMinutes}分钟
- 有价值: ${stats.valuableMinutes}分钟
- 低效: ${stats.wastefulMinutes}分钟

要求：
1. 第一句：概括今天做了什么
2. 第二句：指出做得好的地方
3. 第三句：给出一条改进建议
`
}

module.exports = {
  generateDailySummaryPrompt,
  generateQuickSummaryPrompt,
  getActivityTypeEmoji
}
