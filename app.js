const userManager = require('./utils/userManager.js')
const { getCurrentEnv } = require('./envList.js')

App({
  globalData: {
    userInfo: null,
    memoList: [],
    wisdomQuotes: [],
    currentQuote: null,
    reminderSettings: {
      enabled: true,
      interval: 60 // 默认1小时提醒一次
    },
    cloudReady: false,
    cloudEnvId: null
  },

  onLaunch: function() {
    console.log('App Launch')
    
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
    
    // 加载箴言库
    this.loadWisdomQuotes()
    
    // 设置每日箴言
    this.setDailyQuote()
    
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
      
      const reminderSettings = wx.getStorageSync('reminderSettings')
      if (reminderSettings) {
        this.globalData.reminderSettings = reminderSettings
      }
    } catch (e) {
      console.error('加载本地数据失败:', e)
    }
  },

  // 加载箴言库
  loadWisdomQuotes: function() {
    this.globalData.wisdomQuotes = [
      "今天的努力，是为了明天的惊喜。",
      "记录生活的美好，让每个瞬间都有意义。",
      "时间是最好的见证者，坚持是最美的回答。",
      "每一个小小的记录，都是成长的足迹。",
      "用心感受每一刻，让平凡的日子闪闪发光。",
      "善待时光，善待自己，记录属于你的故事。",
      "不是每天都有新鲜事，但每天都值得记录。",
      "生活不在于长短，而在于是否精彩。",
      "用文字定格时光，用声音留住回忆。",
      "每个今天，都是明天的珍贵回忆。",
      "保持好奇心，记录发现的惊喜。",
      "小小的坚持，会带来大大的改变。",
      "今天比昨天进步一点点，就是成功。",
      "记录是为了更好地前行。",
      "在平凡中发现不平凡，在记录中找到意义。"
    ]
  },

  // 设置每日箴言
  setDailyQuote: function() {
    const today = new Date().toDateString()
    const lastQuoteDate = wx.getStorageSync('lastQuoteDate')
    
    if (lastQuoteDate !== today) {
      // 新的一天，随机选择一句箴言
      const randomIndex = Math.floor(Math.random() * this.globalData.wisdomQuotes.length)
      this.globalData.currentQuote = this.globalData.wisdomQuotes[randomIndex]
      
      // 保存今日箴言和日期
      wx.setStorageSync('currentQuote', this.globalData.currentQuote)
      wx.setStorageSync('lastQuoteDate', today)
    } else {
      // 使用已存储的今日箴言
      this.globalData.currentQuote = wx.getStorageSync('currentQuote')
    }
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
  deleteMemo: async function(id) {
    const memos = userManager.getUserMemos()
    const memoToDelete = memos.find(memo => memo.id === id)
    
    if (!memoToDelete) {
      console.error('要删除的备忘录不存在:', id)
      return false
    }

    // 先删除本地记录
    const filteredMemos = memos.filter(memo => memo.id !== id)
    userManager.saveUserMemos(filteredMemos)

    // 尝试从Notion删除（异步进行，不阻塞界面）
    this.tryDeleteFromNotion(memoToDelete)
    
    return true
  },

  // 尝试从Notion删除备忘录
  tryDeleteFromNotion: async function(memo) {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('没有当前用户，跳过Notion删除')
        return
      }

      const apiService = require('./utils/apiService.js')
      const result = await apiService.deleteUserMemo(currentUser.email, memo)
      
      if (result.success) {
        console.log('Notion删除成功:', result.message)
      } else {
        console.error('Notion删除失败:', result.error)
      }
    } catch (error) {
      console.error('Notion删除异常:', error)
    }
  },

  // 更新提醒设置
  updateReminderSettings: function(settings) {
    this.globalData.reminderSettings = { ...this.globalData.reminderSettings, ...settings }
    wx.setStorageSync('reminderSettings', this.globalData.reminderSettings)
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
    const quotes = this.globalData.wisdomQuotes
    const randomIndex = Math.floor(Math.random() * quotes.length)
    const newQuote = {
      id: Date.now(),
      content: quotes[randomIndex],
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
    return {
      quote: {
        id: Date.now(),
        content: categoryQuotes[randomIndex],
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
      targetDate: goalData.targetDate || '',
      tags: goalData.tags || [],
      milestones: [],
      totalTimeInvestment: 0,
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