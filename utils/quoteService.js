/**
 * 箴言管理服务
 * 负责箴言的加载、选择、统计和同步
 */

const notionApiService = require('./notionApiService.js')
const userManager = require('./userManager.js')

/**
 * 默认箴言库（系统内置）
 * 统一使用content字段作为箴言内容，保留quote字段兼容
 */
const DEFAULT_QUOTES = [
  { content: "今天的努力，是为了明天的惊喜。", quote: "今天的努力，是为了明天的惊喜。", category: "励志", author: "系统默认", source: "系统默认" },
  { content: "记录生活的美好，让每个瞬间都有意义。", quote: "记录生活的美好，让每个瞬间都有意义。", category: "记录", author: "系统默认", source: "系统默认" },
  { content: "时间是最好的见证者，坚持是最美的回答。", quote: "时间是最好的见证者，坚持是最美的回答。", category: "坚持", author: "系统默认", source: "系统默认" },
  { content: "每一个小小的记录，都是成长的足迹。", quote: "每一个小小的记录，都是成长的足迹。", category: "成长", author: "系统默认", source: "系统默认" },
  { content: "用心感受每一刻，让平凡的日子闪闪发光。", quote: "用心感受每一刻，让平凡的日子闪闪发光。", category: "人生", author: "系统默认", source: "系统默认" },
  { content: "善待时光，善待自己，记录属于你的故事。", quote: "善待时光，善待自己，记录属于你的故事。", category: "时间", author: "系统默认", source: "系统默认" },
  { content: "不是每天都有新鲜事，但每天都值得记录。", quote: "不是每天都有新鲜事，但每天都值得记录。", category: "记录", author: "系统默认", source: "系统默认" },
  { content: "生活不在于长短，而在于是否精彩。", quote: "生活不在于长短，而在于是否精彩。", category: "人生", author: "系统默认", source: "系统默认" },
  { content: "用文字定格时光，用声音留住回忆。", quote: "用文字定格时光，用声音留住回忆。", category: "记录", author: "系统默认", source: "系统默认" },
  { content: "每个今天，都是明天的珍贵回忆。", quote: "每个今天，都是明天的珍贵回忆。", category: "时间", author: "系统默认", source: "系统默认" },
  { content: "保持好奇心，记录发现的惊喜。", quote: "保持好奇心，记录发现的惊喜。", category: "成长", author: "系统默认", source: "系统默认" },
  { content: "小小的坚持，会带来大大的改变。", quote: "小小的坚持，会带来大大的改变。", category: "坚持", author: "系统默认", source: "系统默认" },
  { content: "今天比昨天进步一点点，就是成功。", quote: "今天比昨天进步一点点，就是成功。", category: "成长", author: "系统默认", source: "系统默认" },
  { content: "记录是为了更好地前行。", quote: "记录是为了更好地前行。", category: "记录", author: "系统默认", source: "系统默认" },
  { content: "在平凡中发现不平凡，在记录中找到意义。", quote: "在平凡中发现不平凡，在记录中找到意义。", category: "感悟", author: "系统默认", source: "系统默认" }
]

/**
 * 从Notion加载箴言库
 * @returns {Promise<Array>} 箴言列表
 */
