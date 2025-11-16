const app = getApp()
const { toast } = require('../../utils/util.js')
const quoteService = require('../../utils/quoteService.js')
const notionApiService = require('../../utils/notionApiService.js')
const userManager = require('../../utils/userManager.js')

Page({
  data: {
    // Tab状态
    activeTab: 'system', // system | my

    // 统计数据
    totalQuotes: 0,
    favoriteQuotes: 0,
    userQuotes: 0,
    notionQuotes: 0,

    // 当前箴言
    currentQuote: {},

    // 箴言列表
    allQuotes: [],
    systemQuotes: [],
    myQuotes: [],

    // 分类数据
    categories: [],
    categoriesData: {},
    selectedCategory: '',

    // 筛选和排序
    searchKeyword: '',
    sortIndex: 0,
    sortOptions: [
      { key: 'latest', label: '最新添加' },
      { key: 'usage', label: '使用次数' },
      { key: 'favorite', label: '收藏优先' },
      { key: 'category', label: '分类排序' }
    ],
    sourceFilter: 'all', // all | notion | local | system
    activeFilters: 0,

    // 弹窗状态
    showAddModal: false,
    showFilterModal: false,
    editingQuote: null,

    // 表单数据
    formData: {
      content: '',
      category: '励志',
      tags: [],
      source: '用户添加',
      isPinned: false  // ⭐ 新增：是否固定
    },
    tagsInput: '',
    categoryIndex: 0,
    categoryOptions: ['励志', '人生', '成长', '时间', '坚持', '记录', '感悟', '习惯', '梦想']
  },

  onLoad: function() {
    this.loadPageData()
  },

  onShow: function() {
    this.loadPageData()
  },

  // 加载页面数据
  loadPageData: async function() {
    wx.showLoading({ title: '加载中...' })

    try {
      // 从Notion加载箴言
      await this.loadQuotesFromNotion()

      // 加载本地箴言
      this.loadLocalQuotes()

      // 加载当前箴言
      this.loadCurrentQuote()

      // 更新统计
      this.updateStatistics()

      // 筛选数据
      this.filterQuotes()

      wx.hideLoading()
    } catch (error) {
      console.error('加载页面数据失败:', error)
      wx.hideLoading()
      toast.error('加载失败')
    }
  },

  // 从Notion加载箴言
  loadQuotesFromNotion: async function() {
    try {
      const quotes = await quoteService.loadQuotesFromNotion()
      console.log('从Notion加载到的箴言:', quotes)

      // 标记为Notion同步
      const notionQuotes = quotes.map(q => ({
        ...q,
        isNotionSync: q.id && q.id.length > 20, // Notion ID是长UUID
        createdTime: this.formatTime(q.createdAt || Date.now())
      }))

      this.setData({
        allQuotes: notionQuotes,
        notionQuotes: notionQuotes.filter(q => q.isNotionSync).length
      })
    } catch (error) {
      console.error('从Notion加载箴言失败:', error)
    }
  },

  // 加载本地箴言（已禁用 - 只使用Notion数据）
  loadLocalQuotes: function() {
    // 不再加载本地存储的箴言，完全依赖Notion数据库
//     console.log('📝 跳过本地箴言加载，仅使用Notion数据')
  },

  // 加载当前箴言
  loadCurrentQuote: function() {
    const currentQuote = app.globalData.currentQuote || {}
    this.setData({ currentQuote })
  },

  // 更新统计数据
  updateStatistics: function() {
    const allQuotes = this.data.allQuotes
    const favoriteQuotes = allQuotes.filter(q => q.isFavorite).length

    // 系统箴言：source不是'用户添加'的
    const systemQuotes = allQuotes.filter(q => q.source !== '用户添加')

    // 我的箴言：source是'用户添加'的
    const myQuotes = allQuotes.filter(q => q.source === '用户添加')

    // 统计分类
    const categoriesData = {}
    allQuotes.forEach(q => {
      const category = q.category || '未分类'
      categoriesData[category] = (categoriesData[category] || 0) + 1
    })

    this.setData({
      totalQuotes: allQuotes.length,
      favoriteQuotes: favoriteQuotes,
      userQuotes: myQuotes.length,
      categoriesData: categoriesData,
      categories: Object.keys(categoriesData),
      systemQuotes: systemQuotes,
      myQuotes: myQuotes
    })
  },

  // 筛选箴言（简化版 - 只用于搜索和分类筛选）
  filterQuotes: function() {
    // 根据当前Tab获取对应的箴言列表
    let baseQuotes = this.data.activeTab === 'system' ? this.data.systemQuotes : this.data.myQuotes

    // 搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      baseQuotes = baseQuotes.filter(quote =>
        quote.content.toLowerCase().includes(keyword) ||
        (quote.tags || []).some(tag => tag.toLowerCase().includes(keyword)) ||
        (quote.category || '').toLowerCase().includes(keyword)
      )
    }

    // 分类筛选
    if (this.data.selectedCategory) {
      baseQuotes = baseQuotes.filter(quote => quote.category === this.data.selectedCategory)
    }

    // 排序
    const sortKey = this.data.sortOptions[this.data.sortIndex].key
    baseQuotes.sort((a, b) => {
      switch (sortKey) {
        case 'latest':
          return (b.createdAt || 0) - (a.createdAt || 0)
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0)
        case 'favorite':
          if (a.isFavorite && !b.isFavorite) return -1
          if (!a.isFavorite && b.isFavorite) return 1
          return (b.usageCount || 0) - (a.usageCount || 0)
        case 'category':
          return (a.category || '').localeCompare(b.category || '')
        default:
          return 0
      }
    })

    // 统计激活的筛选器数量
    let activeFilters = 0
    if (this.data.selectedCategory) activeFilters++
    if (this.data.searchKeyword) activeFilters++

    // 更新对应Tab的数据
    if (this.data.activeTab === 'system') {
      this.setData({
        systemQuotes: baseQuotes,
        activeFilters: activeFilters
      })
    } else {
      this.setData({
        myQuotes: baseQuotes,
        activeFilters: activeFilters
      })
    }
  },

  // Tab切换
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      searchKeyword: '', // 切换Tab时清空搜索
      selectedCategory: '' // 切换Tab时清空分类筛选
    })
    this.updateStatistics() // 重新分类箴言
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.filterQuotes()
  },

  // 分类筛选
  filterByCategory: function(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
    this.filterQuotes()
  },

  // 来源筛选
  filterBySource: function(e) {
    const source = e.currentTarget.dataset.source
    this.setData({
      sourceFilter: source
    })
  },

  // 排序变更
  onSortChange: function(e) {
    this.setData({
      sortIndex: parseInt(e.detail.value)
    })
    this.filterQuotes()
  },

  // 切换收藏状态
  toggleFavorite: async function(e) {
    const quoteId = e.currentTarget.dataset.id
    const allQuotes = this.data.allQuotes
    const quote = allQuotes.find(q => q.id === quoteId)

    if (!quote) return

    const newFavoriteState = !quote.isFavorite

    // 更新本地状态
    quote.isFavorite = newFavoriteState
    this.setData({ allQuotes: allQuotes })
    this.updateStatistics()
    this.filterQuotes()

    // 保存到本地
    const currentUser = userManager.getCurrentUser()
    if (currentUser) {
      const userQuotes = wx.getStorageSync(`quotes_${currentUser.id}`) || []
      const localQuote = userQuotes.find(q => q.id === quoteId)
      if (localQuote) {
        localQuote.isFavorite = newFavoriteState
        wx.setStorageSync(`quotes_${currentUser.id}`, userQuotes)
      }
    }

    // 如果是Notion箴言，同步到Notion
    if (quote.isNotionSync) {
      try {
        const currentUser = userManager.getCurrentUser()
        if (currentUser && currentUser.notionConfig) {
          const { apiKey } = currentUser.notionConfig
          await notionApiService.updatePageProperties(apiKey, quoteId, {
            'Status': {
              select: { name: newFavoriteState ? '收藏' : '启用' }
            }
          })
//           console.log('✅ 收藏状态已同步到Notion')
        }
      } catch (error) {
        console.error('同步收藏状态到Notion失败:', error)
      }
    }

    toast.success(newFavoriteState ? '已收藏' : '取消收藏')
  },

  // 切换当前箴言收藏状态
  toggleCurrentFavorite: function() {
    if (this.data.currentQuote.id) {
      this.toggleFavorite({
        currentTarget: {
          dataset: { id: this.data.currentQuote.id }
        }
      })
    }
  },

  // 使用指定箴言
  useThisQuote: function(e) {
    const quoteId = e.currentTarget.dataset.id
    const quote = this.data.allQuotes.find(q => q.id === quoteId)

    if (quote) {
      // 更新使用次数
      quote.usageCount = (quote.usageCount || 0) + 1

      // 设为当前箴言
      app.globalData.currentQuote = quote
      wx.setStorageSync('currentQuote', quote)

      this.setData({
        currentQuote: quote,
        allQuotes: this.data.allQuotes
      })

      // 更新到Notion
      if (quote.isNotionSync) {
        quoteService.updateQuoteDisplayStats(quoteId)
      }

      this.updateStatistics()
      this.filterQuotes()

      toast.success('已设为当前箴言')
    }
  },

  // 刷新当前箴言
  refreshCurrentQuote: function() {
    const quotes = this.data.allQuotes
    if (quotes.length === 0) {
      toast.error('箴言库为空')
      return
    }

    const randomIndex = Math.floor(Math.random() * quotes.length)
    const newQuote = quotes[randomIndex]

    app.globalData.currentQuote = newQuote
    wx.setStorageSync('currentQuote', newQuote)

    this.setData({
      currentQuote: newQuote
    })

    toast.success('已刷新箴言')
  },

  // 显示添加箴言弹窗
  addQuote: function() {
    this.setData({
      showAddModal: true,
      editingQuote: null,
      formData: {
        content: '',
        category: '励志',
        tags: [],
        source: '用户添加'
      },
      tagsInput: '',
      categoryIndex: 0
    })
  },

  // 编辑箴言
  editQuote: function(e) {
    const quoteId = e.currentTarget.dataset.id
    const quote = this.data.allQuotes.find(q => q.id === quoteId)

    if (!quote) return

    // 只允许编辑用户添加的箴言
    if (quote.source !== '用户添加') {
      toast.error('只能编辑自己添加的箴言')
      return
    }

    const categoryIndex = this.data.categoryOptions.indexOf(quote.category)

    this.setData({
      showAddModal: true,
      editingQuote: quote,
      formData: {
        content: quote.content || '',
        category: quote.category || '励志',
        tags: quote.tags || [],
        source: quote.source || '用户添加',
        isPinned: quote.isPinned || false  // ⭐ 新增：加载固定状态
      },
      tagsInput: (quote.tags || []).join(' '),
      categoryIndex: Math.max(0, categoryIndex)
    })
  },

  // 删除箴言
  deleteQuote: function(e) {
    const quoteId = e.currentTarget.dataset.id
    const quote = this.data.allQuotes.find(q => q.id === quoteId)

    if (!quote) return

    // 只允许删除用户添加的箴言
    if (quote.source !== '用户添加') {
      toast.error('只能删除自己添加的箴言')
      return
    }

    wx.showModal({
      title: '删除箴言',
      content: `确定要删除这条箴言吗？\n"${quote.content.substring(0, 30)}..."`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await this.performDelete(quoteId, quote)
        }
      }
    })
  },

  // 执行删除操作
  performDelete: async function(quoteId, quote) {
    try {
      wx.showLoading({ title: '删除中...' })

      // 只从Notion删除（设置状态为"禁用"）
      const currentUser = userManager.getCurrentUser()
      if (currentUser && currentUser.notionConfig) {
        const { apiKey } = currentUser.notionConfig

        // Notion不支持真正删除，我们将状态设为"禁用"
        await notionApiService.updatePageProperties(apiKey, quoteId, {
          'Status': {
            select: { name: '禁用' }
          }
        })
//         console.log('✅ 已在Notion中禁用箴言')
      }

      // 更新列表
      const allQuotes = this.data.allQuotes.filter(q => q.id !== quoteId)
      this.setData({ allQuotes: allQuotes })
      this.updateStatistics()
      this.filterQuotes()

      wx.hideLoading()
      toast.success('已删除')
    } catch (error) {
      console.error('删除箴言失败:', error)
      wx.hideLoading()
      toast.error('删除失败')
    }
  },

  // 关闭添加弹窗
  closeAddModal: function() {
    this.setData({
      showAddModal: false
    })
  },

  // 表单输入处理
  onContentInput: function(e) {
    this.setData({
      'formData.content': e.detail.value
    })
  },

  onCategoryChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      categoryIndex: index,
      'formData.category': this.data.categoryOptions[index]
    })
  },

  onPinnedChange: function(e) {
    this.setData({
      'formData.isPinned': e.detail.value
    })
  },

  onTagsInput: function(e) {
    const tagsInput = e.detail.value
    const tags = tagsInput.split(' ').filter(tag => tag.trim())

    // 去重
    const uniqueTags = [...new Set(tags)]

    this.setData({
      tagsInput: tagsInput,
      'formData.tags': uniqueTags
    })
  },

  onSourceInput: function(e) {
    this.setData({
      'formData.source': e.detail.value || '用户添加'
    })
  },

  // 确认添加/编辑箴言
  confirmAddQuote: async function() {
    const { content, category, tags, source, isPinned } = this.data.formData

    if (!content.trim()) {
      toast.error('请输入箴言内容')
      return
    }

    const quoteData = {
      content: content.trim(),
      category: category,
      tags: tags,
      source: source || '用户添加',
      isPinned: isPinned || false  // ⭐ 新增：固定状态
    }

    if (this.data.editingQuote) {
      // 编辑模式
      await this.performEdit(this.data.editingQuote.id, quoteData)
    } else {
      // 添加模式
      await this.performAdd(quoteData)
    }
  },

  // 执行添加操作
  performAdd: async function(quoteData) {
    wx.showLoading({ title: '保存中...' })

    try {
      const newQuote = await app.addUserQuote(quoteData)

      if (newQuote) {
        this.closeAddModal()
        await this.loadPageData()
        toast.success('箴言已添加并同步到Notion')
      } else {
        toast.error('添加失败')
      }
    } catch (error) {
      console.error('添加箴言失败:', error)
      toast.error('添加失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 执行编辑操作
  performEdit: async function(quoteId, quoteData) {
    wx.showLoading({ title: '更新中...' })

    try {
      // 只更新Notion，不使用本地存储
      const quote = this.data.allQuotes.find(q => q.id === quoteId)
      if (quote) {
        const currentUser = userManager.getCurrentUser()
        if (currentUser && currentUser.notionConfig) {
          const { apiKey } = currentUser.notionConfig

          const properties = {
            'Quote': {
              title: [{ text: { content: quoteData.content } }]
            },
            'Category': {
              select: { name: quoteData.category }
            },
            'Is Pinned': {
              checkbox: quoteData.isPinned || false  // ⭐ 新增：更新固定状态
            }
          }

          if (quoteData.tags && quoteData.tags.length > 0) {
            properties['Tags'] = {
              multi_select: quoteData.tags.map(tag => ({ name: tag }))
            }
          }

          await notionApiService.updatePageProperties(apiKey, quoteId, properties)
//           console.log('✅ 箴言已同步到Notion')
        }
      }

      this.closeAddModal()
      await this.loadPageData()
      toast.success('箴言已更新')
    } catch (error) {
      console.error('更新箴言失败:', error)
      toast.error('更新失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 显示筛选弹窗
  showFilterModal: function() {
    this.setData({
      showFilterModal: true
    })
  },

  // 关闭筛选弹窗
  closeFilterModal: function() {
    this.setData({
      showFilterModal: false
    })
  },

  // 重置筛选
  resetFilters: function() {
    this.setData({
      selectedCategory: '',
      sourceFilter: 'all',
      sortIndex: 0,
      activeFilters: 0
    })
    this.filterQuotes()
  },

  // 应用筛选
  applyFilters: function() {
    this.filterQuotes()
    this.closeFilterModal()
  },

  // 阻止事件冒泡
  stopPropagation: function() {
    // 阻止点击模态框内容时关闭
  },

  // 格式化时间
  formatTime: function(timestamp) {
    if (!timestamp) return '未知时间'

    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60 * 1000) return '刚刚'
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`

    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  // 页面分享
  onShareAppMessage: function() {
    return {
      title: '语寄心声 - 箴言力量库',
      path: '/pages/quote-manager/quote-manager',
      imageUrl: '/images/share-quote.png'
    }
  }
})
