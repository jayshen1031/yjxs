/**
 * 自动升级脚本执行器
 * 从云数据库获取用户配置并执行数据库升级
 */

const cloud = require('wx-server-sdk')
const { Client } = require('@notionhq/client')

// 初始化云环境
cloud.init({
  env: 'yjxs-3gbxme0rd1c50635' // 语寄心声独立云环境
})

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 从云数据库获取用户配置
 */
async function getUserConfig(email) {
  console.log(`🔍 正在从云数据库获取用户配置: ${email}`)

  try {
    const result = await cloud.callFunction({
      name: 'memo-notion-sync',
      data: {
        action: 'getUserByEmail',
        data: { email }
      }
    })

    if (result.result.success) {
      console.log('✅ 成功获取用户配置')
      return result.result.user
    } else {
      throw new Error(result.result.error || '获取用户配置失败')
    }
  } catch (error) {
    throw new Error(`云函数调用失败: ${error.message}`)
  }
}

/**
 * 执行数据库升级
 */
async function executeUpgrade(notionConfig) {
  const { apiKey, databases } = notionConfig

  if (!apiKey) {
    throw new Error('Notion API Key未配置')
  }

  if (!databases || !databases.goals || !databases.activityDetails ||
      !databases.todos || !databases.knowledge) {
    throw new Error('数据库配置不完整，请确保已配置六数据库')
  }

  const notion = new Client({ auth: apiKey })

  console.log('\n' + '='.repeat(60))
  console.log('📋 升级计划：')
  console.log('='.repeat(60))
  console.log('\n1️⃣  Goals 数据库')
  console.log('   ✓ 新增字段：Is System Managed (复选框)')
  console.log('   ✓ 新增字段：Daily Target Hours (数字)')
  console.log('\n2️⃣  Activity Details 数据库')
  console.log('   ✓ 新增字段：Activity Type (选择)')
  console.log('   ✓ 新增字段：Related Goal (关联Goals)')
  console.log('   ✓ 新增字段：Related Todo (关联Todos)')
  console.log('   ✓ 新增字段：Related Knowledge (关联Knowledge)')
  console.log('   ✓ 新增字段：Todo Status After (选择)')

  console.log('\n' + '='.repeat(60))
  console.log('🚀 开始升级...')
  console.log('='.repeat(60))

  // 1. 升级 Goals 数据库
  console.log('\n📚 [1/2] 升级 Goals 数据库...')
  try {
    console.log('  ⏳ 添加 "Is System Managed" 字段...')
    await notion.databases.update({
      database_id: databases.goals,
      properties: {
        'Is System Managed': {
          checkbox: {}
        }
      }
    })
    console.log('  ✅ "Is System Managed" 字段已添加')

    await sleep(1000)

    console.log('  ⏳ 添加 "Daily Target Hours" 字段...')
    await notion.databases.update({
      database_id: databases.goals,
      properties: {
        'Daily Target Hours': {
          number: {
            format: 'number'
          }
        }
      }
    })
    console.log('  ✅ "Daily Target Hours" 字段已添加')

    console.log('\n✅ Goals数据库升级成功！')
  } catch (error) {
    console.error('\n❌ Goals数据库升级失败:', error.message)
    throw error
  }

  // 2. 升级 Activity Details 数据库
  console.log('\n⏱️  [2/2] 升级 Activity Details 数据库...')
  try {
    // 2.1 添加 Activity Type
    console.log('  ⏳ 添加 "Activity Type" 字段...')
    await notion.databases.update({
      database_id: databases.activityDetails,
      properties: {
        'Activity Type': {
          select: {
            options: [
              { name: '系统目标', color: 'blue' },
              { name: '每日事项', color: 'yellow' },
              { name: '流水账', color: 'gray' }
            ]
          }
        }
      }
    })
    console.log('  ✅ "Activity Type" 字段已添加')

    await sleep(1000)

    // 2.2 添加 Related Goal
    console.log('  ⏳ 添加 "Related Goal" 关联...')
    await notion.databases.update({
      database_id: databases.activityDetails,
      properties: {
        'Related Goal': {
          relation: {
            database_id: databases.goals
          }
        }
      }
    })
    console.log('  ✅ "Related Goal" 关联已添加')

    await sleep(5000) // 等待Notion创建反向关系

    // 2.3 添加 Related Todo
    console.log('  ⏳ 添加 "Related Todo" 关联...')
    await notion.databases.update({
      database_id: databases.activityDetails,
      properties: {
        'Related Todo': {
          relation: {
            database_id: databases.todos
          }
        }
      }
    })
    console.log('  ✅ "Related Todo" 关联已添加')

    await sleep(5000) // 等待Notion创建反向关系

    // 2.4 添加 Related Knowledge
    console.log('  ⏳ 添加 "Related Knowledge" 关联...')
    await notion.databases.update({
      database_id: databases.activityDetails,
      properties: {
        'Related Knowledge': {
          relation: {
            database_id: databases.knowledge
          }
        }
      }
    })
    console.log('  ✅ "Related Knowledge" 关联已添加')

    await sleep(1000)

    // 2.5 添加 Todo Status After
    console.log('  ⏳ 添加 "Todo Status After" 字段...')
    await notion.databases.update({
      database_id: databases.activityDetails,
      properties: {
        'Todo Status After': {
          select: {
            options: [
              { name: '进行中', color: 'blue' },
              { name: '已完成', color: 'green' }
            ]
          }
        }
      }
    })
    console.log('  ✅ "Todo Status After" 字段已添加')

    console.log('\n✅ Activity Details数据库升级成功！')
  } catch (error) {
    console.error('\n❌ Activity Details数据库升级失败:', error.message)
    throw error
  }

  // 3. 完成
  console.log('\n' + '='.repeat(60))
  console.log('🎉 数据库升级完成！')
  console.log('='.repeat(60))

  console.log('\n✅ 升级成功完成！新增字段如下：')
  console.log('\n📚 Goals 数据库：')
  console.log('   • Is System Managed - 勾选后显示在足迹页面')
  console.log('   • Daily Target Hours - 每日目标时长')

  console.log('\n⏱️  Activity Details 数据库：')
  console.log('   • Activity Type - 活动类型（系统目标/每日事项/流水账）')
  console.log('   • Related Goal - 关联目标')
  console.log('   • Related Todo - 关联待办')
  console.log('   • Related Knowledge - 关联知识库')
  console.log('   • Todo Status After - 记录后待办状态')
}

