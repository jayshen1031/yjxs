const app = getApp()

Page({
  data: {
    // 目标统计数据
    goalStats: {
      total: 0,
      active: 0,
      completed: 0,
      paused: 0,
      shortTerm: 0,
      mediumTerm: 0,
      longTerm: 0,
      averageProgress: 0
    },
    
    // 目标列表
    goals: [],
    filteredGoals: [],
    
    // 筛选条件
    searchKeyword: '',
    selectedType: '',
    selectedStatus: '',
    
    // 排序选项
    sortOptions: [
      { value: 'createTime', label: '创建时间' },
      { value: 'priority', label: '优先级' },
      { value: 'progress', label: '进度' },
      { value: 'targetDate', label: '截止日期' }
    ],
    sortIndex: 0,
    
    // 弹窗状态
    showAddModal: false,
    showMilestoneModal: false,
    showProgressModal: false,
    
    // 表单数据
    formData: {
      title: '',
      description: '',
      type: 'short',
      category: '个人成长',
      priority: 'medium',
      targetDate: '',
      tags: []
    },
    
    // 选择器数据
    typeOptions: [
      { value: 'short', label: '短期目标 (1-3个月)' },
      { value: 'medium', label: '中期目标 (3-12个月)' },
      { value: 'long', label: '长期目标 (1年以上)' }
    ],
    typeIndex: 0,
    
    categoryOptions: ['个人成长', '健康生活', '职业发展', '学习技能', '人际关系', '财务管理', '兴趣爱好', '旅行体验'],
    categoryIndex: 0,
    
    priorityOptions: [
      { value: 'high', label: '高优先级' },
      { value: 'medium', label: '中优先级' },
      { value: 'low', label: '低优先级' }
    ],
    priorityIndex: 1,
    
    // 里程碑数据
    milestoneData: {
      title: '',
      description: ''
    },
    milestoneTargetDate: '',
    currentGoalId: '',
    
    // 进度更新
    progressValue: 0,
    currentProgressGoalId: '',
    
    // 编辑模式
    editingGoal: null,
    tagsInput: '',
    targetDate: ''
  },

  onLoad() {
    this.loadGoals()
    this.calculateStats()
  },

  onShow() {
    this.loadGoals()
    this.calculateStats()
  },

  // 加载目标数据
  loadGoals() {
    const goals = app.getGoals()
    
    // 处理目标显示数据
    const processedGoals = goals.map(goal => {
      // 计算完成的里程碑数量
      const completedMilestones = goal.milestones.filter(m => m.completed).length
      
      // 格式化截止日期显示
      let deadlineText = ''
      if (goal.targetDate) {
        const targetDate = new Date(goal.targetDate)
        const now = new Date()
        const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24))
        
        if (diffDays < 0) {
          deadlineText = `已过期 ${Math.abs(diffDays)} 天`
        } else if (diffDays === 0) {
          deadlineText = '今天到期'
        } else if (diffDays <= 7) {
          deadlineText = `${diffDays} 天后到期`
        } else {
          deadlineText = `${Math.ceil(diffDays / 7)} 周后到期`
        }
      }
      
      // 处理里程碑的目标日期显示
      const processedMilestones = goal.milestones.map(milestone => {
        let targetDateText = ''
        if (milestone.targetDate) {
          const targetDate = new Date(milestone.targetDate)
          const now = new Date()
          const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24))
          
          if (diffDays < 0) {
            targetDateText = `已过期 ${Math.abs(diffDays)} 天`
          } else if (diffDays === 0) {
            targetDateText = '今天'
          } else if (diffDays <= 7) {
            targetDateText = `${diffDays} 天后`
          } else {
            targetDateText = `${Math.ceil(diffDays / 7)} 周后`
          }
        }
        
        return {
          ...milestone,
          targetDateText
        }
      })
      
      return {
        ...goal,
        completedMilestones,
        deadlineText,
        milestones: processedMilestones,
        showMilestones: false,
        timeInvestmentDisplay: this.formatTimeInvestment(goal.totalTimeInvestment || 0)
      }
    })
    
    this.setData({
      goals: processedGoals
    })
    
    this.filterGoals()
  },

  // 计算统计数据
  calculateStats() {
    const stats = app.getGoalStats()
    this.setData({
      goalStats: stats
    })
  },

  // 筛选目标
  filterGoals() {
    let filtered = [...this.data.goals]
    
    // 按关键词搜索
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase()
      filtered = filtered.filter(goal => 
        goal.title.toLowerCase().includes(keyword) ||
        goal.description.toLowerCase().includes(keyword) ||
        goal.category.toLowerCase().includes(keyword)
      )
    }
    
    // 按类型筛选
    if (this.data.selectedType) {
      filtered = filtered.filter(goal => goal.type === this.data.selectedType)
    }
    
    // 按状态筛选
    if (this.data.selectedStatus) {
      filtered = filtered.filter(goal => goal.status === this.data.selectedStatus)
    }
    
    // 排序
    const sortOption = this.data.sortOptions[this.data.sortIndex]
    filtered.sort((a, b) => {
      switch (sortOption.value) {
        case 'createTime':
          return new Date(b.createTime) - new Date(a.createTime)
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'progress':
          return b.progress - a.progress
        case 'targetDate':
          if (!a.targetDate) return 1
          if (!b.targetDate) return -1
          return new Date(a.targetDate) - new Date(b.targetDate)
        default:
          return 0
      }
    })
    
    this.setData({
      filteredGoals: filtered
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    
    // 防抖搜索
    clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(() => {
      this.filterGoals()
    }, 300)
  },

  onSearchConfirm() {
    this.filterGoals()
  },

  // 类型筛选
  filterByType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      selectedType: type
    })
    this.filterGoals()
  },

  // 状态筛选
  filterByStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      selectedStatus: status
    })
    this.filterGoals()
  },

  // 排序变更
  onSortChange(e) {
    this.setData({
      sortIndex: parseInt(e.detail.value)
    })
    this.filterGoals()
  },

  // 新建目标
  addGoal() {
    this.resetForm()
    this.setData({
      showAddModal: true,
      editingGoal: null
    })
  },

  // 编辑目标
  editGoal(e) {
    const goalId = e.currentTarget.dataset.id
    const goal = this.data.goals.find(g => g.id === goalId)
    
    if (goal) {
      // 找到对应的选择器索引
      const typeIndex = this.data.typeOptions.findIndex(opt => opt.value === goal.type)
      const categoryIndex = this.data.categoryOptions.findIndex(cat => cat === goal.category)
      const priorityIndex = this.data.priorityOptions.findIndex(opt => opt.value === goal.priority)
      
      this.setData({
        formData: {
          title: goal.title,
          description: goal.description,
          type: goal.type,
          category: goal.category,
          priority: goal.priority,
          targetDate: goal.targetDate,
          tags: goal.tags
        },
        typeIndex: typeIndex >= 0 ? typeIndex : 0,
        categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
        priorityIndex: priorityIndex >= 0 ? priorityIndex : 1,
        targetDate: goal.targetDate || '',
        tagsInput: goal.tags.join(' '),
        editingGoal: goal,
        showAddModal: true
      })
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      formData: {
        title: '',
        description: '',
        type: 'short',
        category: '个人成长',
        priority: 'medium',
        targetDate: '',
        tags: []
      },
      typeIndex: 0,
      categoryIndex: 0,
      priorityIndex: 1,
      targetDate: '',
      tagsInput: ''
    })
  },

  // 表单输入处理
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    })
  },

  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  onTypeChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      typeIndex: index,
      'formData.type': this.data.typeOptions[index].value
    })
  },

  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      categoryIndex: index,
      'formData.category': this.data.categoryOptions[index]
    })
  },

  onPriorityChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      priorityIndex: index,
      'formData.priority': this.data.priorityOptions[index].value
    })
  },

  onTargetDateChange(e) {
    this.setData({
      targetDate: e.detail.value,
      'formData.targetDate': e.detail.value
    })
  },

  onTagsInput(e) {
    const tagsInput = e.detail.value
    const tags = tagsInput.trim().split(/\s+/).filter(tag => tag.length > 0)
    this.setData({
      tagsInput,
      'formData.tags': tags
    })
  },

  // 确认添加/编辑目标
  confirmAddGoal() {
    if (!this.data.formData.title.trim()) {
      wx.showToast({
        title: '请输入目标标题',
        icon: 'none'
      })
      return
    }

    try {
      if (this.data.editingGoal) {
        // 更新目标
        app.updateGoal(this.data.editingGoal.id, this.data.formData)
        wx.showToast({
          title: '目标更新成功',
          icon: 'success'
        })
      } else {
        // 创建新目标
        app.createGoal(this.data.formData)
        wx.showToast({
          title: '目标创建成功',
          icon: 'success'
        })
      }

      this.closeAddModal()
      this.loadGoals()
      this.calculateStats()
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  closeAddModal() {
    this.setData({
      showAddModal: false,
      editingGoal: null
    })
  },

  // 切换目标状态
  toggleGoalStatus(e) {
    const goalId = e.currentTarget.dataset.id
    const goal = this.data.goals.find(g => g.id === goalId)
    
    if (goal) {
      let newStatus
      switch (goal.status) {
        case 'active':
          newStatus = 'paused'
          break
        case 'paused':
          newStatus = 'active'
          break
        case 'completed':
          newStatus = 'active'
          break
        default:
          newStatus = 'active'
      }
      
      app.updateGoal(goalId, { status: newStatus })
      this.loadGoals()
      this.calculateStats()
      
      wx.showToast({
        title: `目标已${newStatus === 'active' ? '激活' : newStatus === 'paused' ? '暂停' : '完成'}`,
        icon: 'success'
      })
    }
  },

  // 添加里程碑
  addMilestone(e) {
    const goalId = e.currentTarget.dataset.id
    this.setData({
      currentGoalId: goalId,
      milestoneData: {
        title: '',
        description: ''
      },
      milestoneTargetDate: '',
      showMilestoneModal: true
    })
  },

  onMilestoneTitleInput(e) {
    this.setData({
      'milestoneData.title': e.detail.value
    })
  },

  onMilestoneDescriptionInput(e) {
    this.setData({
      'milestoneData.description': e.detail.value
    })
  },

  onMilestoneTargetDateChange(e) {
    this.setData({
      milestoneTargetDate: e.detail.value
    })
  },

  confirmAddMilestone() {
    if (!this.data.milestoneData.title.trim()) {
      wx.showToast({
        title: '请输入里程碑标题',
        icon: 'none'
      })
      return
    }

    const milestoneData = {
      ...this.data.milestoneData,
      targetDate: this.data.milestoneTargetDate
    }

    try {
      app.addMilestone(this.data.currentGoalId, milestoneData)
      wx.showToast({
        title: '里程碑添加成功',
        icon: 'success'
      })
      
      this.closeMilestoneModal()
      this.loadGoals()
      this.calculateStats()
    } catch (error) {
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })
    }
  },

  closeMilestoneModal() {
    this.setData({
      showMilestoneModal: false,
      currentGoalId: ''
    })
  },

  // 切换里程碑状态
  toggleMilestone(e) {
    const goalId = e.currentTarget.dataset.goalId
    const milestoneId = e.currentTarget.dataset.milestoneId
    
    try {
      app.completeMilestone(goalId, milestoneId)
      this.loadGoals()
      this.calculateStats()
      
      wx.showToast({
        title: '里程碑状态已更新',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  // 切换里程碑显示
  toggleMilestones(e) {
    const goalId = e.currentTarget.dataset.id
    const goals = this.data.filteredGoals.map(goal => {
      if (goal.id === goalId) {
        goal.showMilestones = !goal.showMilestones
      }
      return goal
    })
    
    this.setData({
      filteredGoals: goals
    })
  },

  // 更新进度
  updateProgress(e) {
    const goalId = e.currentTarget.dataset.id
    const goal = this.data.goals.find(g => g.id === goalId)
    
    if (goal) {
      this.setData({
        currentProgressGoalId: goalId,
        progressValue: goal.progress,
        showProgressModal: true
      })
    }
  },

  onProgressChange(e) {
    this.setData({
      progressValue: e.detail.value
    })
  },

  confirmUpdateProgress() {
    try {
      app.updateGoalProgress(this.data.currentProgressGoalId, this.data.progressValue)
      
      // 如果进度达到100%，询问是否完成目标
      if (this.data.progressValue >= 100) {
        wx.showModal({
          title: '恭喜',
          content: '进度已达到100%，是否将目标标记为已完成？',
          success: (res) => {
            if (res.confirm) {
              app.updateGoal(this.data.currentProgressGoalId, { 
                status: 'completed',
                completedTime: new Date().toISOString()
              })
            }
            this.loadGoals()
            this.calculateStats()
          }
        })
      } else {
        this.loadGoals()
        this.calculateStats()
      }
      
      wx.showToast({
        title: '进度更新成功',
        icon: 'success'
      })
      
      this.closeProgressModal()
    } catch (error) {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  closeProgressModal() {
    this.setData({
      showProgressModal: false,
      currentProgressGoalId: ''
    })
  },

  // 查看目标详情
  viewGoalDetail(e) {
    const goalId = e.currentTarget.dataset.id
    // 跳转到目标详情页面（可以后续开发）
    wx.showToast({
      title: '详情页面开发中',
      icon: 'none'
    })
  },

  // 显示今日目标
  showToday() {
    const todayGoals = app.getTodayGoals()
    if (todayGoals.length === 0) {
      wx.showToast({
        title: '今日暂无目标',
        icon: 'none'
      })
      return
    }
    
    // 筛选显示今日相关的目标
    this.setData({
      selectedType: '',
      selectedStatus: 'active',
      searchKeyword: ''
    })
    this.filterGoals()
    
    wx.showToast({
      title: `找到${todayGoals.length}个今日目标`,
      icon: 'success'
    })
  },

  // 显示设置（可以后续开发）
  showSettings() {
    wx.showToast({
      title: '设置页面开发中',
      icon: 'none'
    })
  },

  // 格式化时间投入显示
  formatTimeInvestment: function(minutes) {
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
  }
})