#!/usr/bin/env node

/**
 * 箴言库（Quotes Database）交互式创建脚本
 *
 * 功能：
 * 1. 创建Notion箴言库数据库
 * 2. 初始化15条系统默认箴言
 * 3. 保存数据库ID到配置
 *
 * 使用方法：
 * node scripts/createQuotesDatabase_interactive.js
 */

const axios = require('axios')
const readline = require('readline')

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Promise封装readline.question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

// 箴言库Schema定义
const QuotesDatabaseSchema = {
  title: '💬 语寄心声 - 箴言库 (Quotes)',
  description: '管理每日箴言、励志语录、人生格言',
  properties: {
    'Quote': {
      title: {}
    },
    'Author': {
      rich_text: {}
    },
    'Source': {
      rich_text: {}
    },
    'Category': {
      select: {
        options: [
          { name: '励志', color: 'red' },
          { name: '人生', color: 'orange' },
          { name: '成长', color: 'yellow' },
          { name: '时间', color: 'green' },
          { name: '坚持', color: 'blue' },
          { name: '记录', color: 'purple' },
          { name: '感悟', color: 'pink' },
          { name: '习惯', color: 'brown' },
          { name: '梦想', color: 'gray' }
        ]
      }
    },
    'Tags': {
      multi_select: {
        options: [
          { name: '正能量', color: 'red' },
          { name: '深度思考', color: 'blue' },
          { name: '轻松', color: 'yellow' },
          { name: '哲理', color: 'purple' },
          { name: '实用', color: 'green' },
          { name: '情感', color: 'pink' }
        ]
      }
    },
    'Status': {
      select: {
        options: [
          { name: '启用', color: 'green' },
          { name: '禁用', color: 'gray' },
          { name: '收藏', color: 'yellow' }
        ]
      }
    },
    'Is System Default': {
      checkbox: {}
    },
    'Display Count': {
      number: {
        format: 'number'
      }
    },
    'Last Displayed Date': {
      date: {}
    },
    'Created Date': {
      date: {}
    },
    'User ID': {
      rich_text: {}
    },
    'Notes': {
      rich_text: {}
    }
  }
}

// 15条系统默认箴言
const DEFAULT_QUOTES = [
  {
    quote: "今天的努力，是为了明天的惊喜。",
    category: "励志",
    tags: ["正能量", "实用"],
    author: "系统默认"
  },
  {
    quote: "记录生活的美好，让每个瞬间都有意义。",
    category: "记录",
    tags: ["实用", "轻松"],
    author: "系统默认"
  },
  {
    quote: "时间是最好的见证者，坚持是最美的回答。",
    category: "坚持",
    tags: ["正能量", "哲理"],
    author: "系统默认"
  },
  {
    quote: "每一个小小的记录，都是成长的足迹。",
    category: "成长",
    tags: ["实用", "深度思考"],
    author: "系统默认"
  },
  {
    quote: "用心感受每一刻，让平凡的日子闪闪发光。",
    category: "人生",
    tags: ["哲理", "情感"],
    author: "系统默认"
  },
  {
    quote: "善待时光，善待自己，记录属于你的故事。",
    category: "时间",
    tags: ["实用", "情感"],
    author: "系统默认"
  },
  {
    quote: "不是每天都有新鲜事，但每天都值得记录。",
    category: "记录",
    tags: ["实用", "轻松"],
    author: "系统默认"
  },
  {
    quote: "生活不在于长短，而在于是否精彩。",
    category: "人生",
    tags: ["哲理", "深度思考"],
    author: "系统默认"
  },
  {
    quote: "用文字定格时光，用声音留住回忆。",
    category: "记录",
    tags: ["实用", "情感"],
    author: "系统默认"
  },
  {
    quote: "每个今天，都是明天的珍贵回忆。",
    category: "时间",
    tags: ["哲理", "深度思考"],
    author: "系统默认"
  },
  {
    quote: "保持好奇心，记录发现的惊喜。",
    category: "成长",
    tags: ["轻松", "正能量"],
    author: "系统默认"
  },
  {
    quote: "小小的坚持，会带来大大的改变。",
    category: "坚持",
    tags: ["正能量", "实用"],
    author: "系统默认"
  },
  {
    quote: "今天比昨天进步一点点，就是成功。",
    category: "成长",
    tags: ["正能量", "实用"],
    author: "系统默认"
  },
  {
    quote: "记录是为了更好地前行。",
    category: "记录",
    tags: ["实用", "哲理"],
    author: "系统默认"
  },
  {
    quote: "在平凡中发现不平凡，在记录中找到意义。",
    category: "感悟",
    tags: ["哲理", "深度思考"],
    author: "系统默认"
  }
]