/**
 * 主函数
 */
async function main() {
  const userEmail = 'jayshen1031@gmail.com'

  console.log('🚀 数据库自动升级脚本')
  console.log('用户邮箱:', userEmail)
  console.log('='.repeat(60))

  try {
    // 1. 获取用户配置
    const user = await getUserConfig(userEmail)

    if (!user.notionConfig) {
      throw new Error('用户未配置Notion')
    }

    console.log('\n📋 Notion配置信息：')
    console.log('   API Key:', user.notionConfig.apiKey.substring(0, 20) + '...')
    console.log('   Goals:', user.notionConfig.databases?.goals || '未配置')
    console.log('   Todos:', user.notionConfig.databases?.todos || '未配置')
    console.log('   Activity Details:', user.notionConfig.databases?.activityDetails || '未配置')
    console.log('   Knowledge:', user.notionConfig.databases?.knowledge || '未配置')

    // 2. 执行升级
    await executeUpgrade(user.notionConfig)

    console.log('\n✅ 所有操作已完成！')

  } catch (error) {
    console.error('\n💥 升级失败:', error.message)
    console.error('\n详细错误：')
    console.error(error)
    process.exit(1)
  }
}

// 运行主函数
main().then(() => {
  process.exit(0)
}).catch(error => {
  console.error('脚本执行失败:', error)
  process.exit(1)
})
