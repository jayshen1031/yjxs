const app = getApp()
const userManager = require('../../utils/userManager.js')
const apiService = require('../../utils/apiService.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    memoList: [],
    filteredMemos: [],
    searchKeyword: '',
    activeFilter: 'all'
  },

  // 音频播放器
  innerAudioContext: null,
  // 当前播放的备忘录ID
  currentPlayingId: null,

  onLoad: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }
    this.initAudioContext()
    this.loadMemos()
  },

  onShow: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }
    this.loadMemos()
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

  onUnload: function() {
    this.cleanup()
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadMemos()
    wx.stopPullDownRefresh()
  },

  // 初始化音频播放器
  initAudioContext: function() {
    this.innerAudioContext = wx.createInnerAudioContext()
    
    this.innerAudioContext.onPlay(() => {
      this.updatePlayingStatus(this.currentPlayingId, true)
    })

    this.innerAudioContext.onEnded(() => {
      this.updatePlayingStatus(this.currentPlayingId, false)
      this.currentPlayingId = null
    })

    this.innerAudioContext.onError((err) => {
      console.error('播放错误', err)
      this.updatePlayingStatus(this.currentPlayingId, false)
      this.currentPlayingId = null
      wx.showToast({
        title: '播放失败',
        icon: 'error'
      })
    })
  },

  // 加载备忘录列表（时间线模式：最近数据为主）
  loadMemos: async function() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('用户未登录，使用本地数据')
        this.loadMemosFromLocal()
        return
      }

      const notionConfig = currentUser.notionConfig
      console.log('🔍 Timeline - 用户Notion配置:', {
        hasConfig: !!notionConfig,
        hasApiKey: !!notionConfig?.apiKey,
        mainRecordsDatabaseId: notionConfig?.mainRecordsDatabaseId,
        mainDatabaseId: notionConfig?.mainDatabaseId,
        email: currentUser.email
      })

      if (!notionConfig || !notionConfig.apiKey || !notionConfig.mainRecordsDatabaseId) {
        console.log('Notion未配置，使用本地数据')
        this.loadMemosFromLocal()
        return
      }

      // 从云端加载Main Records（前端直接调用，绕过云函数）
      const mainDatabaseId = notionConfig.mainRecordsDatabaseId || notionConfig.mainDatabaseId
      if (!mainDatabaseId) {
        console.error('未配置主记录表数据库ID')
        this.loadMemosFromLocal()
        return
      }

      const result = await notionApiService.queryMainRecords(
        notionConfig.apiKey,
        mainDatabaseId,
        currentUser.email,
        { limit: 30 } // 只加载最近30条
      )

      if (!result.success) {
        console.error('加载Main Records失败:', result.error)
        this.loadMemosFromLocal()
        return
      }

      const mainRecords = result.records || []

      // 转换Main Records为memo格式
      const processedMemos = mainRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(record => ({
          id: record.id,
          content: record.content,
          timestamp: new Date(record.date).getTime(),
          type: 'text', // Main Records都是文本类型
          recordMode: record.recordType === '明日规划' ? 'planning' : 'normal',
          tags: record.tags || [],
          notionPageId: record.id,
          timeDisplay: this.formatTimeDisplay(new Date(record.date)),
          timePeriod: record.timePeriod || this.getTimePeriodFromDate(new Date(record.date)),
          periodColor: this.getTimePeriodColorByName(record.timePeriod),
          category: record.recordType || '日常记录',
          categoryColor: this.getCategoryColorByType(record.recordType),
          isPlaying: false
        }))

      this.setData({
        memoList: processedMemos
      })

      this.applyFilter()

    } catch (error) {
      console.error('加载Main Records异常:', error)
      this.loadMemosFromLocal()
    }
  },

  // 从本地加载备忘录
  loadMemosFromLocal: function() {
    const allMemos = app.getMemoList()

    // 时间线只显示最近30条记录，按时间倒序
    const recentMemos = allMemos
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30)

    const processedMemos = recentMemos.map(memo => ({
      ...memo,
      timeDisplay: this.formatTimeDisplay(new Date(memo.timestamp)),
      timePeriod: this.getTimePeriod(memo),
      periodColor: this.getTimePeriodColor(memo),
      category: this.getCategory(memo),
      categoryColor: this.getCategoryColor(memo),
      isPlaying: false
    }))

    this.setData({
      memoList: processedMemos
    })

    this.applyFilter()
  },

  // 根据日期获取时间段
  getTimePeriodFromDate: function(date) {
    const hour = date.getHours()
    if (hour >= 5 && hour < 8) return '早晨'
    if (hour >= 8 && hour < 12) return '上午'
    if (hour >= 12 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 22) return '晚上'
    return '深夜'
  },

  // 根据时间段名称获取颜色
  getTimePeriodColorByName: function(periodName) {
    const colorMap = {
      '早晨': '#f59e0b',
      '上午': '#10b981',
      '中午': '#ef4444',
      '下午': '#3b82f6',
      '晚上': '#8b5cf6',
      '深夜': '#6b7280'
    }
    return colorMap[periodName] || '#3b82f6'
  },

  // 根据记录类型获取分类颜色
  getCategoryColorByType: function(recordType) {
    const colorMap = {
      '日常记录': '#3b82f6',
      '明日规划': '#f59e0b'
    }
    return colorMap[recordType] || '#3b82f6'
  },

  // 格式化时间显示
  formatTimeDisplay: function(date) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const memoDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    let dateStr = ''
    if (memoDate.getTime() === today.getTime()) {
      dateStr = '今天'
    } else if (memoDate.getTime() === yesterday.getTime()) {
      dateStr = '昨天'
    } else {
      dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
    }

    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

    return {
      date: dateStr,
      time: timeStr
    }
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    
    // 防抖搜索
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.applyFilter()
    }, 500)
  },

  // 搜索确认
  onSearch: function() {
    this.applyFilter()
  },

  // 设置筛选条件
  setFilter: function(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({
      activeFilter: filter
    })
    this.applyFilter()
  },

  // 应用筛选
  applyFilter: function() {
    let filteredMemos = [...this.data.memoList]
    
    // 按类型筛选
    if (this.data.activeFilter === 'text') {
      filteredMemos = filteredMemos.filter(memo => memo.type === 'text')
    } else if (this.data.activeFilter === 'voice') {
      filteredMemos = filteredMemos.filter(memo => memo.type === 'voice')
    } else if (this.data.activeFilter === 'today') {
      const today = new Date().toDateString()
      filteredMemos = filteredMemos.filter(memo => {
        const memoDate = new Date(memo.timestamp).toDateString()
        return memoDate === today
      })
    }

    // 按关键词搜索
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.trim().toLowerCase()
      filteredMemos = filteredMemos.filter(memo => {
        const content = memo.content ? memo.content.toLowerCase() : ''
        const tags = memo.tags ? memo.tags.join(' ').toLowerCase() : ''
        return content.includes(keyword) || tags.includes(keyword)
      })
    }

    this.setData({
      filteredMemos: filteredMemos
    })
  },

  // 查看备忘录详情
  viewMemoDetail: function(e) {
    const memo = e.currentTarget.dataset.memo
    // 可以在这里实现详情查看功能
    console.log('查看详情', memo)
  },

  // 播放语音
  playVoice: function(e) {
    const memo = e.currentTarget.dataset.memo
    
    if (!memo.audioPath) {
      wx.showToast({
        title: '音频文件不存在',
        icon: 'error'
      })
      return
    }

    // 如果当前有正在播放的音频，先停止
    if (this.currentPlayingId && this.currentPlayingId !== memo.id) {
      this.innerAudioContext.stop()
      this.updatePlayingStatus(this.currentPlayingId, false)
    }

    if (memo.isPlaying) {
      // 暂停播放
      this.innerAudioContext.pause()
      this.updatePlayingStatus(memo.id, false)
      this.currentPlayingId = null
    } else {
      // 开始播放
      this.innerAudioContext.src = memo.audioPath
      this.innerAudioContext.play()
      this.currentPlayingId = memo.id
    }
  },

  // 更新播放状态
  updatePlayingStatus: function(memoId, isPlaying) {
    const filteredMemos = this.data.filteredMemos.map(memo => {
      if (memo.id === memoId) {
        return { ...memo, isPlaying }
      }
      return memo
    })

    const memoList = this.data.memoList.map(memo => {
      if (memo.id === memoId) {
        return { ...memo, isPlaying }
      }
      return memo
    })

    this.setData({
      filteredMemos,
      memoList
    })
  },

  // 编辑备忘录
  editMemo: function(e) {
    const memo = e.currentTarget.dataset.memo
    // 这里可以实现编辑功能，暂时跳转到记录页面
    wx.navigateTo({
      url: `/pages/memo/memo?type=${memo.type}&editId=${memo.id}`
    })
  },

  // 删除备忘录
  deleteMemo: async function(e) {
    const memo = e.currentTarget.dataset.memo
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          // 如果正在播放，先停止
          if (memo.isPlaying) {
            this.innerAudioContext.stop()
          }
          
          // 显示删除中状态
          wx.showLoading({ title: '删除中...' })
          
          try {
            const success = await app.deleteMemo(memo.id)
            wx.hideLoading()
            
            if (success) {
              this.loadMemos()
              wx.showToast({
                title: '已删除并同步',
                icon: 'success'
              })
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'error'
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('删除备忘录错误:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 跳转到添加记录页面
  goToAddMemo: function() {
    wx.navigateTo({
      url: '/pages/memo/memo'
    })
  },

  // 跳转到历史页面
  goToHistory: function() {
    wx.switchTab({
      url: '/pages/history/history'
    })
  },

  // 清理资源
  cleanup: function() {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
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
      '早晨': 'morning',
      '上午': 'forenoon',
      '中午': 'noon',
      '下午': 'afternoon',
      '晚上': 'evening',
      '规划': 'planning',
      '休息': 'rest'
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
      '生活': 'life',
      '工作': 'work',
      '学习': 'study',
      '成长': 'growth',
      '理财': 'finance',
      '健康': 'health',
      '社交': 'social',
      '目标': 'goal',
      '想法': 'idea',
      '心情': 'mood'
    }
    return colorMap[category] || 'default'
  }
})