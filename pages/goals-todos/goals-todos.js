const app = getApp()
const userManager = require('../../utils/userManager.js')
const apiService = require('../../utils/apiService.js')
const notionApiService = require('../../utils/notionApiService.js')

// CSS类名映射函数
const statusClassMap = {
  '未开始': 'not-started',
  '进行中': 'in-progress',
  '已完成': 'completed',
  '已暂停': 'paused',
  '已取消': 'cancelled',
  '待办': 'not-started',
  'active': 'in-progress'
}

const priorityClassMap = {
  '高': 'high',
  '中': 'medium',
  '低': 'low',
  '紧急重要': 'urgent-important',
  '重要不紧急': 'important-not-urgent',
  '紧急不重要': 'urgent-not-important',
  '不紧急不重要': 'not-urgent-not-important'
}

const typeClassMap = {
  '目标导向': 'goal-oriented',
  '临时待办': 'ad-hoc',
  '习惯养成': 'habit',
  '紧急处理': 'urgent'
}

Page({
  data: {
    // 当前tab: goals 或 todos
    currentTab: 'goals',

    // 目标数据
    goalStats: {
      total: 0,
      active: 0,
      completed: 0,
      averageProgress: 0
    },
    goals: [],
    filteredGoals: [],
    goalSearchKeyword: '',
    selectedGoalCategory: '',

    // 待办数据
    todoStats: {
      pending: 0,
      inProgress: 0,
      completed: 0,
      urgent: 0
    },
    todos: [],
    filteredTodos: [],
    todoSearchKeyword: '',
    selectedTodoType: '',
    selectedTodoStatus: '', // 状态筛选：''全部 | '待办' | '进行中' | '已完成'
    showCompletedTodos: false, // 默认不显示已完成的待办

    // 可用目标列表（供待办选择）
    availableGoals: [],

    // 弹窗状态
    showGoalModal: false,
    showTodoModal: false,
    showProgressModal: false,
    showTimeModal: false,
    showActivitiesModal: false,

    // 活动明细弹窗数据
    activitiesModalTitle: '',
    relatedActivities: [],
    totalActivityMinutes: 0,
    totalActivityHours: 0,

    // 目标表单
    goalFormData: {
      title: '',
      description: '',
      category: '月度目标 (Monthly Goal)',
      priority: '中',
      startDate: '',
      targetDate: '',
      estimatedHours: 0,
      tags: []
    },
    goalCategoryOptions: ['人生目标 (Life Goal)', '年度目标 (Yearly Goal)', '季度目标 (Quarterly Goal)', '月度目标 (Monthly Goal)', '周目标 (Weekly Goal)'],
    goalCategoryIndex: 3,
    priorityOptions: [
      { value: '高', label: '高优先级' },
      { value: '中', label: '中优先级' },
      { value: '低', label: '低优先级' }
    ],
    goalPriorityIndex: 1,
    goalStartDate: '',
    goalTargetDate: '',
    goalEstimatedHours: '',
    goalTagsInput: '',
    editingGoal: null,

    // 待办表单
    todoFormData: {
      title: '',
      description: '',
      type: '临时待办 (Ad-hoc)',
      priority: '重要不紧急',
      status: '待办',
      dueDate: '',
      estimatedMinutes: '',
      relatedGoalId: '',
      tags: []
    },
    todoTypeOptions: [
      { value: '目标导向 (Goal-oriented)', label: '🎯 目标导向' },
      { value: '临时待办 (Ad-hoc)', label: '📝 临时待办' },
      { value: '习惯养成 (Habit)', label: '💪 习惯养成' },
      { value: '紧急处理 (Urgent)', label: '🚨 紧急处理' },
      { value: '明日规划 (Planning)', label: '📅 明日规划' }
    ],
    todoTypeIndex: 1,
    todoPriorityOptions: [
      { value: '紧急重要', label: '🔴 紧急重要' },
      { value: '重要不紧急', label: '🟡 重要不紧急' },
      { value: '紧急不重要', label: '🟠 紧急不重要' },
      { value: '不紧急不重要', label: '⚪ 不紧急不重要' }
    ],
    todoPriorityIndex: 1,
    todoStatusOptions: [
      { value: '待办', label: '⏳ 待办' },
      { value: '进行中', label: '▶️ 进行中' },
      { value: '已完成', label: '✅ 已完成' },
      { value: '已取消', label: '❌ 已取消' }
    ],
    todoStatusIndex: 0,
    todoDueDate: '',
    todoGoalIndex: -1,
    todoTagsInput: '',
    editingTodo: null,

    // 进度更新
    currentProgressGoalId: '',
    progressValue: 0,

    // 记录时间
    currentTodoId: '',
    actualMinutes: ''
  },

  onLoad() {
    this.loadGoals()
    this.loadTodos()
  },

  onShow() {
    this.loadGoals()
    this.loadTodos()
  },

  // Tab切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
  },

  // ========== 目标相关功能 ==========

  async loadGoals() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('用户未登录，使用本地数据')
        this.loadGoalsFromLocal()
        return
      }

      // 🔧 自动修复配置结构：添加databases字段
      if (currentUser.notionConfig && currentUser.notionConfig.goalsDatabaseId && !currentUser.notionConfig.databases) {
        console.log('🔧 Goals页面：检测到旧配置结构，自动添加databases字段...')
        const notionConfig = {
          ...currentUser.notionConfig,
          databases: {
            goals: currentUser.notionConfig.goalsDatabaseId,
            todos: currentUser.notionConfig.todosDatabaseId,
            mainRecords: currentUser.notionConfig.mainDatabaseId || currentUser.notionConfig.mainRecordsDatabaseId,
            activityDetails: currentUser.notionConfig.activityDatabaseId || currentUser.notionConfig.activitiesDatabaseId
          }
        }

        // 保存到本地
        userManager.configureNotion(currentUser.id, notionConfig)

        // 同步到云端
        try {
          const apiService = require('../../utils/apiService.js')
          await apiService.updateUserByEmail(currentUser.email, { notionConfig })
          console.log('✅ Goals页面：配置结构已自动修复并同步到云端')
        } catch (error) {
          console.error('❌ Goals页面：同步修复后的配置失败:', error)
        }

        // 重新获取更新后的用户数据
        currentUser.notionConfig = notionConfig
      }

      const notionConfig = currentUser.notionConfig
      if (!notionConfig || !notionConfig.apiKey || !notionConfig.goalsDatabaseId) {
        console.log('Notion未配置，使用本地数据')
        this.loadGoalsFromLocal()
        return
      }

      // 前端直接查询Notion数据库（不过滤，返回所有记录）
      console.log('🔍 开始查询Goals数据库:', notionConfig.goalsDatabaseId)
      const result = await notionApiService.queryDatabase(
        notionConfig.apiKey,
        notionConfig.goalsDatabaseId,
        {} // 空对象表示不过滤
      )

      console.log('✅ Goals查询结果:', result)
      console.log('📊 Goals数据条数:', result.data?.results?.length || 0)

      if (!result.success) {
        console.error('❌ 加载Goals失败:', result.error)
        this.loadGoalsFromLocal()
        return
      }

      // 解析Notion返回的数据
      const goals = (result.data?.results || []).map(page => {
        const props = page.properties
        return {
          id: page.id,
          title: props['Goal Name']?.title?.[0]?.text?.content || '',
          description: props.Description?.rich_text?.[0]?.text?.content || '',
          category: props.Category?.select?.name || '',
          type: props.Type?.select?.name || '',
          priority: props.Priority?.select?.name || '中',
          status: props.Status?.select?.name || '未开始',
          progress: props.Progress?.number || 0,
          startDate: props['Start Date']?.date?.start || '',
          targetDate: props['Target Date']?.date?.start || '',
          estimatedHours: props['Estimated Hours']?.number || 0,
          importance: props.Importance?.select?.name || '',
          totalTimeInvestment: props['Total Time Invested']?.rollup?.number || 0,
          tags: props.Tags?.multi_select?.map(t => t.name) || []
        }
      })

      const processedGoals = goals.map(goal => {
        // 格式化起始时间
        let startDateText = ''
        if (goal.startDate) {
          const date = new Date(goal.startDate)
          startDateText = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
        }

        // 格式化结束时间
        let targetDateText = ''
        if (goal.targetDate) {
          const date = new Date(goal.targetDate)
          targetDateText = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
        }

        // 计算实际投入时间（分钟）- 从Notion的Total Time Invested字段获取，单位是分钟
        const actualTimeMinutes = goal.totalTimeInvestment || 0
        const actualTimeHours = (actualTimeMinutes / 60).toFixed(1)

        // 简化类别文本
        const categoryTextMap = {
          '人生目标 (Life Goal)': '人生',
          '年度目标 (Yearly Goal)': '年度',
          '季度目标 (Quarterly Goal)': '季度',
          '月度目标 (Monthly Goal)': '月度',
          '周目标 (Weekly Goal)': '周'
        }
        const categoryText = categoryTextMap[goal.category] || goal.category

        // 计算占比预计总投入时间的百分比
        const estimatedHours = goal.estimatedHours || 0
        const estimatedMinutes = estimatedHours * 60
        const timePercentage = estimatedMinutes > 0 ? Math.round((actualTimeMinutes / estimatedMinutes) * 100) : 0

        // 重要性文本映射
        const importanceTextMap = {
          '核心': '🔥 核心',
          '重要': '⭐ 重要',
          '辅助': '📌 辅助'
        }

        // 重要性CSS类名映射
        const importanceClassMap = {
          '核心': 'core',
          '重要': 'important',
          '辅助': 'auxiliary'
        }

        return {
          ...goal,
          startDateText,
          targetDateText,
          actualTimeMinutes,
          actualTimeHours,
          categoryText,
          timePercentage,
          importanceText: importanceTextMap[goal.importance] || goal.importance,
          statusText: this.getGoalStatusText(goal.status),
          priorityText: goal.priority || '中',
          timeInvestmentDisplay: this.formatTime(goal.totalTimeInvestment || 0),
          // CSS类名
          statusClass: statusClassMap[goal.status] || statusClassMap['未开始'],
          priority: priorityClassMap[goal.priority] || priorityClassMap['中'],
          importance: importanceClassMap[goal.importance] || 'auxiliary'
        }
      })

      console.log('📝 解析后的Goals:', goals)
      console.log('🎨 处理后的Goals:', processedGoals)

      this.setData({
        goals: processedGoals,
        availableGoals: processedGoals
      })

      console.log('✨ Goals数据已设置到页面')

      // 同步到本地缓存（暂时禁用，数据已通过Notion管理）
      // app.setGoals(goals)

      this.calculateGoalStats()
      this.filterGoals()

    } catch (error) {
      console.error('加载Goals异常:', error)
      this.loadGoalsFromLocal()
    }
  },

  loadGoalsFromLocal() {
    const goals = app.getGoals ? app.getGoals() : []

    const processedGoals = goals.map(goal => {
      let targetDateText = ''
      if (goal.targetDate) {
        const date = new Date(goal.targetDate)
        targetDateText = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
      }

      const actualTimeMinutes = goal.totalTimeInvestment || 0
      const actualTimeHours = (actualTimeMinutes / 60).toFixed(1)

      // 简化类别文本
      const categoryTextMap = {
        '人生目标 (Life Goal)': '人生',
        '年度目标 (Yearly Goal)': '年度',
        '季度目标 (Quarterly Goal)': '季度',
        '月度目标 (Monthly Goal)': '月度',
        '周目标 (Weekly Goal)': '周'
      }
      const categoryText = categoryTextMap[goal.category] || goal.category

      return {
        ...goal,
        targetDateText,
        actualTimeMinutes,
        actualTimeHours,
        categoryText,
        statusText: this.getGoalStatusText(goal.status),
        priorityText: goal.priority || '中',
        timeInvestmentDisplay: this.formatTime(goal.totalTimeInvestment || 0),
        // CSS类名
        statusClass: statusClassMap[goal.status] || statusClassMap['未开始'],
        priority: priorityClassMap[goal.priority] || priorityClassMap['中']
      }
    })

    this.setData({
      goals: processedGoals,
      availableGoals: processedGoals
    })

    this.calculateGoalStats()
    this.filterGoals()
  },

  calculateGoalStats() {
    const goals = this.data.goals
    const stats = {
      total: goals.length,
      active: goals.filter(g => g.status === '进行中').length,
      completed: goals.filter(g => g.status === '已完成').length,
      averageProgress: goals.length > 0
        ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
        : 0
    }

    this.setData({
      goalStats: stats
    })
  },

  filterGoals() {
    console.log('🔍 开始筛选Goals，原始数据条数:', this.data.goals.length)
    let filtered = [...this.data.goals]

    if (this.data.goalSearchKeyword) {
      const keyword = this.data.goalSearchKeyword.toLowerCase()
      filtered = filtered.filter(goal =>
        goal.title.toLowerCase().includes(keyword) ||
        (goal.description && goal.description.toLowerCase().includes(keyword))
      )
      console.log('📝 搜索关键词:', this.data.goalSearchKeyword, ', 筛选后:', filtered.length)
    }

    if (this.data.selectedGoalCategory) {
      filtered = filtered.filter(goal => goal.category === this.data.selectedGoalCategory)
      console.log('🏷️ 筛选分类:', this.data.selectedGoalCategory, ', 筛选后:', filtered.length)
    }

    console.log('✅ 最终筛选结果:', filtered.length, '条')
    this.setData({
      filteredGoals: filtered
    })
  },

  onGoalSearchInput(e) {
    this.setData({
      goalSearchKeyword: e.detail.value
    })
    clearTimeout(this.goalSearchTimer)
    this.goalSearchTimer = setTimeout(() => {
      this.filterGoals()
    }, 300)
  },

  filterGoalByCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedGoalCategory: category
    })
    this.filterGoals()
  },

  addGoal() {
    // 默认起始时间为今天
    const today = new Date().toISOString().split('T')[0]

    this.setData({
      goalFormData: {
        title: '',
        description: '',
        category: '月度目标',
        priority: '中',
        startDate: today,
        targetDate: '',
        estimatedHours: 0,
        tags: []
      },
      goalCategoryIndex: 3,
      goalPriorityIndex: 1,
      goalStartDate: today,
      goalTargetDate: '',
      goalEstimatedHours: '',
      goalTagsInput: '',
      editingGoal: null,
      showGoalModal: true
    })
  },

  async editGoal(e) {
    const goalId = e.currentTarget.dataset.id
    console.log('🎯 开始编辑目标，ID:', goalId)

    // 先从Notion重新查询最新数据
    wx.showLoading({ title: '加载中...' })

    try {
      const currentUser = userManager.getCurrentUser()
      const notionConfig = currentUser.notionConfig

      console.log('🔑 使用API Key:', notionConfig.apiKey ? '已配置' : '未配置')

      // 查询单个目标的最新数据
      const notionApiService = require('../../utils/notionApiService.js')
      console.log('📡 调用getPage，goalId:', goalId)

      const pageResult = await notionApiService.getPage(notionConfig.apiKey, goalId)
      console.log('📦 getPage返回结果:', pageResult)

      wx.hideLoading()

      if (!pageResult.success) {
        console.error('❌ getPage失败:', pageResult.error)
        wx.showToast({
          title: '加载失败: ' + pageResult.error,
          icon: 'none'
        })
        return
      }

      // 解析Notion页面数据
      const page = pageResult.data
      const props = page.properties

      console.log('🔍 Notion返回的原始properties:', props)
      console.log('🔍 所有字段名:', Object.keys(props))
      console.log('🔍 Name字段:', props.Name)
      console.log('🔍 Goal Name字段:', props['Goal Name'])
      console.log('🔍 Start Date字段:', props['Start Date'])
      console.log('🔍 Estimated Hours字段:', props['Estimated Hours'])

      const goal = {
        id: page.id,
        title: this.getTitleValue(props['Goal Name']),
        description: this.getRichTextValue(props.Description),
        category: this.getSelectValue(props.Category),
        priority: this.getSelectValue(props.Priority),
        status: this.getSelectValue(props.Status),
        startDate: this.getDateValue(props['Start Date']),
        targetDate: this.getDateValue(props['Target Date']),
        estimatedHours: this.getNumberValue(props['Estimated Hours']),
        tags: this.getMultiSelectValue(props.Tags)
      }

      console.log('📝 从Notion加载的最新目标数据:', goal)

      // 更新本地数据
      const goalIndex = this.data.goals.findIndex(g => g.id === goalId)
      if (goalIndex >= 0) {
        this.data.goals[goalIndex] = goal
        this.setData({ goals: this.data.goals })
      }

      // 填充编辑表单
      const categoryIndex = this.data.goalCategoryOptions.findIndex(c => c === goal.category)
      const priorityIndex = this.data.priorityOptions.findIndex(p => p.value === goal.priority)

      this.setData({
        goalFormData: {
          title: goal.title,
          description: goal.description || '',
          category: goal.category,
          priority: goal.priority || '中',
          startDate: goal.startDate || '',
          targetDate: goal.targetDate || '',
          estimatedHours: goal.estimatedHours || 0,
          tags: goal.tags || []
        },
        goalCategoryIndex: categoryIndex >= 0 ? categoryIndex : 3,
        goalPriorityIndex: priorityIndex >= 0 ? priorityIndex : 1,
        goalStartDate: goal.startDate || '',
        goalTargetDate: goal.targetDate || '',
        goalEstimatedHours: (goal.estimatedHours || '').toString(),
        goalTagsInput: (goal.tags || []).join(' '),
        editingGoal: goal,
        showGoalModal: true
      })
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 加载目标详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  onGoalTitleInput(e) {
    this.setData({ 'goalFormData.title': e.detail.value })
  },

  onGoalDescriptionInput(e) {
    this.setData({ 'goalFormData.description': e.detail.value })
  },

  onGoalCategoryChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      goalCategoryIndex: index,
      'goalFormData.category': this.data.goalCategoryOptions[index]
    })
  },

  onGoalPriorityChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      goalPriorityIndex: index,
      'goalFormData.priority': this.data.priorityOptions[index].value
    })
  },

  onGoalStartDateChange(e) {
    this.setData({
      goalStartDate: e.detail.value,
      'goalFormData.startDate': e.detail.value
    })
  },

  onGoalTargetDateChange(e) {
    this.setData({
      goalTargetDate: e.detail.value,
      'goalFormData.targetDate': e.detail.value
    })
  },

  onGoalEstimatedHoursInput(e) {
    const value = parseFloat(e.detail.value) || 0
    this.setData({
      goalEstimatedHours: e.detail.value,
      'goalFormData.estimatedHours': value
    })
  },

  onGoalTagsInput(e) {
    const tagsInput = e.detail.value
    const tags = tagsInput.trim().split(/\s+/).filter(tag => tag.length > 0)
    this.setData({
      goalTagsInput: tagsInput,
      'goalFormData.tags': tags
    })
  },

  async confirmAddGoal() {
    if (!this.data.goalFormData.title.trim()) {
      wx.showToast({ title: '请输入目标名称', icon: 'none' })
      return
    }
    if (!this.data.goalFormData.startDate) {
      wx.showToast({ title: '请选择起始时间', icon: 'none' })
      return
    }
    if (!this.data.goalFormData.estimatedHours || this.data.goalFormData.estimatedHours <= 0) {
      wx.showToast({ title: '请输入预计投入时间', icon: 'none' })
      return
    }

    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        wx.showToast({ title: '用户未登录', icon: 'none' })
        return
      }

      const notionConfig = currentUser.notionConfig
      const useCloud = notionConfig && notionConfig.apiKey && notionConfig.goalsDatabaseId

      if (useCloud) {
        if (this.data.editingGoal) {
          // 前端直接更新目标到Notion
          const goalData = this.data.goalFormData
          const properties = {
            'Goal Name': {
              title: [{ text: { content: goalData.title } }]
            },
            'Description': {
              rich_text: [{ text: { content: goalData.description || '' } }]
            },
            'Category': {
              select: { name: goalData.category }
            },
            'Priority': {
              select: { name: goalData.priority }
            },
            'Start Date': {
              date: { start: goalData.startDate }
            },
            'Estimated Hours': {
              number: goalData.estimatedHours || 0
            }
          }

          // 添加可选字段
          if (goalData.targetDate) {
            properties['Target Date'] = {
              date: { start: goalData.targetDate }
            }
          }

          if (goalData.tags && goalData.tags.length > 0) {
            properties['Tags'] = {
              multi_select: goalData.tags.map(tag => ({ name: tag }))
            }
          }

          // 使用Notion页面ID更新
          const notionPageId = this.data.editingGoal.notionPageId || this.data.editingGoal.id
          const result = await notionApiService.updatePageGeneric(notionPageId, properties, notionConfig.apiKey)

          if (!result.success) {
            throw new Error(result.error || '更新失败')
          }

          wx.showToast({ title: '目标更新成功', icon: 'success' })
        } else {
          // 前端直接创建目标到Notion
          const goalData = this.data.goalFormData
          const pageData = {
            parent: { database_id: notionConfig.goalsDatabaseId },
            properties: {
              'Goal Name': {
                title: [{ text: { content: goalData.title } }]
              },
              'Description': {
                rich_text: [{ text: { content: goalData.description || '' } }]
              },
              'Category': {
                select: { name: goalData.category }
              },
              'Priority': {
                select: { name: goalData.priority }
              },
              'Status': {
                select: { name: '进行中' }
              },
              'Progress': {
                number: 0
              },
              'Start Date': {
                date: { start: goalData.startDate }
              },
              'Estimated Hours': {
                number: goalData.estimatedHours || 0
              },
              'Total Time Investment': {
                number: 0
              },
              'User ID': {
                rich_text: [{ text: { content: currentUser.email } }]
              }
            }
          }

          // 添加可选字段
          if (goalData.targetDate) {
            pageData.properties['Target Date'] = {
              date: { start: goalData.targetDate }
            }
          }

          if (goalData.tags && goalData.tags.length > 0) {
            pageData.properties['Tags'] = {
              multi_select: goalData.tags.map(tag => ({ name: tag }))
            }
          }

          const result = await notionApiService.createPageGeneric(pageData, notionConfig.apiKey)

          if (!result.success) {
            throw new Error(result.error || '创建失败')
          }

          // 保存到本地存储（带上 notionPageId）
          const localGoal = {
            ...this.data.goalFormData,
            notionPageId: result.pageId
          }
          app.createGoal(localGoal)

          wx.showToast({ title: '目标创建成功', icon: 'success' })
        }
      } else {
        // 降级到本地存储
        if (this.data.editingGoal) {
          app.updateGoal(this.data.editingGoal.id, this.data.goalFormData)
          wx.showToast({ title: '目标更新成功（本地）', icon: 'success' })
        } else {
          app.createGoal(this.data.goalFormData)
          wx.showToast({ title: '目标创建成功（本地）', icon: 'success' })
        }
      }

      this.closeGoalModal()
      this.loadGoals()
    } catch (error) {
      console.error('目标操作失败:', error)
      wx.showToast({ title: '操作失败：' + error.message, icon: 'none' })
    }
  },

  closeGoalModal() {
    this.setData({ showGoalModal: false })
  },

  updateProgress(e) {
    const goalId = e.currentTarget.dataset.id
    const goal = this.data.goals.find(g => g.id === goalId)

    if (goal) {
      this.setData({
        currentProgressGoalId: goalId,
        progressValue: goal.progress || 0,
        showProgressModal: true
      })
    }
  },

  // 删除目标
  deleteGoal(e) {
    const goalId = e.currentTarget.dataset.id
    const goalTitle = e.currentTarget.dataset.title

    wx.showModal({
      title: '确认删除',
      content: `确定要删除目标"${goalTitle}"吗？\n\n此操作将同时删除Notion中的记录，且无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await this.performDeleteGoal(goalId)
        }
      }
    })
  },

  // 执行删除目标操作
  async performDeleteGoal(goalId) {
    try {
      wx.showLoading({ title: '删除中...' })

      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        wx.showToast({ title: '用户未登录', icon: 'none' })
        return
      }

      const notionConfig = currentUser.notionConfig

      // 如果配置了Notion，同步删除Notion记录
      if (notionConfig && notionConfig.apiKey) {
        const goalsDatabaseId = notionConfig.databases?.goals || notionConfig.goalsDatabaseId

        if (goalsDatabaseId) {
          console.log('🗑️ 从Notion删除目标:', goalId)

          // Notion使用归档而不是直接删除
          const result = await notionApiService.updatePageProperties(
            notionConfig.apiKey,
            goalId,
            {
              'Status': {
                select: { name: '已删除' }
              }
            }
          )

          if (result.success) {
            console.log('✅ Notion目标已标记为删除')
          } else {
            console.warn('⚠️ Notion删除失败，仅删除本地记录:', result.error)
          }
        }
      }

      wx.hideLoading()
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })

      // 重新加载目标列表
      await this.loadGoals()

    } catch (error) {
      console.error('❌ 删除目标失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '删除失败：' + error.message,
        icon: 'none'
      })
    }
  },

  onProgressChange(e) {
    this.setData({
      progressValue: e.detail.value
    })
  },

  async confirmUpdateProgress() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        wx.showToast({ title: '用户未登录', icon: 'none' })
        return
      }

      const notionConfig = currentUser.notionConfig
      const useCloud = notionConfig && notionConfig.apiKey && notionConfig.goalsDatabaseId

      if (useCloud) {
        const result = await apiService.updateGoal(
          currentUser.email,
          notionConfig.apiKey,
          this.data.currentProgressGoalId,
          { progress: this.data.progressValue }
        )

        if (!result.success) {
          throw new Error(result.error || '更新失败')
        }
      } else {
        app.updateGoalProgress(this.data.currentProgressGoalId, this.data.progressValue)
      }

      if (this.data.progressValue >= 100) {
        wx.showModal({
          title: '恭喜',
          content: '进度已达到100%，是否将目标标记为已完成？',
          success: async (res) => {
            if (res.confirm) {
              if (useCloud) {
                await apiService.updateGoal(
                  currentUser.email,
                  notionConfig.apiKey,
                  this.data.currentProgressGoalId,
                  {
                    status: '已完成',
                    completedTime: new Date().toISOString()
                  }
                )
              } else {
                app.updateGoal(this.data.currentProgressGoalId, {
                  status: '已完成',
                  completedTime: new Date().toISOString()
                })
              }
            }
            this.loadGoals()
          }
        })
      } else {
        this.loadGoals()
      }

      wx.showToast({ title: '进度更新成功', icon: 'success' })
      this.closeProgressModal()
    } catch (error) {
      console.error('进度更新失败:', error)
      wx.showToast({ title: '更新失败：' + error.message, icon: 'none' })
    }
  },

  closeProgressModal() {
    this.setData({ showProgressModal: false })
  },

  viewRelatedTodos(e) {
    const goalId = e.currentTarget.dataset.id
    this.setData({
      currentTab: 'todos',
      todoSearchKeyword: ''
    })
    // 筛选关联到此目标的待办
    const filtered = this.data.todos.filter(t => t.relatedGoalId === goalId)
    this.setData({
      filteredTodos: filtered
    })
  },

  // ========== 待办相关功能 ==========

  async loadTodos() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('用户未登录，使用本地数据')
        this.loadTodosFromLocal()
        return
      }

      const notionConfig = currentUser.notionConfig
      if (!notionConfig || !notionConfig.apiKey || !notionConfig.todosDatabaseId) {
        console.log('Notion未配置，使用本地数据')
        this.loadTodosFromLocal()
        return
      }

      // 前端直接查询Notion数据库（不过滤，返回所有记录）
      console.log('🔍 开始查询Todos数据库:', notionConfig.todosDatabaseId)
      const result = await notionApiService.queryDatabase(
        notionConfig.apiKey,
        notionConfig.todosDatabaseId,
        {} // 空对象表示不过滤
      )

      console.log('✅ Todos查询结果:', result)
      console.log('📊 Todos数据条数:', result.data?.results?.length || 0)

      // 打印第一条原始数据看看结构
      if (result.data?.results?.length > 0) {
        console.log('🔍 第一条Todo原始数据:', result.data.results[0])
        console.log('🔍 第一条Todo的properties:', result.data.results[0].properties)
      }

      if (!result.success) {
        console.error('❌ 加载Todos失败:', result.error)
        this.loadTodosFromLocal()
        return
      }

      // 解析Notion返回的数据
      const todos = (result.data?.results || []).map(page => {
        const props = page.properties
        console.log('📝 解析单条Todo，props:', props)
        return {
          id: page.id,
          title: props['Todo Name']?.title?.[0]?.text?.content || '',
          description: props.Description?.rich_text?.[0]?.text?.content || '',
          type: props['Todo Type']?.select?.name || '',
          priority: props.Priority?.select?.name || '重要不紧急',
          status: props.Status?.select?.name || '待办',
          isCompleted: props['Is Completed']?.checkbox || false, // 可选字段
          dueDate: props['Due Date']?.date?.start || '',  // ✅ 修正：Record Date → Due Date
          estimatedMinutes: props['Estimated Duration']?.number || props['Estimated Minutes']?.number || 0, // 支持两种字段名
          tags: props.Tags?.multi_select?.map(t => t.name) || []
        }
      })

      const processedTodos = todos.map(todo => {
        let dueDateText = ''
        let dueDateDisplay = ''
        let isOverdue = false

        if (todo.dueDate) {
          const dueDate = new Date(todo.dueDate)
          const now = new Date()
          now.setHours(0, 0, 0, 0) // 重置到当天0点，方便比较
          dueDate.setHours(0, 0, 0, 0)

          const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))

          // 格式化具体日期
          const year = dueDate.getFullYear()
          const month = String(dueDate.getMonth() + 1).padStart(2, '0')
          const day = String(dueDate.getDate()).padStart(2, '0')
          dueDateDisplay = `${year}/${month}/${day}`

          // 相对时间描述（记录日期视角）
          if (diffDays < 0) {
            dueDateText = `${Math.abs(diffDays)}天前`
            isOverdue = false // 过去的记录不算过期
          } else if (diffDays === 0) {
            dueDateText = '今天'
          } else if (diffDays === 1) {
            dueDateText = '明天'
          } else if (diffDays === 2) {
            dueDateText = '后天'
          } else if (diffDays <= 7) {
            dueDateText = `${diffDays}天后`
          } else {
            dueDateText = `${Math.ceil(diffDays / 7)}周后`
          }
        }

        let relatedGoalName = ''
        if (todo.relatedGoalId) {
          const goal = this.data.availableGoals.find(g => g.id === todo.relatedGoalId)
          if (goal) relatedGoalName = goal.title
        }

        return {
          ...todo,
          dueDateText,
          dueDateDisplay,
          isOverdue,
          relatedGoalName,
          priorityLabel: this.getTodoPriorityLabel(todo.priority),
          // CSS类名
          type: typeClassMap[todo.type] || typeClassMap['临时待办'],
          priority: priorityClassMap[todo.priority] || priorityClassMap['重要不紧急']
        }
      })

      console.log('📝 解析后的Todos:', todos)
      console.log('🎨 处理后的Todos:', processedTodos)

      this.setData({
        todos: processedTodos
      })

      console.log('✨ Todos数据已设置到页面')

      // 同步到本地缓存
      wx.setStorageSync('todos', todos)

      this.calculateTodoStats()
      this.filterTodos()

    } catch (error) {
      console.error('加载Todos异常:', error)
      this.loadTodosFromLocal()
    }
  },

  loadTodosFromLocal() {
    const todos = wx.getStorageSync('todos') || []

    const processedTodos = todos.map(todo => {
      let dueDateText = ''
      let isOverdue = false
      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate)
        const now = new Date()
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
          dueDateText = `已过期 ${Math.abs(diffDays)} 天`
          isOverdue = true
        } else if (diffDays === 0) {
          dueDateText = '今天截止'
        } else if (diffDays <= 7) {
          dueDateText = `${diffDays} 天后截止`
        } else {
          dueDateText = `${Math.ceil(diffDays / 7)} 周后截止`
        }
      }

      let relatedGoalName = ''
      if (todo.relatedGoalId) {
        const goal = this.data.availableGoals.find(g => g.id === todo.relatedGoalId)
        if (goal) relatedGoalName = goal.title
      }

      return {
        ...todo,
        dueDateText,
        isOverdue,
        relatedGoalName,
        priorityLabel: this.getTodoPriorityLabel(todo.priority),
        // CSS类名
        type: typeClassMap[todo.type] || typeClassMap['临时待办'],
        priority: priorityClassMap[todo.priority] || priorityClassMap['重要不紧急']
      }
    })

    this.setData({
      todos: processedTodos
    })

    this.calculateTodoStats()
    this.filterTodos()
  },

  calculateTodoStats() {
    const todos = this.data.todos
    const stats = {
      total: todos.length,
      pending: todos.filter(t => t.status === '待办').length,
      inProgress: todos.filter(t => t.status === '进行中').length,
      completed: todos.filter(t => t.status === '已完成').length,
      urgent: todos.filter(t => t.priority === '紧急重要' || t.priority === '紧急不重要').length
    }

    this.setData({
      todoStats: stats
    })
  },

  filterTodos() {
    console.log('🔍 开始筛选Todos，原始数据条数:', this.data.todos.length)
    let filtered = [...this.data.todos]

    const hasSearchKeyword = this.data.todoSearchKeyword && this.data.todoSearchKeyword.trim().length > 0

    // 如果有搜索关键词，搜索所有待办（包括已完成）
    if (hasSearchKeyword) {
      const keyword = this.data.todoSearchKeyword.toLowerCase()
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(keyword) ||
        (todo.description && todo.description.toLowerCase().includes(keyword))
      )
      console.log('🔍 搜索模式 - 关键词:', this.data.todoSearchKeyword, ', 筛选后:', filtered.length, '条（包含已完成）')
    } else if (!this.data.selectedTodoStatus) {
      // 没有搜索且没有选择状态时，默认不显示已完成的待办（除非用户开启了显示选项）
      if (!this.data.showCompletedTodos) {
        filtered = filtered.filter(todo => todo.status !== '已完成')
        console.log('🚫 默认模式 - 过滤已完成待办，剩余:', filtered.length)
      }
    }

    // 状态筛选（优先级高于showCompletedTodos）
    if (this.data.selectedTodoStatus) {
      filtered = filtered.filter(todo => todo.status === this.data.selectedTodoStatus)
      console.log('📊 筛选状态:', this.data.selectedTodoStatus, ', 筛选后:', filtered.length)
    }

    // 类型筛选（适用于搜索和默认模式）
    if (this.data.selectedTodoType) {
      filtered = filtered.filter(todo => todo.type === this.data.selectedTodoType)
      console.log('🏷️ 筛选类型:', this.data.selectedTodoType, ', 筛选后:', filtered.length)
    }

    console.log('✅ 最终筛选结果:', filtered.length, '条')
    this.setData({
      filteredTodos: filtered
    })
  },

  // 切换显示已完成的待办
  toggleShowCompleted() {
    this.setData({
      showCompletedTodos: !this.data.showCompletedTodos
    })
    this.filterTodos()
  },

  onTodoSearchInput(e) {
    this.setData({
      todoSearchKeyword: e.detail.value
    })
    clearTimeout(this.todoSearchTimer)
    this.todoSearchTimer = setTimeout(() => {
      this.filterTodos()
    }, 300)
  },

  filterTodoByType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      selectedTodoType: type
    })
    this.filterTodos()
  },

  filterTodoByStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      selectedTodoStatus: status,
      // 如果选择了具体状态，清空showCompletedTodos的影响
      showCompletedTodos: status === '已完成' ? true : this.data.showCompletedTodos
    })
    this.filterTodos()
  },

  addTodo() {
    this.setData({
      todoFormData: {
        title: '',
        description: '',
        type: '临时待办 (Ad-hoc)',
        priority: '重要不紧急',
        status: '待办',
        dueDate: '',
        estimatedMinutes: '',
        relatedGoalId: '',
        tags: []
      },
      todoTypeIndex: 1,
      todoPriorityIndex: 1,
      todoStatusIndex: 0,
      todoGoalIndex: -1,
      todoDueDate: '',
      todoTagsInput: '',
      editingTodo: null,
      showTodoModal: true
    })
  },

  // 快速添加明日规划
  addTomorrowPlanning() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    this.setData({
      todoFormData: {
        title: '',
        description: '',
        type: '明日规划 (Planning)',
        priority: '重要不紧急',
        status: '待办',
        dueDate: tomorrowStr,
        estimatedMinutes: '',
        relatedGoalId: '',
        tags: []
      },
      todoTypeIndex: 4, // 明日规划的索引
      todoPriorityIndex: 1,
      todoStatusIndex: 0,
      todoGoalIndex: -1,
      todoDueDate: tomorrowStr,
      todoTagsInput: '',
      editingTodo: null,
      showTodoModal: true
    })
  },

  async editTodo(e) {
    const todoId = e.currentTarget.dataset.id

    // 先从Notion重新查询最新数据
    wx.showLoading({ title: '加载中...' })

    try {
      const currentUser = userManager.getCurrentUser()
      const notionConfig = currentUser.notionConfig

      // 查询单个待办的最新数据
      const notionApiService = require('../../utils/notionApiService.js')
      const pageResult = await notionApiService.getPage(notionConfig.apiKey, todoId)

      wx.hideLoading()

      if (!pageResult.success) {
        wx.showToast({
          title: '加载失败: ' + pageResult.error,
          icon: 'none'
        })
        return
      }

      // 解析Notion页面数据
      const page = pageResult.data
      const props = page.properties

      const todo = {
        id: page.id,
        title: this.getTitleValue(props['Todo Name']),
        description: this.getRichTextValue(props.Description),
        type: this.getSelectValue(props['Todo Type']),
        priority: this.getSelectValue(props.Priority),
        status: this.getSelectValue(props.Status),
        dueDate: this.getDateValue(props['Due Date']),  // ✅ 修正：Record Date → Due Date
        estimatedMinutes: props['Estimated Duration'] ? this.getNumberValue(props['Estimated Duration']) : null,
        relatedGoalId: this.getRelationValue(props['Related Goal']),
        tags: this.getMultiSelectValue(props.Tags),
        completed: props['Is Completed'] ? this.getCheckboxValue(props['Is Completed']) : false
      }

      console.log('📝 从Notion加载的最新待办数据:', todo)

      // 更新本地数据
      const todoIndex = this.data.todos.findIndex(t => t.id === todoId)
      if (todoIndex >= 0) {
        this.data.todos[todoIndex] = todo
        this.setData({ todos: this.data.todos })
      }

      // 填充编辑表单
      const typeIndex = this.data.todoTypeOptions.findIndex(t => t.value === todo.type)
      const priorityIndex = this.data.todoPriorityOptions.findIndex(p => p.value === todo.priority)
      const statusIndex = this.data.todoStatusOptions.findIndex(s => s.value === todo.status)
      const goalIndex = this.data.availableGoals.findIndex(g => g.id === todo.relatedGoalId)

      this.setData({
        todoFormData: {
          title: todo.title,
          description: todo.description || '',
          type: todo.type,
          priority: todo.priority,
          status: todo.status || '待办',
          dueDate: todo.dueDate || '',
          estimatedMinutes: todo.estimatedMinutes || '',
          relatedGoalId: todo.relatedGoalId || '',
          tags: todo.tags || []
        },
        todoTypeIndex: typeIndex >= 0 ? typeIndex : 1,
        todoPriorityIndex: priorityIndex >= 0 ? priorityIndex : 1,
        todoStatusIndex: statusIndex >= 0 ? statusIndex : 0,
        todoGoalIndex: goalIndex >= 0 ? goalIndex : -1,
        todoDueDate: todo.dueDate || '',
        todoTagsInput: (todo.tags || []).join(' '),
        editingTodo: todo,
        showTodoModal: true
      })
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 加载待办详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  onTodoTitleInput(e) {
    this.setData({ 'todoFormData.title': e.detail.value })
  },

  onTodoDescriptionInput(e) {
    this.setData({ 'todoFormData.description': e.detail.value })
  },

  onTodoTypeChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      todoTypeIndex: index,
      'todoFormData.type': this.data.todoTypeOptions[index].value
    })
  },

  onTodoPriorityChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      todoPriorityIndex: index,
      'todoFormData.priority': this.data.todoPriorityOptions[index].value
    })
  },

  onTodoStatusChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      todoStatusIndex: index,
      'todoFormData.status': this.data.todoStatusOptions[index].value
    })
  },

  onTodoDueDateChange(e) {
    this.setData({
      todoDueDate: e.detail.value,
      'todoFormData.dueDate': e.detail.value
    })
  },

  onTodoGoalChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      todoGoalIndex: index,
      'todoFormData.relatedGoalId': index >= 0 ? this.data.availableGoals[index].id : ''
    })
  },

  onTodoEstimatedMinutesInput(e) {
    this.setData({
      'todoFormData.estimatedMinutes': parseInt(e.detail.value) || 0
    })
  },

  onTodoTagsInput(e) {
    const tagsInput = e.detail.value
    const tags = tagsInput.trim().split(/\s+/).filter(tag => tag.length > 0)
    this.setData({
      todoTagsInput: tagsInput,
      'todoFormData.tags': tags
    })
  },

  async confirmAddTodo() {
    if (!this.data.todoFormData.title.trim()) {
      wx.showToast({ title: '请输入待办标题', icon: 'none' })
      return
    }

    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        wx.showToast({ title: '用户未登录', icon: 'none' })
        return
      }

      const notionConfig = currentUser.notionConfig
      const useCloud = notionConfig && notionConfig.apiKey && notionConfig.todosDatabaseId

      if (useCloud) {
        if (this.data.editingTodo) {
          // 前端直接更新待办到Notion
          const notionPageId = this.data.editingTodo.id
          const todoData = this.data.todoFormData

          const properties = {
            'Todo Name': {
              title: [{ text: { content: todoData.title } }]
            },
            'Description': {
              rich_text: [{ text: { content: todoData.description || '' } }]
            },
            'Todo Type': {
              select: { name: todoData.type || '临时待办' }
            },
            'Priority': {
              select: { name: todoData.priority || '重要不紧急' }
            },
            'Status': {
              select: { name: todoData.status || '待办' }
            }
          }

          if (todoData.dueDate) {
            properties['Due Date'] = { date: { start: todoData.dueDate } }  // ✅ 修正：Record Date → Due Date
          }

          // 预估时长字段 - 如果数据库有此字段才添加
          // if (todoData.estimatedMinutes) {
          //   properties['Estimated Duration'] = { number: Number(todoData.estimatedMinutes) }
          // }

          if (todoData.relatedGoalId) {
            properties['Related Goal'] = { relation: [{ id: todoData.relatedGoalId }] }
          }

          if (todoData.tags && todoData.tags.length > 0) {
            properties['Tags'] = {
              multi_select: todoData.tags.map(tag => ({ name: tag }))
            }
          }

          const result = await notionApiService.updatePageGeneric(notionPageId, properties, notionConfig.apiKey)

          if (!result.success) {
            throw new Error(result.error || '更新失败')
          }

          wx.showToast({ title: '待办更新成功', icon: 'success' })
        } else {
          // 前端直接创建待办到Notion
          const todoData = this.data.todoFormData
          const pageData = {
            parent: { database_id: notionConfig.todosDatabaseId },
            properties: {
              'Todo Name': {
                title: [{ text: { content: todoData.title } }]
              },
              'Description': {
                rich_text: [{ text: { content: todoData.description || '' } }]
              },
              'Todo Type': {
                select: { name: todoData.type || '临时待办' }
              },
              'Priority': {
                select: { name: todoData.priority || '重要不紧急' }
              },
              'Status': {
                select: { name: todoData.status || '待办' }
              }
              // 'Is Completed' 字段已注释 - 如果数据库有此字段请取消注释
              // 'Is Completed': {
              //   checkbox: false
              // }
            }
          }

          if (todoData.dueDate) {
            pageData.properties['Due Date'] = { date: { start: todoData.dueDate } }  // ✅ 修正：Record Date → Due Date
          }

          // 预估时长字段 - 如果数据库有此字段才添加
          // if (todoData.estimatedMinutes) {
          //   pageData.properties['Estimated Duration'] = { number: Number(todoData.estimatedMinutes) }
          // }

          if (todoData.relatedGoalId) {
            pageData.properties['Related Goal'] = { relation: [{ id: todoData.relatedGoalId }] }
          }

          if (todoData.tags && todoData.tags.length > 0) {
            pageData.properties['Tags'] = {
              multi_select: todoData.tags.map(tag => ({ name: tag }))
            }
          }

          const result = await notionApiService.createPageGeneric(pageData, notionConfig.apiKey)

          if (!result.success) {
            throw new Error(result.error || '创建失败')
          }

          wx.showToast({ title: '待办创建成功', icon: 'success' })
        }
      } else {
        // 降级到本地存储
        const todos = this.data.todos

        if (this.data.editingTodo) {
          const index = todos.findIndex(t => t.id === this.data.editingTodo.id)
          if (index >= 0) {
            todos[index] = {
              ...todos[index],
              ...this.data.todoFormData,
              updateTime: new Date().toISOString()
            }
          }
          wx.showToast({ title: '待办更新成功（本地）', icon: 'success' })
        } else {
          const newTodo = {
            id: 'todo_' + Date.now(),
            ...this.data.todoFormData,
            status: '待办',
            actualTime: 0,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          }
          todos.unshift(newTodo)
          wx.showToast({ title: '待办创建成功（本地）', icon: 'success' })
        }

        wx.setStorageSync('todos', todos)
      }

      this.closeTodoModal()
      this.loadTodos()
    } catch (error) {
      console.error('待办操作失败:', error)
      wx.showToast({ title: '操作失败：' + error.message, icon: 'none' })
    }
  },

  closeTodoModal() {
    this.setData({ showTodoModal: false })
  },

  async toggleTodoStatus(e) {
    const todoId = e.currentTarget.dataset.id
    const todo = this.data.todos.find(t => t.id === todoId)

    if (!todo) {
      wx.showToast({ title: '待办不存在', icon: 'none' })
      return
    }

    console.log('🔄 切换待办状态:', {
      todoId,
      currentStatus: todo.status
    })

    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        wx.showToast({ title: '用户未登录', icon: 'none' })
        return
      }

      const notionConfig = currentUser.notionConfig
      const useCloud = notionConfig && notionConfig.apiKey && notionConfig.todosDatabaseId

      const newStatus = todo.status === '已完成' ? '待办' : '已完成'

      if (useCloud) {
        console.log('🌐 更新待办到Notion:', newStatus)

        // 前端直接调用Notion API更新
        const properties = {
          'Status': {
            select: { name: newStatus }
          }
        }

        // 如果状态改为已完成，添加完成时间（如果数据库有此字段）
        // if (newStatus === '已完成') {
        //   properties['Actual Completion Date'] = {
        //     date: { start: new Date().toISOString().split('T')[0] }
        //   }
        // }

        const notionApiService = require('../../utils/notionApiService.js')
        const result = await notionApiService.updatePageProperties(
          notionConfig.apiKey,
          todoId,
          properties
        )

        if (!result.success) {
          throw new Error(result.error || '更新失败')
        }

        console.log('✅ Notion更新成功')
      } else {
        console.log('💾 使用本地存储更新')
        // 降级到本地存储
        const todos = this.data.todos
        const index = todos.findIndex(t => t.id === todoId)

        if (index >= 0) {
          todos[index] = {
            ...todo,
            status: newStatus,
            completedTime: newStatus === '已完成' ? new Date().toISOString() : '',
            updateTime: new Date().toISOString()
          }
          wx.setStorageSync('todos', todos)
        }
      }

      // 重新加载待办列表
      await this.loadTodos()

      wx.showToast({
        title: newStatus === '已完成' ? '✅ 已完成' : '🔄 已恢复',
        icon: 'success',
        duration: 1500
      })

    } catch (error) {
      console.error('❌ 状态切换失败:', error)
      wx.showToast({
        title: '操作失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  },

  deleteTodo(e) {
    const todoId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个待办事项吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const currentUser = userManager.getCurrentUser()
            if (!currentUser) {
              wx.showToast({ title: '用户未登录', icon: 'none' })
              return
            }

            const notionConfig = currentUser.notionConfig
            const useCloud = notionConfig && notionConfig.apiKey && notionConfig.databases?.todos

            if (useCloud) {
              // 直接使用Notion API删除（设置Status为已删除）
              await notionApiService.updatePageProperties(
                notionConfig.apiKey,
                todoId,
                {
                  'Status': {
                    select: { name: '已删除' }
                  }
                }
              )
              console.log('✅ 已在Notion中删除待办')
            } else {
              // 降级到本地存储
              let todos = this.data.todos.filter(t => t.id !== todoId)
              wx.setStorageSync('todos', todos)
            }

            this.loadTodos()
            wx.showToast({ title: '删除成功', icon: 'success' })

          } catch (error) {
            console.error('删除待办失败:', error)
            wx.showToast({ title: '删除失败：' + error.message, icon: 'none' })
          }
        }
      }
    })
  },

  recordTime(e) {
    const todoId = e.currentTarget.dataset.id
    this.setData({
      currentTodoId: todoId,
      actualMinutes: '',
      showTimeModal: true
    })
  },

  onActualMinutesInput(e) {
    this.setData({
      actualMinutes: e.detail.value
    })
  },

  confirmRecordTime() {
    const minutes = parseInt(this.data.actualMinutes)

    if (!minutes || minutes <= 0) {
      wx.showToast({ title: '请输入有效的时间', icon: 'none' })
      return
    }

    const todos = this.data.todos
    const index = todos.findIndex(t => t.id === this.data.currentTodoId)

    if (index >= 0) {
      todos[index] = {
        ...todos[index],
        actualTime: (todos[index].actualTime || 0) + minutes,
        updateTime: new Date().toISOString()
      }

      wx.setStorageSync('todos', todos)
      this.closeTimeModal()
      this.loadTodos()

      wx.showToast({ title: '时间记录成功', icon: 'success' })
    }
  },

  closeTimeModal() {
    this.setData({ showTimeModal: false })
  },

  // ========== 工具函数 ==========

  stopPropagation() {},

  formatTime(minutes) {
    if (minutes === 0) return '0分钟'

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours === 0) {
      return `${remainingMinutes}分钟`
    } else if (remainingMinutes === 0) {
      return `${hours}小时`
    } else {
      return `${hours}小时${remainingMinutes}分钟`
    }
  },

  getGoalStatusText(status) {
    const statusMap = {
      '未开始': '未开始',
      '进行中': '进行中',
      '已完成': '已完成',
      '已暂停': '已暂停',
      '已取消': '已取消'
    }
    return statusMap[status] || '未开始'
  },

  getTodoPriorityLabel(priority) {
    const labels = {
      '紧急重要': '🔴 紧急重要',
      '重要不紧急': '🟡 重要不紧急',
      '紧急不重要': '🟠 紧急不重要',
      '不紧急不重要': '⚪ 不紧急不重要'
    }
    return labels[priority] || priority
  },

  // ========== Notion数据解析辅助方法 ==========

  getTitleValue(prop) {
    if (prop?.title && prop.title.length > 0) {
      return prop.title[0].plain_text || ''
    }
    return ''
  },

  getRichTextValue(prop) {
    if (prop?.rich_text && prop.rich_text.length > 0) {
      return prop.rich_text.map(t => t.plain_text).join('')
    }
    return ''
  },

  getSelectValue(prop) {
    return prop?.select?.name || ''
  },

  getMultiSelectValue(prop) {
    if (prop?.multi_select && prop.multi_select.length > 0) {
      return prop.multi_select.map(item => item.name)
    }
    return []
  },

  getDateValue(prop) {
    return prop?.date?.start || ''
  },

  getNumberValue(prop) {
    return prop?.number || 0
  },

  getCheckboxValue(prop) {
    return prop?.checkbox || false
  },

  getRelationValue(prop) {
    if (prop?.relation && prop.relation.length > 0) {
      return prop.relation[0].id
    }
    return ''
  },

  /**
   * 查看目标关联的活动明细
   */
  viewGoalActivities: async function(e) {
    const goalId = e.currentTarget.dataset.id
    const goalTitle = e.currentTarget.dataset.title

    console.log('🎯 查看目标活动明细')
    console.log('   目标ID:', goalId)
    console.log('   目标标题:', goalTitle)
    console.log('   ID长度:', goalId.length)
    console.log('   ID格式:', goalId.includes('-') ? 'UUID格式' : '非UUID格式')

    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        wx.hideLoading()
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }

      const notionConfig = currentUser.notionConfig
      if (!notionConfig?.apiKey || !notionConfig?.databases?.activityDetails) {
        wx.hideLoading()
        wx.showToast({
          title: '请先配置Notion活动明细库',
          icon: 'none',
          duration: 2000
        })
        return
      }

      console.log('📧 当前用户邮箱:', currentUser.email)
      console.log('🗄️ 活动明细库ID:', notionConfig.databases.activityDetails)

      // 查询关联的活动明细（带User ID过滤）
      console.log('🔍 第一次查询：使用User ID + Goal ID过滤')
      const result = await notionApiService.queryActivities(
        notionConfig.apiKey,
        notionConfig.databases.activityDetails,
        currentUser.email,
        {
          relatedGoalId: goalId
        }
      )

      // 如果查询结果为0，尝试不过滤User ID再查一次
      if (result.success && result.activities.length === 0) {
        console.log('⚠️ 第一次查询结果为0，尝试不过滤User ID再查询一次')
        const result2 = await notionApiService.queryActivities(
          notionConfig.apiKey,
          notionConfig.databases.activityDetails,
          currentUser.email,
          {
            relatedGoalId: goalId,
            skipUserFilter: true
          }
        )

        if (result2.success && result2.activities.length > 0) {
          console.log('🎉 去掉User ID过滤后查到了', result2.activities.length, '条记录')
          console.log('💡 这说明问题出在User ID字段的值不匹配')
          console.log('   检查活动明细表中User ID字段的值是否与当前邮箱一致:', currentUser.email)

          // 显示第一条记录的User ID值
          if (result2.activities[0]) {
            console.log('   第一条记录的User ID值:', result2.activities[0].userId)
          }
        }
      }

      wx.hideLoading()

      if (!result.success) {
        wx.showToast({
          title: result.error || '查询失败',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // 处理活动数据
      const activities = result.activities.map(activity => {
        return {
          ...activity,
          activityTypeClass: this.getActivityTypeClass(activity.activityType)
        }
      })

      // 计算总时长
      const totalMinutes = activities.reduce((sum, activity) => sum + activity.duration, 0)
      const totalHours = (totalMinutes / 60).toFixed(1)

      this.setData({
        showActivitiesModal: true,
        activitiesModalTitle: `目标：${goalTitle}`,
        relatedActivities: activities,
        totalActivityMinutes: totalMinutes,
        totalActivityHours: totalHours
      })

    } catch (error) {
      wx.hideLoading()
      console.error('查询活动明细失败:', error)
      wx.showToast({
        title: '查询失败',
        icon: 'none'
      })
    }
  },

  /**
   * 查看待办关联的活动明细
   */
  viewTodoActivities: async function(e) {
    const todoId = e.currentTarget.dataset.id
    const todoTitle = e.currentTarget.dataset.title

    console.log('查看待办活动明细:', todoId, todoTitle)

    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        wx.hideLoading()
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }

      const notionConfig = currentUser.notionConfig
      if (!notionConfig?.apiKey || !notionConfig?.databases?.activityDetails) {
        wx.hideLoading()
        wx.showToast({
          title: '请先配置Notion活动明细库',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // 查询关联的活动明细
      const result = await notionApiService.queryActivities(
        notionConfig.apiKey,
        notionConfig.databases.activityDetails,
        currentUser.email,
        {
          relatedTodoId: todoId
        }
      )

      wx.hideLoading()

      if (!result.success) {
        wx.showToast({
          title: result.error || '查询失败',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // 处理活动数据
      const activities = result.activities.map(activity => {
        return {
          ...activity,
          activityTypeClass: this.getActivityTypeClass(activity.activityType)
        }
      })

      // 计算总时长
      const totalMinutes = activities.reduce((sum, activity) => sum + activity.duration, 0)
      const totalHours = (totalMinutes / 60).toFixed(1)

      this.setData({
        showActivitiesModal: true,
        activitiesModalTitle: `待办：${todoTitle}`,
        relatedActivities: activities,
        totalActivityMinutes: totalMinutes,
        totalActivityHours: totalHours
      })

    } catch (error) {
      wx.hideLoading()
      console.error('查询活动明细失败:', error)
      wx.showToast({
        title: '查询失败',
        icon: 'none'
      })
    }
  },

  /**
   * 关闭活动明细弹窗
   */
  closeActivitiesModal: function() {
    this.setData({
      showActivitiesModal: false,
      activitiesModalTitle: '',
      relatedActivities: [],
      totalActivityMinutes: 0,
      totalActivityHours: 0
    })
  },

  /**
   * 获取活动类型对应的CSS类名
   */
  getActivityTypeClass: function(activityType) {
    // 活动类型映射：Value Type字段的值 -> CSS类名（英文）
    const typeMap = {
      '有价值': 'valuable',
      '中性': 'neutral',
      '低效': 'inefficient',
      '有价值活动': 'valuable',
      '中性活动': 'neutral',
      '低效活动': 'inefficient'
    }
    return typeMap[activityType] || 'neutral'
  }
})
