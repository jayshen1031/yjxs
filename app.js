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
    
    // 异步同步到Notion（如果用户启用了同步）
    this.tryAutoSyncToNotion(memo)
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
      const result = await apiService.syncUserMemoToNotion(currentUser.id, memo)
      
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
      const result = await apiService.deleteUserMemo(currentUser.id, memo)
      
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
  }
})