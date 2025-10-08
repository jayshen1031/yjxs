const app = getApp()
const { toast } = require('../../utils/util.js')

Page({
  data: {
    // 统计数据
    totalQuotes: 0,
    favoriteQuotes: 0,
    userQuotes: 0,
    categoriesCount: 0,
    
    // 当前箴言
    currentQuote: {},
    
    // 箴言列表
    allQuotes: [],
    filteredQuotes: [],
    
    // 分类数据
    categories: [],
    categoriesData: {},
    allCategories: [],
    
    // 筛选和排序
    searchKeyword: '',
    selectedCategory: '',
    sortIndex: 0,
    sortOptions: [
      { key: 'latest', label: '最新添加' },
      { key: 'usage', label: '使用次数' },
      { key: 'favorite', label: '收藏优先' },
      { key: 'category', label: '分类排序' }
    ],
    
    // 添加/编辑弹窗
    showAddModal: false,
    editingQuote: null,
    formData: {
      content: '',
      category: '励志',
      tags: [],
      source: '用户添加'
    },
    tagsInput: '',
    categoryIndex: 0,
    categoryOptions: ['励志', '生活', '成长', '哲理', '记录', '时间', '自信', '心理', '决策', '自定义'],
    
    // 设置弹窗
    showSettingsModal: false,
    settings: {
      showFavoriteOnly: false,
      autoRefresh: true,
      refreshInterval: 'daily',
      categories: []
    },
    refreshIntervalIndex: 0,
    refreshIntervalOptions: [
      { key: 'daily', label: '每天' },
      { key: 'hourly', label: '每小时' },
      { key: 'manual', label: '手动' }
    ]
  },

  onLoad: function() {
    this.loadPageData()
  },

  onShow: function() {
    this.loadPageData()
  },

  // 加载页面数据
  loadPageData: function() {
    this.loadQuotesData()
    this.loadSettings()
    this.updateStatistics()
    this.filterQuotes()
  },

  // 加载箴言数据
  loadQuotesData: function() {
    const allQuotes = app.getAllQuotes()
    const currentQuote = app.globalData.currentQuote || {}
    const categoriesData = app.getQuoteCategories()
    
    this.setData({
      allQuotes: allQuotes,
      currentQuote: currentQuote,
      categories: Object.keys(categoriesData),
      categoriesData: categoriesData,
      allCategories: Object.keys(categoriesData)
    })
  },

  // 加载设置
  loadSettings: function() {
    const settings = app.globalData.quoteSettings
    const refreshIntervalIndex = this.data.refreshIntervalOptions.findIndex(
      option => option.key === settings.refreshInterval
    )
    
    this.setData({
      settings: settings,
      refreshIntervalIndex: Math.max(0, refreshIntervalIndex)
    })
  },

  // 更新统计数据
  updateStatistics: function() {
    const allQuotes = this.data.allQuotes
    const favoriteQuotes = allQuotes.filter(quote => quote.isFavorite).length
    const userQuotes = allQuotes.filter(quote => quote.source === '用户添加').length
    
    this.setData({
      totalQuotes: allQuotes.length,
      favoriteQuotes: favoriteQuotes,
      userQuotes: userQuotes,
      categoriesCount: this.data.categories.length
    })
  },

  // 筛选箴言
  filterQuotes: function() {
    let filtered = [...this.data.allQuotes]
    
    // 搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(quote => 
        quote.content.toLowerCase().includes(keyword) ||
        quote.tags.some(tag => tag.toLowerCase().includes(keyword)) ||
        quote.category.toLowerCase().includes(keyword)
      )
    }
    
    // 分类筛选
    if (this.data.selectedCategory) {
      filtered = filtered.filter(quote => quote.category === this.data.selectedCategory)
    }
    
    // 排序
    const sortKey = this.data.sortOptions[this.data.sortIndex].key
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'latest':
          return b.createdAt - a.createdAt
        case 'usage':
          return b.usageCount - a.usageCount
        case 'favorite':
          if (a.isFavorite && !b.isFavorite) return -1
          if (!a.isFavorite && b.isFavorite) return 1
          return b.usageCount - a.usageCount
        case 'category':
          return a.category.localeCompare(b.category)
        default:
          return 0
      }
    })
    
    this.setData({
      filteredQuotes: filtered
    })
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.filterQuotes()
  },

  // 搜索确认
  onSearchConfirm: function(e) {
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

  // 快速获取该分类的随机箴言
  getRandomQuoteFromCategory: function(e) {
    const category = e.currentTarget.dataset.category
    const app = getApp()
    
    const selectedQuote = app.getRandomQuoteByCategory(category)
    if (selectedQuote) {
      // 设置为当前箴言
      app.globalData.currentQuote = selectedQuote
      wx.setStorageSync('currentQuote', selectedQuote)
      
      this.setData({
        currentQuote: selectedQuote
      })
      
      // 更新统计和列表
      this.updateStatistics()
      this.filterQuotes()
      
      wx.showToast({
        title: `已获取${category}箴言`,
        icon: 'success',
        duration: 1500
      })
    } else {
      wx.showToast({
        title: `暂无${category}类箴言`,
        icon: 'none',
        duration: 1500
      })
    }
  },

  // 排序方式改变
  onSortChange: function(e) {
    this.setData({
      sortIndex: parseInt(e.detail.value)
    })
    this.filterQuotes()
  },

  // 切换收藏状态
  toggleFavorite: function(e) {
    const quoteId = e.currentTarget.dataset.id
    const isFavorite = app.toggleQuoteFavorite(quoteId)
    
    this.loadPageData()
    
    toast.success(isFavorite ? '已收藏' : '取消收藏')
  },

  // 切换当前箴言收藏状态
  toggleCurrentFavorite: function() {
    if (this.data.currentQuote.id) {
      const isFavorite = app.toggleQuoteFavorite(this.data.currentQuote.id)
      this.setData({
        'currentQuote.isFavorite': isFavorite
      })
      toast.success(isFavorite ? '已收藏' : '取消收藏')
    }
  },

  // 使用指定箴言
  useThisQuote: function(e) {
    const quoteId = e.currentTarget.dataset.id
    const quote = this.data.allQuotes.find(q => q.id === quoteId)
    
    if (quote) {
      app.updateQuoteUsage(quoteId)
      app.globalData.currentQuote = quote
      wx.setStorageSync('currentQuote', quote)
      
      this.setData({
        currentQuote: quote
      })
      
      this.updateStatistics()
      this.filterQuotes()
      
      toast.success('已设为当前箴言')
    }
  },

  // 刷新当前箴言
  refreshCurrentQuote: function() {
    const newQuote = app.refreshQuote()
    if (newQuote) {
      this.setData({
        currentQuote: newQuote
      })
      this.updateStatistics()
      this.filterQuotes()
      toast.success('已刷新箴言')
    }
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
    
    if (quote && quote.source === '用户添加') {
      const categoryIndex = this.data.categoryOptions.indexOf(quote.category)
      
      this.setData({
        showAddModal: true,
        editingQuote: quote,
        formData: {
          content: quote.content,
          category: quote.category,
          tags: quote.tags,
          source: quote.source
        },
        tagsInput: quote.tags.join(' '),
        categoryIndex: Math.max(0, categoryIndex)
      })
    }
  },

  // 删除箴言
  deleteQuote: function(e) {
    const quoteId = e.currentTarget.dataset.id
    const quote = this.data.allQuotes.find(q => q.id === quoteId)
    
    if (quote && quote.source === '用户添加') {
      wx.showModal({
        title: '删除箴言',
        content: `确定要删除这条箴言吗？\n"${quote.content.substring(0, 30)}..."`,
        confirmText: '删除',
        confirmColor: '#ef4444',
        success: (res) => {
          if (res.confirm) {
            const success = app.deleteUserQuote(quoteId)
            if (success) {
              this.loadPageData()
              toast.success('已删除')
            } else {
              toast.error('删除失败')
            }
          }
        }
      })
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

  onTagsInput: function(e) {
    const tagsInput = e.detail.value
    const tags = tagsInput.split(' ').filter(tag => tag.trim())
    
    this.setData({
      tagsInput: tagsInput,
      'formData.tags': tags
    })
  },

  onSourceInput: function(e) {
    this.setData({
      'formData.source': e.detail.value || '用户添加'
    })
  },

  // 确认添加/编辑箴言
  confirmAddQuote: function() {
    const { content, category, tags, source } = this.data.formData
    
    if (!content.trim()) {
      toast.error('请输入箴言内容')
      return
    }
    
    const quoteData = {
      content: content.trim(),
      category: category,
      tags: tags,
      source: source || '用户添加'
    }
    
    if (this.data.editingQuote) {
      // 编辑模式
      const success = app.updateQuote(this.data.editingQuote.id, quoteData)
      if (success) {
        toast.success('箴言已更新')
        this.closeAddModal()
        this.loadPageData()
      } else {
        toast.error('更新失败')
      }
    } else {
      // 添加模式
      const newQuote = app.addUserQuote(quoteData)
      if (newQuote) {
        toast.success('箴言已添加')
        this.closeAddModal()
        this.loadPageData()
      } else {
        toast.error('添加失败')
      }
    }
  },

  // 显示设置弹窗
  showSettings: function() {
    this.setData({
      showSettingsModal: true
    })
  },

  // 关闭设置弹窗
  closeSettingsModal: function() {
    this.setData({
      showSettingsModal: false
    })
  },

  // 设置项更改
  onShowFavoriteOnlyChange: function(e) {
    this.setData({
      'settings.showFavoriteOnly': e.detail.value
    })
  },

  onAutoRefreshChange: function(e) {
    this.setData({
      'settings.autoRefresh': e.detail.value
    })
  },

  onRefreshIntervalChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      refreshIntervalIndex: index,
      'settings.refreshInterval': this.data.refreshIntervalOptions[index].key
    })
  },

  // 切换分类启用状态
  toggleCategoryEnabled: function(e) {
    const category = e.currentTarget.dataset.category
    const categories = [...this.data.settings.categories]
    const index = categories.indexOf(category)
    
    if (index > -1) {
      categories.splice(index, 1)
    } else {
      categories.push(category)
    }
    
    this.setData({
      'settings.categories': categories
    })
  },

  // 保存设置
  saveSettings: function() {
    app.globalData.quoteSettings = { ...this.data.settings }
    app.saveQuoteSettings()
    
    this.closeSettingsModal()
    toast.success('设置已保存')
    
    // 重新设置当前箴言（应用新设置）
    app.setDailyQuote()
    this.loadPageData()
  },

  // 将中文分类转换为英文CSS类名
  getCategoryClass: function(category) {
    const categoryMap = {
      '励志': 'inspire',
      '生活': 'life', 
      '成长': 'growth',
      '哲理': 'philosophy',
      '记录': 'record',
      '时间': 'time',
      '自信': 'confidence',
      '心理': 'psychology',
      '决策': 'decision',
      '自定义': 'custom'
    }
    return categoryMap[category] || 'custom'
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