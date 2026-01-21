const app = getApp()
const userManager = require('../../utils/userManager.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    // 日期选择
    selectedDate: '',
    selectedDateDisplay: '今天',
    todayDate: '',

    // 统计数据
    stats: {
      totalHours: 0,
      systemGoalHours: 0,
      dailyTaskHours: 0,
      journalHours: 0,
      activityCount: 0
    },

    // 活动列表
    activities: [],

    // 状态
    isLoading: false,
    showAddDialog: false
  },

  onLoad: function() {
    console.log('📚 History页面加载')

    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }

    this.initData()
    this.loadActivities()
  },

  onShow: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }

    // 刷新数据
    this.loadActivities()
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

  // 加载活动数据
  loadActivities: async function() {
    try {
      this.setData({ isLoading: true })

      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('用户未登录')
        this.setData({ isLoading: false })
        return
      }

      const notionConfig = currentUser.notionConfig
      const activityDetailsDatabaseId = notionConfig?.databases?.activityDetails
      const mainRecordsDatabaseId = notionConfig?.databases?.mainRecords

      console.log('🔍 加载活动明细:', {
        hasConfig: !!notionConfig,
        hasApiKey: !!notionConfig?.apiKey,
        activityDetailsDatabaseId: activityDetailsDatabaseId,
        mainRecordsDatabaseId: mainRecordsDatabaseId,
        selectedDate: this.data.selectedDate
      })

      if (!notionConfig || !notionConfig.apiKey || !activityDetailsDatabaseId || !mainRecordsDatabaseId) {
        console.log('Notion未配置')
        wx.showToast({
          title: '请先配置Notion',
          icon: 'none',
          duration: 2000
        })
        this.setData({ isLoading: false })
        return
      }

      // 优化方案：查询Main Records数据库（有Date字段），按选中日期过滤
      // 然后获取这些Main Record关联的Activity Details
      const selectedDateStr = this.data.selectedDate
      console.log(`📅 查询日期: ${selectedDateStr}`)

      // ⭐ 智能检测字段名，兼容新旧Schema
      let dateField = 'Date' // 默认新Schema字段名
      try {
        const schema = await notionApiService.getDatabaseSchema(notionConfig.apiKey, mainRecordsDatabaseId)
        console.log('📋 Main Records Schema字段:', Object.keys(schema || {}))

        // 检测实际存在的日期字段名
        if (schema) {
          if ('Record Date' in schema) {
            dateField = 'Record Date'
            console.log('✅ 使用旧Schema字段名: Record Date')
          } else if ('Date' in schema) {
            dateField = 'Date'
            console.log('✅ 使用新Schema字段名: Date')
          }
        }
      } catch (error) {
        console.warn('⚠️ 获取Schema失败，使用默认字段名:', error.message)
      }

      console.log(`🔍 使用日期字段名: "${dateField}"`)

      // 查询指定日期的Main Records
      const mainRecordsResult = await notionApiService.queryDatabase(
        notionConfig.apiKey,
        mainRecordsDatabaseId,
        {
          filter: {
            property: dateField,
            date: {
              equals: selectedDateStr
            }
          },
          page_size: 100
        }
      )

      if (!mainRecordsResult.success) {
        console.error('❌ 查询主记录失败:', mainRecordsResult.error)
        wx.showToast({
          title: `查询失败: ${mainRecordsResult.error}`,
          icon: 'none',
          duration: 3000
        })
        this.setData({ isLoading: false })
        return
      }

      const mainRecords = mainRecordsResult.data.results || []
      console.log(`📝 查询到 ${mainRecords.length} 条主记录（日期: ${selectedDateStr}）`)

      // 收集所有关联的Activity Details ID
      const activityIds = new Set()
      mainRecords.forEach(record => {
        const relatedActivities = record.properties['Related Activities']?.relation || []
        relatedActivities.forEach(activity => {
          activityIds.add(activity.id)
        })
      })

      console.log(`⏱️ 关联的活动数量: ${activityIds.size}`)

      // 如果没有关联活动，直接返回空列表
      if (activityIds.size === 0) {
        console.log('📭 当天无活动记录')
        this.setData({
          activities: [],
          stats: {
            totalHours: 0,
            systemGoalHours: 0,
            dailyTaskHours: 0,
            journalHours: 0,
            activityCount: 0
          },
          isLoading: false
        })
        return
      }

      // 批量查询Activity Details
      const activities = []
      for (const activityId of activityIds) {
        try {
          const activityResult = await notionApiService.getPage(notionConfig.apiKey, activityId)
          if (activityResult.success) {
            activities.push(activityResult.data)
          }
        } catch (error) {
          console.warn(`⚠️ 获取活动失败 ${activityId}:`, error)
        }
      }

      console.log(`📊 成功获取 ${activities.length} 个活动明细`)

      // 查询活动（改为按指定日期查询Main Records，避免加载所有历史数据）
      const result = {
        success: true,
        data: {
          results: activities
        }
      }

      if (!result.success) {
        console.error('❌ 查询活动失败:', result.error)
        wx.showToast({
          title: `查询失败: ${result.error}`,
          icon: 'none',
          duration: 3000
        })
        this.setData({ isLoading: false })
        return
      }

      // activities变量已在第173行定义并填充，此处无需重复声明
      console.log(`📊 获取到 ${activities.length} 个活动（日期: ${selectedDateStr}）`)

      // 处理活动数据（不再需要查询Related Main Record获取日期）
      const processedActivities = await this.processActivities(activities, notionConfig, selectedDateStr)

      console.log('📋 处理后的活动数据示例:', processedActivities.slice(0, 3))

      // 不再需要前端筛选，因为已经在API层面按日期过滤了
      // 直接计算统计数据
      const stats = this.calculateStats(processedActivities)

      this.setData({
        activities: processedActivities,
        stats: stats,
        isLoading: false
      })

    } catch (error) {
      console.error('❌ 加载活动异常:', error)
      wx.showToast({
        title: '加载失败：' + error.message,
        icon: 'none',
        duration: 3000
      })
      this.setData({ isLoading: false })
    }
  },

  // 处理活动数据
  processActivities: async function(activities, notionConfig, activityDate) {
    const processed = []

    for (const activity of activities) {
      const props = activity.properties

      // 提取基本字段
      const activityName = props['Name']?.title?.[0]?.text?.content || '未命名活动'
      const startTime = props['Start Time']?.rich_text?.[0]?.text?.content || ''
      const endTime = props['End Time']?.rich_text?.[0]?.text?.content || ''
      const duration = props['Duration']?.number || 0
      const activityType = props['Activity Type']?.select?.name || '流水账'

      // 提取关联ID
      const relatedGoalId = props['Related Goal']?.relation?.[0]?.id || null
      const relatedTodoId = props['Related Todo']?.relation?.[0]?.id || null
      const relatedKnowledgeId = props['Related Knowledge']?.relation?.[0]?.id || null

      // 查询关联的目标、待办、知识库获取名称和状态
      let relatedGoalName = ''
      let relatedTodoName = ''
      let relatedKnowledgeName = ''
      let statusDisplay = ''

      // 不再需要查询Related Main Record获取日期，直接使用传入的日期参数

      // 查询目标
      if (relatedGoalId) {
        try {
          const goalPage = await notionApiService.getPage(notionConfig.apiKey, relatedGoalId)
          if (goalPage.success) {
            relatedGoalName = goalPage.data.properties['Goal Name']?.title?.[0]?.text?.content ||
                             goalPage.data.properties['Name']?.title?.[0]?.text?.content || ''

            // 系统目标显示进度
            if (activityType === '系统目标') {
              const progress = goalPage.data.properties['Progress']?.number || 0
              const targetValue = goalPage.data.properties['Target Value']?.number || 0
              const currentValue = goalPage.data.properties['Current Value']?.number || 0
              const unit = goalPage.data.properties['Unit']?.rich_text?.[0]?.text?.content || 'h'

              if (targetValue > 0) {
                statusDisplay = `${currentValue}/${targetValue}${unit}`
              } else {
                statusDisplay = `${Math.round(progress)}%`
              }
            }
          }
        } catch (error) {
          console.warn('查询目标失败:', error)
        }
      }

      // 查询待办
      if (relatedTodoId) {
        try {
          const todoPage = await notionApiService.getPage(notionConfig.apiKey, relatedTodoId)
          if (todoPage.success) {
            relatedTodoName = todoPage.data.properties['Title']?.title?.[0]?.text?.content ||
                             todoPage.data.properties['Todo Name']?.title?.[0]?.text?.content || ''

            // 每日事项显示状态
            if (activityType === '每日事项') {
              const status = todoPage.data.properties['Status']?.select?.name || ''
              statusDisplay = status
            }
          }
        } catch (error) {
          console.warn('查询待办失败:', error)
        }
      }

      // 查询知识库
      if (relatedKnowledgeId) {
        try {
          const knowledgePage = await notionApiService.getPage(notionConfig.apiKey, relatedKnowledgeId)
          if (knowledgePage.success) {
            relatedKnowledgeName = knowledgePage.data.properties['Title']?.title?.[0]?.text?.content ||
                                  knowledgePage.data.properties['Name']?.title?.[0]?.text?.content || ''
          }
        } catch (error) {
          console.warn('查询知识库失败:', error)
        }
      }

      // 流水账不显示状态
      if (activityType === '流水账') {
        statusDisplay = '-'
      }

      // 确定活动类型样式类
      let activityTypeClass = 'journal-activity'
      if (activityType === '系统目标') {
        activityTypeClass = 'system-goal-activity'
      } else if (activityType === '每日事项') {
        activityTypeClass = 'daily-task-activity'
      }

      processed.push({
        id: activity.id,
        activityName: activityName,
        startTimeDisplay: startTime || '-',
        endTimeDisplay: endTime || '-',
        durationDisplay: duration > 0 ? `${duration}分钟` : '-',
        activityType: activityType,
        activityTypeClass: activityTypeClass,
        relatedGoalName: relatedGoalName,
        relatedTodoName: relatedTodoName,
        relatedKnowledgeName: relatedKnowledgeName,
        statusDisplay: statusDisplay || '-',
        duration: duration,
        activityDate: activityDate // 用于前端筛选
      })
    }

    return processed
  },

  // 计算统计数据
  calculateStats: function(activities) {
    let totalMinutes = 0
    let systemGoalMinutes = 0
    let dailyTaskMinutes = 0
    let journalMinutes = 0

    activities.forEach(activity => {
      const duration = activity.duration || 0
      totalMinutes += duration

      if (activity.activityType === '系统目标') {
        systemGoalMinutes += duration
      } else if (activity.activityType === '每日事项') {
        dailyTaskMinutes += duration
      } else {
        journalMinutes += duration
      }
    })

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      systemGoalHours: (systemGoalMinutes / 60).toFixed(1),
      dailyTaskHours: (dailyTaskMinutes / 60).toFixed(1),
      journalHours: (journalMinutes / 60).toFixed(1),
      activityCount: activities.length
    }
  },

  // 日期导航 - 前一天
  previousDay: function() {
    const currentDate = new Date(this.data.selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)

    const newDateStr = this.formatDate(currentDate)
    const newDisplay = this.getDateDisplay(currentDate)

    this.setData({
      selectedDate: newDateStr,
      selectedDateDisplay: newDisplay
    })

    this.loadActivities()
  },

  // 日期导航 - 后一天
  nextDay: function() {
    const currentDate = new Date(this.data.selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)

    const newDateStr = this.formatDate(currentDate)
    const newDisplay = this.getDateDisplay(currentDate)

    this.setData({
      selectedDate: newDateStr,
      selectedDateDisplay: newDisplay
    })

    this.loadActivities()
  },

  // 日期导航 - 回到今天
  goToToday: function() {
    const today = new Date()
    const todayStr = this.formatDate(today)

    this.setData({
      selectedDate: todayStr,
      selectedDateDisplay: '今天'
    })

    this.loadActivities()
  },

  // 日期选择器变化
  onDateChange: function(e) {
    const selectedDate = e.detail.value
    const selectedDateObj = new Date(selectedDate)
    const dateDisplay = this.getDateDisplay(selectedDateObj)

    this.setData({
      selectedDate: selectedDate,
      selectedDateDisplay: dateDisplay
    })

    this.loadActivities()
  },

  // 获取日期显示文本
  getDateDisplay: function(date) {
    const today = new Date()
    const todayStr = this.formatDate(today)
    const dateStr = this.formatDate(date)

    if (dateStr === todayStr) {
      return '今天'
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = this.formatDate(yesterday)

    if (dateStr === yesterdayStr) {
      return '昨天'
    }

    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  // 格式化日期
  formatDate: function(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  },

  // 编辑活动
  editActivity: function(e) {
    const activityId = e.currentTarget.dataset.id
    console.log('编辑活动:', activityId)

    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 删除活动
  deleteActivity: function(e) {
    const activityId = e.currentTarget.dataset.id
    const activity = this.data.activities.find(a => a.id === activityId)

    if (!activity) {
      wx.showToast({
        title: '活动不存在',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除活动 "${activity.activityName}" 吗？`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await this.performDeleteActivity(activityId)
        }
      }
    })
  },

  // 执行删除活动
  performDeleteActivity: async function(activityId) {
    try {
      wx.showLoading({ title: '删除中...' })

      const currentUser = userManager.getCurrentUser()
      const notionConfig = currentUser?.notionConfig

      if (!notionConfig || !notionConfig.apiKey) {
        wx.hideLoading()
        wx.showToast({
          title: 'Notion未配置',
          icon: 'none'
        })
        return
      }

      // 归档活动（Notion软删除）
      const result = await notionApiService.updatePageProperties(
        notionConfig.apiKey,
        activityId,
        {
          'Archived': { checkbox: true }
        }
      )

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })

        // 重新加载数据
        this.loadActivities()
      } else {
        wx.showToast({
          title: '删除失败：' + result.error,
          icon: 'none',
          duration: 3000
        })
      }

    } catch (error) {
      console.error('❌ 删除活动失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '删除失败：' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 显示添加活动对话框
  showAddActivityDialog: function() {
    wx.showToast({
      title: '添加功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 关闭添加活动对话框
  closeAddDialog: function() {
    this.setData({ showAddDialog: false })
  },

  // 阻止事件冒泡
  stopPropagation: function() {
    // 阻止点击对话框内容时关闭
  }
})
