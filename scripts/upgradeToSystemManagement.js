/**
 * 数据库Schema升级脚本
 * 从旧版八数据库架构升级到系统管理版本
 *
 * 升级内容：
 * 1. Goals 增加：Is System Managed, Daily Target Hours
 * 2. Activity Details 增加：Activity Type, Related Goal, Related Todo,
 *    Related Knowledge, Todo Status After
 *
 * 使用方法：
 * node scripts/upgradeToSystemManagement.js
 */

const { Client } = require('@notionhq/client')
const readline = require('readline')

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// 提示输入
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🚀 数据库Schema升级脚本')
  console.log('从旧版八数据库架构升级到系统管理版本')
  console.log('='.repeat(60))

  // 1. 输入Notion API Key
  console.log('\n📝 步骤1：输入Notion配置')
  const apiKey = await question('\n请输入Notion API Key: ')

  if (!apiKey || !apiKey.trim()) {
    console.log('❌ API Key不能为空')
    rl.close()
    return
  }

  const notion = new Client({ auth: apiKey.trim() })

  // 2. 输入数据库ID
  console.log('\n请输入各数据库ID（可从小程序"Notion集成配置"页面获取）：')
  const goalsDatabaseId = await question('Goals数据库ID: ')
  const activityDetailsDatabaseId = await question('Activity Details数据库ID: ')
  const todosDatabaseId = await question('Todos数据库ID: ')
  const knowledgeDatabaseId = await question('Knowledge数据库ID: ')

  // 验证输入
  if (!goalsDatabaseId || !activityDetailsDatabaseId || !todosDatabaseId || !knowledgeDatabaseId) {
    console.log('❌ 所有数据库ID都是必填的')
    rl.close()
    return
  }

  // 3. 显示升级计划
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
  console.log('\n⚠️  注意：')
  console.log('   • 升级过程不会删除任何数据')
  console.log('   • 现有记录的新字段将为空')
  console.log('   • 建议先在测试数据库上执行')
  console.log('   • 升级过程约需1-2分钟')

  const confirm = await question('\n确认执行升级？(输入 yes 确认): ')
  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ 升级已取消')
    rl.close()
    return
  }

  console.log('\n' + '='.repeat(60))
  console.log('🚀 开始升级...')
  console.log('='.repeat(60))

  // 4. 升级 Goals 数据库
  console.log('\n📚 [1/2] 升级 Goals 数据库...')
  try {
    // 添加 Is System Managed 字段
    console.log('  ⏳ 添加 "Is System Managed" 字段...')
    await notion.databases.update({
      database_id: goalsDatabaseId.trim(),
      properties: {
        'Is System Managed': {
          checkbox: {}
        }
      }
    })
    console.log('  ✅ "Is System Managed" 字段已添加')

    await sleep(1000)

    // 添加 Daily Target Hours 字段
    console.log('  ⏳ 添加 "Daily Target Hours" 字段...')
    await notion.databases.update({
      database_id: goalsDatabaseId.trim(),
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
    console.error('\n可能的原因：')
    console.error('  • 数据库ID不正确')
    console.error('  • API Key没有权限访问该数据库')
    console.error('  • 字段已存在')
    console.error('\n详细错误：', error)
    rl.close()
    return
  }

  // 5. 升级 Activity Details 数据库
  console.log('\n⏱️  [2/2] 升级 Activity Details 数据库...')
  try {
    // 5.1 添加 Activity Type
    console.log('  ⏳ 添加 "Activity Type" 字段...')
    await notion.databases.update({
      database_id: activityDetailsDatabaseId.trim(),
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

    // 5.2 添加 Related Goal
    console.log('  ⏳ 添加 "Related Goal" 关联...')
    await notion.databases.update({
      database_id: activityDetailsDatabaseId.trim(),
      properties: {
        'Related Goal': {
          relation: {
            database_id: goalsDatabaseId.trim()
          }
        }
      }
    })
    console.log('  ✅ "Related Goal" 关联已添加')

    await sleep(5000) // 等待Notion创建反向关系

    // 5.3 添加 Related Todo
    console.log('  ⏳ 添加 "Related Todo" 关联...')
    await notion.databases.update({
      database_id: activityDetailsDatabaseId.trim(),
      properties: {
        'Related Todo': {
          relation: {
            database_id: todosDatabaseId.trim()
          }
        }
      }
    })
    console.log('  ✅ "Related Todo" 关联已添加')

    await sleep(5000) // 等待Notion创建反向关系

    // 5.4 添加 Related Knowledge
    console.log('  ⏳ 添加 "Related Knowledge" 关联...')
    await notion.databases.update({
      database_id: activityDetailsDatabaseId.trim(),
      properties: {
        'Related Knowledge': {
          relation: {
            database_id: knowledgeDatabaseId.trim()
          }
        }
      }
    })
    console.log('  ✅ "Related Knowledge" 关联已添加')

    await sleep(1000)

    // 5.5 添加 Todo Status After
    console.log('  ⏳ 添加 "Todo Status After" 字段...')
    await notion.databases.update({
      database_id: activityDetailsDatabaseId.trim(),
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
    console.error('\n可能的原因：')
    console.error('  • 数据库ID不正确')
    console.error('  • API Key没有权限访问该数据库')
    console.error('  • 字段已存在')
    console.error('\n详细错误：', error)
    rl.close()
    return
  }

  // 6. 完成
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

  console.log('\n📝 后续步骤：')
  console.log('   1. 在小程序"目标·待办"页面编辑目标')
  console.log('   2. 勾选"Is System Managed"并设置"Daily Target Hours"')
  console.log('   3. 使用新版"足迹"页面记录活动')
  console.log('   4. Main Records数据库保留但不再使用')

  console.log('\n💡 温馨提示：')
  console.log('   • 现有活动记录不受影响')
  console.log('   • 新字段为空值，不影响旧数据')
  console.log('   • 可以继续使用旧功能，新功能不冲突')

  rl.close()
}

// 错误处理
main().catch(error => {
  console.error('\n💥 脚本执行失败:', error.message)
  console.error('\n详细错误信息：')
  console.error(error)
  rl.close()
  process.exit(1)
})
