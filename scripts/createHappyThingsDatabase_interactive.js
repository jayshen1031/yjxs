#!/usr/bin/env node
/**
 * 创建开心库（交互式版本）
 *
 * 使用方法：
 * node scripts/createHappyThingsDatabase_interactive.js
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

async function createHappyThingsDatabase(apiKey, parentPageId) {
  const NOTION_API_BASE = 'https://api.notion.com/v1'
  const NOTION_VERSION = '2022-06-28'

  const schema = {
    parent: { page_id: parentPageId },
    title: [{ text: { content: '😊 语寄心声 - 开心库 (Happy Things)' } }],
    properties: {
      'Title': { title: {} },
      'Content': { rich_text: {} },
      'Category': {
        select: {
          options: [
            { name: '运动', color: 'red' },
            { name: '美食', color: 'orange' },
            { name: '社交', color: 'yellow' },
            { name: '娱乐', color: 'green' },
            { name: '学习', color: 'blue' },
            { name: '创造', color: 'purple' },
            { name: '自然', color: 'pink' },
            { name: '放松', color: 'brown' },
            { name: '生活', color: 'gray' }
          ]
        }
      },
      'Emoji': { rich_text: {} },
      'Energy Level': {
        select: {
          options: [
            { name: '轻松', color: 'green' },
            { name: '适中', color: 'yellow' },
            { name: '需精力', color: 'red' }
          ]
        }
      },
      'Duration': { number: { format: 'number' } },
      'Difficulty': {
        select: {
          options: [
            { name: '简单', color: 'green' },
            { name: '中等', color: 'yellow' },
            { name: '困难', color: 'red' }
          ]
        }
      },
      'Cost': {
        select: {
          options: [
            { name: '免费', color: 'green' },
            { name: '低成本', color: 'blue' },
            { name: '中成本', color: 'yellow' },
            { name: '高成本', color: 'red' }
          ]
        }
      },
      'Is Active': { checkbox: {} },
      'Usage Count': { number: { format: 'number' } },
      'Last Used': { date: {} },
      'User ID': { rich_text: {} },
      'Tags': { multi_select: { options: [] } },
      'Notes': { rich_text: {} }
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
  console.log('   创建开心库 (Happy Things)')
  console.log('========================================\n')

  console.log('📖 说明：')
  console.log('此脚本用于创建开心库数据库，用于管理和推荐开心的事情')
  console.log('')
  console.log('😊 开心库包含字段：')
  console.log('- 📝 标题、内容描述')
  console.log('- 🏷️ 分类（运动、美食、社交、娱乐、学习、创造、自然、放松、生活）')
  console.log('- 😀 表情、能量等级（轻松/适中/需精力）')
  console.log('- ⏱️ 建议时长、难度（简单/中等/困难）')
  console.log('- 💰 成本（免费/低成本/中成本/高成本）')
  console.log('- ✅ 是否启用、使用次数、最后使用日期')
  console.log('- 🏷️ 标签、📝 备注')
  console.log('')

  const apiKey = await question('请输入Notion API Key: ')
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ API Key不能为空')
    rl.close()
    process.exit(1)
  }

  const parentPageId = await question('请输入父页面ID (建议与其他数据库在同一页面): ')
  if (!parentPageId || parentPageId.trim().length === 0) {
    console.error('❌ Page ID不能为空')
    rl.close()
    process.exit(1)
  }

  console.log('\n📋 参数确认：')
  console.log('API Key:', apiKey.substring(0, 20) + '...')
  console.log('Parent Page ID:', parentPageId.trim())

  const confirm = await question('\n确认创建开心库？(y/n): ')
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消')
    rl.close()
    process.exit(0)
  }

  console.log('')
  rl.close()

  try {
    console.log('正在创建开心库...\n')
    const database = await createHappyThingsDatabase(apiKey.trim(), parentPageId.trim())

    console.log('\n✅ 开心库创建成功！')
    console.log('=====================================')
    console.log('数据库ID:', database.id)
    console.log('数据库URL:', database.url)
    console.log('=====================================')

    console.log('\n📝 复制以下ID到小程序配置：')
    console.log(database.id)

    console.log('\n📋 完整配置（JSON格式）：')
    console.log(JSON.stringify({
      happyThings: database.id
    }, null, 2))

    console.log('\n💡 推荐：批量导入默认开心事项')
    console.log('你可以使用以下36条默认开心事项初始化数据库：')
    console.log('- 运动类：散步20分钟、拉伸运动、跳舞、骑车兜风')
    console.log('- 美食类：做拿手菜、品尝新餐厅、烘焙点心、泡茶')
    console.log('- 社交类：给朋友打电话、喝咖啡、发小视频、加入兴趣小组')
    console.log('- 娱乐类：看喜剧电影、听音乐、玩游戏、追剧')
    console.log('- 学习类：读书、学新技能、看TED演讲、练外语')
    console.log('- 创造类：写日记、画画、做手工、拍照')
    console.log('- 自然类：晒太阳、看花、观云、看星星')
    console.log('- 放松类：泡澡、冥想、午睡、听放松音乐')
    console.log('- 生活类：整理房间、浇水、换发型、买鲜花')

    console.log('\n✅ 下一步：')
    console.log('1. 复制上面的数据库ID')
    console.log('2. 在小程序中打开Notion配置页面')
    console.log('3. 找到"开心库ID"字段（需要先添加该字段）')
    console.log('4. 粘贴ID并保存')
    console.log('5. （可选）使用批量导入工具导入36条默认开心事项')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ 创建失败：', error.message)
    if (error.response) {
      console.error('\nNotion API响应：', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error('\n详细错误：', error)
    }
    process.exit(1)
  }
}

process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的错误：', error)
  rl.close()
  process.exit(1)
})

main()
