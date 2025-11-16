const app = getApp()
const userManager = require('../../utils/userManager.js')
const tagManager = require('../../utils/tagManager.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    // 统一的活动列表
    allActivities: [], // [{activity, minutes, activityType, tags, goalId, goalTitle, todoId, todoTitle, todoStatus}]

    // 当前正在输入的活动信息
    currentActivity: '',
    currentMinutes: '',
    currentActivityType: 'valuable', // 默认有价值
    currentActivityTags: [],
    currentActivityGoalIndex: -1,
    currentActivityTodoIndex: -1,
    currentActivityTodoStatus: '进行中',

    // 是否可以添加
    canAddActivity: false,

    // 统计数据
    totalMinutes: 0,
    totalValuableMinutes: 0,
    totalNeutralMinutes: 0,
    totalWastefulMinutes: 0,

    // 标签、目标、待办列表
    availableTags: [],
    availableGoals: [],
    availableTodos: [],

    // 时间选择相关
    selectedDateType: 'today', // 'today' | 'yesterday' | 'custom'
    minuteOptions: ['00', '30'], // 分钟选项数组
    startHour: 5, // 开始小时 (5-23)
    startMinuteIndex: 0, // 开始分钟索引 (0=00, 1=30)
    endHour: 6, // 结束小时 (5-23)
    endMinuteIndex: 0, // 结束分钟索引
    startTimeDisplay: '', // 开始时间显示
    endTimeDisplay: '', // 结束时间显示
    selectedTimeDisplay: '', // 完整时间显示
    customDate: '',
    customDateDisplay: '',
    todayDate: ''

    // 保存相关
    isSaving: false,

    // 编辑模式
    isEditMode: false,
    editingMemoId: '',
  },

  onLoad: async function(options) {
    console.log('📝 Memo页面加载 (onLoad)')

    try {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return
      }

      // 初始化时间选项
      const today = new Date()
      const todayDate = this.formatDate(today)
      const startTimeDisplay = this.formatTimeDisplay(5, 0) // 默认5:00
      const endTimeDisplay = this.formatTimeDisplay(6, 0)   // 默认6:00

      console.log('📅 时间选项初始化:', {
        todayDate
      })

      this.setData({
        todayDate: todayDate,
        customDate: todayDate,
        startHour: 5,
        startMinuteIndex: 0,
        endHour: 6,
        endMinuteIndex: 0,
        startTimeDisplay: startTimeDisplay,
        endTimeDisplay: endTimeDisplay,
        selectedTimeDisplay: this.getSelectedTimeDisplay('today')
      })

      console.log('✅ 页面数据初始化完成')

      // 加载标签
      try {
        await this.loadUserTags()
      } catch (error) {
        console.error('❌ 加载标签失败:', error)
      }

      // 加载目标和待办（异步，不阻塞页面）
      this.loadAvailableGoals().catch(err => {
        console.error('❌ 加载目标失败:', err)
      })
      this.loadAvailableTodos().catch(err => {
        console.error('❌ 加载待办失败:', err)
      })

      console.log('🎉 Memo页面加载完成')
    } catch (error) {
      console.error('❌ Memo页面加载失败:', error)
      wx.showToast({
        title: '页面加载失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // ⭐ onShow在每次页面显示时都会调用（包括从其他页面返回）
  onShow: function() {
    console.log('📝 Memo页面显示 (onShow)')

    // 检查是否有编辑数据（使用switchTab跳转时，需要在onShow中检查）
    const app = getApp()
    if (app.globalData.editMemo) {
      console.log('📝 [onShow] 检测到编辑模式，加载原记录数据')
      this.loadEditMemo(app.globalData.editMemo)
      // 清除globalData中的编辑数据，避免重复加载
      app.globalData.editMemo = null
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      console.log('❌ 未登录，跳转到登录页')
      wx.reLaunch({
        url: '/pages/home/home'
      })
      return false
    }
    console.log('✅ 用户已登录:', currentUser.email)
    return true
  },

  // ⭐ 加载编辑模式数据
  loadEditMemo: function(editData) {
    console.log('📝 开始加载编辑数据:', editData)

    const { editId, memoData } = editData

    if (!memoData) {
      console.error('❌ 编辑数据为空')
      return
    }

    console.log('📋 编辑数据详情:', {
      id: memoData.id,
      content: memoData.content,
      startTime: memoData.startTime,
      endTime: memoData.endTime,
      dateStr: memoData.dateStr,
      valuableCount: memoData.valuableTimeEntries?.length || 0,
      neutralCount: memoData.neutralTimeEntries?.length || 0,
      wastefulCount: memoData.wastefulTimeEntries?.length || 0
    })

    // 合并所有时间投入到allActivities
    const allActivities = []

    // 有价值活动
    if (memoData.valuableTimeEntries && memoData.valuableTimeEntries.length > 0) {
      memoData.valuableTimeEntries.forEach(entry => {
        allActivities.push({
          activity: entry.activity,
          minutes: entry.minutes,
          activityType: 'valuable',
          tags: entry.tags || [],
          goalId: entry.goalId || '',
          goalTitle: entry.goalTitle || '',
          todoId: entry.todoId || '',
          todoTitle: entry.todoTitle || '',
          todoStatus: entry.todoStatus || '进行中'
        })
      })
    }

    // 中性活动
    if (memoData.neutralTimeEntries && memoData.neutralTimeEntries.length > 0) {
      memoData.neutralTimeEntries.forEach(entry => {
        allActivities.push({
          activity: entry.activity,
          minutes: entry.minutes,
          activityType: 'neutral',
          tags: entry.tags || [],
          goalId: entry.goalId || '',
          goalTitle: entry.goalTitle || '',
          todoId: entry.todoId || '',
          todoTitle: entry.todoTitle || '',
          todoStatus: entry.todoStatus || '进行中'
        })
      })
    }

    // 低效活动
    if (memoData.wastefulTimeEntries && memoData.wastefulTimeEntries.length > 0) {
      memoData.wastefulTimeEntries.forEach(entry => {
        allActivities.push({
          activity: entry.activity,
          minutes: entry.minutes,
          activityType: 'wasteful',
          tags: entry.tags || [],
          goalId: entry.goalId || '',
          goalTitle: entry.goalTitle || '',
          todoId: entry.todoId || '',
          todoTitle: entry.todoTitle || '',
          todoStatus: entry.todoStatus || '进行中'
        })
      })
    }

    // 计算总时长
    const totalMinutes = allActivities.reduce((sum, activity) => sum + activity.minutes, 0)
    const totalValuableMinutes = allActivities
      .filter(a => a.activityType === 'valuable')
      .reduce((sum, a) => sum + a.minutes, 0)
    const totalNeutralMinutes = allActivities
      .filter(a => a.activityType === 'neutral')
      .reduce((sum, a) => sum + a.minutes, 0)
    const totalWastefulMinutes = allActivities
      .filter(a => a.activityType === 'wasteful')
      .reduce((sum, a) => sum + a.minutes, 0)

    console.log('✅ 加载编辑数据完成:', {
      totalActivities: allActivities.length,
      totalMinutes,
      totalValuableMinutes,
      totalNeutralMinutes,
      totalWastefulMinutes
    })

    // ⭐ 处理时间字段
    let startHour = 5
    let startMinuteIndex = 0
    let endHour = 6
    let endMinuteIndex = 0
    let startTimeDisplay = ''
    let endTimeDisplay = ''
    let dateMode = 'today'
    let customDate = ''

    // 从memoData中解析时间
    if (memoData.dateStr) {
      const today = this.formatDate(new Date())
      if (memoData.dateStr !== today) {
        dateMode = 'custom'
        customDate = memoData.dateStr
      }
    }

    // 解析开始和结束时间
    if (memoData.startTime && memoData.endTime) {
      // 解析开始时间 (格式: "HH:MM")
      const startMatch = memoData.startTime.match(/(\d{1,2}):(\d{2})/)
      if (startMatch) {
        startHour = parseInt(startMatch[1])
        const startMinute = parseInt(startMatch[2])
        startMinuteIndex = startMinute >= 30 ? 1 : 0
        startTimeDisplay = this.formatTimeDisplay(startHour, startMinute)
      }

      // 解析结束时间
      const endMatch = memoData.endTime.match(/(\d{1,2}):(\d{2})/)
      if (endMatch) {
        endHour = parseInt(endMatch[1])
        const endMinute = parseInt(endMatch[2])
        endMinuteIndex = endMinute >= 30 ? 1 : 0
        endTimeDisplay = this.formatTimeDisplay(endHour, endMinute)
      }

      console.log('⏰ 时间解析结果:', {
        startTime: memoData.startTime,
        endTime: memoData.endTime,
        startHour,
        startMinuteIndex,
        endHour,
        endMinuteIndex,
        startTimeDisplay,
        endTimeDisplay
      })
    }

    // 设置数据到页面
    this.setData({
      isEditMode: true,
      editingMemoId: editId,
      allActivities: allActivities,
      totalMinutes: totalMinutes,
      totalValuableMinutes: totalValuableMinutes,
      totalNeutralMinutes: totalNeutralMinutes,
      totalWastefulMinutes: totalWastefulMinutes,
      recordMode: memoData.recordMode || 'daily',
      // ⭐ 时间相关字段
      selectedDateType: dateMode,
      customDate: customDate,
      startHour: startHour,
      startMinuteIndex: startMinuteIndex,
      endHour: endHour,
      endMinuteIndex: endMinuteIndex,
      startTimeDisplay: startTimeDisplay,
      endTimeDisplay: endTimeDisplay,
      selectedTimeDisplay: this.getSelectedTimeDisplay(dateMode)
    })

    wx.showToast({
      title: '编辑数据加载成功',
      icon: 'success',
      duration: 2000
    })
  },

  // === 输入处理方法 ===

  onActivityInput: function(e) {
    this.setData({
      currentActivity: e.detail.value
    })
    this.checkCanAddActivity()
  },

  onMinutesInput: function(e) {
    const minutes = parseInt(e.detail.value) || 0
    this.setData({
      currentMinutes: e.detail.value
    })
    this.checkCanAddActivity()
  },

  selectActivityType: function(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      currentActivityType: type
    })
  },

  toggleActivityTag: function(e) {
    const tag = e.currentTarget.dataset.tag
    const tags = [...this.data.currentActivityTags] // 创建副本避免直接修改
    const index = tags.indexOf(tag)

    if (index > -1) {
      tags.splice(index, 1)
    } else {
      tags.push(tag)
    }

    this.setData({
      currentActivityTags: tags
    })

    console.log('标签选择变化:', tags)
  },

  onGoalChange: function(e) {
    const index = parseInt(e.detail.value)
    const goal = this.data.availableGoals[index]

    this.setData({
      currentActivityGoalIndex: index
    })
  },

  onTodoChange: function(e) {
    const index = parseInt(e.detail.value)
    const todo = this.data.availableTodos[index]

    this.setData({
      currentActivityTodoIndex: index
    })
  },

  selectTodoStatus: function(e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      currentActivityTodoStatus: status
    })
  },

  // 检查是否可以添加活动
  checkCanAddActivity: function() {
    const activity = this.data.currentActivity.trim()
    const minutes = parseInt(this.data.currentMinutes) || 0

    const canAdd = activity.length > 0 && minutes >= 5

    this.setData({
      canAddActivity: canAdd
    })
  },

  // === 活动管理方法 ===

  addActivity: function() {
    if (!this.data.canAddActivity) {
      return
    }

    const activity = this.data.currentActivity.trim()
    const minutes = parseInt(this.data.currentMinutes) || 0
    const activityType = this.data.currentActivityType
    const tags = [...this.data.currentActivityTags]

    // 获取关联的目标
    let goalId = ''
    let goalTitle = ''
    if (this.data.currentActivityGoalIndex >= 0) {
      const goal = this.data.availableGoals[this.data.currentActivityGoalIndex]
      goalId = goal.id
      goalTitle = goal.title
    }

    // 获取关联的待办
    let todoId = ''
    let todoTitle = ''
    if (this.data.currentActivityTodoIndex >= 0) {
      const todo = this.data.availableTodos[this.data.currentActivityTodoIndex]
      todoId = todo.id
      todoTitle = todo.title
    }

    const newActivity = {
      activity,
      minutes,
      activityType,
      tags,
      goalId,
      goalTitle,
      todoId,
      todoTitle,
      todoStatus: this.data.currentActivityTodoStatus
    }

    const activities = [...this.data.allActivities, newActivity]

    this.setData({
      allActivities: activities,
      // 清空输入
      currentActivity: '',
      currentMinutes: '',
      currentActivityTags: [],
      currentActivityGoalIndex: -1,
      currentActivityTodoIndex: -1,
      currentActivityTodoStatus: '进行中',
      canAddActivity: false
    })

    // 更新统计
    this.updateStatistics()

    wx.showToast({
      title: '已添加',
      icon: 'success',
      duration: 1000
    })
  },

  removeActivity: function(e) {
    const index = e.currentTarget.dataset.index
    const activities = this.data.allActivities

    activities.splice(index, 1)

    this.setData({
      allActivities: activities
    })

    // 更新统计
    this.updateStatistics()

    wx.showToast({
      title: '已删除',
      icon: 'success',
      duration: 1000
    })
  },

  // 更新统计数据
  updateStatistics: function() {
    let totalMinutes = 0
    let valuableMinutes = 0
    let neutralMinutes = 0
    let wastefulMinutes = 0

    this.data.allActivities.forEach(activity => {
      const minutes = activity.minutes || 0
      totalMinutes += minutes

      if (activity.activityType === 'valuable') {
        valuableMinutes += minutes
      } else if (activity.activityType === 'neutral') {
        neutralMinutes += minutes
      } else if (activity.activityType === 'wasteful') {
        wastefulMinutes += minutes
      }
    })

    this.setData({
      totalMinutes,
      totalValuableMinutes: valuableMinutes,
      totalNeutralMinutes: neutralMinutes,
      totalWastefulMinutes: wastefulMinutes
    })
  },

  // === 数据加载方法 ===

  loadUserTags: async function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) return

    try {
      const tags = await tagManager.getUserTags(currentUser.email)
      this.setData({
        availableTags: tags
      })
      console.log('✅ 加载用户标签成功:', tags.length)
    } catch (error) {
      console.error('❌ 加载用户标签失败:', error)
    }
  },

  loadAvailableGoals: async function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.notionConfig) {
      console.log('⚠️ 未配置Notion，跳过加载目标')
      return
    }

    const notionConfig = currentUser.notionConfig
    const apiKey = notionConfig.apiKey
    const goalsDatabaseId = notionConfig.databases?.goals

    if (!apiKey || !goalsDatabaseId) {
      console.log('⚠️ 未配置目标数据库')
      return
    }

    try {
      const result = await notionApiService.queryGoals(apiKey, goalsDatabaseId, {
        status: '进行中'
      })

      if (result.success && result.goals) {
        this.setData({
          availableGoals: result.goals.map(goal => ({
            id: goal.id,
            title: goal.title
          }))
        })
        console.log('✅ 加载目标成功:', result.goals.length)
      }
    } catch (error) {
      console.error('❌ 加载目标失败:', error)
    }
  },

  loadAvailableTodos: async function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.notionConfig) {
      console.log('⚠️ 未配置Notion，跳过加载待办')
      return
    }

    const notionConfig = currentUser.notionConfig
    const apiKey = notionConfig.apiKey
    const todosDatabaseId = notionConfig.databases?.todos

    if (!apiKey || !todosDatabaseId) {
      console.log('⚠️ 未配置待办数据库')
      return
    }

    try {
      // 使用scope参数查询待办和进行中的事项
      const result = await notionApiService.queryTodos(apiKey, todosDatabaseId, {
        scope: '进行中' // 这个会查询所有待办和进行中的事项
      })

      if (result.success && result.todos) {
        this.setData({
          availableTodos: result.todos.map(todo => ({
            id: todo.id,
            title: todo.title
          }))
        })
        console.log('✅ 加载待办成功:', result.todos.length)
      }
    } catch (error) {
      console.error('❌ 加载待办失败:', error)
    }
  },

  // === 保存方法 ===

  saveMemo: async function() {
    if (this.data.isSaving) {
      console.log('⚠️ 正在保存中，请勿重复提交')
      return
    }

    if (this.data.allActivities.length === 0) {
      wx.showToast({
        title: '请至少添加一个活动',
        icon: 'none'
      })
      return
    }

    this.setData({ isSaving: true })

    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser || !currentUser.notionConfig) {
        throw new Error('未配置Notion')
      }

      const notionConfig = currentUser.notionConfig
      const apiKey = notionConfig.apiKey
      const mainRecordsDatabaseId = notionConfig.databases?.mainRecords
      const activityDetailsDatabaseId = notionConfig.databases?.activityDetails

      if (!apiKey || !mainRecordsDatabaseId || !activityDetailsDatabaseId) {
        throw new Error('Notion配置不完整')
      }

      // 1. 生成主记录内容（合并所有活动描述）
      const valuableActivities = []
      const neutralActivities = []
      const wastefulActivities = []

      this.data.allActivities.forEach(activity => {
        const desc = `${activity.activity}（${activity.minutes}分钟）`
        if (activity.activityType === 'valuable') {
          valuableActivities.push(desc)
        } else if (activity.activityType === 'neutral') {
          neutralActivities.push(desc)
        } else {
          wastefulActivities.push(desc)
        }
      })

      const contentParts = []
      if (valuableActivities.length > 0) {
        contentParts.push(valuableActivities.join('、'))
      }
      if (neutralActivities.length > 0) {
        contentParts.push(neutralActivities.join('、'))
      }
      if (wastefulActivities.length > 0) {
        contentParts.push(wastefulActivities.join('、'))
      }

      const content = contentParts.join('\n\n')

      // 2. 创建主记录 - 使用全局唯一数字ID
      const now = new Date()
      const timestamp = now.getTime()
      // 使用13位时间戳作为ID (例如: 1729493847123)
      // 可以通过ID相减计算两条记录的时间间隔
      const recordId = timestamp.toString()

      console.log('📝 生成主记录ID:', recordId)

      // 获取时间
      const startHour = this.data.startHour
      const startMinute = this.data.startMinuteIndex === 0 ? 0 : 30
      const endHour = this.data.endHour
      const endMinute = this.data.endMinuteIndex === 0 ? 0 : 30

      // 根据选中的日期类型确定基础时间戳
      let baseDate
      switch (this.data.selectedDateType) {
        case 'today':
          baseDate = new Date()
          break
        case 'yesterday':
          baseDate = new Date()
          baseDate.setDate(baseDate.getDate() - 1)
          break
        case 'custom':
          baseDate = new Date(this.data.customDate)
          break
        default:
          baseDate = new Date()
      }

      // 辅助函数：根据baseDate、小时和分钟计算完整的DateTime
      const getFullTimestamp = (baseTimestamp, hour, minute) => {
        const date = new Date(baseTimestamp)
        date.setHours(hour, minute, 0, 0)
        return date
      }

      const startDateTime = getFullTimestamp(baseDate, startHour, startMinute)
      const endDateTime = getFullTimestamp(baseDate, endHour, endMinute)

      // 格式化时间显示
      const formatTimeForNotion = (hour, minute) => {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      }

      const startTimeStr = formatTimeForNotion(startHour, startMinute)
      const endTimeStr = formatTimeForNotion(endHour, endMinute)

      console.log('⏰ 时间段:', {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        startTime: startTimeStr,
        endTime: endTimeStr
      })

      // 🔍 获取数据库Schema，自动适配新旧字段名
      let schema = null
      try {
        const schemaResult = await notionApiService.getDatabaseSchema(apiKey, mainRecordsDatabaseId)
        if (schemaResult.success) {
          schema = schemaResult.properties
          console.log('📋 检测到数据库字段:', Object.keys(schema))
        }
      } catch (err) {
        console.warn('⚠️ 获取Schema失败，使用新字段名:', err)
      }

      // 🎯 智能选择字段名（兼容新旧数据库）
      const titleField = schema && 'Name' in schema ? 'Name' : 'Title'
      const contentField = schema && 'Summary' in schema ? 'Summary' : 'Content'
      const dateField = schema && 'Record Date' in schema ? 'Record Date' : 'Date'
      const typeField = schema && 'Type' in schema ? 'Type' : 'Record Type'

      console.log('🔧 使用字段名:', { titleField, contentField, dateField, typeField })

      const properties = {
        [titleField]: { title: [{ text: { content: recordId } }] },
        [contentField]: { rich_text: [{ text: { content: content } }] },
        [dateField]: { date: { start: baseDate.toISOString().split('T')[0] } },
        [typeField]: { select: { name: '日常记录' } },
        'Start Time': {
          rich_text: [{ text: { content: startTimeStr } }]
        },
        'End Time': {
          rich_text: [{ text: { content: endTimeStr } }]
        },
        'User ID': { rich_text: [{ text: { content: currentUser.email } }] }
      }

      const mainRecordResult = await notionApiService.createPageGeneric(
        {
          parent: { database_id: mainRecordsDatabaseId },
          properties: properties
        },
        apiKey
      )

      if (!mainRecordResult.success) {
        throw new Error('创建主记录失败')
      }

      const mainRecordId = mainRecordResult.pageId
      console.log('✅ 主记录创建成功:', mainRecordId)
      console.log('🔍 主记录完整返回数据:', mainRecordResult.data)

      // 3. 创建活动明细
      console.log(`📝 准备创建 ${this.data.allActivities.length} 个活动明细，关联到主记录ID: ${mainRecordId}`)

      for (const activity of this.data.allActivities) {
        // ✅ 修正：映射到正确的Value Rating选项
        const valueRatingMap = {
          'valuable': '高价值',
          'neutral': '中等价值',
          'wasteful': '低价值'
        }

        const valueRating = valueRatingMap[activity.activityType] || '高价值'

        // 完全按照notionApiService.js第2348-2360行查询代码中的字段名
        const properties = {
          'Name': { title: [{ text: { content: activity.activity } }] },
          'Description': { rich_text: [{ text: { content: `${valueRating}活动，投入${activity.minutes}分钟` } }] },
          'Duration': { number: activity.minutes },
          'Activity Type': { select: { name: valueRating } },  // 使用valueRating作为活动类型
          'User ID': { rich_text: [{ text: { content: currentUser.email } }] },
          'Record': { relation: [{ id: mainRecordId }] }
        }

        // 添加标签（持久化到Notion）
        if (activity.tags && activity.tags.length > 0) {
          properties['Tags'] = {
            multi_select: activity.tags.map(tag => ({ name: tag }))
          }
        }

        // 添加目标关联
        if (activity.goalId) {
          properties['Related Goal'] = { relation: [{ id: activity.goalId }] }
        }

        // 添加待办关联
        if (activity.todoId) {
          properties['Related Todo'] = { relation: [{ id: activity.todoId }] }
        }

        console.log(`🔗 创建活动明细 "${activity.activity}"`)
        console.log('📤 完整properties对象:', JSON.stringify(properties, null, 2))

        const activityResult = await notionApiService.createPageGeneric(
          {
            parent: { database_id: activityDetailsDatabaseId },
            properties: properties
          },
          apiKey
        )

        if (!activityResult.success) {
          console.error(`❌ 创建活动明细失败: ${activity.activity}`, activityResult.error)

          // 🔍 诊断：获取数据库实际字段名
          if (activityResult.error && activityResult.error.includes('is not a property that exists')) {
            console.log('🔍 检查活动明细表的实际字段...')
            const schemaResult = await notionApiService.getDatabaseSchema(apiKey, activityDetailsDatabaseId)
            if (schemaResult.success) {
              console.log('📋 活动明细表实际字段名:')
              console.log(JSON.stringify(schemaResult.properties, null, 2))
              console.log('\n❌ 字段名不匹配！请检查数据库配置。')
              console.log('💡 建议：使用注册流程重新自动创建数据库，或手动修改数据库字段名与代码一致。')
            }
          }
        } else {
          console.log(`✅ 活动明细创建成功: ${activity.activity}`)
          console.log(`   活动ID: ${activityResult.pageId}`)
          console.log(`   关联的主记录ID: ${mainRecordId}`)
        }
      }

      console.log('✅ 所有活动明细创建成功')

      // 4. 更新待办状态
      const todoUpdates = new Map()
      this.data.allActivities.forEach(activity => {
        if (activity.todoId) {
          todoUpdates.set(activity.todoId, {
            status: activity.todoStatus,
            title: activity.todoTitle
          })
        }
      })

      for (const [todoId, update] of todoUpdates) {
        try {
          await notionApiService.updatePageProperties(
            apiKey,
            todoId,
            { 'Status': { select: { name: update.status } } }
          )
          console.log(`✅ 更新待办"${update.title}"状态为: ${update.status}`)
        } catch (error) {
          console.error(`❌ 更新待办状态失败:`, error)
        }
      }

      // 5. 保存成功
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000
      })

      // 清空数据
      setTimeout(() => {
        this.setData({
          allActivities: [],
          totalMinutes: 0,
          totalValuableMinutes: 0,
          totalNeutralMinutes: 0,
          totalWastefulMinutes: 0,
          isSaving: false
        })

        // 返回首页
        wx.switchTab({
          url: '/pages/home/home'
        })
      }, 1500)

    } catch (error) {
      console.error('❌ 保存失败:', error)
      wx.showToast({
        title: '保存失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
      this.setData({ isSaving: false })
    }
  },

  // 获取时间段
  getTimePeriod: function(date) {
    const hour = date.getHours()

    if (hour >= 5 && hour < 8) return '早晨'
    if (hour >= 8 && hour < 12) return '上午'
    if (hour >= 12 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 22) return '晚上'
    return '深夜'
  },

  // === 时间选择相关方法 ===

  // 格式化时间显示
  formatTimeDisplay: function(hour, minute) {
    const hourStr = hour.toString().padStart(2, '0')
    const minuteStr = minute === 0 ? '00' : '30'
    const timeStr = `${hourStr}:${minuteStr}`

    if (hour < 6) return `清晨 ${timeStr}`
    if (hour < 12) return `上午 ${timeStr}`
    if (hour === 12) return `中午 ${timeStr}`
    if (hour < 18) return `下午 ${timeStr}`
    return `晚上 ${timeStr}`
  },

  // 验证小时范围 (5-23)
  validateHour: function(hour) {
    const h = parseInt(hour)
    if (isNaN(h)) return 5
    if (h < 5) return 5
    if (h > 23) return 23
    return h
  },

  // 格式化日期 YYYY-MM-DD
  formatDate: function(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 格式化时间 HH:MM
  formatTime: function(date) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  // 格式化日期显示
  formatDateDisplay: function(dateStr) {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
    return `${month}月${day}日 周${weekDay}`
  },

  // 选择日期类型 (今天/昨天/其他日期)
  selectDateType: function(e) {
    const dateType = e.currentTarget.dataset.type
    let targetDate

    // 根据选择的日期类型确定目标日期
    switch (dateType) {
      case 'today':
        targetDate = new Date()
        break
      case 'yesterday':
        targetDate = new Date()
        targetDate.setDate(targetDate.getDate() - 1)
        break
      case 'custom':
        // 保持当前的customDate
        targetDate = new Date(this.data.customDate || this.data.todayDate)
        break
    }

    // 更新自定义日期显示
    const dateStr = this.formatDate(targetDate)
    const displayText = this.formatDateDisplay(dateStr)

    this.setData({
      selectedDateType: dateType,
      customDate: dateStr,
      customDateDisplay: displayText,
      selectedTimeDisplay: this.getSelectedTimeDisplay(dateType)
    })
  },

  // 开始小时输入
  onStartHourInput: function(e) {
    this.setData({
      startHour: e.detail.value
    })
  },

  // 开始小时失焦（验证）
  onStartHourBlur: function(e) {
    let hour = this.validateHour(e.detail.value)
    const minute = this.data.startMinuteIndex === 0 ? 0 : 30

    // 自动调整结束时间
    const startMinutes = hour * 60 + minute
    const endHour = this.data.endHour
    const endMinute = this.data.endMinuteIndex === 0 ? 0 : 30
    const endMinutes = endHour * 60 + endMinute

    let newEndHour = endHour
    let newEndMinuteIndex = this.data.endMinuteIndex

    if (endMinutes <= startMinutes) {
      // 结束时间设为开始时间+30分钟
      let newEndMinutes = startMinutes + 30
      newEndHour = Math.floor(newEndMinutes / 60)
      const newEndMinute = newEndMinutes % 60

      if (newEndHour > 23 || (newEndHour === 23 && newEndMinute > 30)) {
        newEndHour = 23
        newEndMinuteIndex = 1 // 30分钟
      } else {
        newEndMinuteIndex = newEndMinute === 0 ? 0 : 1
      }
    }

    const startDisplay = this.formatTimeDisplay(hour, minute)
    const endDisplay = this.formatTimeDisplay(newEndHour, newEndMinuteIndex === 0 ? 0 : 30)

    this.setData({
      startHour: hour,
      endHour: newEndHour,
      endMinuteIndex: newEndMinuteIndex,
      startTimeDisplay: startDisplay,
      endTimeDisplay: endDisplay,
      selectedTimeDisplay: this.getSelectedTimeDisplay(this.data.selectedDateType)
    })
  },

  // 开始分钟选择
  onStartMinuteChange: function(e) {
    const minuteIndex = parseInt(e.detail.value)
    const hour = this.data.startHour
    const minute = minuteIndex === 0 ? 0 : 30
    const startDisplay = this.formatTimeDisplay(hour, minute)

    this.setData({
      startMinuteIndex: minuteIndex,
      startTimeDisplay: startDisplay,
      selectedTimeDisplay: this.getSelectedTimeDisplay(this.data.selectedDateType)
    })
  },

  // 结束小时输入
  onEndHourInput: function(e) {
    this.setData({
      endHour: e.detail.value
    })
  },

  // 结束小时失焦（验证）
  onEndHourBlur: function(e) {
    let hour = this.validateHour(e.detail.value)
    const minute = this.data.endMinuteIndex === 0 ? 0 : 30

    // 自动调整开始时间
    const endMinutes = hour * 60 + minute
    const startHour = this.data.startHour
    const startMinute = this.data.startMinuteIndex === 0 ? 0 : 30
    const startMinutes = startHour * 60 + startMinute

    let newStartHour = startHour
    let newStartMinuteIndex = this.data.startMinuteIndex

    if (startMinutes >= endMinutes) {
      // 开始时间设为结束时间-30分钟
      let newStartMinutes = endMinutes - 30
      newStartHour = Math.floor(newStartMinutes / 60)
      const newStartMinute = newStartMinutes % 60

      if (newStartHour < 5) {
        newStartHour = 5
        newStartMinuteIndex = 0
      } else {
        newStartMinuteIndex = newStartMinute === 0 ? 0 : 1
      }
    }

    const endDisplay = this.formatTimeDisplay(hour, minute)
    const startDisplay = this.formatTimeDisplay(newStartHour, newStartMinuteIndex === 0 ? 0 : 30)

    this.setData({
      endHour: hour,
      startHour: newStartHour,
      startMinuteIndex: newStartMinuteIndex,
      startTimeDisplay: startDisplay,
      endTimeDisplay: endDisplay,
      selectedTimeDisplay: this.getSelectedTimeDisplay(this.data.selectedDateType)
    })
  },

  // 结束分钟选择
  onEndMinuteChange: function(e) {
    const minuteIndex = parseInt(e.detail.value)
    const hour = this.data.endHour
    const minute = minuteIndex === 0 ? 0 : 30
    const endDisplay = this.formatTimeDisplay(hour, minute)

    this.setData({
      endMinuteIndex: minuteIndex,
      endTimeDisplay: endDisplay,
      selectedTimeDisplay: this.getSelectedTimeDisplay(this.data.selectedDateType)
    })
  },

  // 获取选中时间的完整显示文本
  getSelectedTimeDisplay: function(dateType) {
    let dateText = ''
    switch (dateType) {
      case 'today':
        dateText = '今天'
        break
      case 'yesterday':
        dateText = '昨天'
        break
      case 'custom':
        dateText = this.data.customDateDisplay || '指定日期'
        break
    }

    const startHour = this.data.startHour
    const startMinute = this.data.startMinuteIndex === 0 ? 0 : 30
    const endHour = this.data.endHour
    const endMinute = this.data.endMinuteIndex === 0 ? 0 : 30

    const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

    return `${dateText} ${startTimeStr}-${endTimeStr}`
  },

  // 自定义日期选择
  onDateChange: function(e) {
    const selectedDate = e.detail.value
    const displayText = this.formatDateDisplay(selectedDate)

    this.setData({
      customDate: selectedDate,
      customDateDisplay: displayText,
      selectedTimeDisplay: this.getSelectedTimeDisplay('custom')
    })
  }
})
