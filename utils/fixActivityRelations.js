/**
 * 修复活动明细与主记录的关联关系
 *
 * 问题：旧数据使用 'Record' 字段，但查询时期望 'Related Main Record' 字段
 * 解决：读取所有活动明细，根据日期和用户匹配主记录，更新关联关系
 */

const notionApiService = require('./notionApiService.js')

/**
 * 修复单个用户的活动关联
 * @param {string} apiKey - Notion API Key
 * @param {string} mainRecordsDatabaseId - 主记录表数据库ID
 * @param {string} activityDetailsDatabaseId - 活动明细表数据库ID
 * @param {string} userEmail - 用户邮箱
 */
async function fixUserActivityRelations(apiKey, mainRecordsDatabaseId, activityDetailsDatabaseId, userEmail) {
  console.log('🔧 开始修复活动关联关系...')
  console.log('用户:', userEmail)

  try {
    // 1. 加载所有主记录
    console.log('\n📋 步骤1: 加载主记录...')
    const mainRecordsResult = await notionApiService.queryMainRecords(
      apiKey,
      mainRecordsDatabaseId,
      userEmail,
      {}
    )

    if (!mainRecordsResult.success) {
      throw new Error('加载主记录失败: ' + mainRecordsResult.error)
    }

    const mainRecords = mainRecordsResult.records || []
    console.log(`✅ 加载了 ${mainRecords.length} 条主记录`)

    // 2. 加载所有活动明细
    console.log('\n📊 步骤2: 加载活动明细...')
    const activitiesResult = await notionApiService.queryActivities(
      apiKey,
      activityDetailsDatabaseId,
      userEmail,
      {}
    )

    if (!activitiesResult.success) {
      throw new Error('加载活动明细失败: ' + activitiesResult.error)
    }

    const activities = activitiesResult.activities || []
    console.log(`✅ 加载了 ${activities.length} 条活动明细`)

    // 3. 按日期建立主记录索引
    console.log('\n🗂️ 步骤3: 建立日期索引...')
    const mainRecordsByDate = {}
    mainRecords.forEach(record => {
      const dateKey = record.date // 格式: "2025-10-18"
      if (!mainRecordsByDate[dateKey]) {
        mainRecordsByDate[dateKey] = []
      }
      mainRecordsByDate[dateKey].push(record)
    })
    console.log(`✅ 建立了 ${Object.keys(mainRecordsByDate).length} 个日期索引`)

    // 4. 修复活动关联
    console.log('\n🔗 步骤4: 修复活动关联...')
    let fixedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const activity of activities) {
      try {
        // 检查是否已有关联
        if (activity.relatedMainRecordId) {
          console.log(`⏭️ 跳过 "${activity.name}" - 已有关联`)
          skippedCount++
          continue
        }

        // 从活动的startTime提取日期
        const activityDate = activity.startTime.split('T')[0] // "2025-10-18"

        // 查找同一天的主记录
        const matchingRecords = mainRecordsByDate[activityDate]

        if (!matchingRecords || matchingRecords.length === 0) {
          console.warn(`⚠️ 活动 "${activity.name}" (${activityDate}) 找不到匹配的主记录`)
          skippedCount++
          continue
        }

        // 如果有多条主记录，选择第一条（通常是该天的汇总记录）
        const targetMainRecord = matchingRecords[0]

        console.log(`🔗 关联: "${activity.name}" → "${targetMainRecord.title}" (${activityDate})`)

        // 更新活动的关联字段
        const updateResult = await notionApiService.updatePageProperties(
          apiKey,
          activity.id,
          {
            'Record': {
              relation: [{ id: targetMainRecord.id }]
            }
          }
        )

        if (updateResult.success) {
          fixedCount++
          console.log(`  ✅ 成功`)
        } else {
          errorCount++
          console.error(`  ❌ 失败: ${updateResult.error}`)
        }

        // 延迟，避免API限流
        await sleep(300)

      } catch (error) {
        errorCount++
        console.error(`❌ 处理活动 "${activity.name}" 时出错:`, error.message)
      }
    }

    // 5. 输出汇总
    console.log('\n' + '='.repeat(50))
    console.log('📊 修复完成！')
    console.log('='.repeat(50))
    console.log(`✅ 成功修复: ${fixedCount} 条`)
    console.log(`⏭️ 已跳过: ${skippedCount} 条`)
    console.log(`❌ 失败: ${errorCount} 条`)
    console.log(`📋 总计: ${activities.length} 条`)
    console.log('='.repeat(50))

    return {
      success: true,
      fixed: fixedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: activities.length
    }

  } catch (error) {
    console.error('❌ 修复过程出错:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 主函数 - 支持在小程序中调用
 */
async function fix(userConfig) {
  const { apiKey, mainRecordsDatabaseId, activityDetailsDatabaseId, userEmail } = userConfig

  if (!apiKey) {
    throw new Error('缺少 Notion API Key')
  }
  if (!mainRecordsDatabaseId) {
    throw new Error('缺少主记录表数据库ID')
  }
  if (!activityDetailsDatabaseId) {
    throw new Error('缺少活动明细表数据库ID')
  }
  if (!userEmail) {
    throw new Error('缺少用户邮箱')
  }

  return await fixUserActivityRelations(
    apiKey,
    mainRecordsDatabaseId,
    activityDetailsDatabaseId,
    userEmail
  )
}

// 如果是在Node.js环境中直接运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fix,
    fixUserActivityRelations
  }
}

// 如果是在微信小程序中作为工具模块
if (typeof exports !== 'undefined') {
  exports.fix = fix
  exports.fixUserActivityRelations = fixUserActivityRelations
}
