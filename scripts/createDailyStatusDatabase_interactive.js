#!/usr/bin/env node
/**
 * 创建每日状态库（交互式版本）
 *
 * 使用方法：
 * node scripts/createDailyStatusDatabase_interactive.js
 */

const readline = require('readline')
const axios = require('axios')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function createDailyStatusDatabase(apiKey, parentPageId) {
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
  console.log('========================================')
  console.log('   创建每日状态库 (Daily Status)')
  console.log('========================================\n')

  console.log('📖 说明：')
  console.log('此脚本用于在已有四数据库的基础上，单独添加每日状态库')
  console.log('')
  console.log('📊 每日状态库包含字段：')
  console.log('- 📅 日期、心情、精力、压力')
  console.log('- 😴 起床时间、睡觉时间、睡眠质量')
  console.log('- ⚖️ 体重、💧 饮水量')
  console.log('- 🏃 运动类型、运动时长')
  console.log('- 🍽️ 用餐情况、饮食备注')
  console.log('- 🧘 冥想、📖 阅读')
  console.log('- 📝 备注、✨ 今日亮点')
  console.log('')

  const apiKey = await question('请输入Notion API Key: ')
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ API Key不能为空')
    rl.close()
    process.exit(1)
  }

  const parentPageId = await question('请输入父页面ID (与其他4个数据库在同一页面): ')
  if (!parentPageId || parentPageId.trim().length === 0) {
    console.error('❌ Page ID不能为空')
    rl.close()
    process.exit(1)
  }

  console.log('\n📋 参数确认：')
  console.log('API Key:', apiKey.substring(0, 20) + '...')
  console.log('Parent Page ID:', parentPageId.trim())

  const confirm = await question('\n确认创建每日状态库？(y/n): ')
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消')
    rl.close()
    process.exit(0)
  }

  console.log('')
  rl.close()

  try {
    console.log('正在创建每日状态库...\n')
    const database = await createDailyStatusDatabase(apiKey.trim(), parentPageId.trim())

    console.log('\n✅ 每日状态库创建成功！')
    console.log('=====================================')
    console.log('数据库ID:', database.id)
    console.log('数据库URL:', database.url)
    console.log('=====================================')

    console.log('\n📝 复制以下ID到小程序配置：')
    console.log(database.id)

    console.log('\n📋 完整配置（JSON格式）：')
    console.log(JSON.stringify({
      dailyStatus: database.id
    }, null, 2))

    console.log('\n✅ 下一步：')
    console.log('1. 复制上面的数据库ID')
    console.log('2. 在小程序中打开Notion配置页面')
    console.log('3. 找到"每日状态库ID"字段')
    console.log('4. 粘贴ID并保存')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ 创建失败：', error.message)
    console.error('\n详细错误：', error)
    process.exit(1)
  }
}

process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的错误：', error)
  rl.close()
  process.exit(1)
})

main()
