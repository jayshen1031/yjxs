const app = getApp()
const userManager = require('../../utils/userManager.js')
const apiService = require('../../utils/apiService.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    selectedDate: '',
    selectedDateDisplay: '',
    todayDate: '',
    showFilterPanel: false,
    selectedTags: [],
    timeRange: 'all',
    sortBy: 'time_desc',
    
    // 统计数据
    stats: {
      total: 0,
      text: 0,
      voice: 0,
      todayCount: 0
    },
    
    // 筛选选项
    allTags: [],
    timeRangeOptions: [
      { label: '全部', value: 'all' },
      { label: '今天', value: 'today' },
      { label: '最近3天', value: '3days' },
      { label: '最近一周', value: 'week' },
      { label: '最近一月', value: 'month' }
    ],
    sortOptions: [
      { label: '时间降序', value: 'time_desc' },
      { label: '时间升序', value: 'time_asc' },
      { label: '内容长度', value: 'length' }
    ],
    
    // 记录数据
    allMemos: [],
    filteredMemos: [],
    groupedMemos: [],
    
    // 分页
    pageSize: 20,
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    
    // 播放状态
    currentPlayingId: null
  },

  // 音频播放器
  innerAudioContext: null,

  onLoad: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }
    this.initData()
    this.initAudioContext()
    this.loadAllMemos()
  },

  onShow: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }
    this.loadAllMemos()
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

  // 初始化数据
  initData: function() {
    const today = new Date()
    const todayStr = this.formatDate(today)
    
    this.setData({
      selectedDate: todayStr,
      selectedDateDisplay: '今天',
      todayDate: todayStr
    })
  },

  // 初始化音频播放器
  initAudioContext: function() {
    this.innerAudioContext = wx.createInnerAudioContext()
    
    this.innerAudioContext.onPlay(() => {
      this.updatePlayingStatus(this.data.currentPlayingId, true)
    })

    this.innerAudioContext.onEnded(() => {
      this.updatePlayingStatus(this.data.currentPlayingId, false)
      this.setData({ currentPlayingId: null })
    })

    this.innerAudioContext.onError((err) => {
      console.error('播放错误', err)
      this.updatePlayingStatus(this.data.currentPlayingId, false)
      this.setData({ currentPlayingId: null })
    })
  },

  // 加载所有备忘录
  loadAllMemos: async function() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('用户未登录，使用本地数据')
        this.loadMemosFromLocal()
        return
      }

      const notionConfig = currentUser.notionConfig
      console.log('🔍 History - 用户Notion配置:', {
        hasConfig: !!notionConfig,
        hasApiKey: !!notionConfig?.apiKey,
        activitiesDatabaseId: notionConfig?.activitiesDatabaseId,
        activityDatabaseId: notionConfig?.activityDatabaseId,
        email: currentUser.email
      })

      if (!notionConfig || !notionConfig.apiKey || !notionConfig.activitiesDatabaseId) {
        console.log('Notion未配置，使用本地数据')
        this.loadMemosFromLocal()
        return
      }

      // 从云端加载Activity Details（前端直接调用，绕过云函数）
      const activitiesDatabaseId = notionConfig.activitiesDatabaseId || notionConfig.activityDatabaseId
      if (!activitiesDatabaseId) {
        console.error('未配置活动明细表数据库ID')
        this.loadMemosFromLocal()
        return
      }

      const result = await notionApiService.queryActivities(
        notionConfig.apiKey,
        activitiesDatabaseId,
        currentUser.email,
        {} // 加载所有活动
      )

      if (!result.success) {
        console.error('加载Activities失败:', result.error)
        this.loadMemosFromLocal()
        return
      }

      const activities = result.activities || []

      console.log('📊 从Notion获取的活动数据:', activities)
      console.log('📊 活动数量:', activities.length)
      if (activities.length > 0) {
        console.log('📊 第一条活动详情:', activities[0])
      }

      // 转换Activities为memo格式
      const processedMemos = activities.map(activity => {
        const startTime = new Date(activity.startTime)
        return {
          id: activity.id,
          content: activity.description || activity.name,
          timestamp: startTime.getTime(),
          type: 'text',
          tags: activity.tags || [],
          notionPageId: activity.id,
          timeStr: this.formatTime(startTime),
          dateStr: this.formatDate(startTime),
          timePeriodDisplay: this.formatActivityTimePeriodDisplay(activity),
          timePeriod: this.getTimePeriodFromTime(startTime),
          periodColor: this.getTimePeriodColorFromTime(startTime),
          category: activity.activityType || '未分类',
          categoryColor: this.getActivityCategoryColor(activity.activityType),
          isPlaying: false,
          // 活动特有信息
          activityName: activity.name,
          duration: activity.duration,
          activityType: activity.activityType
        }
      })

      // 提取所有标签
      const allTags = new Set()
      activities.forEach(activity => {
        if (activity.tags) {
          activity.tags.forEach(tag => allTags.add(tag))
        }
      })

      // 计算统计数据
      const stats = this.calculateStats(processedMemos)

      this.setData({
        allMemos: processedMemos,
        allTags: Array.from(allTags),
        stats: stats
      })

      this.applyFilters()

    } catch (error) {
      console.error('加载Activities异常:', error)
      this.loadMemosFromLocal()
    }
  },

  // 从本地加载备忘录
  loadMemosFromLocal: function() {
    const memoList = app.getMemoList()
    const processedMemos = memoList.map(memo => ({
      ...memo,
      timeStr: this.formatTime(new Date(memo.timestamp)),
      dateStr: this.formatDate(new Date(memo.timestamp)),
      timePeriodDisplay: this.formatTimePeriodDisplay(memo),
      timePeriod: this.getTimePeriod(memo),
      periodColor: this.getTimePeriodColor(memo),
      category: this.getCategory(memo),
      categoryColor: this.getCategoryColor(memo),
      isPlaying: false
    }))

    // 提取所有标签
    const allTags = new Set()
    memoList.forEach(memo => {
      if (memo.tags) {
        memo.tags.forEach(tag => allTags.add(tag))
      }
    })

    // 计算统计数据
    const stats = this.calculateStats(memoList)

    this.setData({
      allMemos: processedMemos,
      allTags: Array.from(allTags),
      stats: stats
    })

    this.applyFilters()
  },

  // 格式化活动时间段显示
  formatActivityTimePeriodDisplay: function(activity) {
    if (!activity || !activity.startTime) {
      return '时间未知'
    }

    const startTime = new Date(activity.startTime)
    const endTime = new Date(activity.endTime)

    const startTimeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
    const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`

    return `${startTimeStr} - ${endTimeStr} (${activity.duration}分钟)`
  },

  // 根据时间获取时间段
  getTimePeriodFromTime: function(date) {
    const hour = date.getHours()
    if (hour >= 5 && hour < 8) return '早晨'
    if (hour >= 8 && hour < 12) return '上午'
    if (hour >= 12 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 22) return '晚上'
    return '深夜'
  },

  // 根据时间段获取颜色
  getTimePeriodColorFromTime: function(date) {
    const period = this.getTimePeriodFromTime(date)
    const colorMap = {
      '早晨': '#f59e0b',
      '上午': '#10b981',
      '中午': '#ef4444',
      '下午': '#3b82f6',
      '晚上': '#8b5cf6',
      '深夜': '#6b7280'
    }
    return colorMap[period] || '#3b82f6'
  },

  // 根据活动类型获取颜色
  getActivityCategoryColor: function(activityType) {
    const colorMap = {
      '工作': '#3b82f6',
      '学习': '#10b981',
      '运动': '#f59e0b',
      '休息': '#8b5cf6',
      '生活': '#6b7280'
    }
    return colorMap[activityType] || '#3b82f6'
  },

  // 计算统计数据
  calculateStats: function(memoList) {
    const today = new Date().toDateString()
    const todayMemos = memoList.filter(memo => {
      return new Date(memo.timestamp).toDateString() === today
    })

    return {
      total: memoList.length,
      text: memoList.filter(memo => memo.type === 'text').length,
      voice: memoList.filter(memo => memo.type === 'voice').length,
      todayCount: todayMemos.length
    }
  },

  // 格式化日期
  formatDate: function(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  },

  // 格式化时间
  formatTime: function(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  },

  // 格式化时间段显示
  formatTimePeriodDisplay: function(memo) {
    if (!memo || !memo.timestamp) {
      return '时间未知'
    }

    // 获取记录的开始时间
    const recordDate = new Date(memo.timestamp)
    const startTime = `${recordDate.getHours().toString().padStart(2, '0')}:${recordDate.getMinutes().toString().padStart(2, '0')}`
    
    // 获取日期显示
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const memoDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
    
    let dateStr = ''
    if (memoDate.getTime() === today.getTime()) {
      dateStr = '今天'
    } else if (memoDate.getTime() === yesterday.getTime()) {
      dateStr = '昨天'
    } else {
      dateStr = `${recordDate.getMonth() + 1}月${recordDate.getDate()}日`
    }

    // 尝试从memo数据中获取时间段信息
    if (memo.startTime && memo.endTime) {
      return `${dateStr} ${memo.startTime}-${memo.endTime}`
    }
    
    // 如果没有时间段信息，则基于开始时间推算一个小时的时间段
    const endDate = new Date(recordDate.getTime() + 60 * 60 * 1000) // 加1小时
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
    
    return `${dateStr} ${startTime}-${endTime}`
  },

  // 日期选择
  onDateChange: function(e) {
    const selectedDate = e.detail.value
    const today = new Date().toDateString()
    const selectedDateObj = new Date(selectedDate)
    
    let dateDisplay = selectedDate
    if (selectedDateObj.toDateString() === today) {
      dateDisplay = '今天'
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (selectedDateObj.toDateString() === yesterday.toDateString()) {
        dateDisplay = '昨天'
      }
    }

    this.setData({
      selectedDate: selectedDate,
      selectedDateDisplay: dateDisplay
    })

    this.applyFilters()
  },

  // 切换筛选面板
  toggleFilterPanel: function() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    })
  },

  // 切换标签筛选
  toggleTagFilter: function(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = [...this.data.selectedTags]
    
    const index = selectedTags.indexOf(tag)
    if (index !== -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tag)
    }
    
    this.setData({ selectedTags })
    this.applyFilters()
  },

  // 设置时间范围
  setTimeRange: function(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    this.applyFilters()
  },

  // 设置排序方式
  setSortBy: function(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy: sortBy })
    this.applyFilters()
  },

  // 应用筛选
  applyFilters: function() {
    let filteredMemos = [...this.data.allMemos]

    // 标签筛选
    if (this.data.selectedTags.length > 0) {
      filteredMemos = filteredMemos.filter(memo => {
        if (!memo.tags) return false
        return this.data.selectedTags.some(tag => memo.tags.includes(tag))
      })
    }

    // 时间范围筛选
    const now = new Date()
    switch (this.data.timeRange) {
      case 'today':
        const today = now.toDateString()
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp).toDateString() === today
        })
        break
      case '3days':
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp) >= threeDaysAgo
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp) >= weekAgo
        })
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp) >= monthAgo
        })
        break
    }

    // 排序
    switch (this.data.sortBy) {
      case 'time_desc':
        filteredMemos.sort((a, b) => b.timestamp - a.timestamp)
        break
      case 'time_asc':
        filteredMemos.sort((a, b) => a.timestamp - b.timestamp)
        break
      case 'length':
        filteredMemos.sort((a, b) => b.content.length - a.content.length)
        break
    }

    // 按日期分组
    const groupedMemos = this.groupMemosByDate(filteredMemos)

    this.setData({
      filteredMemos: filteredMemos,
      groupedMemos: groupedMemos,
      currentPage: 1,
      hasMore: filteredMemos.length > this.data.pageSize
    })
  },

  // 按日期分组
  groupMemosByDate: function(memos) {
    const groups = {}
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    memos.forEach(memo => {
      const memoDate = new Date(memo.timestamp)
      const dateKey = memo.dateStr
      
      if (!groups[dateKey]) {
        let dateDisplay = dateKey
        if (memoDate.toDateString() === today.toDateString()) {
          dateDisplay = '今天'
        } else if (memoDate.toDateString() === yesterday.toDateString()) {
          dateDisplay = '昨天'
        } else {
          dateDisplay = `${memoDate.getMonth() + 1}月${memoDate.getDate()}日`
        }

        groups[dateKey] = {
          date: dateKey,
          dateDisplay: dateDisplay,
          memos: []
        }
      }
      
      groups[dateKey].memos.push(memo)
    })

    return Object.values(groups)
  },

  // 查看备忘录详情
  viewMemoDetail: function(e) {
    const memo = e.currentTarget.dataset.memo
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

    if (this.data.currentPlayingId && this.data.currentPlayingId !== memo.id) {
      this.innerAudioContext.stop()
      this.updatePlayingStatus(this.data.currentPlayingId, false)
    }

    if (memo.isPlaying) {
      this.innerAudioContext.pause()
      this.updatePlayingStatus(memo.id, false)
      this.setData({ currentPlayingId: null })
    } else {
      this.innerAudioContext.src = memo.audioPath
      this.innerAudioContext.play()
      this.setData({ currentPlayingId: memo.id })
    }
  },

  // 更新播放状态
  updatePlayingStatus: function(memoId, isPlaying) {
    const groupedMemos = this.data.groupedMemos.map(group => ({
      ...group,
      memos: group.memos.map(memo => {
        if (memo.id === memoId) {
          return { ...memo, isPlaying }
        }
        return memo
      })
    }))

    this.setData({ groupedMemos })
  },

  // 编辑备忘录
  editMemo: function(e) {
    console.log('editMemo clicked', e)
    const { id, type } = e.currentTarget.dataset
    console.log('memo id:', id, 'type:', type)
    
    if (!id) {
      console.error('memo data is invalid. id:', id, 'type:', type)
      wx.showToast({
        title: '记录数据错误',
        icon: 'none'
      })
      return
    }
    
    // type字段可能为undefined（历史记录兼容），这是正常的
    
    // 由于memo页面是tabBar页面，不能使用navigateTo传参
    // 使用全局数据传递编辑参数
    const app = getApp()
    app.globalData.editMemo = {
      type: type,
      editId: id,
      fromPage: 'history'
    }
    
    console.log('switching to memo tab with edit params:', type, id)
    wx.switchTab({
      url: '/pages/memo/memo',
      fail: (err) => {
        console.error('switch tab failed:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
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
          if (memo.isPlaying) {
            this.innerAudioContext.stop()
          }
          
          // 显示删除中状态
          wx.showLoading({ title: '删除中...' })
          
          try {
            const success = await app.deleteMemo(memo.id)
            wx.hideLoading()
            
            if (success) {
              this.loadAllMemos()
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

  // 清除筛选
  clearFilters: function() {
    this.setData({
      selectedTags: [],
      timeRange: 'all',
      sortBy: 'time_desc'
    })
    this.applyFilters()
  },

  // 加载更多
  loadMore: function() {
    if (this.data.isLoading || !this.data.hasMore) return

    this.setData({ isLoading: true })

    setTimeout(() => {
      const nextPage = this.data.currentPage + 1
      const startIndex = (nextPage - 1) * this.data.pageSize
      const hasMore = startIndex < this.data.filteredMemos.length

      this.setData({
        currentPage: nextPage,
        hasMore: hasMore,
        isLoading: false
      })
    }, 1000)
  },

  // 清理资源
  cleanup: function() {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  },

  // 计算属性：是否有激活的筛选
  get hasActiveFilters() {
    return this.data.selectedTags.length > 0 || 
           this.data.timeRange !== 'all' || 
           this.data.sortBy !== 'time_desc'
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