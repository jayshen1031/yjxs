const app = getApp()
const userManager = require('../../utils/userManager.js')
const apiService = require('../../utils/apiService.js')

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

    // 可用目标列表（供待办选择）
    availableGoals: [],

    // 弹窗状态
    showGoalModal: false,
    showTodoModal: false,
    showProgressModal: false,
    showTimeModal: false,

    // 目标表单
    goalFormData: {
      title: '',
      description: '',
      category: '月度目标',
      priority: '中',
      targetDate: '',
      tags: []
    },
    goalCategoryOptions: ['人生目标', '年度目标', '季度目标', '月度目标', '周目标'],
    goalCategoryIndex: 3,
    priorityOptions: [
      { value: '高', label: '高优先级' },
      { value: '中', label: '中优先级' },
      { value: '低', label: '低优先级' }
    ],
    goalPriorityIndex: 1,
    goalTargetDate: '',
    goalTagsInput: '',
    editingGoal: null,

    // 待办表单
    todoFormData: {
      title: '',
      description: '',
      type: '临时待办',
      priority: '重要不紧急',
      dueDate: '',
      estimatedMinutes: '',
      relatedGoalId: '',
      tags: []
    },
    todoTypeOptions: [
      { value: '目标导向', label: '目标导向' },
      { value: '临时待办', label: '临时待办' },
      { value: '习惯养成', label: '习惯养成' },
      { value: '紧急处理', label: '紧急处理' }
    ],
    todoTypeIndex: 1,
    todoPriorityOptions: [
      { value: '紧急重要', label: '🔴 紧急重要' },
      { value: '重要不紧急', label: '🟡 重要不紧急' },
      { value: '紧急不重要', label: '🟠 紧急不重要' },
      { value: '不紧急不重要', label: '⚪ 不紧急不重要' }
    ],
    todoPriorityIndex: 1,
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

      const notionConfig = currentUser.notionConfig
      if (!notionConfig || !notionConfig.apiKey || !notionConfig.goalsDatabaseId) {
        console.log('Notion未配置，使用本地数据')
        this.loadGoalsFromLocal()
        return
      }

      // 从云端加载Goals
      const result = await apiService.getGoals(currentUser.id, notionConfig.apiKey)

      if (!result.success) {
        console.error('加载Goals失败:', result.error)
        this.loadGoalsFromLocal()
        return
      }

      const goals = result.goals || []

      const processedGoals = goals.map(goal => {
        let targetDateText = ''
        if (goal.targetDate) {
          const date = new Date(goal.targetDate)
          targetDateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }

        return {
          ...goal,
          targetDateText,
          statusText: this.getGoalStatusText(goal.status),
          priorityText: goal.priority || '中',
          timeInvestmentDisplay: this.formatTime(goal.totalTimeInvestment || 0),
          // CSS类名
          status: statusClassMap[goal.status] || statusClassMap['未开始'],
          priority: priorityClassMap[goal.priority] || priorityClassMap['中']
        }
      })

      this.setData({
        goals: processedGoals,
        availableGoals: processedGoals
      })

      // 同步到本地缓存
      app.setGoals(goals)

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
        targetDateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      }

      return {
        ...goal,
        targetDateText,
        statusText: this.getGoalStatusText(goal.status),
        priorityText: goal.priority || '中',
        timeInvestmentDisplay: this.formatTime(goal.totalTimeInvestment || 0),
        // CSS类名
        status: statusClassMap[goal.status] || statusClassMap['未开始'],
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
    let filtered = [...this.data.goals]

    if (this.data.goalSearchKeyword) {
      const keyword = this.data.goalSearchKeyword.toLowerCase()
      filtered = filtered.filter(goal =>
        goal.title.toLowerCase().includes(keyword) ||
        (goal.description && goal.description.toLowerCase().includes(keyword))
      )
    }

    if (this.data.selectedGoalCategory) {
      filtered = filtered.filter(goal => goal.category === this.data.selectedGoalCategory)
    }

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
    this.setData({
      goalFormData: {
        title: '',
        description: '',
        category: '月度目标',
        priority: '中',
        targetDate: '',
        tags: []
      },
      goalCategoryIndex: 3,
      goalPriorityIndex: 1,
      goalTargetDate: '',
      goalTagsInput: '',
      editingGoal: null,
      showGoalModal: true
    })
  },

  editGoal(e) {
    const goalId = e.currentTarget.dataset.id
    const goal = this.data.goals.find(g => g.id === goalId)

    if (goal) {
      const categoryIndex = this.data.goalCategoryOptions.findIndex(c => c === goal.category)
      const priorityIndex = this.data.priorityOptions.findIndex(p => p.value === goal.priority)

      this.setData({
        goalFormData: {
          title: goal.title,
          description: goal.description || '',
          category: goal.category,
          priority: goal.priority || '中',
          targetDate: goal.targetDate || '',
          tags: goal.tags || []
        },
        goalCategoryIndex: categoryIndex >= 0 ? categoryIndex : 3,
        goalPriorityIndex: priorityIndex >= 0 ? priorityIndex : 1,
        goalTargetDate: goal.targetDate || '',
        goalTagsInput: (goal.tags || []).join(' '),
        editingGoal: goal,
        showGoalModal: true
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

  onGoalTargetDateChange(e) {
    this.setData({
      goalTargetDate: e.detail.value,
      'goalFormData.targetDate': e.detail.value
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
          // 更新目标
          const result = await apiService.updateGoal(
            currentUser.id,
            notionConfig.apiKey,
            this.data.editingGoal.id,
            this.data.goalFormData
          )

          if (!result.success) {
            throw new Error(result.error || '更新失败')
          }

          wx.showToast({ title: '目标更新成功', icon: 'success' })
        } else {
          // 创建目标
          const result = await apiService.createGoal(
            currentUser.id,
            notionConfig.apiKey,
            this.data.goalFormData
          )

          if (!result.success) {
            throw new Error(result.error || '创建失败')
          }

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
          currentUser.id,
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
                  currentUser.id,
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

      // 从云端加载Todos
      const result = await apiService.getTodos(currentUser.id, notionConfig.apiKey, 'all')

      if (!result.success) {
        console.error('加载Todos失败:', result.error)
        this.loadTodosFromLocal()
        return
      }

      const todos = result.todos || []

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
    let filtered = [...this.data.todos]

    if (this.data.todoSearchKeyword) {
      const keyword = this.data.todoSearchKeyword.toLowerCase()
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(keyword) ||
        (todo.description && todo.description.toLowerCase().includes(keyword))
      )
    }

    if (this.data.selectedTodoType) {
      filtered = filtered.filter(todo => todo.type === this.data.selectedTodoType)
    }

    this.setData({
      filteredTodos: filtered
    })
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

  addTodo() {
    this.setData({
      todoFormData: {
        title: '',
        description: '',
        type: '临时待办',
        priority: '重要不紧急',
        dueDate: '',
        estimatedMinutes: '',
        relatedGoalId: '',
        tags: []
      },
      todoTypeIndex: 1,
      todoPriorityIndex: 1,
      todoGoalIndex: -1,
      todoDueDate: '',
      todoTagsInput: '',
      editingTodo: null,
      showTodoModal: true
    })
  },

  editTodo(e) {
    const todoId = e.currentTarget.dataset.id
    const todo = this.data.todos.find(t => t.id === todoId)

    if (todo) {
      const typeIndex = this.data.todoTypeOptions.findIndex(t => t.value === todo.type)
      const priorityIndex = this.data.todoPriorityOptions.findIndex(p => p.value === todo.priority)
      const goalIndex = this.data.availableGoals.findIndex(g => g.id === todo.relatedGoalId)

      this.setData({
        todoFormData: {
          title: todo.title,
          description: todo.description || '',
          type: todo.type,
          priority: todo.priority,
          dueDate: todo.dueDate || '',
          estimatedMinutes: todo.estimatedMinutes || '',
          relatedGoalId: todo.relatedGoalId || '',
          tags: todo.tags || []
        },
        todoTypeIndex: typeIndex >= 0 ? typeIndex : 1,
        todoPriorityIndex: priorityIndex >= 0 ? priorityIndex : 1,
        todoGoalIndex: goalIndex >= 0 ? goalIndex : -1,
        todoDueDate: todo.dueDate || '',
        todoTagsInput: (todo.tags || []).join(' '),
        editingTodo: todo,
        showTodoModal: true
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
          // 更新待办
          const result = await apiService.updateTodo(
            currentUser.id,
            notionConfig.apiKey,
            this.data.editingTodo.id,
            this.data.todoFormData
          )

          if (!result.success) {
            throw new Error(result.error || '更新失败')
          }

          wx.showToast({ title: '待办更新成功', icon: 'success' })
        } else {
          // 创建待办
          const result = await apiService.createTodo(
            currentUser.id,
            notionConfig.apiKey,
            this.data.todoFormData
          )

          if (!result.success) {
            throw new Error(result.error || '创建失败')
          }

          // 如果关联了目标，创建关联
          if (this.data.todoFormData.relatedGoalId) {
            await apiService.linkTodoToGoal(
              currentUser.id,
              notionConfig.apiKey,
              result.pageId,
              this.data.todoFormData.relatedGoalId
            )
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

    if (!todo) return

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
        const result = await apiService.updateTodo(
          currentUser.id,
          notionConfig.apiKey,
          todoId,
          {
            status: newStatus,
            completedTime: newStatus === '已完成' ? new Date().toISOString() : ''
          }
        )

        if (!result.success) {
          throw new Error(result.error || '更新失败')
        }
      } else {
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

      this.loadTodos()

      wx.showToast({
        title: newStatus === '已完成' ? '已完成' : '已恢复',
        icon: 'success'
      })

    } catch (error) {
      console.error('状态切换失败:', error)
      wx.showToast({ title: '操作失败：' + error.message, icon: 'none' })
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
            const useCloud = notionConfig && notionConfig.apiKey && notionConfig.todosDatabaseId

            if (useCloud) {
              const result = await apiService.deleteTodo(
                currentUser.id,
                notionConfig.apiKey,
                todoId
              )

              if (!result.success) {
                throw new Error(result.error || '删除失败')
              }
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
  }
})