// Notion API调用封装
async function callNotionApi(endpoint, method, apiKey, data = null) {
  try {
    const response = await axios({
      method: method,
      url: `https://api.notion.com/v1${endpoint}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      data: data
    })
    return { success: true, data: response.data }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    }
  }
}

// 创建箴言库数据库
async function createQuotesDatabase(apiKey, parentPageId) {
  console.log('\n📝 正在创建箴言库数据库...')

  const schema = {
    parent: {
      type: 'page_id',
      page_id: parentPageId
    },
    title: [
      {
        type: 'text',
        text: {
          content: QuotesDatabaseSchema.title
        }
      }
    ],
    properties: QuotesDatabaseSchema.properties
  }

  const result = await callNotionApi('/databases', 'POST', apiKey, schema)

  if (result.success) {
    console.log('✅ 箴言库数据库创建成功！')
    console.log(`📋 数据库ID: ${result.data.id}`)
    return { success: true, databaseId: result.data.id }
  } else {
    console.error('❌ 创建失败:', result.error)
    return { success: false, error: result.error }
  }
}

// 初始化15条默认箴言
async function initializeDefaultQuotes(apiKey, databaseId) {
  console.log('\n📚 正在导入15条系统默认箴言...')

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < DEFAULT_QUOTES.length; i++) {
    const quote = DEFAULT_QUOTES[i]

    const pageData = {
      parent: {
        database_id: databaseId
      },
      properties: {
        'Quote': {
          title: [
            {
              text: {
                content: quote.quote
              }
            }
          ]
        },
        'Author': {
          rich_text: [
            {
              text: {
                content: quote.author
              }
            }
          ]
        },
        'Category': {
          select: {
            name: quote.category
          }
        },
        'Tags': {
          multi_select: quote.tags.map(tag => ({ name: tag }))
        },
        'Status': {
          select: {
            name: '启用'
          }
        },
        'Is System Default': {
          checkbox: true
        },
        'Display Count': {
          number: 0
        },
        'Created Date': {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        }
      }
    }

    const result = await callNotionApi('/pages', 'POST', apiKey, pageData)

    if (result.success) {
      successCount++
      console.log(`✅ [${i + 1}/15] ${quote.quote.substring(0, 20)}...`)
    } else {
      failCount++
      console.error(`❌ [${i + 1}/15] 导入失败:`, result.error)
    }

    // 延迟以避免API限流
    if (i < DEFAULT_QUOTES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 350))
    }
  }

  console.log(`\n📊 导入完成: 成功 ${successCount} 条，失败 ${failCount} 条`)

  return {
    success: failCount === 0,
    total: DEFAULT_QUOTES.length,
    imported: successCount,
    failed: failCount
  }
}

// 主函数
async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║  💬 语寄心声 - 箴言库自动创建脚本          ║')
  console.log('╚════════════════════════════════════════════╝')
  console.log('')

  try {
    // 获取Notion API Key
    const apiKey = await question('请输入Notion API Key: ')
    if (!apiKey.trim()) {
      console.log('❌ API Key不能为空')
      rl.close()
      return
    }

    // 获取父页面ID
    const parentPageId = await question('请输入父页面ID (Notion页面URL中的ID): ')
    if (!parentPageId.trim()) {
      console.log('❌ 父页面ID不能为空')
      rl.close()
      return
    }

    // 确认创建
    const confirm = await question('\n确认创建箴言库并导入15条默认箴言? (y/n): ')
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 已取消创建')
      rl.close()
      return
    }

    // 创建数据库
    const createResult = await createQuotesDatabase(apiKey, parentPageId)
    if (!createResult.success) {
      rl.close()
      return
    }

    const databaseId = createResult.databaseId

    // 询问是否导入默认箴言
    const importDefault = await question('\n是否导入15条系统默认箴言? (y/n): ')
    if (importDefault.toLowerCase() === 'y') {
      await initializeDefaultQuotes(apiKey, databaseId)
    }

    // 显示完成信息
    console.log('\n╔════════════════════════════════════════════╗')
    console.log('║  ✅ 箴言库创建完成！                        ║')
    console.log('╚════════════════════════════════════════════╝')
    console.log('')
    console.log('📋 请保存以下信息到Notion配置:')
    console.log(`   数据库ID: ${databaseId}`)
    console.log('')
    console.log('📝 下一步操作:')
    console.log('   1. 打开小程序"设置" → "Notion集成配置"')
    console.log('   2. 在"箴言库 (Quotes)"输入框中粘贴上述数据库ID')
    console.log('   3. 保存配置')
    console.log('   4. 返回首页查看每日箴言')
    console.log('')

  } catch (error) {
    console.error('\n❌ 执行出错:', error.message)
  } finally {
    rl.close()
  }
}

// 运行主函数
main()
