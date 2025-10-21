const app = getApp()
const userManager = require('../../utils/userManager.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    currentQuote: '',
    currentQuoteData: {},
    todayMemoCount: 0,
    totalMemoCount: 0,
    recentMemos: [],
    reminderEnabled: true,
    reminderInterval: 60,
    todayPlanning: null,
    planningDate: '',
    todayValueMinutes: 0, // 今日价值分钟总数
    todayStatus: null, // 今日状态
    todayHappyThings: [], // 今日开心推荐
    // 箴言相关
    quoteCategories: [],
    selectedQuoteCategory: '',
    quotesCount: 0,
    // 箴言主题
    quoteTheme: 'purple',
    quoteThemes: [
      { value: 'purple', name: '经典紫', emoji: '💜' },
      { value: 'orange', name: '活力橙', emoji: '🧡' },
      { value: 'green', name: '清新绿', emoji: '💚' },
      { value: 'pink', name: '浪漫粉', emoji: '💗' },
      { value: 'blue', name: '天空蓝', emoji: '💙' },
      { value: 'red', name: '热情红', emoji: '❤️' },
      { value: 'teal', name: '青瓷蓝', emoji: '💎' },
      { value: 'amber', name: '琥珀金', emoji: '💛' }
    ],
    // 目标相关
    goalStats: {
      total: 0,
      active: 0,
      completed: 0,
      averageProgress: 0
    },
    todayGoals: [],
    // 今日待办
    todayTodos: [],
    todayTodosStats: {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0
    },
    // 进行中待办
    inProgressTodos: []
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
    // 加载箴言主题
    this.loadQuoteTheme()

    // 获取今日箴言
    this.loadCurrentQuote()

    // 获取箴言分类
    this.loadQuoteCategories()

    // 获取备忘录统计
    this.loadMemoStats()

    // 获取最近记录
    this.loadRecentMemos()

    // 获取提醒设置
    this.loadReminderSettings()

    // 获取今日规划
    this.loadTodayPlanning()

    // 获取目标数据
    this.loadGoalStats()

    // 获取今日目标
    this.loadTodayGoals()

    // 获取进行中待办
    this.loadInProgressTodos()

    // 获取今日待办
    this.loadTodayTodos()

    // 获取今日状态
    this.loadTodayStatus()

    // 加载今日开心推荐
    this.loadTodayHappyThings()
  },

  // 加载当前箴言
  loadCurrentQuote: function() {
    const currentQuote = app.globalData.currentQuote
    const fallbackQuote = '记录生活的美好，让每个瞬间都有意义。'

    if (typeof currentQuote === 'object' && currentQuote.quote) {
      // Notion箴言对象格式
      this.setData({
        currentQuote: currentQuote.quote,
        currentQuoteData: {
          author: currentQuote.author,
          source: currentQuote.source,
          category: currentQuote.category,
          tags: currentQuote.tags || []
        }
      })
    } else if (typeof currentQuote === 'object' && currentQuote.content) {
      // 旧版本的箴言对象
      this.setData({
        currentQuote: currentQuote.content,
        currentQuoteData: currentQuote
      })
    } else if (typeof currentQuote === 'string') {
      // 兼容旧版本的字符串箴言
      this.setData({
        currentQuote: currentQuote || fallbackQuote,
        currentQuoteData: {
          content: currentQuote || fallbackQuote,
          category: '默认',
          isFavorite: false,
          usageCount: 0,
          source: '内置'
        }
      })
    } else {
      this.setData({
        currentQuote: fallbackQuote,
        currentQuoteData: {
          content: fallbackQuote,
          category: '默认',
          isFavorite: false,
          usageCount: 0,
          source: '内置'
        }
      })
    }
  },

  // 加载箴言分类
  loadQuoteCategories: function() {
    const categories = Object.keys(app.getQuoteCategories())
    const quotesCount = app.getAllQuotes().length
    
    this.setData({
      quoteCategories: categories,
      quotesCount: quotesCount
    })
  },

  // 加载备忘录统计
  loadMemoStats: function() {
    const memoList = app.getMemoList()
    const today = new Date()
    const todayStr = today.toDateString()

    // 计算今日价值分钟总数
    const todayValueMinutes = this.calculateTodayValueMinutes(memoList, todayStr)

    this.setData({
      todayValueMinutes: todayValueMinutes
    })
  },

  // 计算今日价值分钟总数
  calculateTodayValueMinutes: function(memoList, todayStr) {
    const todayMemos = memoList.filter(memo => {
      const memoDateStr = new Date(memo.timestamp).toDateString()
      return memoDateStr === todayStr && !memo.isPlanning
    })

    if (todayMemos.length === 0) return 0

    let totalMinutes = 0

    // 从记录中提取valuableTimeEntries
    todayMemos.forEach(memo => {
      // 如果memo有valuableTimeEntries字段
      if (memo.valuableTimeEntries && Array.isArray(memo.valuableTimeEntries)) {
        memo.valuableTimeEntries.forEach(entry => {
          totalMinutes += entry.minutes || 0
        })
      }

      // 兼容：从content中解析时间投入（格式：活动名称 (X分钟)）
      if (memo.content && memo.content.includes('🌟 有价值的活动')) {
        const valuableSection = memo.content.split('😐 中性的活动')[0]
        const timeMatches = valuableSection.match(/\((\d+)分钟\)/g)
        if (timeMatches) {
          timeMatches.forEach(match => {
            const minutes = parseInt(match.match(/\d+/)[0])
            totalMinutes += minutes
          })
        }
      }
    })

    return totalMinutes
  },

  // 计算连续记录天数
  calculateContinuousDays: function(memoList) {
    if (memoList.length === 0) return 0
    
    const today = new Date()
    let continuousDays = 0
    let checkDate = new Date(today)
    
    // 从今天开始往前检查
    for (let i = 0; i < 365; i++) { // 最多检查365天
      const checkDateStr = checkDate.toDateString()
      const hasRecord = memoList.some(memo => {
        const memoDateStr = new Date(memo.timestamp).toDateString()
        return memoDateStr === checkDateStr
      })
      
      if (hasRecord) {
        continuousDays++
        // 往前推一天
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    
    return continuousDays
  },

  // 计算今日价值度（基于价值分类内容）
  calculateTodayValueScore: function(memoList, todayStr) {
    const todayMemos = memoList.filter(memo => {
      const memoDateStr = new Date(memo.timestamp).toDateString()
      return memoDateStr === todayStr && !memo.isPlanning
    })
    
    if (todayMemos.length === 0) return 0
    
    let totalValuePoints = 0
    let totalContentLength = 0
    
    todayMemos.forEach(memo => {
      if (!memo.content) return
      
      // 解析价值分类内容
      const valuableLength = this.extractContentLength(memo.content, '🌟 有价值的活动：')
      const neutralLength = this.extractContentLength(memo.content, '😐 中性的活动：')
      const wastefulLength = this.extractContentLength(memo.content, '🗑️ 低效的活动：')
      
      // 计算权重分数：有价值=3分，中性=1分，低效=-1分
      const valuePoints = (valuableLength * 3) + (neutralLength * 1) + (wastefulLength * -1)
      const contentLength = valuableLength + neutralLength + wastefulLength
      
      totalValuePoints += valuePoints
      totalContentLength += contentLength
    })
    
    if (totalContentLength === 0) return 50 // 默认中性分数
    
    // 计算百分比，50为基准分（中性），最高100，最低0
    const rawScore = (totalValuePoints / totalContentLength) * 16.67 + 50
    return Math.max(0, Math.min(100, Math.round(rawScore)))
  },

  // 提取特定分类的内容长度
  extractContentLength: function(content, prefix) {
    if (!content.includes(prefix)) return 0
    
    const sections = content.split('\n\n')
    for (let section of sections) {
      if (section.startsWith(prefix)) {
        const contentPart = section.replace(prefix + '\n', '')
        return contentPart.trim().length
      }
    }
    return 0
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

  // 加载今日待办（昨日规划）
  // 加载今日待办重点（昨日规划）
  loadTodayPlanning: async function() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser || !currentUser.notionConfig) {
        console.log('未配置Notion，无法加载今日规划')
        this.setData({
          todayPlanning: null,
          planningDate: ''
        })
        return
      }

      const { apiKey, databases } = currentUser.notionConfig
      const todosDatabaseId = databases?.todos || currentUser.notionConfig.todosDatabaseId

      if (!todosDatabaseId) {
        console.log('未配置待办库ID')
        this.setData({
          todayPlanning: null,
          planningDate: ''
        })
        return
      }

      console.log('从Notion加载今日规划...')

      // 计算昨天的日期
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      // 查询昨天的规划类型待办
      const result = await notionApiService.queryTodos(apiKey, todosDatabaseId, {
        scope: 'all'
      })

      if (result.success && result.todos.length > 0) {
        // 筛选昨天的明日规划类型待办
        const yesterdayPlannings = result.todos.filter(todo => {
          return todo.todoType === '明日规划 (Planning)' &&
                 todo.dueDate &&
                 todo.dueDate.startsWith(yesterdayStr)
        })

        if (yesterdayPlannings.length > 0) {
          // 取第一个
          const planning = yesterdayPlannings[0]

          // 映射字段名
          const priorityClassMap = {
            '紧急重要': 'urgent-important',
            '重要不紧急': 'important',
            '紧急不重要': 'urgent',
            '不紧急不重要': 'normal'
          }

          const priorityTextMap = {
            '紧急重要': '🔴 紧急重要',
            '重要不紧急': '🟠 重要不紧急',
            '紧急不重要': '🟡 紧急不重要',
            '不紧急不重要': '⚪ 不紧急不重要'
          }

          this.setData({
            todayPlanning: {
              title: planning.title,
              description: planning.description,
              dueDate: planning.dueDate,
              dueDateDisplay: yesterdayStr,
              priorityClass: priorityClassMap[planning.priority] || 'normal',
              priorityText: priorityTextMap[planning.priority] || planning.priority
            },
            planningDate: `昨日规划（${yesterday.getMonth() + 1}月${yesterday.getDate()}日）`
          })
          console.log('加载到昨日规划:', planning.title)
        } else {
          console.log('暂无昨日规划')
          this.setData({
            todayPlanning: null,
            planningDate: ''
          })
        }
      } else {
        console.log('查询待办失败或无数据')
        this.setData({
          todayPlanning: null,
          planningDate: ''
        })
      }
    } catch (error) {
      console.error('加载今日规划失败:', error)
      this.setData({
        todayPlanning: null,
        planningDate: ''
      })
    }
  },

  // 加载进行中待办 ⭐ 新增
  loadInProgressTodos: async function() {
    try {
      const currentUser = userManager.getCurrentUser()
      console.log('🔍 [进行中待办] 当前用户:', currentUser ? '已登录' : '未登录')
      console.log('🔍 [进行中待办] notionConfig:', JSON.stringify(currentUser?.notionConfig, null, 2))

      if (!currentUser || !currentUser.notionConfig) {
        console.log('❌ [进行中待办] 未配置Notion，无法加载进行中待办')
        return
      }

      const { apiKey, databases } = currentUser.notionConfig
      const todosDatabaseId = databases?.todos || currentUser.notionConfig.todosDatabaseId || currentUser.notionConfig.databaseId

      console.log('🔍 [进行中待办] databases对象:', databases)
      console.log('🔍 [进行中待办] 待办库ID:', todosDatabaseId)

      if (!todosDatabaseId) {
        console.log('❌ [进行中待办] 未配置待办库ID')
        return
      }

      console.log('⏳ [进行中待办] 开始从Notion加载...')

      // 查询进行中的待办
      const result = await notionApiService.queryTodos(apiKey, todosDatabaseId, {
        scope: '进行中'
      })

      console.log('✅ [进行中待办] Notion API调用结果:', result)

      if (result.success && result.todos.length > 0) {
        // 处理数据，添加进度百分比
        const todos = result.todos.map(todo => {
          const progressPercentage = todo.estimatedMinutes > 0
            ? Math.min(Math.round((todo.actualMinutes / todo.estimatedMinutes) * 100), 100)
            : 0

          console.log(`📋 [进行中待办] ${todo.title} - ${todo.actualMinutes}/${todo.estimatedMinutes}分钟 (${progressPercentage}%)`)

          return {
            ...todo,
            progressPercentage: progressPercentage
          }
        })

        console.log(`✅ [进行中待办] 成功加载 ${todos.length} 个进行中待办`)
        this.setData({
          inProgressTodos: todos
        })
      } else {
        console.log('⚠️ [进行中待办] 暂无进行中待办')
        this.setData({
          inProgressTodos: []
        })
      }
    } catch (error) {
      console.error('❌ [进行中待办] 加载失败:', error)
      this.setData({
        inProgressTodos: []
      })
    }
  },

  // 跳转到memo页面并预填待办 ⭐ 新增
  goToMemoWithTodo: function(e) {
    const todoId = e.currentTarget.dataset.todoId
    const todo = this.data.inProgressTodos.find(t => t.id === todoId)

    if (todo) {
      // 跳转到memo页面，并通过URL参数传递待办ID
      wx.switchTab({
        url: '/pages/memo/memo',
        success: function() {
          // 获取memo页面实例
          const pages = getCurrentPages()
          const memoPage = pages[pages.length - 1]
          if (memoPage && memoPage.route === 'pages/memo/memo') {
            // 预设待办关联
            memoPage.setData({
              selectedTodoId: todoId,
              selectedTodoInfo: todo,
              todoFilterScope: '进行中'
            })
            // 重新加载待办列表
            if (memoPage.loadAvailableTodos) {
              memoPage.loadAvailableTodos()
            }
          }
        }
      })
    }
  },

  // 加载提醒设置
  loadReminderSettings: function() {
    const settings = app.globalData.reminderSettings
    this.setData({
      reminderEnabled: settings.enabled,
      reminderInterval: settings.interval
    })
    
    // 如果提醒已启用，自动开始提醒
    if (settings.enabled) {
      console.log('自动启动定时提醒，间隔:', settings.interval, '分钟')
      this.startReminder()
    }
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


  // 跳转到待办管理
  goToGoalsTodos: function() {
    wx.switchTab({
      url: '/pages/goals-todos/goals-todos'
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

  // 开启准点提醒
  startReminder: function() {
    // 清除已有提醒
    this.stopReminder()

    // 设置准点提醒（7:00-22:00每小时）
    this.scheduleNextHourlyReminder()
    console.log('已启动准点提醒系统（7:00-22:00每小时）')
  },

  // 安排下一次准点提醒
  scheduleNextHourlyReminder: function() {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentSecond = now.getSeconds()

    // 计算下一个提醒时间
    let nextHour = currentHour
    
    // 如果当前时间超过了整点，则下一小时提醒
    if (currentMinute > 0 || currentSecond > 0) {
      nextHour = currentHour + 1
    }

    // 如果超过22点或早于7点，则安排到明天7点
    if (nextHour > 22 || nextHour < 7) {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(7, 0, 0, 0)
      
      const timeUntilTomorrow = tomorrow.getTime() - now.getTime()
      this.reminderTimer = setTimeout(() => {
        this.triggerHourlyReminder()
      }, timeUntilTomorrow)
      
      console.log(`下次提醒时间：明天7:00（${Math.round(timeUntilTomorrow/1000/60)}分钟后）`)
      return
    }

    // 计算到下一个整点的毫秒数
    const nextReminderTime = new Date(now)
    nextReminderTime.setHours(nextHour, 0, 0, 0)
    
    const timeUntilNext = nextReminderTime.getTime() - now.getTime()
    
    this.reminderTimer = setTimeout(() => {
      this.triggerHourlyReminder()
    }, timeUntilNext)

    console.log(`下次提醒时间：${nextHour}:00（${Math.round(timeUntilNext/1000/60)}分钟后）`)
  },

  // 触发准点提醒
  triggerHourlyReminder: function() {
    const now = new Date()
    const currentHour = now.getHours()
    
    // 只在生活时间段（7-22点）提醒
    if (currentHour >= 7 && currentHour <= 22) {
      this.showReminderNotification()
    }
    
    // 安排下一次提醒
    this.scheduleNextHourlyReminder()
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
    
    // 晚上21-22点提醒记录明日规划
    if (hour >= 21) {
      wx.showModal({
        title: '规划明天',
        content: `${hour}:00 整点提醒\n今天就要结束了，不如规划一下明天的重要事项？`,
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
      // 根据时间段显示不同的提醒内容
      let timeText = ''
      let content = ''
      
      if (hour >= 7 && hour < 9) {
        timeText = '早晨'
        content = '美好的一天开始了，记录一下早晨的想法和计划吧～'
      } else if (hour >= 9 && hour < 12) {
        timeText = '上午'
        content = '上午时光，记录一下过去一小时的工作或学习情况～'
      } else if (hour >= 12 && hour < 14) {
        timeText = '中午'
        content = '午休时间，记录一下上午的收获和下午的计划～'
      } else if (hour >= 14 && hour < 18) {
        timeText = '下午'
        content = '下午时光，记录一下过去一小时的进展和想法～'
      } else if (hour >= 18 && hour < 21) {
        timeText = '傍晚'
        content = '一天即将结束，记录一下这一小时的生活点滴～'
      }
      
      wx.showModal({
        title: `${timeText}记录提醒`,
        content: `${hour}:00 整点提醒\n${content}`,
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

  // 箴言相关交互
  // 刷新箴言
  refreshQuote: function() {
    const newQuote = app.refreshQuote()
    if (newQuote) {
      this.setData({
        currentQuote: newQuote.content,
        currentQuoteData: newQuote
      })
      
      wx.showToast({
        title: '已刷新箴言',
        icon: 'success',
        duration: 1500
      })
    }
  },

  // 切换箴言收藏状态
  toggleQuoteFavorite: function() {
    const currentQuote = this.data.currentQuoteData
    if (currentQuote.id) {
      const isFavorite = app.toggleQuoteFavorite(currentQuote.id)
      this.setData({
        'currentQuoteData.isFavorite': isFavorite
      })
      
      wx.showToast({
        title: isFavorite ? '已收藏' : '取消收藏',
        icon: 'success',
        duration: 1500
      })
    }
  },

  // 跳转到箴言管理页面
  goToQuoteManager: function() {
    wx.navigateTo({
      url: '/pages/quote-manager/quote-manager'
    })
  },

  // 跳转到开心库管理页面
  goToHappyManager: function() {
    wx.navigateTo({
      url: '/pages/happy-manager/happy-manager'
    })
  },

  // 快速按分类筛选箴言
  quickFilterByCategory: function(e) {
    const category = e.currentTarget.dataset.category
    const app = getApp()
    
    // 使用新的分类获取方法
    const selectedQuote = app.setQuoteByCategory(category)
    
    if (selectedQuote) {
      this.setData({
        currentQuote: selectedQuote.content,
        currentQuoteData: selectedQuote,
        selectedQuoteCategory: category,
        selectedMood: '' // 清除心情选择
      })
      
      wx.showToast({
        title: `已切换到${category}箴言`,
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

  // 加载目标统计数据
  loadGoalStats: async function() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser || !currentUser.notionConfig) {
        console.log('未配置Notion，无法加载目标统计')
        this.setData({
          goalStats: {
            total: 0,
            active: 0,
            completed: 0,
            averageProgress: 0
          }
        })
        return
      }

      const { apiKey, databases } = currentUser.notionConfig
      const goalsDatabaseId = databases?.goals || currentUser.notionConfig.goalsDatabaseId

      if (!goalsDatabaseId) {
        console.log('未配置目标库ID')
        this.setData({
          goalStats: {
            total: 0,
            active: 0,
            completed: 0,
            averageProgress: 0
          }
        })
        return
      }

      console.log('从Notion加载目标统计...')

      // 查询所有目标
      const result = await notionApiService.queryGoals(apiKey, goalsDatabaseId, {
        status: 'all' // 查询所有状态的目标
      })

      if (result.success && result.goals) {
        const goals = result.goals
        const active = goals.filter(g => g.status === '进行中').length
        const completed = goals.filter(g => g.status === '已完成').length
        const totalProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0)

        console.log(`目标统计: 总计${goals.length}个, 进行中${active}个, 已完成${completed}个`)

        this.setData({
          goalStats: {
            total: goals.length,
            active: active,
            completed: completed,
            averageProgress: goals.length > 0 ? Math.round(totalProgress / goals.length) : 0
          }
        })
      } else {
        console.log('查询目标失败或无数据')
        this.setData({
          goalStats: {
            total: 0,
            active: 0,
            completed: 0,
            averageProgress: 0
          }
        })
      }
    } catch (error) {
      console.error('加载目标统计失败:', error)
      this.setData({
        goalStats: {
          total: 0,
          active: 0,
          completed: 0,
          averageProgress: 0
        }
      })
    }
  },

  // 加载今日目标
  loadTodayGoals: async function() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser || !currentUser.notionConfig) {
        console.log('未配置Notion，无法加载今日目标')
        this.setData({
          todayGoals: []
        })
        return
      }

      const { apiKey, databases } = currentUser.notionConfig
      const goalsDatabaseId = databases?.goals || currentUser.notionConfig.goalsDatabaseId

      if (!goalsDatabaseId) {
        console.log('未配置目标库ID')
        this.setData({
          todayGoals: []
        })
        return
      }

      console.log('从Notion加载今日目标...')

      // 查询进行中的目标
      const result = await notionApiService.queryGoals(apiKey, goalsDatabaseId, {
        status: '进行中'
      })

      if (result.success && result.goals) {
        // 取前3个进行中的目标
        const todayGoals = result.goals.slice(0, 3)
        console.log(`加载到${todayGoals.length}个今日目标`)
        this.setData({
          todayGoals: todayGoals
        })
      } else {
        console.log('查询今日目标失败或无数据')
        this.setData({
          todayGoals: []
        })
      }
    } catch (error) {
      console.error('加载今日目标失败:', error)
      this.setData({
        todayGoals: []
      })
    }
  },


  // ========== 今日待办相关方法 ==========

  // 加载今日待办
  loadTodayTodos: function() {
    const todos = app.getTodayTodos ? app.getTodayTodos() : []
    const stats = app.getTodayTodosStats ? app.getTodayTodosStats() : {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0
    }

    // 处理待办数据，添加UI需要的字段
    const processedTodos = todos.map(todo => {
      // 映射优先级显示
      let priorityLevel = 'low'
      let priorityText = todo.priority
      if (todo.priority === '紧急重要') {
        priorityLevel = 'urgent'
        priorityText = '🔴 紧急重要'
      } else if (todo.priority === '重要不紧急') {
        priorityLevel = 'important'
        priorityText = '🟡 重要'
      } else if (todo.priority === '紧急不重要') {
        priorityLevel = 'medium'
        priorityText = '🟠 紧急'
      } else {
        priorityLevel = 'low'
        priorityText = '⚪ 一般'
      }

      return {
        ...todo,
        priorityLevel,
        priorityText
      }
    })

    this.setData({
      todayTodos: processedTodos,
      todayTodosStats: stats
    })
  },

  // 切换待办状态
  toggleTodoStatus: function(e) {
    const { id } = e.currentTarget.dataset
    const todos = app.getTodos()
    const todo = todos.find(t => t.id === id)

    if (!todo) return

    // 切换状态
    const newStatus = todo.status === '已完成' ? '待办' : '已完成'

    app.updateTodo(id, {
      status: newStatus,
      completedTime: newStatus === '已完成' ? new Date().toISOString() : ''
    })

    // 重新加载
    this.loadTodayTodos()

    wx.showToast({
      title: newStatus === '已完成' ? '已完成' : '重新开始',
      icon: 'success',
      duration: 1000
    })
  },

  // 跳转到待办页面
  goToTodosPage: function() {
    wx.switchTab({
      url: '/pages/goals-todos/goals-todos'
    })
  },

  // 加载箴言主题
  loadQuoteTheme: function() {
    try {
      const savedTheme = wx.getStorageSync('quote_theme')
      if (savedTheme) {
        this.setData({
          quoteTheme: savedTheme
        })
      }
    } catch (e) {
      console.error('加载箴言主题失败:', e)
    }
  },

  // 切换箴言主题
  changeQuoteTheme: function() {
    const currentIndex = this.data.quoteThemes.findIndex(t => t.value === this.data.quoteTheme)
    const nextIndex = (currentIndex + 1) % this.data.quoteThemes.length
    const nextTheme = this.data.quoteThemes[nextIndex]

    this.setData({
      quoteTheme: nextTheme.value
    })

    // 保存主题到本地存储
    try {
      wx.setStorageSync('quote_theme', nextTheme.value)

      // 显示主题名称提示
      wx.showToast({
        title: `${nextTheme.emoji} ${nextTheme.name}`,
        icon: 'none',
        duration: 1500
      })
    } catch (e) {
      console.error('保存箴言主题失败:', e)
    }
  },

  // ========== 每日状态相关方法 ==========

  // 加载今日状态
  loadTodayStatus: async function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.notionConfig?.databases?.dailyStatus || !currentUser.notionConfig?.apiKey) {
      console.log('⏭️ 跳过加载今日状态：配置不完整')
      return
    }

    try {
      // 获取今天日期字符串 (YYYY-MM-DD)
      const today = new Date()
      const dateStr = this.formatDate(today)

      console.log('🔍 首页查询今日状态:', dateStr)

      // 查询今日状态
      const apiKey = currentUser.notionConfig.apiKey
      const databaseId = currentUser.notionConfig.databases.dailyStatus
      const response = await notionApiService.queryDatabase(apiKey, databaseId, {
        filter: {
          property: 'Date',
          title: {
            equals: dateStr
          }
        },
        page_size: 1
      })

      console.log('📊 查询结果:', response)

      if (response.success && response.data?.results && response.data.results.length > 0) {
        const page = response.data.results[0]
        console.log('✅ 找到今日状态:', page)
        const status = this.parseDailyStatusPage(page)
        console.log('📝 解析后的状态:', status)
        this.setData({
          todayStatus: status
        })
      } else {
        console.log('⚠️ 今日还没有状态记录')
        // 清空旧数据
        this.setData({
          todayStatus: null
        })
      }
    } catch (error) {
      console.error('❌ 加载今日状态失败:', error)
    }
  },

  // 解析Notion页面数据
  parseDailyStatusPage: function(page) {
    const props = page.properties
    return {
      mood: this.getMultiSelectValue(props['Mood']),  // 多选
      energyLevel: this.getSelectValue(props['Energy Level']),
      stressLevel: this.getSelectValue(props['Stress Level']),
      wakeUpTime: this.getRichTextValue(props['Wake Up Time']),  // 起床时间
      bedTime: this.getRichTextValue(props['Bed Time']),  // 睡觉时间
      sleepHours: this.getNumberValue(props['Sleep Hours']),
      sleepQuality: this.getSelectValue(props['Sleep Quality']),
      weight: this.getNumberValue(props['Weight']),
      waterIntake: this.getNumberValue(props['Water Intake']),
      exerciseDuration: this.getNumberValue(props['Exercise Duration']),
      highlights: this.getRichTextValue(props['Highlights']),
      notes: this.getRichTextValue(props['Notes'])
    }
  },

  // 获取多选属性值
  getMultiSelectValue: function(prop) {
    if (prop?.multi_select && prop.multi_select.length > 0) {
      return prop.multi_select.map(item => item.name).join('、')
    }
    return ''
  },

  // 获取选择属性值
  getSelectValue: function(prop) {
    return prop?.select?.name || ''
  },

  // 获取数字属性值
  getNumberValue: function(prop) {
    return prop?.number || null
  },

  // 获取富文本属性值
  getRichTextValue: function(prop) {
    if (prop?.rich_text && prop.rich_text.length > 0) {
      return prop.rich_text.map(t => t.plain_text).join('')
    }
    return ''
  },

  // 跳转到每日状态页面
  goToDailyStatus: function() {
    wx.navigateTo({
      url: '/pages/daily-status/daily-status'
    })
  },

  // 格式化日期 (YYYY-MM-DD)
  formatDate: function(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // ========== 开心推荐相关方法 ==========

  // 加载今日开心推荐
  loadTodayHappyThings: function() {
    const happyThings = app.globalData.todayHappyThings || []
    this.setData({
      todayHappyThings: happyThings
    })
  },

  // 刷新开心推荐
  refreshHappyThings: function() {
    const newThings = app.refreshTodayHappyThings()
    this.setData({
      todayHappyThings: newThings
    })

    wx.showToast({
      title: '已换一批',
      icon: 'success',
      duration: 1500
    })
  },

  onHide: function() {
    // 页面隐藏时停止提醒（避免在其他页面弹出提醒）
    this.stopReminder()
  },

  onUnload: function() {
    // 页面卸载时清除定时器
    this.stopReminder()
  }
})