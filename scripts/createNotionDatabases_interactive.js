#!/usr/bin/env node
/**
 * Notion五数据库创建脚本（交互式版本）
 *
 * 使用方法：
 * node scripts/createNotionDatabases_interactive.js
 *
 * 然后按照提示输入API Key和Page ID
 */

const readline = require('readline')
const { NotionQuadDatabaseCreator } = require('../utils/notionQuadDatabaseCreator.js')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function main() {
  console.log('========================================')
  console.log('   Notion五数据库架构创建向导')
  console.log('========================================\n')

  console.log('📖 使用说明：')
  console.log('1. 需要准备Notion Integration API Key')
  console.log('2. 需要准备一个Notion页面ID（数据库将在此页面下创建）')
  console.log('3. 脚本将自动创建5个数据库：')
  console.log('   - 🎯 目标库 (Goals)')
  console.log('   - ✅ 待办库 (Todos)')
  console.log('   - 📝 主记录表 (Main Records)')
  console.log('   - ⏱️ 活动明细表 (Activity Details)')
  console.log('   - 📊 每日状态库 (Daily Status)')
  console.log('')

  // 获取API Key
  const apiKey = await question('请输入Notion API Key: ')
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ API Key不能为空')
    rl.close()
    process.exit(1)
  }

  // 获取Page ID
  const parentPageId = await question('请输入父页面ID (Page ID): ')
  if (!parentPageId || parentPageId.trim().length === 0) {
    console.error('❌ Page ID不能为空')
    rl.close()
    process.exit(1)
  }

  console.log('\n📋 参数确认：')
  console.log('API Key:', apiKey.substring(0, 20) + '...')
  console.log('Parent Page ID:', parentPageId.trim())

  const confirm = await question('\n确认创建数据库？(y/n): ')
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消')
    rl.close()
    process.exit(0)
  }

  console.log('')
  rl.close()

  // 创建数据库
  const creator = new NotionQuadDatabaseCreator(apiKey.trim(), parentPageId.trim())
  const result = await creator.createAll()

  if (result.success) {
    console.log('\n🎉 创建成功！')
    console.log('\n📋 数据库ID列表（请保存）：')
    console.log('=====================================')
    console.log('目标库 (Goals):', result.databases.goals)
    console.log('待办库 (Todos):', result.databases.todos)
    console.log('主记录表 (Main Records):', result.databases.mainRecords)
    console.log('活动明细表 (Activity Details):', result.databases.activityDetails)
    console.log('每日状态库 (Daily Status):', result.databases.dailyStatus)
    console.log('=====================================')

    console.log('\n📝 JSON格式（可直接复制到配置中）：')
    console.log(JSON.stringify(result.databases, null, 2))

    console.log('\n✅ 下一步：')
    console.log('1. 复制以上数据库ID')
    console.log('2. 在小程序中打开Notion配置页面')
    console.log('3. 粘贴数据库ID到对应字段')
    console.log('4. 保存配置')

    process.exit(0)
  } else {
    console.error('\n❌ 创建失败：', result.error)
    process.exit(1)
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的错误：', error)
  rl.close()
  process.exit(1)
})

// 运行
main().catch(error => {
  console.error('❌ 执行失败：', error)
  rl.close()
  process.exit(1)
})
