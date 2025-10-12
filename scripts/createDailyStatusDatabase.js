#!/usr/bin/env node
/**
 * 创建每日状态库（Daily Status）
 * 用于在已有四数据库的基础上，单独添加每日状态库
 *
 * 使用方法：
 * node scripts/createDailyStatusDatabase.js <API_KEY> <PARENT_PAGE_ID>
 */

const axios = require('axios')

async function createDailyStatusDatabase(apiKey, parentPageId) {
  console.log('========================================')
  console.log('开始创建每日状态库 (Daily Status)')
  console.log('========================================\n')

  const NOTION_API_BASE = 'https://api.notion.com/v1'
  const NOTION_VERSION = '2022-06-28'

  const schema = {
    parent: { page_id: parentPageId },
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
            { name: '😤 压力大', color: 'red' },
            { name: '😞 失落', color: 'purple' },
            { name: '🤔 困惑', color: 'pink' },
            { name: '😐 无聊', color: 'gray' },
            { name: '🥰 感恩', color: 'green' }
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
            { name: '🚶 散步', color: 'default' },
            { name: '⚽ 球类运动', color: 'orange' },
            { name: '🕺 舞蹈', color: 'yellow' },
            { name: '🧗 攀岩', color: 'brown' },
            { name: '🤸 其他', color: 'gray' }
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

  console.log('正在创建每日状态库...')

  // 使用axios直接调用Notion API
  const response = await axios.post(`${NOTION_API_BASE}/databases`, schema, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    }
  })

  return response.data
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('❌ 缺少必要参数！')
    console.log('\n使用方法：')
    console.log('node scripts/createDailyStatusDatabase.js <API_KEY> <PARENT_PAGE_ID>')
    console.log('\n参数说明：')
    console.log('- API_KEY: Notion Integration API Key')
    console.log('- PARENT_PAGE_ID: 父页面ID（与其他4个数据库在同一页面）')
    console.log('\n示例：')
    console.log('node scripts/createDailyStatusDatabase.js secret_xxxxx 12345678-1234-1234-1234-123456789abc')
    process.exit(1)
  }

  const apiKey = args[0]
  const parentPageId = args[1]

  console.log('📋 参数确认：')
  console.log('API Key:', apiKey.substring(0, 20) + '...')
  console.log('Parent Page ID:', parentPageId)
  console.log('')

  try {
    const database = await createDailyStatusDatabase(apiKey, parentPageId)

    console.log('\n✅ 每日状态库创建成功！')
    console.log('=====================================')
    console.log('数据库ID:', database.id)
    console.log('数据库URL:', database.url)
    console.log('=====================================')

    console.log('\n📝 请将以下ID添加到小程序Notion配置中：')
    console.log('dailyStatus:', database.id)

    console.log('\n💡 提示：')
    console.log('1. 复制上面的数据库ID')
    console.log('2. 在小程序中打开Notion配置')
    console.log('3. 将ID粘贴到"每日状态库ID"字段')
    console.log('4. 保存配置')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ 创建失败：', error.message)
    console.error('\n详细错误：', error)
    process.exit(1)
  }
}

process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的错误：', error)
  process.exit(1)
})

main()
