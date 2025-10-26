console.log('========================================')
console.log('[App.js] 开始执行')
console.log('[App.js] 时间:', new Date().toISOString())
console.log('========================================')

const userManager = require('./utils/userManager.js')
console.log('[App.js] userManager已加载')

const quoteService = require('./utils/quoteService.js')
console.log('[App.js] quoteService已加载')

const { getCurrentEnv } = require('./envList.js')
console.log('[App.js] envList已加载')

// 引入towxml
const Towxml = require('/towxml/index')
console.log('[App.js] Towxml已加载')

App({
  // towxml转换函数
  towxml: Towxml,

  globalData: {
    userInfo: null,
    memoList: [],
    wisdomQuotes: [],
    currentQuote: null,
    happyThings: [], // 开心库
    todayHappyThings: [], // 今日推荐的开心事项
    quoteSettings: {
      refreshInterval: 'daily', // 默认每日刷新
      autoRefresh: true,
      onlyMyQuotes: false // 只显示我的箴言
    },
    cloudReady: false,
    cloudEnvId: null
  },

  onLaunch: function() {
    console.log('========================================')
    console.log('[App] onLaunch 开始')
    console.log('========================================')

    // 启用云开发功能
    this.initCloudDev()

    // 初始化用户管理器
    this.initUserManager()

    // 检查登录状态 - 延迟执行，等待云开发初始化
    setTimeout(() => {
      this.checkLoginStatus()
    }, 1000)

    // 初始化本地存储
    this.initLocalStorage()

    // 加载箴言设置
    this.loadQuoteSettings()

    // 加载箴言库并设置每日箴言（需要等待异步加载完成）
    this.loadWisdomQuotes().then(() => {
      this.setDailyQuote()
    })

    // 加载开心库
    this.loadHappyThings()

    // 设置今日开心推荐
    this.setTodayHappyThings()

    // 检查权限
    this.checkPermissions()
  },

  // 云开发初始化方法
  initCloudDev: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    // 使用统一的环境配置
    const envId = getCurrentEnv()
    console.log('正在初始化云开发环境:', envId)

    try {
      wx.cloud.init({
        env: envId,
        traceUser: true
      })
      // 云开发环境初始化成功
      this.globalData.cloudReady = true
      this.globalData.cloudEnvId = envId
      console.log('语寄心声云开发初始化成功, 环境ID:', envId)
    } catch (error) {
      console.error('云开发初始化失败:', error)
      // 重试初始化（不追踪用户）
      setTimeout(() => {
        try {
          wx.cloud.init({
            env: envId,
            traceUser: false
          })
          this.globalData.cloudReady = true
          this.globalData.cloudEnvId = envId
          console.log('语寄心声云开发重试初始化成功, 环境ID:', envId)
        } catch (retryError) {
          console.error('云开发重试初始化失败:', retryError)
        }
      }, 2000)
    }
  },

  // 初始化用户管理器
  initUserManager: function() {
    // 用户管理器已经在userManager.js中自动初始化
    console.log('用户管理器初始化完成')
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const currentUser = userManager.getCurrentUser()
    const users = userManager.getUsers()
    
    // 如果没有任何用户或没有当前用户，跳转到登录页
    if (users.length === 0 || !currentUser) {
      console.log('没有登录用户，跳转到登录页')
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }, 1000)
      return false
    }

    console.log('当前用户:', currentUser.name)
    this.globalData.userInfo = currentUser
    return true
  },

  onShow: function() {
    console.log('App Show')
  },

  onHide: function() {
    console.log('App Hide')
  },

  // 初始化本地存储
  initLocalStorage: function() {
    try {
      const memoList = wx.getStorageSync('memoList')
      if (memoList) {
        this.globalData.memoList = memoList
      }
      
    } catch (e) {
      console.error('加载本地数据失败:', e)
    }
  },

  // 加载箴言库
  loadWisdomQuotes: async function() {
    try {
      console.log('📚 开始加载箴言库...')
      const quotes = await quoteService.loadQuotesFromNotion()
      this.globalData.wisdomQuotes = quotes
      console.log(`✅ 箴言库加载成功，共 ${quotes.length} 条`)
    } catch (error) {
      console.error('❌ 加载箴言库失败，使用默认箴言:', error)
      this.globalData.wisdomQuotes = quoteService.DEFAULT_QUOTES
    }
  },

  // 设置每日箴言
  setDailyQuote: async function() {
    const today = new Date().toDateString()
    const lastQuoteDate = wx.getStorageSync('lastQuoteDate')

    if (lastQuoteDate !== today) {
      // 新的一天，选择一句箴言
      const selectedQuote = quoteService.selectDailyQuote(
        this.globalData.wisdomQuotes,
        'random'  // 可选策略: 'random' 或 'least_displayed'
      )

      this.globalData.currentQuote = selectedQuote

      // 保存今日箴言和日期
      wx.setStorageSync('currentQuote', selectedQuote)
      wx.setStorageSync('lastQuoteDate', today)

      // 更新展示统计（如果有Notion ID）
      if (selectedQuote.id) {
        quoteService.updateQuoteDisplayStats(selectedQuote.id)
          .catch(err => console.warn('更新箴言统计失败:', err))
      }
    } else {
      // 使用已存储的今日箴言
      this.globalData.currentQuote = wx.getStorageSync('currentQuote')
    }
  },

  // 加载开心库
  loadHappyThings: function() {
    // 尝试从本地存储加载
    try {
      const savedHappyThings = wx.getStorageSync('happyThings')
      if (savedHappyThings && savedHappyThings.length > 0) {
        this.globalData.happyThings = savedHappyThings
        return
      }
    } catch (e) {
      console.error('加载开心库失败:', e)
    }

    // 如果没有保存的数据，使用默认开心库
    this.globalData.happyThings = [
      // 运动类
      { id: 'h1', content: '出门散步20分钟', category: '运动', emoji: '🚶', energy: 'low', isSystemDefault: true },
      { id: 'h2', content: '做10分钟拉伸运动', category: '运动', emoji: '🧘', energy: 'low', isSystemDefault: true },
      { id: 'h3', content: '跳一支喜欢的舞', category: '运动', emoji: '💃', energy: 'medium', isSystemDefault: true },
      { id: 'h4', content: '骑自行车兜风', category: '运动', emoji: '🚴', energy: 'medium', isSystemDefault: true },

      // 美食类
      { id: 'h5', content: '做一道拿手菜', category: '美食', emoji: '🍳', energy: 'medium', isSystemDefault: true },
      { id: 'h6', content: '品尝一家新餐厅', category: '美食', emoji: '🍽️', energy: 'low', isSystemDefault: true },
      { id: 'h7', content: '烘焙小点心', category: '美食', emoji: '🧁', energy: 'medium', isSystemDefault: true },
      { id: 'h8', content: '给自己泡杯好茶', category: '美食', emoji: '🍵', energy: 'low', isSystemDefault: true },

      // 社交类
      { id: 'h9', content: '给朋友打个电话', category: '社交', emoji: '📞', energy: 'low', isSystemDefault: true },
      { id: 'h10', content: '约朋友喝杯咖啡', category: '社交', emoji: '☕', energy: 'medium', isSystemDefault: true },
      { id: 'h11', content: '给家人发个小视频', category: '社交', emoji: '📹', energy: 'low', isSystemDefault: true },
      { id: 'h12', content: '加入一个兴趣小组', category: '社交', emoji: '👥', energy: 'medium', isSystemDefault: true },

      // 娱乐类
      { id: 'h13', content: '看一部喜剧电影', category: '娱乐', emoji: '🎬', energy: 'low', isSystemDefault: true },
      { id: 'h14', content: '听喜欢的音乐专辑', category: '娱乐', emoji: '🎵', energy: 'low', isSystemDefault: true },
      { id: 'h15', content: '玩一个轻松的游戏', category: '娱乐', emoji: '🎮', energy: 'low', isSystemDefault: true },
      { id: 'h16', content: '追一集有趣的剧', category: '娱乐', emoji: '📺', energy: 'low', isSystemDefault: true },

      // 学习类
      { id: 'h17', content: '读几页喜欢的书', category: '学习', emoji: '📖', energy: 'low', isSystemDefault: true },
      { id: 'h18', content: '学习一个新技能', category: '学习', emoji: '💡', energy: 'high', isSystemDefault: true },
      { id: 'h19', content: '看一个TED演讲', category: '学习', emoji: '🎓', energy: 'medium', isSystemDefault: true },
      { id: 'h20', content: '练习一门外语', category: '学习', emoji: '🌍', energy: 'medium', isSystemDefault: true },

      // 创造类
      { id: 'h21', content: '写写日记或随笔', category: '创造', emoji: '✍️', energy: 'low', isSystemDefault: true },
      { id: 'h22', content: '画一幅简单的画', category: '创造', emoji: '🎨', energy: 'medium', isSystemDefault: true },
      { id: 'h23', content: '做一个小手工', category: '创造', emoji: '✂️', energy: 'medium', isSystemDefault: true },
      { id: 'h24', content: '拍几张创意照片', category: '创造', emoji: '📷', energy: 'medium', isSystemDefault: true },

      // 自然类
      { id: 'h25', content: '晒晒太阳发呆', category: '自然', emoji: '☀️', energy: 'low', isSystemDefault: true },
      { id: 'h26', content: '去公园看看花', category: '自然', emoji: '🌸', energy: 'low', isSystemDefault: true },
      { id: 'h27', content: '观察窗外的云', category: '自然', emoji: '☁️', energy: 'low', isSystemDefault: true },
      { id: 'h28', content: '晚上看看星星', category: '自然', emoji: '⭐', energy: 'low', isSystemDefault: true },

      // 放松类
      { id: 'h29', content: '泡个热水澡', category: '放松', emoji: '🛁', energy: 'low', isSystemDefault: true },
      { id: 'h30', content: '做10分钟冥想', category: '放松', emoji: '🧘', energy: 'low', isSystemDefault: true },
      { id: 'h31', content: '午睡20分钟', category: '放松', emoji: '😴', energy: 'low', isSystemDefault: true },
      { id: 'h32', content: '听一段放松音乐', category: '放松', emoji: '🎼', energy: 'low', isSystemDefault: true },

      // 生活类
      { id: 'h33', content: '整理一下房间', category: '生活', emoji: '🧹', energy: 'medium', isSystemDefault: true },
      { id: 'h34', content: '给植物浇浇水', category: '生活', emoji: '🌱', energy: 'low', isSystemDefault: true },
      { id: 'h35', content: '换个新发型', category: '生活', emoji: '💇', energy: 'medium', isSystemDefault: true },
      { id: 'h36', content: '买束鲜花回家', category: '生活', emoji: '💐', energy: 'low', isSystemDefault: true }
    ]

    // 保存默认开心库
    this.saveHappyThings()
  },

  // 设置今日开心推荐
  setTodayHappyThings: function() {
    const today = new Date().toDateString()
    const lastHappyDate = wx.getStorageSync('lastHappyDate')

    if (lastHappyDate !== today) {
      // 新的一天，随机选择3个开心事项
      const shuffled = [...this.globalData.happyThings].sort(() => 0.5 - Math.random())
      this.globalData.todayHappyThings = shuffled.slice(0, 3)

      // 保存今日推荐和日期
      wx.setStorageSync('todayHappyThings', this.globalData.todayHappyThings)
      wx.setStorageSync('lastHappyDate', today)
    } else {
      // 使用已存储的今日推荐
      const saved = wx.getStorageSync('todayHappyThings')
      this.globalData.todayHappyThings = saved || []
    }
  },

  // 保存开心库
  saveHappyThings: function() {
    try {
      wx.setStorageSync('happyThings', this.globalData.happyThings)
    } catch (e) {
      console.error('保存开心库失败:', e)
    }
  },

  // 添加开心事项
  addHappyThing: function(happyThing) {
    const newThing = {
      id: 'h' + Date.now(),
      ...happyThing
    }
    this.globalData.happyThings.push(newThing)
    this.saveHappyThings()
    return newThing
  },

  // 删除开心事项
  deleteHappyThing: function(id) {
    this.globalData.happyThings = this.globalData.happyThings.filter(item => item.id !== id)
    this.saveHappyThings()
  },

  // 更新开心事项
  updateHappyThing: function(id, updates) {
    const index = this.globalData.happyThings.findIndex(item => item.id === id)
    if (index !== -1) {
      this.globalData.happyThings[index] = {
        ...this.globalData.happyThings[index],
        ...updates
      }
      this.saveHappyThings()
      return this.globalData.happyThings[index]
    }
    return null
  },

  // 刷新今日开心推荐
  refreshTodayHappyThings: function() {
    const shuffled = [...this.globalData.happyThings].sort(() => 0.5 - Math.random())
    this.globalData.todayHappyThings = shuffled.slice(0, 3)
    wx.setStorageSync('todayHappyThings', this.globalData.todayHappyThings)
    return this.globalData.todayHappyThings
  },

  // 检查权限
  checkPermissions: function() {
    // 检查录音权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          console.log('尚未授权录音权限')
        }
      }
    })
  },

  // 保存备忘录（支持多用户）
  saveMemo: function(memo) {
    // 使用用户管理器保存数据
    const memos = userManager.getUserMemos()
    memos.unshift(memo)
    userManager.saveUserMemos(memos)

    // ⚠️ 已在memo页面直接保存到Notion，不需要重复同步
    // this.tryAutoSyncToNotion(memo)
  },

  // 更新备忘录（编辑模式）
  updateMemo: function(memo) {
    console.log('🔄 更新备忘录到本地存储:', memo.id)
    const memos = userManager.getUserMemos()

    // 查找并更新现有记录
    const index = memos.findIndex(m => m.id === memo.id)

    if (index !== -1) {
      // 找到记录，更新
      memos[index] = memo
      console.log('✅ 找到并更新记录，索引:', index)
    } else {
      // 未找到记录，可能是从Notion加载的记录，添加到列表开头
      console.log('⚠️ 本地未找到记录，添加为新记录')
      memos.unshift(memo)
    }

    userManager.saveUserMemos(memos)
    console.log('✅ 备忘录已保存到本地存储')
  },

  // 尝试自动同步到Notion
  tryAutoSyncToNotion: async function(memo) {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser || !currentUser.notionConfig || !currentUser.notionConfig.enabled || !currentUser.notionConfig.syncEnabled) {
        console.log('用户未启用自动同步，跳过')
        return
      }

      console.log('开始自动同步到Notion:', memo.content.substring(0, 30) + '...')

      const apiService = require('./utils/apiService.js')
      const result = await apiService.syncUserMemoToNotion(currentUser.email, memo)
      
      if (result.success) {
        console.log('自动同步成功:', result.notionPageId)
      } else {
        console.error('自动同步失败:', result.error)
      }
    } catch (error) {
      console.error('自动同步异常:', error)
    }
  },

  // 获取备忘录列表（当前用户）
  getMemoList: function() {
    return userManager.getUserMemos()
  },

  // 删除备忘录
  deleteMemo: async function(id, memoData = null) {
    console.log('🗑️ 准备删除备忘录，ID:', id)

    const memos = userManager.getUserMemos()
    let memoToDelete = memos.find(memo => memo.id === id)

    // 如果本地没有找到，但传入了memoData（从Notion加载的数据），使用传入的数据
    if (!memoToDelete && memoData) {
      console.log('⚠️ 本地未找到备忘录，使用传入的Notion数据')
      memoToDelete = memoData
    }

    if (!memoToDelete) {
      console.error('❌ 要删除的备忘录不存在（本地和传入数据都没有）:', id)
      return false
    }

    console.log('📋 找到待删除的备忘录:', {
      id: memoToDelete.id,
      title: memoToDelete.title || memoToDelete.content?.substring(0, 20),
      notionPageId: memoToDelete.notionPageId || '未同步到Notion',
      hasActivities: !!(memoToDelete.activities && memoToDelete.activities.length > 0),
      source: memoData ? 'Notion传入数据' : '本地存储'
    })

    // 如果本地存在，删除本地记录
    if (memos.find(memo => memo.id === id)) {
      const filteredMemos = memos.filter(memo => memo.id !== id)
      userManager.saveUserMemos(filteredMemos)
      console.log('✅ 已从本地删除，剩余记录数:', filteredMemos.length)
    } else {
      console.log('⚠️ 本地不存在该记录，跳过本地删除')
    }

    // 尝试从Notion删除（异步进行，不阻塞界面）
    await this.tryDeleteFromNotion(memoToDelete)

    return true
  },

  // 尝试从Notion删除备忘录
  tryDeleteFromNotion: async function(memo) {
    try {
      console.log('🔄 开始从Notion删除...')

      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('没有当前用户，跳过Notion删除')
        return
      }

      if (!memo.notionPageId) {
        console.log('⚠️ 备忘录没有notionPageId，可能未同步到Notion，跳过Notion删除')
        return
      }

      console.log('🌐 准备调用Notion API删除:', memo.notionPageId)

      const apiService = require('./utils/apiService.js')
      const result = await apiService.deleteUserMemo(currentUser.email, memo)

      if (result.success) {
        console.log('✅ Notion删除成功:', result.message)
        wx.showToast({
          title: '已同步删除到Notion',
          icon: 'success',
          duration: 2000
        })
      } else {
        console.error('❌ Notion删除失败:', result.error)
        wx.showToast({
          title: 'Notion删除失败',
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('❌ Notion删除异常:', error)
      wx.showToast({
        title: '删除异常: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  },


  // 保存箴言设置
  saveQuoteSettings: function() {
    wx.setStorageSync('quoteSettings', this.globalData.quoteSettings)
  },

  // 加载箴言设置
  loadQuoteSettings: function() {
    try {
      const savedSettings = wx.getStorageSync('quoteSettings')
      if (savedSettings) {
        this.globalData.quoteSettings = savedSettings
      }
    } catch (e) {
      console.error('加载箴言设置失败:', e)
    }
  },

  // 格式化时间
  formatTime: function(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()

    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  // ========== 箴言系统相关方法 ==========

  // 获取箴言分类
  getQuoteCategories: function() {
    return {
      '励志': ['今天的努力，是为了明天的惊喜。', '时间是最好的见证者，坚持是最美的回答。', '小小的坚持,会带来大大的改变。'],
      '生活': ['记录生活的美好，让每个瞬间都有意义。', '善待时光，善待自己，记录属于你的故事。', '用心感受每一刻，让平凡的日子闪闪发光。'],
      '成长': ['每一个小小的记录，都是成长的足迹。', '今天比昨天进步一点点，就是成功。', '记录是为了更好地前行。'],
      '记录': ['不是每天都有新鲜事，但每天都值得记录。', '用文字定格时光，用声音留住回忆。', '在平凡中发现不平凡，在记录中找到意义。'],
      '时间': ['生活不在于长短，而在于是否精彩。', '每个今天，都是明天的珍贵回忆。', '保持好奇心，记录发现的惊喜。']
    }
  },

  // 获取所有箴言
  getAllQuotes: function() {
    return this.globalData.wisdomQuotes
  },

  // 刷新箴言
  refreshQuote: function() {
    let quotes = this.globalData.wisdomQuotes
    if (!quotes || quotes.length === 0) {
      console.warn('箴言库为空')
      return null
    }

    // ⭐ 根据设置筛选箴言
    const onlyMyQuotes = this.globalData.quoteSettings?.onlyMyQuotes || false
    if (onlyMyQuotes) {
      // 只显示用户自己添加的箴言（source为"我的"或"用户自定义"）
      quotes = quotes.filter(q => {
        if (typeof q === 'object') {
          const source = q.source || ''
          return source === '我的' || source === '用户自定义' || source === '自定义'
        }
        return false
      })

      console.log(`📝 只显示我的箴言，筛选后数量: ${quotes.length}`)

      if (quotes.length === 0) {
        console.warn('⚠️ 没有找到我的箴言，请先在箴言管理中添加')
        wx.showToast({
          title: '还没有自己的箴言哦',
          icon: 'none',
          duration: 2000
        })
        return null
      }
    }

    const randomIndex = Math.floor(Math.random() * quotes.length)
    const selectedQuote = quotes[randomIndex]

    // 如果已经是完整的箴言对象，直接使用
    if (typeof selectedQuote === 'object' && (selectedQuote.content || selectedQuote.quote)) {
      this.globalData.currentQuote = selectedQuote
      wx.setStorageSync('currentQuote', selectedQuote)
      return selectedQuote
    }

    // 兼容旧版本：如果是字符串，包装成对象
    const newQuote = {
      id: Date.now(),
      content: selectedQuote,
      quote: selectedQuote,
      category: '默认',
      isFavorite: false,
      usageCount: 0,
      source: '内置'
    }
    this.globalData.currentQuote = newQuote
    wx.setStorageSync('currentQuote', newQuote)
    return newQuote
  },

  // 切换箴言收藏状态（暂时只返回切换后的状态）
  toggleQuoteFavorite: function(quoteId) {
    // 简化实现：返回随机状态
    return Math.random() > 0.5
  },

  // 根据心情获取箴言
  getQuoteByMood: function(mood) {
    const categories = this.getQuoteCategories()
    const moodCategoryMap = {
      '沮丧': '励志',
      '焦虑': '励志',
      '迷茫': '成长',
      '疲惫': '生活',
      '孤独': '生活',
      '压力大': '励志',
      '失落': '成长',
      '困惑': '成长',
      '无聊': '记录',
      '开心': '生活',
      '平静': '时间',
      '充满动力': '励志'
    }

    const category = moodCategoryMap[mood] || '生活'
    const categoryQuotes = categories[category] || []

    if (categoryQuotes.length === 0) return null

    const randomIndex = Math.floor(Math.random() * categoryQuotes.length)
    const selectedQuote = categoryQuotes[randomIndex]

    // categoryQuotes是字符串数组，需要包装成对象
    return {
      quote: {
        id: Date.now(),
        content: selectedQuote,
        quote: selectedQuote,
        category: category,
        isFavorite: false,
        usageCount: 0,
        source: '内置'
      },
      category: category
    }
  },

  // 根据心情获取推荐分类
  getMoodBasedCategories: function(mood) {
    const moodCategoryMap = {
      '沮丧': ['励志', '成长'],
      '焦虑': ['励志', '生活'],
      '迷茫': ['成长', '时间'],
      '疲惫': ['生活', '时间'],
      '孤独': ['生活', '记录'],
      '压力大': ['励志', '成长'],
      '失落': ['成长', '励志'],
      '困惑': ['成长', '时间'],
      '无聊': ['记录', '生活'],
      '开心': ['生活', '记录'],
      '平静': ['时间', '记录'],
      '充满动力': ['励志', '成长']
    }
    return moodCategoryMap[mood] || ['生活']
  },

  // 根据分类设置箴言
  setQuoteByCategory: function(category) {
    const categories = this.getQuoteCategories()
    const categoryQuotes = categories[category] || []

    if (categoryQuotes.length === 0) return null

    const randomIndex = Math.floor(Math.random() * categoryQuotes.length)
    const newQuote = {
      id: Date.now(),
      content: categoryQuotes[randomIndex],
      category: category,
      isFavorite: false,
      usageCount: 0,
      source: '内置'
    }

    this.globalData.currentQuote = newQuote
    wx.setStorageSync('currentQuote', newQuote)
    return newQuote
  },

  // 添加用户箴言
  addUserQuote: async function(quoteData) {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.error('未登录')
        return null
      }

      const newQuote = {
        id: Date.now().toString(),
        content: quoteData.content,
        category: quoteData.category || '励志',
        tags: quoteData.tags || [],
        source: quoteData.source || '用户添加',
        isFavorite: false,
        usageCount: 0,
        createdAt: Date.now()
      }

      // 保存到用户的箴言库（本地）
      const userQuotes = wx.getStorageSync(`quotes_${currentUser.id}`) || []
      userQuotes.unshift(newQuote)
      wx.setStorageSync(`quotes_${currentUser.id}`, userQuotes)

      // 更新全局箴言库
      this.globalData.wisdomQuotes.push(newQuote.content)

      // 同步到Notion（如果已配置）
      console.log('🔍 检查Notion配置...')
      console.log('notionConfig:', currentUser.notionConfig)
      console.log('databases:', currentUser.notionConfig?.databases)
      console.log('quotes数据库ID:', currentUser.notionConfig?.databases?.quotes)

      if (currentUser.notionConfig?.databases?.quotes) {
        console.log('📝 同步箴言到Notion...')
        const quoteService = require('./utils/quoteService.js')

        const quotePayload = {
          quote: quoteData.content,
          author: quoteData.source || '用户添加',
          category: quoteData.category || '励志',
          tags: quoteData.tags || []
        }
        console.log('📦 箴言数据:', quotePayload)

        const notionResult = await quoteService.addCustomQuote(quotePayload)
        console.log('📡 Notion返回结果:', notionResult)

        if (notionResult.success) {
          console.log('✅ 箴言已同步到Notion，页面ID:', notionResult.data.id)
          // 更新本地箴言ID为Notion页面ID
          newQuote.id = notionResult.data.id
          userQuotes[0] = newQuote
          wx.setStorageSync(`quotes_${currentUser.id}`, userQuotes)
        } else {
          console.error('❌ 箴言Notion同步失败:', notionResult.error)
        }
      } else {
        console.warn('⚠️ 箴言库未配置，跳过Notion同步')
        console.log('当前用户Notion配置:', JSON.stringify(currentUser.notionConfig, null, 2))
      }

      return newQuote
    } catch (e) {
      console.error('添加箴言失败:', e)
      return null
    }
  },

  // 更新箴言
  updateQuote: function(quoteId, updates) {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.error('未登录')
        return false
      }

      const userQuotes = wx.getStorageSync(`quotes_${currentUser.id}`) || []
      const index = userQuotes.findIndex(q => q.id === quoteId)

      if (index === -1) {
        console.error('箴言不存在')
        return false
      }

      userQuotes[index] = {
        ...userQuotes[index],
        ...updates,
        updatedAt: Date.now()
      }

      wx.setStorageSync(`quotes_${currentUser.id}`, userQuotes)
      return true
    } catch (e) {
      console.error('更新箴言失败:', e)
      return false
    }
  },

  // 删除用户箴言
  deleteUserQuote: function(quoteId) {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.error('未登录')
        return false
      }

      const userQuotes = wx.getStorageSync(`quotes_${currentUser.id}`) || []
      const filteredQuotes = userQuotes.filter(q => q.id !== quoteId)

      wx.setStorageSync(`quotes_${currentUser.id}`, filteredQuotes)
      return true
    } catch (e) {
      console.error('删除箴言失败:', e)
      return false
    }
  },

  // 根据分类随机获取箴言
  getRandomQuoteByCategory: function(category) {
    const categories = this.getQuoteCategories()
    const categoryQuotes = categories[category] || []

    if (categoryQuotes.length === 0) return null

    const randomIndex = Math.floor(Math.random() * categoryQuotes.length)
    return {
      id: Date.now(),
      content: categoryQuotes[randomIndex],
      category: category,
      isFavorite: false,
      usageCount: 0,
      source: '内置'
    }
  },

  // 更新箴言使用次数
  updateQuoteUsage: function(quoteId) {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) return

      const userQuotes = wx.getStorageSync(`quotes_${currentUser.id}`) || []
      const index = userQuotes.findIndex(q => q.id === quoteId)

      if (index !== -1) {
        userQuotes[index].usageCount = (userQuotes[index].usageCount || 0) + 1
        userQuotes[index].lastUsedAt = Date.now()
        wx.setStorageSync(`quotes_${currentUser.id}`, userQuotes)
      }
    } catch (e) {
      console.error('更新箴言使用次数失败:', e)
    }
  },

  // ========== 目标系统相关方法 ==========

  // 获取目标统计
  getGoalStats: function() {
    const goals = this.getGoals()
    const active = goals.filter(g => g.status === '进行中').length
    const completed = goals.filter(g => g.status === '已完成').length
    const totalProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0)

    return {
      total: goals.length,
      active: active,
      completed: completed,
      averageProgress: goals.length > 0 ? Math.round(totalProgress / goals.length) : 0
    }
  },

  // 获取今日目标
  getTodayGoals: function() {
    const goals = this.getGoals()
    const today = new Date().toDateString()

    return goals.filter(goal => {
      if (goal.status === '已完成') return false
      if (!goal.targetDate) return false

      const targetDate = new Date(goal.targetDate).toDateString()
      return targetDate === today
    }).slice(0, 3)
  },

  // 获取所有目标
  getGoals: function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) return []

    try {
      const goals = wx.getStorageSync(`goals_${currentUser.id}`) || []
      return goals
    } catch (e) {
      console.error('获取目标失败:', e)
      return []
    }
  },

  // 创建目标
  createGoal: function(goalData) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('未登录')
    }

    const goals = this.getGoals()
    const newGoal = {
      id: Date.now().toString(),
      userId: currentUser.id,
      title: goalData.title,
      description: goalData.description || '',
      category: goalData.category || '个人成长',
      type: goalData.type || 'short',
      priority: goalData.priority || 'medium',
      status: '进行中',
      progress: 0,
      startDate: goalData.startDate || '', // 起始时间
      targetDate: goalData.targetDate || '',
      tags: goalData.tags || [],
      milestones: [],
      totalTimeInvestment: 0, // 实际投入时间（分钟数）
      estimatedHours: goalData.estimatedHours || 0, // 预计完成小时数
      createdTime: new Date().toISOString(),
      updatedTime: new Date().toISOString()
    }

    goals.unshift(newGoal)
    wx.setStorageSync(`goals_${currentUser.id}`, goals)
    return newGoal
  },

  // 更新目标
  updateGoal: function(goalId, updates) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('未登录')
    }

    const goals = this.getGoals()
    const goalIndex = goals.findIndex(g => g.id === goalId)

    if (goalIndex === -1) {
      throw new Error('目标不存在')
    }

    goals[goalIndex] = {
      ...goals[goalIndex],
      ...updates,
      updatedTime: new Date().toISOString()
    }

    wx.setStorageSync(`goals_${currentUser.id}`, goals)
    return goals[goalIndex]
  },

  // 更新目标进度
  updateGoalProgress: function(goalId, progress) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('未登录')
    }

    const goals = this.getGoals()
    const goalIndex = goals.findIndex(g => g.id === goalId)

    if (goalIndex === -1) {
      throw new Error('目标不存在')
    }

    goals[goalIndex] = {
      ...goals[goalIndex],
      progress: progress,
      updatedTime: new Date().toISOString()
    }

    // 如果进度达到100%，自动标记为已完成
    if (progress >= 100 && goals[goalIndex].status !== '已完成') {
      goals[goalIndex].status = '已完成'
      goals[goalIndex].completedTime = new Date().toISOString()
    }

    wx.setStorageSync(`goals_${currentUser.id}`, goals)
    return goals[goalIndex]
  },

  // 添加里程碑
  addMilestone: function(goalId, milestoneData) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('未登录')
    }

    const goals = this.getGoals()
    const goalIndex = goals.findIndex(g => g.id === goalId)

    if (goalIndex === -1) {
      throw new Error('目标不存在')
    }

    const newMilestone = {
      id: Date.now().toString(),
      title: milestoneData.title,
      description: milestoneData.description || '',
      targetDate: milestoneData.targetDate || '',
      completed: false,
      completedTime: '',
      createdTime: new Date().toISOString()
    }

    if (!goals[goalIndex].milestones) {
      goals[goalIndex].milestones = []
    }

    goals[goalIndex].milestones.push(newMilestone)
    goals[goalIndex].updatedTime = new Date().toISOString()

    wx.setStorageSync(`goals_${currentUser.id}`, goals)
    return newMilestone
  },

  // 完成里程碑
  completeMilestone: function(goalId, milestoneId) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('未登录')
    }

    const goals = this.getGoals()
    const goalIndex = goals.findIndex(g => g.id === goalId)

    if (goalIndex === -1) {
      throw new Error('目标不存在')
    }

    const milestones = goals[goalIndex].milestones || []
    const milestoneIndex = milestones.findIndex(m => m.id === milestoneId)

    if (milestoneIndex === -1) {
      throw new Error('里程碑不存在')
    }

    milestones[milestoneIndex].completed = !milestones[milestoneIndex].completed
    milestones[milestoneIndex].completedTime = milestones[milestoneIndex].completed
      ? new Date().toISOString()
      : ''

    goals[goalIndex].updatedTime = new Date().toISOString()

    wx.setStorageSync(`goals_${currentUser.id}`, goals)
    return milestones[milestoneIndex]
  },

  // 计算目标的实际时间投入（从历史记录中汇总）
  calculateGoalTimeInvestment: function(goalId) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) return 0

    try {
      // 获取所有记录
      const memos = wx.getStorageSync(`memos_${currentUser.id}`) || []

      // 累加所有时间投入
      let totalMinutes = 0

      memos.forEach(memo => {
        // 检查有价值的时间投入中关联此目标的条目
        if (memo.valuableTimeEntries && Array.isArray(memo.valuableTimeEntries)) {
          memo.valuableTimeEntries.forEach(entry => {
            if (entry.goalId === goalId) {
              totalMinutes += (entry.minutes || 0)
            }
          })
        }

        // 检查中性的时间投入中关联此目标的条目
        if (memo.neutralTimeEntries && Array.isArray(memo.neutralTimeEntries)) {
          memo.neutralTimeEntries.forEach(entry => {
            if (entry.goalId === goalId) {
              totalMinutes += (entry.minutes || 0)
            }
          })
        }

        // 检查无价值的时间投入中关联此目标的条目（也统计）
        if (memo.wastefulTimeEntries && Array.isArray(memo.wastefulTimeEntries)) {
          memo.wastefulTimeEntries.forEach(entry => {
            if (entry.goalId === goalId) {
              totalMinutes += (entry.minutes || 0)
            }
          })
        }
      })

      return totalMinutes
    } catch (e) {
      console.error('计算目标时间投入失败:', e)
      return 0
    }
  },

  // 更新目标的时间投入和进度
  updateGoalTimeAndProgress: function(goalId) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) return

    try {
      const goals = this.getGoals()
      const goalIndex = goals.findIndex(g => g.id === goalId)

      if (goalIndex === -1) return

      // 计算实际时间投入
      const totalMinutes = this.calculateGoalTimeInvestment(goalId)
      goals[goalIndex].totalTimeInvestment = totalMinutes

      // 根据时间投入自动计算进度
      const estimatedHours = goals[goalIndex].estimatedHours || 0
      if (estimatedHours > 0) {
        const estimatedMinutes = estimatedHours * 60
        const progress = Math.min(100, Math.round((totalMinutes / estimatedMinutes) * 100))
        goals[goalIndex].progress = progress
      }

      goals[goalIndex].updatedTime = new Date().toISOString()
      wx.setStorageSync(`goals_${currentUser.id}`, goals)
    } catch (e) {
      console.error('更新目标时间和进度失败:', e)
    }
  },

  // ========== 待办系统相关方法 ==========

  // 获取今日待办
  getTodayTodos: function() {
    const todos = this.getTodos()
    const today = new Date().toDateString()

    return todos.filter(todo => {
      if (!todo.dueDate) return false
      const dueDate = new Date(todo.dueDate).toDateString()
      return dueDate === today
    })
  },

  // 获取今日待办统计
  getTodayTodosStats: function() {
    const todayTodos = this.getTodayTodos()

    return {
      total: todayTodos.length,
      pending: todayTodos.filter(t => t.status === '待办').length,
      inProgress: todayTodos.filter(t => t.status === '进行中').length,
      completed: todayTodos.filter(t => t.status === '已完成').length
    }
  },

  // 获取所有待办
  getTodos: function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) return []

    try {
      const todos = wx.getStorageSync(`todos_${currentUser.id}`) || []
      return todos
    } catch (e) {
      console.error('获取待办失败:', e)
      return []
    }
  },

  // 更新待办
  updateTodo: function(todoId, updates) {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      throw new Error('未登录')
    }

    const todos = this.getTodos()
    const todoIndex = todos.findIndex(t => t.id === todoId)

    if (todoIndex === -1) {
      throw new Error('待办不存在')
    }

    todos[todoIndex] = {
      ...todos[todoIndex],
      ...updates,
      updatedTime: new Date().toISOString()
    }

    wx.setStorageSync(`todos_${currentUser.id}`, todos)
    return todos[todoIndex]
  }
})