async function loadQuotesFromNotion() {
  try {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.notionConfig) {
      console.log('📚 用户未配置Notion，使用默认箴言库')
      return DEFAULT_QUOTES
    }

    const { apiKey, databases } = currentUser.notionConfig
    const quotesDatabaseId = databases?.quotes

    if (!apiKey || !quotesDatabaseId) {
      console.log('📚 箴言库未配置，使用默认箴言库')
      return DEFAULT_QUOTES
    }

    console.log('📚 从Notion加载箴言库...')

    // 查询启用状态的箴言（或查询全部，客户端过滤）
    const queryBody = {
      filter: {
        property: 'Status',
        select: {
          equals: '启用'
        }
      }
    }

    const result = await notionApiService.queryDatabase(apiKey, quotesDatabaseId, queryBody)

    if (!result.success || !result.data || !result.data.results || result.data.results.length === 0) {
      console.log('📚 Notion箴言库为空，使用默认箴言库')
      return DEFAULT_QUOTES
    }

    // 解析Notion数据 - 数据在 result.data.results 中
    const quotes = result.data.results.map(page => {
      const props = page.properties
      return {
        id: page.id,
        content: getTitleValue(props.Quote), // 统一使用content字段
        quote: getTitleValue(props.Quote),   // 保留quote字段兼容
        author: getRichTextValue(props.Author),
        source: getRichTextValue(props.Source) || getRichTextValue(props.Author) || '未知来源',
        category: getSelectValue(props.Category) || '励志',
        tags: getMultiSelectValue(props.Tags) || [],
        displayCount: getNumberValue(props['Display Count']) || 0,
        lastDisplayedDate: getDateValue(props['Last Displayed Date']),
        isSystemDefault: getCheckboxValue(props['Is System Default']),
        isFavorite: false,
        usageCount: 0,
        createdAt: Date.now()
      }
    })

    console.log(`📚 成功从Notion加载 ${quotes.length} 条箴言`)

    // 合并默认箴言和Notion箴言
    return [...quotes, ...DEFAULT_QUOTES]
  } catch (error) {
    console.error('❌ 从Notion加载箴言失败:', error)
    return DEFAULT_QUOTES
  }
}

/**
 * 选择今日箴言
 * @param {Array} quotes - 箴言列表
 * @param {String} strategy - 选择策略: 'random'(随机) | 'least_displayed'(最少展示)
 * @returns {Object} 今日箴言
 */
function selectDailyQuote(quotes, strategy = 'random') {
  if (!quotes || quotes.length === 0) {
    return DEFAULT_QUOTES[0]
  }

  if (strategy === 'least_displayed') {
    // 选择展示次数最少的箴言
    const sorted = [...quotes].sort((a, b) => {
      const countA = a.displayCount || 0
      const countB = b.displayCount || 0
      return countA - countB
    })
    return sorted[0]
  }

  // 默认随机选择
  const today = new Date().toDateString()
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = seed % quotes.length
  return quotes[index]
}

/**
 * 更新箴言展示统计
 * @param {String} quoteId - 箴言ID
 */
async function updateQuoteDisplayStats(quoteId) {
  try {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.notionConfig) {
      return
    }

    const { apiKey } = currentUser.notionConfig

    // 获取当前箴言数据
    const pageResult = await notionApiService.getPage(apiKey, quoteId)
    if (!pageResult.success) {
      console.warn('⚠️ 无法获取箴言数据，跳过统计更新')
      return
    }

    const currentCount = getNumberValue(pageResult.data.properties['Display Count']) || 0

    // 更新展示次数和最后展示日期
    const properties = {
      'Display Count': {
        number: currentCount + 1
      },
      'Last Displayed Date': {
        date: {
          start: new Date().toISOString().split('T')[0]
        }
      }
    }

    await notionApiService.updatePageProperties(apiKey, quoteId, properties)
    console.log(`✅ 箴言展示统计已更新 (${currentCount + 1}次)`)
  } catch (error) {
    console.error('❌ 更新箴言统计失败:', error)
  }
}

/**
 * 初始化箴言库（将默认箴言导入到Notion）
 */
