// pages/knowledge/knowledge.js
const userManager = require('../../utils/userManager.js')
const notionApiService = require('../../utils/notionApiService.js')
const app = getApp()

Page({
  data: {
    knowledgeList: [],
    filteredList: [],
    categories: ['全部', '技术', '产品', '设计', '管理', '思考', '方法论', '其他'],
    selectedCategory: '全部',
    searchKeyword: '',
    loading: false,
    showAddModal: false,
    showDetailModal: false,

    // 详情弹窗数据
    detailContent: {
      title: '',
      content: '',
      url: '',
      markdownData: null
    },

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
          filter: {
            property: 'Status',
            select: {
              does_not_equal: '归档'
            }
          },
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
      content: null, // 完整内容存在页面body中，需要时再加载
      preview: '', // 预览文本不存储在属性中，需要时从页面内容截取
      category: this.getSelectValue(props.Category) || '其他',
      source: '实践', // 默认值，字段不存在
      importance: '一般', // 默认值，字段不存在
      status: this.getSelectValue(props.Status) || '已发布',
      tags: this.getMultiSelectValue(props.Tags) || [],
      readCount: 0, // Read Count字段不存在，设为默认值
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
        (item.content && item.content.toLowerCase().includes(keyword))
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

    // 🔍 调试日志：检查配置
    console.log('📋 当前用户:', currentUser)
    console.log('📋 Notion配置:', notionConfig)
    console.log('📋 databases对象:', notionConfig?.databases)
    console.log('📋 databases所有keys:', Object.keys(notionConfig?.databases || {}))
    console.log('📋 databases详细内容:', JSON.stringify(notionConfig?.databases, null, 2))
    console.log('📋 知识库数据库ID:', notionConfig?.databases?.knowledge)
    console.log('📋 知识库ID长度:', notionConfig?.databases?.knowledge?.length)
    console.log('📋 知识库ID是否包含空格:', notionConfig?.databases?.knowledge?.includes(' '))
    console.log('📋 其他数据库ID对比:')
    console.log('  - goals:', notionConfig?.databases?.goals)
    console.log('  - todos:', notionConfig?.databases?.todos)
    console.log('  - quotes:', notionConfig?.databases?.quotes)
    console.log('📋 notionConfig所有keys:', Object.keys(notionConfig || {}))

    // 🔧 临时修复：如果databases对象不存在，尝试从根级别获取
    let knowledgeDatabaseId = notionConfig?.databases?.knowledge

    // 如果找不到，检查是否需要初始化databases对象
    if (!knowledgeDatabaseId) {
      console.warn('⚠️ databases.knowledge不存在，尝试修复...')

      // 检查notionConfig是否有databases对象
      if (!notionConfig.databases) {
        wx.showModal({
          title: '配置需要更新',
          content: '检测到配置格式较旧，需要重新保存配置以支持八数据库架构。\n\n请前往"设置"->"Notion集成配置"重新保存。',
          showCancel: false,
          confirmText: '前往设置',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/settings/settings'
              })
            }
          }
        })
        return
      }

      wx.showToast({
        title: '请先在设置中配置知识库数据库ID',
        icon: 'none',
        duration: 3000
      })
      return
    }

    wx.showLoading({ title: editingId ? '更新中...' : '保存中...' })

    try {
      const properties = {
        'Title': { title: [{ text: { content: formData.title } }] },
        'Category': { select: { name: formData.category } },
        'Status': { select: { name: '已发布' } }
      }

      if (editingId) {
        // 更新
        await notionApiService.updatePageGeneric(
          editingId,
          properties,
          notionConfig.apiKey
        )
        // TODO: 更新页面内容需要使用 blocks API
        wx.hideLoading()
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        // 新增 - 混合方案：Preview存属性，完整内容存页面body
        const pageData = {
          parent: { database_id: notionConfig.databases.knowledge },
          properties: properties,
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{
                  type: 'text',
                  text: { content: formData.content }
                }]
              }
            }
          ]
        }
        await notionApiService.createPageGeneric(pageData, notionConfig.apiKey)
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
      }

      this.hideModal()
      this.loadKnowledge()
    } catch (error) {
      console.error('保存失败:', error)
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  // 查看详情
  viewDetail: async function(e) {
    console.log('🔍 viewDetail被调用')
    const id = e.currentTarget.dataset.id
    console.log('📋 知识ID:', id)

    const item = this.data.knowledgeList.find(k => k.id === id)
    console.log('📋 找到的知识条目:', item)

    if (!item) {
      wx.showToast({ title: '找不到该知识条目', icon: 'error' })
      return
    }

    const currentUser = userManager.getCurrentUser()
    const notionConfig = currentUser.notionConfig

    wx.showLoading({ title: '加载内容...' })

    try {
      // 如果没有完整内容，从Notion加载
      let fullContent = item.content
      console.log('📋 当前content:', fullContent)

      if (!fullContent) {
        console.log('📋 开始从Notion加载页面内容...')
        const result = await notionApiService.getPageBlocks(
          notionConfig.apiKey,
          id
        )
        console.log('📋 Notion返回结果:', result)

        if (result.success && result.blocks.length > 0) {
          // 提取所有paragraph block的文本
          fullContent = result.blocks
            .filter(block => block.type === 'paragraph')
            .map(block => block.paragraph?.rich_text?.[0]?.plain_text || '')
            .join('\n')
          console.log('📋 提取的完整内容:', fullContent)
        }
      }

      wx.hideLoading()

      console.log('📋 准备显示详情弹窗，标题:', item.title)
      console.log('📋 内容长度:', (fullContent || item.preview || '').length, '字符')

      // 使用towxml解析Markdown
      const markdownContent = fullContent || item.preview || '暂无内容'
      const markdownData = app.towxml(markdownContent, 'markdown')
      console.log('📋 Markdown解析完成')

      // 使用自定义弹窗显示长内容
      this.setData({
        showDetailModal: true,
        detailContent: {
          title: item.title,
          content: markdownContent,
          url: item.url,
          markdownData: markdownData
        }
      })

      // 增加阅读次数
      this.increaseReadCount(id)
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 加载完整内容失败:', error)
      wx.showModal({
        title: item.title,
        content: item.preview || '加载失败，请稍后重试',
        showCancel: false
      })
    }
  },

  // 关闭详情弹窗
  hideDetailModal: function() {
    this.setData({ showDetailModal: false })
  },

  // 复制Notion链接
  openInNotion: function() {
    const url = this.data.detailContent.url
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: '链接已复制，可在Notion中编辑',
          icon: 'success',
          duration: 2000
        })
      }
    })
  },

  // 增加阅读次数
  increaseReadCount: async function(id) {
    // Read Count字段在数据库中不存在，暂时禁用此功能
    console.log('📖 阅读次数功能已禁用（数据库无Read Count字段）')
    // const currentUser = userManager.getCurrentUser()
    // const notionConfig = currentUser.notionConfig
    // const item = this.data.knowledgeList.find(k => k.id === id)
    //
    // try {
    //   await notionApiService.updatePageProperties(
    //     notionConfig.apiKey,
    //     id,
    //     { 'Read Count': { number: item.readCount + 1 } }
    //   )
    // } catch (error) {
    //   console.error('更新阅读次数失败:', error)
    // }
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
