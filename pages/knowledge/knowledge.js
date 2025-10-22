// pages/knowledge/knowledge.js
const userManager = require('../../utils/userManager.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    knowledgeList: [],
    filteredList: [],
    categories: ['全部', '技术', '产品', '设计', '管理', '思考', '方法论', '其他'],
    selectedCategory: '全部',
    searchKeyword: '',
    loading: false,
    showAddModal: false,

    // 新增/编辑表单
    formData: {
      title: '',
      content: '',
      category: '技术',
      source: '实践',
      importance: '一般',
      tags: []
    },

    editingId: null,

    // 统计数据
    stats: {
      total: 0,
      favoriteCount: 0,
      categoryCount: {}
    }
  },

  onLoad: function() {
    this.loadKnowledge()
  },

  onShow: function() {
    this.loadKnowledge()
  },

  // 加载知识库数据
  loadKnowledge: async function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const notionConfig = currentUser.notionConfig
    if (!notionConfig?.databases?.knowledge) {
      this.setData({
        knowledgeList: [],
        filteredList: [],
        loading: false
      })
      return
    }

    this.setData({ loading: true })

    try {
      const result = await notionApiService.queryDatabase(
        notionConfig.apiKey,
        notionConfig.databases.knowledge,
        {
          sorts: [{ timestamp: 'created_time', direction: 'descending' }]
        }
      )

      if (result.success) {
        const knowledgeList = result.data.results.map(page => this.parseKnowledge(page))
        this.setData({
          knowledgeList,
          filteredList: knowledgeList
        })
        this.updateStats()
      }
    } catch (error) {
      console.error('加载知识库失败:', error)
      wx.showToast({ title: '加载失败', icon: 'error' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 解析知识条目
  parseKnowledge: function(page) {
    const props = page.properties
    return {
      id: page.id,
      title: this.getTitleValue(props.Title),
      content: this.getRichTextValue(props.Content),
      preview: this.getRichTextValue(props.Preview),
      category: this.getSelectValue(props.Category) || '其他',
      source: this.getSelectValue(props.Source) || '实践',
      importance: this.getSelectValue(props.Importance) || '一般',
      status: this.getSelectValue(props.Status) || '已发布',
      tags: this.getMultiSelectValue(props.Tags),
      readCount: props['Read Count']?.number || 0,
      isFavorite: props['Is Favorite']?.checkbox || false,
      createdTime: page.created_time,
      url: page.url
    }
  },

  getTitleValue: function(prop) {
    return prop?.title?.[0]?.plain_text || ''
  },

  getRichTextValue: function(prop) {
    return prop?.rich_text?.[0]?.plain_text || ''
  },

  getSelectValue: function(prop) {
    return prop?.select?.name || ''
  },

  getMultiSelectValue: function(prop) {
    return prop?.multi_select?.map(item => item.name) || []
  },

  // 更新统计
  updateStats: function() {
    const { knowledgeList } = this.data
    const categoryCount = {}
    let favoriteCount = 0

    knowledgeList.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1
      if (item.isFavorite) favoriteCount++
    })

    this.setData({
      stats: {
        total: knowledgeList.length,
        favoriteCount,
        categoryCount
      }
    })
  },

  // 切换分类
  switchCategory: function(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category })
    this.filterList()
  },

  // 搜索
  onSearch: function(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.filterList()
  },

  // 筛选列表
  filterList: function() {
    const { knowledgeList, selectedCategory, searchKeyword } = this.data
    let filtered = knowledgeList

    // 分类筛选
    if (selectedCategory !== '全部') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    // 关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.preview.toLowerCase().includes(keyword)
      )
    }

    this.setData({ filteredList: filtered })
  },

  // 显示添加弹窗
  showAddDialog: function() {
    this.setData({
      showAddModal: true,
      editingId: null,
      formData: {
        title: '',
        content: '',
        category: '技术',
        source: '实践',
        importance: '一般',
        tags: []
      }
    })
  },

  // 隐藏弹窗
  hideModal: function() {
    this.setData({ showAddModal: false })
  },

  // 阻止事件冒泡
  stopPropagation: function() {
    // 空函数，用于阻止模态框内容区域的点击事件冒泡到遮罩层
  },

  // 表单输入
  onFormInput: function(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },

  onCategoryChange: function(e) {
    const categories = this.data.categories
    const index = parseInt(e.detail.value)
    this.setData({
      'formData.category': categories[index]
    })
  },

  onSourceChange: function(e) {
    const sources = ['书籍', '文章', '视频', '课程', '实践', '交流', '其他']
    this.setData({
      'formData.source': sources[e.detail.value]
    })
  },

  onImportanceChange: function(e) {
    const importance = ['核心', '重要', '一般']
    this.setData({
      'formData.importance': importance[e.detail.value]
    })
  },

  // 保存知识
  saveKnowledge: async function() {
    const { formData, editingId } = this.data

    if (!formData.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }

    const currentUser = userManager.getCurrentUser()
    const notionConfig = currentUser.notionConfig

    // 检查知识库数据库ID配置
    if (!notionConfig?.databases?.knowledge) {
      wx.showModal({
        title: '未配置知识库',
        content: '请先在"设置 > Notion集成配置 > 八数据库配置"中配置知识库数据库ID',
        showCancel: true,
        confirmText: '去配置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/notion-config/notion-config' })
          }
        }
      })
      return
    }

    wx.showLoading({ title: editingId ? '更新中...' : '保存中...' })

    try {
      const properties = {
        'Title': { title: [{ text: { content: formData.title } }] },
        'Content': { rich_text: [{ text: { content: formData.content } }] },
        'Preview': { rich_text: [{ text: { content: formData.content.substring(0, 200) } }] },
        'Markdown Content': { rich_text: [{ text: { content: formData.content } }] },
        'Category': { select: { name: formData.category } },
        'Source': { select: { name: formData.source } },
        'Importance': { select: { name: formData.importance } },
        'Status': { select: { name: '已发布' } },
        'User ID': { rich_text: [{ text: { content: currentUser.email } }] }
      }

      if (editingId) {
        // 更新
        await notionApiService.updatePageGeneric(
          editingId,
          properties,
          notionConfig.apiKey
        )
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        // 新增
        const pageData = {
          parent: { database_id: notionConfig.databases.knowledge },
          properties: properties
        }
        await notionApiService.createPageGeneric(pageData, notionConfig.apiKey)
        wx.showToast({ title: '保存成功', icon: 'success' })
      }

      this.hideModal()
      this.loadKnowledge()
    } catch (error) {
      console.error('保存失败:', error)
      wx.showToast({ title: '保存失败', icon: 'error' })
    } finally {
      wx.hideLoading()
    }
  },

  // 查看详情
  viewDetail: function(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.knowledgeList.find(k => k.id === id)

    wx.showModal({
      title: item.title,
      content: item.content || item.preview || '暂无内容',
      showCancel: true,
      cancelText: '关闭',
      confirmText: '在Notion中打开',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: item.url,
            success: () => {
              wx.showToast({ title: '链接已复制', icon: 'success' })
            }
          })
        }
      }
    })

    // 增加阅读次数
    this.increaseReadCount(id)
  },

  // 增加阅读次数
  increaseReadCount: async function(id) {
    const currentUser = userManager.getCurrentUser()
    const notionConfig = currentUser.notionConfig
    const item = this.data.knowledgeList.find(k => k.id === id)

    try {
      await notionApiService.updatePageProperties(
        notionConfig.apiKey,
        id,
        { 'Read Count': { number: item.readCount + 1 } }
      )
    } catch (error) {
      console.error('更新阅读次数失败:', error)
    }
  },

  // 切换收藏
  toggleFavorite: async function(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.knowledgeList.find(k => k.id === id)
    const currentUser = userManager.getCurrentUser()
    const notionConfig = currentUser.notionConfig

    try {
      await notionApiService.updatePageProperties(
        notionConfig.apiKey,
        id,
        { 'Is Favorite': { checkbox: !item.isFavorite } }
      )

      wx.showToast({
        title: item.isFavorite ? '已取消收藏' : '已收藏',
        icon: 'success'
      })

      this.loadKnowledge()
    } catch (error) {
      console.error('切换收藏失败:', error)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  // 删除知识
  deleteKnowledge: function(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.knowledgeList.find(k => k.id === id)

    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${item.title}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          const currentUser = userManager.getCurrentUser()
          const notionConfig = currentUser.notionConfig

          try {
            await notionApiService.updatePageProperties(
              notionConfig.apiKey,
              id,
              { 'Status': { select: { name: '归档' } } }
            )
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadKnowledge()
          } catch (error) {
            console.error('删除失败:', error)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  }
})