async function initializeQuotesDatabase() {
  try {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.notionConfig) {
      throw new Error('用户未配置Notion')
    }

    const { apiKey, databases } = currentUser.notionConfig
    const quotesDatabaseId = databases?.quotes

    if (!apiKey || !quotesDatabaseId) {
      throw new Error('箴言库未配置')
    }

    console.log('📚 开始初始化箴言库...')

    let successCount = 0
    for (const quote of DEFAULT_QUOTES) {
      const pageData = {
        parent: { database_id: quotesDatabaseId },
        properties: {
          'Quote': {
            title: [{ text: { content: quote.quote } }]
          },
          'Author': {
            rich_text: [{ text: { content: quote.author || '' } }]
          },
          'Category': {
            select: { name: quote.category }
          },
          'Status': {
            select: { name: '启用' }
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

      const result = await notionApiService.createPageGeneric(pageData, apiKey)
      if (result.success) {
        successCount++
      }
    }

    console.log(`✅ 箴言库初始化完成，成功导入 ${successCount}/${DEFAULT_QUOTES.length} 条箴言`)
    return {
      success: true,
      total: DEFAULT_QUOTES.length,
      imported: successCount
    }
  } catch (error) {
    console.error('❌ 初始化箴言库失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 添加自定义箴言
 */
async function addCustomQuote(quoteData) {
  try {
    console.log('🔧 addCustomQuote 开始执行...')
    console.log('📥 接收到的数据:', quoteData)

    const currentUser = userManager.getCurrentUser()
    console.log('👤 当前用户:', currentUser ? currentUser.email : 'null')

    if (!currentUser || !currentUser.notionConfig) {
      throw new Error('用户未配置Notion')
    }

    const { apiKey, databases } = currentUser.notionConfig
    const quotesDatabaseId = databases?.quotes

    console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'null')
    console.log('🗄️ 箴言库ID:', quotesDatabaseId)

    if (!apiKey || !quotesDatabaseId) {
      throw new Error('箴言库未配置')
    }

    const pageData = {
      parent: { database_id: quotesDatabaseId },
      properties: {
        'Quote': {
          title: [{ text: { content: quoteData.quote } }]
        },
        'Author': {
          rich_text: [{ text: { content: quoteData.author || '' } }]
        },
        'Source': {
          rich_text: [{ text: { content: quoteData.source || '' } }]
        },
        'Category': {
          select: { name: quoteData.category || '感悟' }
        },
        'Status': {
          select: { name: '启用' }
        },
        'Is System Default': {
          checkbox: false
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

    if (quoteData.tags && quoteData.tags.length > 0) {
      pageData.properties['Tags'] = {
        multi_select: quoteData.tags.map(tag => ({ name: tag }))
      }
    }

    console.log('📦 准备发送的pageData:', JSON.stringify(pageData, null, 2))
    console.log('🌐 调用 notionApiService.createPageGeneric...')

    const result = await notionApiService.createPageGeneric(pageData, apiKey)

    console.log('📡 Notion API返回:', result)

    return result
  } catch (error) {
    console.error('❌ 添加自定义箴言失败:', error)
    console.error('❌ 错误堆栈:', error.stack)
    return {
      success: false,
      error: error.message
    }
  }
}

// === 辅助函数 ===

function getTitleValue(property) {
  if (!property || !property.title || property.title.length === 0) return ''
  return property.title[0].plain_text || ''
}

function getRichTextValue(property) {
  if (!property || !property.rich_text || property.rich_text.length === 0) return ''
  return property.rich_text[0].plain_text || ''
}

function getSelectValue(property) {
  if (!property || !property.select) return ''
  return property.select.name || ''
}

function getMultiSelectValue(property) {
  if (!property || !property.multi_select) return []
  return property.multi_select.map(item => item.name)
}

function getNumberValue(property) {
  if (!property || property.number === null || property.number === undefined) return 0
  return property.number
}

function getDateValue(property) {
  if (!property || !property.date) return null
  return property.date.start || null
}

function getCheckboxValue(property) {
  if (!property || property.checkbox === undefined) return false
  return property.checkbox
}

module.exports = {
  DEFAULT_QUOTES,
  loadQuotesFromNotion,
  selectDailyQuote,
  updateQuoteDisplayStats,
  initializeQuotesDatabase,
  addCustomQuote
}
