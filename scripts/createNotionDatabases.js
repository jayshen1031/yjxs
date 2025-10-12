#!/usr/bin/env node
/**
 * Notion五数据库创建脚本
 * 用于在控制台直接运行创建Notion数据库
 *
 * 使用方法：
 * node scripts/createNotionDatabases.js <API_KEY> <PARENT_PAGE_ID>
 *
 * 参数说明：
 * - API_KEY: Notion Integration API Key
 * - PARENT_PAGE_ID: 父页面ID（数据库将在此页面下创建）
 */

const { NotionQuadDatabaseCreator } = require('../utils/notionQuadDatabaseCreator.js')

async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('❌ 缺少必要参数！')
    console.log('\n使用方法：')
    console.log('node scripts/createNotionDatabases.js <API_KEY> <PARENT_PAGE_ID>')
    console.log('\n参数说明：')
    console.log('- API_KEY: Notion Integration API Key')
    console.log('- PARENT_PAGE_ID: 父页面ID（数据库将在此页面下创建）')
    console.log('\n示例：')
    console.log('node scripts/createNotionDatabases.js secret_xxxxx 12345678-1234-1234-1234-123456789abc')
    process.exit(1)
  }

  const apiKey = args[0]
  const parentPageId = args[1]

  console.log('\n📋 参数确认：')
  console.log('API Key:', apiKey.substring(0, 20) + '...')
  console.log('Parent Page ID:', parentPageId)
  console.log('')

  // 创建数据库
  const creator = new NotionQuadDatabaseCreator(apiKey, parentPageId)
  const result = await creator.createAll()

  if (result.success) {
    console.log('\n🎉 创建成功！请将以下数据库ID保存到用户配置中：')
    console.log('\nJSON格式（可直接复制）：')
    console.log(JSON.stringify(result.databases, null, 2))
    console.log('\n复制以上ID到小程序中的Notion配置页面')
    process.exit(0)
  } else {
    console.error('\n❌ 创建失败：', result.error)
    process.exit(1)
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的错误：', error)
  process.exit(1)
})

// 运行
main().catch(error => {
  console.error('❌ 执行失败：', error)
  process.exit(1)
})
