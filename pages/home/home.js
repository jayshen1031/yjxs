const app = getApp()
const userManager = require('../../utils/userManager.js')

Page({
  data: {
    currentQuote: '',
    todayMemoCount: 0,
    totalMemoCount: 0,
    recentMemos: [],
    reminderEnabled: true,
    reminderInterval: 60,
    todayPlanning: null,
    planningDate: ''
  },

  onLoad: function() {
    this.loadPageData()
  },

  onShow: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }
    this.loadPageData()
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return false
    }
    return true
  },

  // 加载页面数据
  loadPageData: function() {
    // 获取今日箴言
    this.setData({
      currentQuote: app.globalData.currentQuote || '记录生活的美好，让每个瞬间都有意义。'
    })

    // 获取备忘录统计
    this.loadMemoStats()

    // 获取最近记录
    this.loadRecentMemos()

    // 获取提醒设置
    this.loadReminderSettings()

    // 获取今日规划
    this.loadTodayPlanning()
  },

  // 加载备忘录统计
  loadMemoStats: function() {
    const memoList = app.getMemoList()
    const today = new Date().toDateString()
    
    const todayMemos = memoList.filter(memo => {
      const memoDate = new Date(memo.timestamp).toDateString()
      return memoDate === today
    })

    this.setData({
      todayMemoCount: todayMemos.length,
      totalMemoCount: memoList.length
    })
  },

  // 加载最近记录
  loadRecentMemos: function() {
    const memoList = app.getMemoList()
    // 过滤掉规划记录，只显示普通记录
    const normalMemos = memoList.filter(memo => !memo.isPlanning)
    const recentMemos = normalMemos.slice(0, 3).map(memo => ({
      ...memo,
      formattedTime: this.formatRelativeTime(new Date(memo.timestamp)),
      timePeriod: this.getTimePeriod(memo),
      periodColor: this.getTimePeriodColor(memo),
      category: this.getCategory(memo),
      categoryColor: this.getCategoryColor(memo)
    }))

    this.setData({
      recentMemos: recentMemos
    })
  },

  // 加载今日规划
  loadTodayPlanning: function() {
    const memoList = app.getMemoList()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toDateString()
    
    // 找到昨天最后一条规划记录
    const yesterdayPlannings = memoList.filter(memo => {
      const memoDate = new Date(memo.timestamp).toDateString()
      return memoDate === yesterdayStr && memo.isPlanning
    })

    if (yesterdayPlannings.length > 0) {
      // 按时间排序，取最后一条
      yesterdayPlannings.sort((a, b) => b.timestamp - a.timestamp)
      const latestPlanning = yesterdayPlannings[0]
      
      this.setData({
        todayPlanning: {
          ...latestPlanning,
          formattedTime: this.formatRelativeTime(new Date(latestPlanning.timestamp))
        },
        planningDate: '昨日规划'
      })
    } else {
      // 如果没有昨天的规划，查找今天的规划
      const today = new Date().toDateString()
      const todayPlannings = memoList.filter(memo => {
        const memoDate = new Date(memo.timestamp).toDateString()
        return memoDate === today && memo.isPlanning
      })

      if (todayPlannings.length > 0) {
        todayPlannings.sort((a, b) => b.timestamp - a.timestamp)
        const latestPlanning = todayPlannings[0]
        
        this.setData({
          todayPlanning: {
            ...latestPlanning,
            formattedTime: this.formatRelativeTime(new Date(latestPlanning.timestamp))
          },
          planningDate: '今日规划'
        })
      }
    }
  },

  // 加载提醒设置
  loadReminderSettings: function() {
    const settings = app.globalData.reminderSettings
    this.setData({
      reminderEnabled: settings.enabled,
      reminderInterval: settings.interval
    })
  },

  // 格式化相对时间
  formatRelativeTime: function(date) {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return app.formatTime(date)
    }
  },

  // 跳转到文字记录
  goToTextMemo: function() {
    wx.switchTab({
      url: '/pages/memo/memo'
    })
  },

  // 跳转到语音记录
  goToVoiceMemo: function() {
    console.log('点击语音记录按钮')
    wx.switchTab({
      url: '/pages/memo/memo',
      success: function() {
        console.log('跳转语音记录页面成功')
        // 由于switchTab不支持参数传递，需要用其他方式设置语音模式
        const pages = getCurrentPages()
        const memoPage = pages[pages.length - 1]
        if (memoPage && memoPage.route === 'pages/memo/memo') {
          memoPage.setData({ inputType: 'voice' })
        }
      },
      fail: function(error) {
        console.error('跳转语音记录页面失败:', error)
        wx.showToast({
          title: '跳转失败',
          icon: 'error'
        })
      }
    })
  },

  // 跳转到规划记录
  goToPlanningMemo: function() {
    wx.switchTab({
      url: '/pages/memo/memo',
      success: function() {
        // 设置为规划模式
        const pages = getCurrentPages()
        const memoPage = pages[pages.length - 1]
        if (memoPage && memoPage.route === 'pages/memo/memo') {
          memoPage.setData({ 
            recordMode: 'planning',
            inputType: 'text'
          })
          memoPage.updateCurrentTemplates()
        }
      }
    })
  },

  // 查看全部记录
  viewAllMemos: function() {
    wx.switchTab({
      url: '/pages/timeline/timeline'
    })
  },

  // 切换提醒开关
  toggleReminder: function(e) {
    const enabled = e.detail.value
    this.setData({
      reminderEnabled: enabled
    })

    app.updateReminderSettings({ enabled: enabled })

    if (enabled) {
      this.startReminder()
      wx.showToast({
        title: '已开启定时提醒',
        icon: 'success'
      })
    } else {
      this.stopReminder()
      wx.showToast({
        title: '已关闭定时提醒',
        icon: 'success'
      })
    }
  },

  // 提醒间隔改变
  onReminderIntervalChange: function(e) {
    const interval = e.detail.value
    this.setData({
      reminderInterval: interval
    })

    app.updateReminderSettings({ interval: interval })

    // 重新设置提醒
    if (this.data.reminderEnabled) {
      this.startReminder()
    }
  },

  // 开启提醒
  startReminder: function() {
    // 清除已有提醒
    this.stopReminder()

    // 设置新的提醒
    const intervalMs = this.data.reminderInterval * 60 * 1000
    this.reminderTimer = setInterval(() => {
      this.showReminderNotification()
    }, intervalMs)

    console.log(`设置提醒间隔: ${this.data.reminderInterval}分钟`)
  },

  // 停止提醒
  stopReminder: function() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer)
      this.reminderTimer = null
    }
  },

  // 显示提醒通知
  showReminderNotification: function() {
    const now = new Date()
    const hour = now.getHours()
    
    // 晚上21点后提醒记录明日规划
    if (hour >= 21) {
      wx.showModal({
        title: '规划明天',
        content: '今天就要结束了，不如规划一下明天的重要事项？',
        confirmText: '去规划',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/memo/memo',
              success: function() {
                const pages = getCurrentPages()
                const memoPage = pages[pages.length - 1]
                if (memoPage && memoPage.route === 'pages/memo/memo') {
                  memoPage.setData({ 
                    recordMode: 'planning',
                    inputType: 'text'
                  })
                  memoPage.updateCurrentTemplates()
                }
              }
            })
          }
        }
      })
    } else {
      wx.showModal({
        title: '记录提醒',
        content: '该记录一下此刻的心情和想法了～',
        confirmText: '去记录',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/memo/memo'
            })
          }
        }
      })
    }
  },

  // 根据时间和类型获取时间段
  getTimePeriod: function(memo) {
    if (memo.isPlanning) {
      return '规划'
    }

    const date = new Date(memo.timestamp)
    const hour = date.getHours()

    if (hour >= 5 && hour < 9) {
      return '早晨'
    } else if (hour >= 9 && hour < 12) {
      return '上午'
    } else if (hour >= 12 && hour < 14) {
      return '中午'
    } else if (hour >= 14 && hour < 18) {
      return '下午'
    } else if (hour >= 18 && hour < 23) {
      return '晚上'
    } else {
      return '休息'
    }
  },

  // 获取时间段对应的颜色
  getTimePeriodColor: function(memo) {
    const period = this.getTimePeriod(memo)
    const colorMap = {
      '早晨': 'morning',    // 橙色
      '上午': 'forenoon',   // 黄色
      '中午': 'noon',       // 暖橙色
      '下午': 'afternoon',  // 蓝色
      '晚上': 'evening',    // 紫色
      '规划': 'planning',   // 绿色
      '休息': 'rest'        // 灰色
    }
    return colorMap[period] || 'default'
  },

  // 智能识别内容分类
  getCategory: function(memo) {
    if (!memo || !memo.content) {
      return '生活'
    }
    const content = memo.content.toLowerCase()
    
    // 工作相关关键词
    const workKeywords = ['工作', '项目', '会议', '同事', '客户', '业务', '任务', '汇报', '加班', '绩效', '考核']
    if (workKeywords.some(keyword => content.includes(keyword))) {
      return '工作'
    }
    
    // 学习相关关键词  
    const studyKeywords = ['学习', '学到', '课程', '书', '知识', '技能', '培训', '考试', '阅读', '笔记']
    if (studyKeywords.some(keyword => content.includes(keyword))) {
      return '学习'
    }
    
    // 成长相关关键词
    const growthKeywords = ['反思', '总结', '成长', '进步', '改进', '提升', '收获', '感悟', '经验', '教训']
    if (growthKeywords.some(keyword => content.includes(keyword))) {
      return '成长'
    }
    
    // 理财相关关键词
    const financeKeywords = ['理财', '投资', '消费', '买', '花费', '存钱', '基金', '股票', '财务', '预算']
    if (financeKeywords.some(keyword => content.includes(keyword))) {
      return '理财'
    }
    
    // 健康相关关键词
    const healthKeywords = ['健康', '运动', '锻炼', '跑步', '健身', '饮食', '吃', '睡觉', '休息', '医生']
    if (healthKeywords.some(keyword => content.includes(keyword))) {
      return '健康'
    }
    
    // 社交相关关键词
    const socialKeywords = ['朋友', '聚会', '聊天', '约', '见面', '社交', '聚餐', '派对', '活动', '相处']
    if (socialKeywords.some(keyword => content.includes(keyword))) {
      return '社交'
    }
    
    // 目标相关关键词
    const goalKeywords = ['目标', '计划', '打算', '准备', '要做', '完成', '达成', '实现', '规划']
    if (goalKeywords.some(keyword => content.includes(keyword)) || memo.isPlanning) {
      return '目标'
    }
    
    // 心情相关关键词
    const moodKeywords = ['开心', '难过', '生气', '焦虑', '紧张', '兴奋', '失落', '感觉', '心情', '情绪']
    if (moodKeywords.some(keyword => content.includes(keyword))) {
      return '心情'
    }
    
    // 想法相关关键词
    const ideaKeywords = ['想法', '想到', '思考', '觉得', '认为', '想起', '突然', '灵感', '想象']
    if (ideaKeywords.some(keyword => content.includes(keyword))) {
      return '想法'
    }
    
    // 默认返回生活
    return '生活'
  },

  // 获取内容分类对应的颜色
  getCategoryColor: function(memo) {
    const category = this.getCategory(memo)
    const colorMap = {
      '生活': 'life',      // 绿色
      '工作': 'work',      // 蓝色
      '学习': 'study',     // 紫色
      '成长': 'growth',    // 橙色
      '理财': 'finance',   // 黄色
      '健康': 'health',    // 红色
      '社交': 'social',    // 粉色
      '目标': 'goal',      // 棕色
      '想法': 'idea',      // 灰色
      '心情': 'mood'       // 默认色
    }
    return colorMap[category] || 'default'
  },

  onUnload: function() {
    // 页面卸载时清除定时器
    this.stopReminder()
  }
})