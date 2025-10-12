#!/usr/bin/env node
/**
 * 批量导入默认36条开心事项到Notion
 *
 * 使用方法：
 * node scripts/importDefaultHappyThings.js
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

// 36条默认开心事项
const DEFAULT_HAPPY_THINGS = [
  // 运动类
  { content: '出门散步20分钟', category: '运动', emoji: '🚶', energy: '轻松', duration: 20, difficulty: '简单', cost: '免费' },
  { content: '做10分钟拉伸运动', category: '运动', emoji: '🧘', energy: '轻松', duration: 10, difficulty: '简单', cost: '免费' },
  { content: '跳一支喜欢的舞', category: '运动', emoji: '💃', energy: '适中', duration: 30, difficulty: '中等', cost: '免费' },
  { content: '骑自行车兜风', category: '运动', emoji: '🚴', energy: '适中', duration: 40, difficulty: '中等', cost: '免费' },

  // 美食类
  { content: '做一道拿手菜', category: '美食', emoji: '🍳', energy: '适中', duration: 45, difficulty: '中等', cost: '中成本' },
  { content: '品尝一家新餐厅', category: '美食', emoji: '🍽️', energy: '轻松', duration: 90, difficulty: '简单', cost: '中成本' },
  { content: '烘焙小点心', category: '美食', emoji: '🧁', energy: '适中', duration: 60, difficulty: '中等', cost: '低成本' },
  { content: '给自己泡杯好茶', category: '美食', emoji: '🍵', energy: '轻松', duration: 10, difficulty: '简单', cost: '低成本' },

  // 社交类
  { content: '给朋友打个电话', category: '社交', emoji: '📞', energy: '轻松', duration: 20, difficulty: '简单', cost: '免费' },
  { content: '约朋友喝杯咖啡', category: '社交', emoji: '☕', energy: '适中', duration: 60, difficulty: '简单', cost: '低成本' },
  { content: '给家人发个小视频', category: '社交', emoji: '📹', energy: '轻松', duration: 5, difficulty: '简单', cost: '免费' },
  { content: '加入一个兴趣小组', category: '社交', emoji: '👥', energy: '适中', duration: 60, difficulty: '中等', cost: '免费' },

  // 娱乐类
  { content: '看一部喜剧电影', category: '娱乐', emoji: '🎬', energy: '轻松', duration: 120, difficulty: '简单', cost: '低成本' },
  { content: '听喜欢的音乐专辑', category: '娱乐', emoji: '🎵', energy: '轻松', duration: 40, difficulty: '简单', cost: '免费' },
  { content: '玩一个轻松的游戏', category: '娱乐', emoji: '🎮', energy: '轻松', duration: 30, difficulty: '简单', cost: '免费' },
  { content: '追一集有趣的剧', category: '娱乐', emoji: '📺', energy: '轻松', duration: 45, difficulty: '简单', cost: '免费' },

  // 学习类
  { content: '读几页喜欢的书', category: '学习', emoji: '📖', energy: '轻松', duration: 30, difficulty: '简单', cost: '免费' },
  { content: '学习一个新技能', category: '学习', emoji: '💡', energy: '需精力', duration: 60, difficulty: '困难', cost: '低成本' },
  { content: '看一个TED演讲', category: '学习', emoji: '🎓', energy: '适中', duration: 20, difficulty: '简单', cost: '免费' },
  { content: '练习一门外语', category: '学习', emoji: '🌍', energy: '适中', duration: 30, difficulty: '中等', cost: '免费' },

  // 创造类
  { content: '写写日记或随笔', category: '创造', emoji: '✍️', energy: '轻松', duration: 20, difficulty: '简单', cost: '免费' },
  { content: '画一幅简单的画', category: '创造', emoji: '🎨', energy: '适中', duration: 40, difficulty: '中等', cost: '低成本' },
  { content: '做一个小手工', category: '创造', emoji: '✂️', energy: '适中', duration: 60, difficulty: '中等', cost: '低成本' },
  { content: '拍几张创意照片', category: '创造', emoji: '📷', energy: '适中', duration: 30, difficulty: '中等', cost: '免费' },

  // 自然类
  { content: '晒晒太阳发呆', category: '自然', emoji: '☀️', energy: '轻松', duration: 15, difficulty: '简单', cost: '免费' },
  { content: '去公园看看花', category: '自然', emoji: '🌸', energy: '轻松', duration: 30, difficulty: '简单', cost: '免费' },
  { content: '观察窗外的云', category: '自然', emoji: '☁️', energy: '轻松', duration: 10, difficulty: '简单', cost: '免费' },
  { content: '晚上看看星星', category: '自然', emoji: '⭐', energy: '轻松', duration: 20, difficulty: '简单', cost: '免费' },

  // 放松类
  { content: '泡个热水澡', category: '放松', emoji: '🛁', energy: '轻松', duration: 30, difficulty: '简单', cost: '免费' },
  { content: '做10分钟冥想', category: '放松', emoji: '🧘', energy: '轻松', duration: 10, difficulty: '简单', cost: '免费' },
  { content: '午睡20分钟', category: '放松', emoji: '😴', energy: '轻松', duration: 20, difficulty: '简单', cost: '免费' },
  { content: '听一段放松音乐', category: '放松', emoji: '🎼', energy: '轻松', duration: 15, difficulty: '简单', cost: '免费' },

  // 生活类
  { content: '整理一下房间', category: '生活', emoji: '🧹', energy: '适中', duration: 40, difficulty: '中等', cost: '免费' },
  { content: '给植物浇浇水', category: '生活', emoji: '🌱', energy: '轻松', duration: 5, difficulty: '简单', cost: '免费' },
  { content: '换个新发型', category: '生活', emoji: '💇', energy: '适中', duration: 60, difficulty: '中等', cost: '中成本' },
  { content: '买束鲜花回家', category: '生活', emoji: '💐', energy: '轻松', duration: 15, difficulty: '简单', cost: '低成本' }
]

async function createHappyThingPage(apiKey, databaseId, item, userId) {
  const NOTION_API_BASE = 'https://api.notion.com/v1'
  const NOTION_VERSION = '2022-06-28'

  const pageData = {
    parent: { database_id: databaseId },
    properties: {
      'Title': {
        title: [{ text: { content: item.content } }]
      },
      'Content': {
        rich_text: [{ text: { content: item.content } }]
      },
      'Category': {
        select: { name: item.category }
      },
      'Emoji': {
        rich_text: [{ text: { content: item.emoji } }]
      },
      'Energy Level': {
        select: { name: item.energy }
      },
      'Duration': {
        number: item.duration
      },
      'Difficulty': {
        select: { name: item.difficulty }
      },
      'Cost': {
        select: { name: item.cost }
      },
      'Is Active': {
        checkbox: true
      },
      'Usage Count': {
        number: 0
      },
      'User ID': {
        rich_text: [{ text: { content: userId } }]
      }
    }
  }

  const response = await axios.post(`${NOTION_API_BASE}/pages`, pageData, {
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
  console.log('   批量导入默认开心事项')
  console.log('========================================\n')

  console.log('📖 说明：')
  console.log('此脚本将36条默认开心事项批量导入到已创建的开心库中')
  console.log('')
  console.log('📊 导入内容概览：')
  console.log('- 运动类：4条')
  console.log('- 美食类：4条')
  console.log('- 社交类：4条')
  console.log('- 娱乐类：4条')
  console.log('- 学习类：4条')
  console.log('- 创造类：4条')
  console.log('- 自然类：4条')
  console.log('- 放松类：4条')
  console.log('- 生活类：4条')
  console.log('合计：36条开心事项\n')

  const apiKey = await question('请输入Notion API Key: ')
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ API Key不能为空')
    rl.close()
    process.exit(1)
  }

  const databaseId = await question('请输入开心库数据库ID: ')
  if (!databaseId || databaseId.trim().length === 0) {
    console.error('❌ 数据库ID不能为空')
    rl.close()
    process.exit(1)
  }

  const userId = await question('请输入用户ID (可选，留空使用"system"): ')
  const finalUserId = userId.trim() || 'system'

  console.log('\n📋 参数确认：')
  console.log('API Key:', apiKey.substring(0, 20) + '...')
  console.log('Database ID:', databaseId.trim())
  console.log('User ID:', finalUserId)
  console.log('导入数量:', DEFAULT_HAPPY_THINGS.length, '条')

  const confirm = await question('\n确认开始导入？(y/n): ')
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消')
    rl.close()
    process.exit(0)
  }

  console.log('')
  rl.close()

  try {
    console.log('开始批量导入...\n')
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < DEFAULT_HAPPY_THINGS.length; i++) {
      const item = DEFAULT_HAPPY_THINGS[i]
      try {
        process.stdout.write(`[${i + 1}/${DEFAULT_HAPPY_THINGS.length}] 导入: ${item.emoji} ${item.content} ... `)
        await createHappyThingPage(apiKey.trim(), databaseId.trim(), item, finalUserId)
        console.log('✅')
        successCount++

        // 避免请求过快，添加短暂延迟
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.log('❌')
        console.error(`   错误: ${error.message}`)
        failCount++
      }
    }

    console.log('\n========================================')
    console.log('✅ 导入完成！')
    console.log('========================================')
    console.log('成功:', successCount, '条')
    console.log('失败:', failCount, '条')
    console.log('总计:', DEFAULT_HAPPY_THINGS.length, '条')

    if (failCount > 0) {
      console.log('\n⚠️ 部分导入失败，请检查：')
      console.log('1. 数据库ID是否正确')
      console.log('2. API Key是否有写入权限')
      console.log('3. 数据库字段是否创建正确')
    }

    console.log('\n✅ 下一步：')
    console.log('1. 打开Notion查看导入的开心事项')
    console.log('2. 可以编辑、添加或删除任意事项')
    console.log('3. 在小程序中使用开心库功能')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ 导入失败：', error.message)
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
