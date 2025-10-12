const app = getApp()
const notionApiService = require('../../utils/notionApiService.js')
const { toast } = require('../../utils/util.js')

Page({
  data: {
    // 统计数据
    totalCount: 0,
    systemDefaultCount: 0,
    userCustomCount: 0,
    notionCount: 0,
    categoryStats: {},

    // 开心事项列表
    allHappyThings: [],
    filteredHappyThings: [],

    // 筛选和排序
    searchKeyword: '',
    selectedCategory: '',
    categories: ['全部', '运动', '美食', '社交', '娱乐', '学习', '创造', '自然', '放松', '生活'],
    sortIndex: 0,
    sortOptions: [
      { key: 'latest', label: '最新添加' },
      { key: 'usage', label: '使用次数' },
      { key: 'category', label: '分类排序' }
    ],

    // 添加/编辑弹窗
    showAddModal: false,
    editingItem: null,
    formData: {
      content: '',
      category: '运动',
      emoji: '',
      energy: 'low',
      duration: 30,
      difficulty: 'simple',
      cost: 'free',
      notes: ''
    },
    categoryIndex: 0,
    categoryOptions: ['运动', '美食', '社交', '娱乐', '学习', '创造', '自然', '放松', '生活'],
    energyIndex: 0,
    energyOptions: [
      { key: 'low', label: '轻松' },
      { key: 'medium', label: '适中' },
      { key: 'high', label: '需精力' }
    ],
    difficultyIndex: 0,
    difficultyOptions: [
      { key: 'simple', label: '简单' },
      { key: 'medium', label: '中等' },
      { key: 'hard', label: '困难' }
    ],
    costIndex: 0,
    costOptions: [
      { key: 'free', label: '免费' },
      { key: 'low', label: '低成本' },
      { key: 'medium', label: '中成本' },
      { key: 'high', label: '高成本' }
    ],

    // Notion配置
    hasNotionConfig: false,
    notionDatabaseId: '',
    isSyncing: false
  },

  onLoad: function() {
    this.checkNotionConfig()
    this.loadPageData()
  },

  onShow: function() {
    this.loadPageData()
  },

  onPullDownRefresh: function() {
    this.loadPageData()
    wx.stopPullDownRefresh()
  },

  // 检查Notion配置
  checkNotionConfig: function() {
    const currentUser = app.globalData.currentUser
    if (currentUser && currentUser.notionConfig) {
      // 优先使用databases.happyThings，向后兼容happyThingsDatabaseId
      const databaseId = currentUser.notionConfig.databases?.happyThings || currentUser.notionConfig.happyThingsDatabaseId
      if (databaseId) {
        this.setData({
          hasNotionConfig: true,
          notionDatabaseId: databaseId
        })
      }
    }
  },

  // 加载页面数据
  loadPageData: function() {
    this.loadLocalHappyThings()
    if (this.data.hasNotionConfig) {
      this.loadNotionHappyThings()
    }
    this.updateStatistics()
    this.filterHappyThings()
  },

  // 加载本地开心事项
  loadLocalHappyThings: function() {
    const localThings = app.globalData.happyThings || []
    this.setData({
      allHappyThings: localThings.map(item => ({
        ...item,
        source: 'local'
      })),
      localCount: localThings.length
    })
  },

  // 从Notion加载开心事项
  loadNotionHappyThings: async function() {
    if (!this.data.hasNotionConfig) return

    try {
      const currentUser = app.globalData.currentUser
      const apiKey = currentUser.notionConfig.apiKey
      // 优先使用databases.happyThings，向后兼容happyThingsDatabaseId
      const databaseId = currentUser.notionConfig.databases?.happyThings || currentUser.notionConfig.happyThingsDatabaseId

      wx.showLoading({ title: '加载中...' })

      const result = await notionApiService.queryDatabase(apiKey, databaseId, {})

      if (result.success && result.data.results) {
        const notionThings = result.data.results.map(page => ({
          id: page.id,
          content: this.getTitleValue(page.properties.Title) ||
                   this.getRichTextValue(page.properties.Content),
          category: this.getSelectValue(page.properties.Category) || '生活',
          emoji: this.getRichTextValue(page.properties.Emoji) || '😊',
          energy: this.mapEnergyLevel(this.getSelectValue(page.properties['Energy Level'])),
          duration: this.getNumberValue(page.properties.Duration) || 30,
          difficulty: this.mapDifficulty(this.getSelectValue(page.properties.Difficulty)),
          cost: this.mapCost(this.getSelectValue(page.properties.Cost)),
          usageCount: this.getNumberValue(page.properties['Usage Count']) || 0,
          lastUsed: this.getDateValue(page.properties['Last Used']),
          isActive: this.getCheckboxValue(page.properties['Is Active']),
          notes: this.getRichTextValue(page.properties.Notes),
          source: 'notion'
        }))

        // 合并本地和Notion数据
        const allThings = [...this.data.allHappyThings, ...notionThings]
        this.setData({
          allHappyThings: allThings,
          notionCount: notionThings.length
        })

        this.updateStatistics()
        this.filterHappyThings()
      }

      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      console.error('加载Notion开心事项失败:', error)
    }
  },

  // Notion字段解析辅助函数
  getTitleValue: function(property) {
    if (!property || !property.title || property.title.length === 0) return ''
    return property.title[0].plain_text
  },

  getRichTextValue: function(property) {
    if (!property || !property.rich_text || property.rich_text.length === 0) return ''
    return property.rich_text[0].plain_text
  },

  getSelectValue: function(property) {
    if (!property || !property.select) return ''
    return property.select.name
  },

  getNumberValue: function(property) {
    if (!property || property.number === null) return 0
    return property.number
  },

  getDateValue: function(property) {
    if (!property || !property.date) return ''
    return property.date.start
  },

  getCheckboxValue: function(property) {
    if (!property) return false
    return property.checkbox
  },

  // 映射函数
  mapEnergyLevel: function(value) {
    const map = { '轻松': 'low', '适中': 'medium', '需精力': 'high' }
    return map[value] || 'low'
  },

  mapDifficulty: function(value) {
    const map = { '简单': 'simple', '中等': 'medium', '困难': 'hard' }
    return map[value] || 'simple'
  },

  mapCost: function(value) {
    const map = { '免费': 'free', '低成本': 'low', '中成本': 'medium', '高成本': 'high' }
    return map[value] || 'free'
  },

  // 更新统计数据
  updateStatistics: function() {
    const allThings = this.data.allHappyThings
    const categoryStats = {}
    let systemDefaultCount = 0
    let userCustomCount = 0

    allThings.forEach(item => {
      const category = item.category || '其他'
      categoryStats[category] = (categoryStats[category] || 0) + 1

      // 统计系统默认和用户自定义
      if (item.isSystemDefault) {
        systemDefaultCount++
      } else {
        userCustomCount++
      }
    })

    this.setData({
      totalCount: allThings.length,
      systemDefaultCount: systemDefaultCount,
      userCustomCount: userCustomCount,
      categoryStats: categoryStats
    })
  },

  // 筛选开心事项
  filterHappyThings: function() {
    let filtered = [...this.data.allHappyThings]

    // 搜索筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        (item.notes && item.notes.toLowerCase().includes(keyword))
      )
    }

    // 分类筛选
    if (this.data.selectedCategory && this.data.selectedCategory !== '全部') {
      filtered = filtered.filter(item => item.category === this.data.selectedCategory)
    }

    // 排序
    const sortKey = this.data.sortOptions[this.data.sortIndex].key
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'latest':
          return (b.id || 0) - (a.id || 0)
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0)
        case 'category':
          return (a.category || '').localeCompare(b.category || '')
        default:
          return 0
      }
    })

    this.setData({
      filteredHappyThings: filtered
    })
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.filterHappyThings()
  },

  // 分类筛选
  filterByCategory: function(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
    this.filterHappyThings()
  },

  // 排序方式改变
  onSortChange: function(e) {
    this.setData({
      sortIndex: parseInt(e.detail.value)
    })
    this.filterHappyThings()
  },

  // 显示添加弹窗
  addHappyThing: function() {
    this.setData({
      showAddModal: true,
      editingItem: null,
      formData: {
        content: '',
        category: '运动',
        emoji: '',
        energy: 'low',
        duration: 30,
        difficulty: 'simple',
        cost: 'free',
        notes: ''
      },
      categoryIndex: 0,
      energyIndex: 0,
      difficultyIndex: 0,
      costIndex: 0
    })
  },

  // 编辑开心事项
  editHappyThing: function(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.allHappyThings.find(t => t.id === id)

    if (item) {
      const categoryIndex = this.data.categoryOptions.indexOf(item.category)
      const energyIndex = this.data.energyOptions.findIndex(o => o.key === item.energy)
      const difficultyIndex = this.data.difficultyOptions.findIndex(o => o.key === item.difficulty)
      const costIndex = this.data.costOptions.findIndex(o => o.key === item.cost)

      this.setData({
        showAddModal: true,
        editingItem: item,
        formData: {
          content: item.content,
          category: item.category,
          emoji: item.emoji,
          energy: item.energy,
          duration: item.duration || 30,
          difficulty: item.difficulty || 'simple',
          cost: item.cost || 'free',
          notes: item.notes || ''
        },
        categoryIndex: Math.max(0, categoryIndex),
        energyIndex: Math.max(0, energyIndex),
        difficultyIndex: Math.max(0, difficultyIndex),
        costIndex: Math.max(0, costIndex)
      })
    }
  },

  // 删除开心事项
  deleteHappyThing: function(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.allHappyThings.find(t => t.id === id)

    if (item) {
      // 检查是否是系统默认事项
      if (item.isSystemDefault) {
        wx.showModal({
          title: '无法删除',
          content: '系统默认的开心事项不能删除，只能在Notion中编辑或禁用',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }

      wx.showModal({
        title: '删除开心事项',
        content: `确定要删除"${item.content}"吗？`,
        confirmText: '删除',
        confirmColor: '#ef4444',
        success: (res) => {
          if (res.confirm) {
            if (item.source === 'local') {
              app.deleteHappyThing(id)
              toast.success('已删除')
              this.loadPageData()
            } else if (item.source === 'notion') {
              // Notion删除（归档）
              this.archiveNotionHappyThing(id)
            }
          }
        }
      })
    }
  },

  // 归档Notion开心事项
  archiveNotionHappyThing: async function(pageId) {
    try {
      const currentUser = app.globalData.currentUser
      const apiKey = currentUser.notionConfig.apiKey

      wx.showLoading({ title: '删除中...' })

      await notionApiService.archivePage(pageId, apiKey)

      wx.hideLoading()
      toast.success('已删除')
      this.loadPageData()
    } catch (error) {
      wx.hideLoading()
      toast.error('删除失败')
      console.error('归档Notion页面失败:', error)
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

  onEmojiInput: function(e) {
    this.setData({
      'formData.emoji': e.detail.value
    })
  },

  onDurationInput: function(e) {
    this.setData({
      'formData.duration': parseInt(e.detail.value) || 30
    })
  },

  onNotesInput: function(e) {
    this.setData({
      'formData.notes': e.detail.value
    })
  },

  onCategoryChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      categoryIndex: index,
      'formData.category': this.data.categoryOptions[index]
    })
  },

  onEnergyChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      energyIndex: index,
      'formData.energy': this.data.energyOptions[index].key
    })
  },

  onDifficultyChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      difficultyIndex: index,
      'formData.difficulty': this.data.difficultyOptions[index].key
    })
  },

  onCostChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      costIndex: index,
      'formData.cost': this.data.costOptions[index].key
    })
  },

  // 确认添加/编辑
  confirmAddHappyThing: async function() {
    const { content, category, emoji, energy, duration, difficulty, cost, notes } = this.data.formData

    if (!content.trim()) {
      toast.error('请输入开心事项内容')
      return
    }

    const happyThingData = {
      content: content.trim(),
      category: category,
      emoji: emoji || '😊',
      energy: energy,
      duration: duration,
      difficulty: difficulty,
      cost: cost,
      notes: notes
    }

    if (this.data.editingItem) {
      // 编辑模式
      if (this.data.editingItem.source === 'local') {
        app.updateHappyThing(this.data.editingItem.id, happyThingData)
        toast.success('已更新')
      } else if (this.data.editingItem.source === 'notion' && this.data.hasNotionConfig) {
        await this.updateNotionHappyThing(this.data.editingItem.id, happyThingData)
      }
    } else {
      // 添加模式
      if (this.data.hasNotionConfig) {
        // 同步到Notion
        await this.createNotionHappyThing(happyThingData)
      } else {
        // 仅本地保存
        app.addHappyThing(happyThingData)
        toast.success('已添加')
      }
    }

    this.closeAddModal()
    this.loadPageData()
  },

  // 创建Notion开心事项
  createNotionHappyThing: async function(data) {
    try {
      const currentUser = app.globalData.currentUser
      const apiKey = currentUser.notionConfig.apiKey
      // 优先使用databases.happyThings，向后兼容happyThingsDatabaseId
      const databaseId = currentUser.notionConfig.databases?.happyThings || currentUser.notionConfig.happyThingsDatabaseId

      wx.showLoading({ title: '保存中...' })

      const properties = {
        'Title': {
          title: [{ text: { content: data.content } }]
        },
        'Content': {
          rich_text: [{ text: { content: data.content } }]
        },
        'Category': {
          select: { name: data.category }
        },
        'Emoji': {
          rich_text: [{ text: { content: data.emoji } }]
        },
        'Energy Level': {
          select: { name: this.getEnergyLabel(data.energy) }
        },
        'Duration': {
          number: data.duration
        },
        'Difficulty': {
          select: { name: this.getDifficultyLabel(data.difficulty) }
        },
        'Cost': {
          select: { name: this.getCostLabel(data.cost) }
        },
        'Is Active': {
          checkbox: true
        },
        'Usage Count': {
          number: 0
        },
        'User ID': {
          rich_text: [{ text: { content: currentUser.email || 'local' } }]
        }
      }

      if (data.notes) {
        properties['Notes'] = {
          rich_text: [{ text: { content: data.notes } }]
        }
      }

      const pageData = {
        parent: { database_id: databaseId },
        properties: properties
      }

      await notionApiService.createPageGeneric(pageData, apiKey)

      wx.hideLoading()
      toast.success('已保存到Notion')
    } catch (error) {
      wx.hideLoading()
      toast.error('保存失败')
      console.error('创建Notion页面失败:', error)
    }
  },

  // 更新Notion开心事项
  updateNotionHappyThing: async function(pageId, data) {
    try {
      const currentUser = app.globalData.currentUser
      const apiKey = currentUser.notionConfig.apiKey

      wx.showLoading({ title: '更新中...' })

      const properties = {
        'Title': {
          title: [{ text: { content: data.content } }]
        },
        'Content': {
          rich_text: [{ text: { content: data.content } }]
        },
        'Category': {
          select: { name: data.category }
        },
        'Emoji': {
          rich_text: [{ text: { content: data.emoji } }]
        },
        'Energy Level': {
          select: { name: this.getEnergyLabel(data.energy) }
        },
        'Duration': {
          number: data.duration
        },
        'Difficulty': {
          select: { name: this.getDifficultyLabel(data.difficulty) }
        },
        'Cost': {
          select: { name: this.getCostLabel(data.cost) }
        }
      }

      if (data.notes) {
        properties['Notes'] = {
          rich_text: [{ text: { content: data.notes } }]
        }
      }

      await notionApiService.updatePageGeneric(pageId, properties, apiKey)

      wx.hideLoading()
      toast.success('已更新')
    } catch (error) {
      wx.hideLoading()
      toast.error('更新失败')
      console.error('更新Notion页面失败:', error)
    }
  },

  // 标签转换辅助函数
  getEnergyLabel: function(key) {
    const map = { 'low': '轻松', 'medium': '适中', 'high': '需精力' }
    return map[key] || '轻松'
  },

  getDifficultyLabel: function(key) {
    const map = { 'simple': '简单', 'medium': '中等', 'hard': '困难' }
    return map[key] || '简单'
  },

  getCostLabel: function(key) {
    const map = { 'free': '免费', 'low': '低成本', 'medium': '中成本', 'high': '高成本' }
    return map[key] || '免费'
  },

  // 同步到Notion
  syncToNotion: async function() {
    if (!this.data.hasNotionConfig) {
      wx.showModal({
        title: '未配置Notion',
        content: '请先在设置页面配置Notion API密钥和数据库ID',
        showCancel: false
      })
      return
    }

    if (this.data.isSyncing) return

    wx.showModal({
      title: '同步到Notion',
      content: `将同步${this.data.localCount}条本地开心事项到Notion，确定继续吗？`,
      success: async (res) => {
        if (res.confirm) {
          this.setData({ isSyncing: true })
          wx.showLoading({ title: '同步中...' })

          let successCount = 0
          const localThings = this.data.allHappyThings.filter(t => t.source === 'local')

          for (const item of localThings) {
            try {
              await this.createNotionHappyThing(item)
              successCount++
            } catch (error) {
              console.error('同步失败:', item.content, error)
            }
          }

          wx.hideLoading()
          this.setData({ isSyncing: false })

          wx.showModal({
            title: '同步完成',
            content: `成功同步 ${successCount}/${localThings.length} 条`,
            showCancel: false,
            success: () => {
              this.loadPageData()
            }
          })
        }
      }
    })
  },

  // 获取能量等级的CSS类
  getEnergyClass: function(energy) {
    const map = { 'low': 'low', 'medium': 'medium', 'high': 'high' }
    return map[energy] || 'low'
  },

  // 获取能量等级文本
  getEnergyText: function(energy) {
    const map = { 'low': '轻松', 'medium': '适中', 'high': '需精力' }
    return map[energy] || '轻松'
  },

  // 页面分享
  onShareAppMessage: function() {
    return {
      title: '语寄心声 - 开心库',
      path: '/pages/happy-manager/happy-manager',
      imageUrl: '/images/share-happy.png'
    }
  }
})
