const userManager = require('../../utils/userManager.js')
const { toast } = require('../../utils/util.js')

Page({
  data: {
    currentUser: null,
    users: [],
    userStats: {},
    notionConfig: {
      enabled: false,
      apiKey: '',
      databaseId: '',
      mainDatabaseId: '',
      activityDatabaseId: '',
      goalsDatabaseId: '',
      todosDatabaseId: '',
      dailyStatusDatabaseId: '',
      happyThingsDatabaseId: '',
      parentPageId: ''
    },
    configMode: 'auto', // 'auto' 自动创建 | 'manual' 手动配置
    preferences: {
      autoSync: true,
      reminderEnabled: true,
      reminderInterval: 60
    },
    syncStatus: {
      isConnected: false,
      pendingCount: 0
    },
    lastSyncTime: '',
    notionConfigured: false,
    pendingMemos: 0,
    showApiKey: false,
    testing: false,
    creating: false, // 正在创建数据库
    diagnosing: false, // 正在诊断数据库
    fixing: false, // 正在修复数据库结构
    // 箴言相关数据
    quoteStats: {
      total: 0,
      favorites: 0,
      user: 0,
      categories: 0
    },
    currentQuotePreview: null
  },

  onLoad: function() {
    this.loadUserData()
    this.loadSyncStatus()
    this.loadQuoteData()
  },

  onShow: function() {
    this.loadUserData()
    this.loadSyncStatus()
    this.loadQuoteData()
  },

  // 加载用户数据
  async loadUserData() {
    let currentUser = userManager.getCurrentUser()
    
    // 如果有当前用户，从云端同步最新数据
    if (currentUser && currentUser.email) {
      try {
        console.log('设置页面：从云端同步用户数据...')
        const apiService = require('../../utils/apiService.js')
        const result = await apiService.getUserByEmail(currentUser.email)
        
        if (result.success && result.user) {
          const cloudUser = result.user
          console.log('设置页面：云端用户数据:', cloudUser)
          
          // 同步notionConfig到本地
          if (cloudUser.notionConfig) {
            userManager.configureNotion(currentUser.id, cloudUser.notionConfig)
            // 重新获取更新后的用户数据
            currentUser = userManager.getCurrentUser()
            console.log('设置页面：同步后的本地用户:', currentUser)
          }
        }
      } catch (error) {
        console.error('设置页面：同步用户数据失败:', error)
      }
    }
    
    const users = userManager.getUsers()
    const userStats = userManager.getUserStats()
    const preferences = userManager.getUserPreferences()

    // 计算注册天数
    if (userStats && currentUser) {
      const daysSinceCreated = Math.floor((Date.now() - currentUser.createdAt) / (1000 * 60 * 60 * 24))
      userStats.daysSinceCreated = daysSinceCreated
    }

    // 调试信息
    console.log('设置页面加载用户数据:', {
      currentUser: currentUser,
      notionConfig: currentUser ? currentUser.notionConfig : null
    })

    // 为用户列表添加备忘录数量
    const usersWithStats = users.map(user => {
      const stats = userManager.getUserStats(user.id)
      return {
        ...user,
        memoCount: stats ? stats.totalMemos : 0
      }
    })

    // 确保notionConfig包含所有字段
    const defaultConfig = {
      enabled: false,
      apiKey: '',
      databaseId: '',
      parentPageId: '',
      goalsDatabaseId: '',
      todosDatabaseId: '',
      mainDatabaseId: '',
      activityDatabaseId: '',
      mainRecordsDatabaseId: '',
      activitiesDatabaseId: ''
    }

    const notionConfig = currentUser && currentUser.notionConfig
      ? { ...defaultConfig, ...currentUser.notionConfig }
      : defaultConfig

    // 🔧 自动修复配置结构：添加databases字段
    if (currentUser && notionConfig.goalsDatabaseId && !notionConfig.databases) {
      console.log('🔧 检测到旧配置结构，自动添加databases字段...')
      notionConfig.databases = {
        goals: notionConfig.goalsDatabaseId,
        todos: notionConfig.todosDatabaseId,
        mainRecords: notionConfig.mainDatabaseId || notionConfig.mainRecordsDatabaseId,
        activityDetails: notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId
      }

      // 保存到本地
      userManager.configureNotion(currentUser.id, notionConfig)

      // 同步到云端
      try {
        const apiService = require('../../utils/apiService.js')
        await apiService.updateUserByEmail(currentUser.email, { notionConfig })
        console.log('✅ 配置结构已自动修复并同步到云端')
      } catch (error) {
        console.error('❌ 同步修复后的配置失败:', error)
      }
    }

    console.log('最终设置的 notionConfig:', notionConfig)

    const notionConfigured = userManager.isNotionConfigured(currentUser ? currentUser.id : null)
    const memos = userManager.getUserMemos()
    const pendingMemos = memos.filter(memo => memo.syncStatus !== 'synced').length

    this.setData({
      currentUser: currentUser || {},
      users: usersWithStats,
      userStats: userStats || {},
      preferences: preferences,
      notionConfig: notionConfig,
      notionConfigured: notionConfigured,
      pendingMemos: pendingMemos
    })
  },

  // 加载同步状态
  loadSyncStatus: function() {
    // 简化同步状态，不依赖notionSync模块
    const syncStatus = {
      isConnected: this.data.notionConfigured,
      syncInProgress: false,
      pendingCount: this.data.pendingMemos || 0
    }
    
    this.setData({
      syncStatus: syncStatus,
      lastSyncTime: ''
    })
  },

  // 编辑用户资料
  editProfile: function() {
    wx.showModal({
      title: '编辑资料',
      editable: true,
      placeholderText: '请输入用户名',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const newName = res.content.trim()
          userManager.updateUser(this.data.currentUser.id, { name: newName })
          this.loadUserData()
          toast.success('资料更新成功')
        }
      }
    })
  },

  // 更换头像
  changeAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        // 这里可以上传头像到服务器或使用本地路径
        userManager.updateUser(this.data.currentUser.id, { avatar: tempFilePath })
        this.loadUserData()
        toast.success('头像更新成功')
      }
    })
  },

  // 切换用户
  switchUser: function(e) {
    const userId = e.currentTarget.dataset.userId
    if (userId === this.data.currentUser.id) return

    wx.showModal({
      title: '切换用户',
      content: '确定要切换到这个用户吗？当前数据将被保存。',
      success: (res) => {
        if (res.confirm) {
          const success = userManager.switchUser(userId)
          if (success) {
            this.loadUserData()
            toast.success('用户切换成功')
            
            // 刷新其他页面数据
            const pages = getCurrentPages()
            pages.forEach(page => {
              if (page.route !== 'pages/settings/settings' && page.loadPageData) {
                page.loadPageData()
              }
            })
          } else {
            toast.error('用户切换失败')
          }
        }
      }
    })
  },

  // 添加新用户
  addNewUser: function() {
    wx.showModal({
      title: '添加新用户',
      editable: true,
      placeholderText: '请输入用户名',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          const userName = res.content.trim()
          const newUser = userManager.createUser({ name: userName })
          
          wx.showModal({
            title: '用户创建成功',
            content: '是否立即切换到新用户？',
            success: (res2) => {
              if (res2.confirm) {
                userManager.switchUser(newUser.id)
                this.loadUserData()
              } else {
                this.loadUserData()
              }
              toast.success('新用户创建成功')
            }
          })
        }
      }
    })
  },

  // 配置Notion - 重置配置状态，显示配置界面
  configureNotion: function() {
    // 方案1：重置notionConfigured状态，在当前页面重新配置
    this.setData({
      notionConfigured: false,
      configMode: 'auto'
    })

    wx.showToast({
      title: '请重新配置',
      icon: 'none',
      duration: 1500
    })

    // 方案2（备用）：跳转到独立配置页面
    // wx.navigateTo({
    //   url: `/pages/notion-config/notion-config?userId=${this.data.currentUser.id}`
    // })
  },

  // 切换Notion同步
  toggleNotionSync: function(e) {
    const enabled = e.detail.value
    const notionConfig = { ...this.data.notionConfig, enabled }
    
    userManager.configureNotion(this.data.currentUser.id, notionConfig)
    this.setData({ notionConfig })
    
    if (enabled) {
      toast.success('Notion集成已启用')
    } else {
      toast.success('Notion集成已关闭')
    }
  },

  // Notion API Key输入
  onNotionApiKeyInput: function(e) {
    const apiKey = e.detail.value
    const notionConfig = { ...this.data.notionConfig, apiKey }
    console.log('API Key输入:', apiKey, '更新配置:', notionConfig)
    
    this.setData({ notionConfig })
    
    // 实时保存配置到用户数据
    const saveResult = userManager.configureNotion(this.data.currentUser.id, notionConfig)
    console.log('保存API Key结果:', saveResult)
  },

  // Notion Database ID输入
  onNotionDatabaseIdInput: function(e) {
    const databaseId = e.detail.value
    const notionConfig = { ...this.data.notionConfig, databaseId }
    console.log('Database ID输入:', databaseId, '更新配置:', notionConfig)

    this.setData({ notionConfig })

    // 实时保存配置到用户数据
    const saveResult = userManager.configureNotion(this.data.currentUser.id, notionConfig)
    console.log('保存Database ID结果:', saveResult)
  },

  // Notion 父页面ID输入
  onParentPageIdInput: function(e) {
    const parentPageId = e.detail.value
    const notionConfig = { ...this.data.notionConfig, parentPageId }
    console.log('Parent Page ID输入:', parentPageId, '更新配置:', notionConfig)

    this.setData({ notionConfig })

    // 实时保存配置到用户数据
    const saveResult = userManager.configureNotion(this.data.currentUser.id, notionConfig)
    console.log('保存Parent Page ID结果:', saveResult)
  },

  // 目标库ID输入
  onGoalsDatabaseIdInput: function(e) {
    const goalsDatabaseId = e.detail.value
    const notionConfig = { ...this.data.notionConfig, goalsDatabaseId }
    this.setData({ notionConfig })
  },

  // 待办库ID输入
  onTodosDatabaseIdInput: function(e) {
    const todosDatabaseId = e.detail.value
    const notionConfig = { ...this.data.notionConfig, todosDatabaseId }
    this.setData({ notionConfig })
  },

  // 主记录表ID输入
  onMainDatabaseIdInput: function(e) {
    const mainDatabaseId = e.detail.value
    const notionConfig = {
      ...this.data.notionConfig,
      mainDatabaseId,
      mainRecordsDatabaseId: mainDatabaseId, // 兼容字段
      databaseId: mainDatabaseId // 兼容旧版
    }
    this.setData({ notionConfig })
  },

  // 活动明细表ID输入
  onActivityDatabaseIdInput: function(e) {
    const activityDatabaseId = e.detail.value
    const notionConfig = {
      ...this.data.notionConfig,
      activityDatabaseId,
      activitiesDatabaseId: activityDatabaseId // 兼容字段
    }
    this.setData({ notionConfig })
  },

  // 每日状态库ID输入
  onDailyStatusDatabaseIdInput: function(e) {
    const dailyStatusDatabaseId = e.detail.value
    const notionConfig = {
      ...this.data.notionConfig,
      dailyStatusDatabaseId
    }
    this.setData({ notionConfig })
  },

  // 开心库ID输入
  onHappyThingsDatabaseIdInput: function(e) {
    const happyThingsDatabaseId = e.detail.value
    const notionConfig = {
      ...this.data.notionConfig,
      happyThingsDatabaseId
    }
    this.setData({ notionConfig })
  },

  // 箴言库ID输入
  onQuotesDatabaseIdInput: function(e) {
    const quotesDatabaseId = e.detail.value
    const notionConfig = {
      ...this.data.notionConfig,
      databases: {
        ...this.data.notionConfig.databases,
        quotes: quotesDatabaseId
      }
    }
    this.setData({ notionConfig })
  },

  // 保存手动配置
  saveManualConfig: async function() {
    const { apiKey, goalsDatabaseId, todosDatabaseId, mainDatabaseId, activityDatabaseId, dailyStatusDatabaseId, happyThingsDatabaseId, databases } = this.data.notionConfig
    const quotesDatabaseId = databases?.quotes

    if (!apiKey) {
      toast.error('请输入API Key')
      return
    }

    if (!goalsDatabaseId || !todosDatabaseId || !mainDatabaseId || !activityDatabaseId) {
      toast.error('请至少输入前四个数据库的ID（目标库、待办库、主记录、活动明细）')
      return
    }

    try {
      // 保存配置到本地（包含完整的databases结构）
      const notionConfig = {
        ...this.data.notionConfig,
        enabled: true,
        // 标准databases结构
        databases: {
          goals: goalsDatabaseId,
          todos: todosDatabaseId,
          mainRecords: mainDatabaseId,
          activityDetails: activityDatabaseId,
          dailyStatus: dailyStatusDatabaseId || '',
          happyThings: happyThingsDatabaseId || '',
          quotes: quotesDatabaseId || ''
        },
        // 兼容字段（向后兼容）
        goalsDatabaseId: goalsDatabaseId,
        todosDatabaseId: todosDatabaseId,
        mainDatabaseId: mainDatabaseId,
        mainRecordsDatabaseId: mainDatabaseId,
        activityDatabaseId: activityDatabaseId,
        activitiesDatabaseId: activityDatabaseId,
        dailyStatusDatabaseId: dailyStatusDatabaseId || '',
        happyThingsDatabaseId: happyThingsDatabaseId || '',
        databaseId: mainDatabaseId // 兼容旧版
      }

      userManager.configureNotion(this.data.currentUser.id, notionConfig)

      // 同步配置到云端
      const apiService = require('../../utils/apiService.js')
      const updateResult = await apiService.updateUserByEmail(
        this.data.currentUser.email,
        { notionConfig: notionConfig }
      )

      if (updateResult.success) {
        console.log('手动配置已同步到云端')
      } else {
        console.warn('同步到云端失败，但本地配置已保存:', updateResult.error)
      }

      // 刷新页面数据
      await this.loadUserData()
      this.loadSyncStatus()

      wx.showToast({
        title: '配置保存成功',
        icon: 'success'
      })

    } catch (error) {
      console.error('保存手动配置失败:', error)
      toast.error('保存失败: ' + error.message)
    }
  },

  // 切换配置模式
  onConfigModeChange: function(e) {
    const configMode = e.detail.value
    console.log('切换配置模式:', configMode)
    this.setData({ configMode })
  },

  // 切换API Key显示
  toggleApiKeyVisibility: function() {
    this.setData({
      showApiKey: !this.data.showApiKey
    })
  },

  // 自动创建数据库
  autoCreateDatabases: async function() {
    const { apiKey, parentPageId } = this.data.notionConfig

    if (!apiKey || !parentPageId) {
      toast.error('请先填写API Key和父页面ID')
      return
    }

    this.setData({ creating: true })

    try {
      console.log('开始自动创建四数据库架构...')

      const cloudTest = require('../../utils/cloudTest.js')
      const result = await cloudTest.autoCreateDatabases(apiKey, parentPageId)

      if (result.success) {
        // 更新配置
        const notionConfig = {
          ...this.data.notionConfig,
          enabled: true,
          goalsDatabaseId: result.goalsDatabaseId,
          todosDatabaseId: result.todosDatabaseId,
          mainDatabaseId: result.mainDatabaseId,
          activityDatabaseId: result.activityDatabaseId,
          databaseId: result.mainDatabaseId,  // 兼容旧版
          mainRecordsDatabaseId: result.mainDatabaseId,
          activitiesDatabaseId: result.activityDatabaseId,
          // 添加databases结构供云函数使用
          databases: {
            goals: result.goalsDatabaseId,
            todos: result.todosDatabaseId,
            mainRecords: result.mainDatabaseId,
            activityDetails: result.activityDatabaseId
          }
        }

        // 保存配置到本地
        userManager.configureNotion(this.data.currentUser.id, notionConfig)

        // 更新初始化状态
        const initStatus = {
          success: true,
          addedFields: result.tables || ['goals', 'todos', 'main', 'activity'],
          error: null
        }
        userManager.updateNotionInitStatus(this.data.currentUser.id, initStatus)

        // 同步配置到云端用户数据库
        try {
          const apiService = require('../../utils/apiService.js')
          const updateResult = await apiService.updateUserByEmail(
            this.data.currentUser.email,
            { notionConfig: notionConfig }
          )

          if (updateResult.success) {
            console.log('Notion配置已同步到云端')
          } else {
            console.warn('同步到云端失败，但本地配置已保存:', updateResult.error)
          }
        } catch (syncError) {
          console.error('同步配置到云端失败:', syncError)
          // 即使云端同步失败，本地配置也已保存，继续执行
        }

        // 刷新页面数据
        await this.loadUserData()
        this.loadSyncStatus()

        // ⚠️ 关键：更新全局app状态，确保memo页面使用新配置
        const app = getApp()
        if (app.globalData) {
          app.globalData.currentUser = userManager.getCurrentUser()
          console.log('✅ 已更新app.globalData.currentUser:', app.globalData.currentUser)
        }

        // 刷新其他页面数据（重要！）
        const pages = getCurrentPages()
        pages.forEach(page => {
          if (page.route !== 'pages/settings/settings') {
            // 如果页面有reload方法，调用它
            if (typeof page.onShow === 'function') {
              console.log('刷新页面:', page.route)
              // 触发页面的onShow重新加载数据
              if (page.loadUserData) {
                page.loadUserData()
              } else if (page.checkLoginStatus) {
                page.checkLoginStatus()
              }
            }
          }
        })

        // 显示成功消息
        let message = '✅ 四数据库创建成功！\n'
        message += `🎯 目标库ID: ${result.goalsDatabaseId.slice(0, 8)}...\n`
        message += `📝 待办库ID: ${result.todosDatabaseId.slice(0, 8)}...\n`
        message += `📋 主记录表ID: ${result.mainDatabaseId.slice(0, 8)}...\n`
        message += `📊 活动明细表ID: ${result.activityDatabaseId.slice(0, 8)}...\n`
        message += '🎉 数据库字段已自动初始化\n\n'
        message += '⚠️ 请返回记录页面重新打开，以使用新数据库'

        wx.showModal({
          title: '创建成功',
          content: message,
          showCancel: false,
          confirmText: '好的'
        })

        console.log('数据库创建成功:', result)
      } else {
        toast.error('创建失败: ' + result.error)
      }
    } catch (error) {
      console.error('自动创建数据库失败:', error)
      toast.error('创建失败: ' + error.message)
    } finally {
      this.setData({ creating: false })
    }
  },

  // 测试Notion连接
  testNotionConnection: async function() {
    const { apiKey, databaseId } = this.data.notionConfig

    if (!apiKey || !databaseId) {
      toast.error('请先填写API Token和Database ID')
      return
    }

    this.setData({ testing: true })

    try {
      console.log('开始测试Notion连接并初始化数据库...')

      // 直接测试Notion API连接并初始化数据库字段
      const cloudTest = require('../../utils/cloudTest.js')
      const notionTest = await cloudTest.testNotionDirectly(apiKey, databaseId)

      if (notionTest.success) {
        // 保存配置到本地
        userManager.configureNotion(this.data.currentUser.id, this.data.notionConfig)

        // 保存初始化状态
        if (notionTest.initialized !== undefined) {
          const initStatus = {
            success: notionTest.initialized,
            addedFields: notionTest.database?.properties ?
                        Object.keys(notionTest.database.properties) : [],
            error: notionTest.initialized ? null : '部分字段初始化失败'
          }
          userManager.updateNotionInitStatus(this.data.currentUser.id, initStatus)
          console.log('数据库初始化状态已保存:', initStatus)
        }

        // 同步配置到云端用户数据库
        try {
          const apiService = require('../../utils/apiService.js')
          const updateResult = await apiService.updateUserByEmail(
            this.data.currentUser.email,
            { notionConfig: this.data.notionConfig }
          )

          if (updateResult.success) {
            console.log('Notion配置已同步到云端')
          } else {
            console.warn('同步到云端失败，但本地配置已保存:', updateResult.error)
          }
        } catch (syncError) {
          console.error('同步配置到云端失败:', syncError)
          // 即使云端同步失败，本地配置也已保存，继续执行
        }

        this.loadSyncStatus()
        this.loadUserData() // 重新加载用户数据以更新显示

        // 构建成功消息
        let message = '✅ Notion连接测试成功'
        if (notionTest.user) {
          message += `\n👤 用户: ${notionTest.user.name || 'Unknown'}`
        }
        if (notionTest.database) {
          const dbTitle = notionTest.database.title?.[0]?.plain_text ||
                         notionTest.database.title?.[0]?.text?.content ||
                         'Database'
          message += `\n📋 数据库: ${dbTitle}`
        }
        if (notionTest.initialized) {
          message += '\n🎉 数据库字段已自动初始化'
        } else {
          message += '\n⚠️ 部分字段需要手动创建'
        }

        toast.success(message)
      } else {
        toast.error('Notion连接失败: ' + notionTest.error)
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      toast.error('连接测试失败: ' + error.message)
    } finally {
      this.setData({ testing: false })
    }
  },

  // 诊断Notion数据库结构
  // 修复活动关联
  fixActivityRelations: function() {
    wx.navigateTo({
      url: '/pages/fix-relations/fix-relations'
    })
  },

  diagnoseDatabases: async function() {
    if (!this.data.notionConfigured) {
      toast.error('请先配置Notion集成')
      return
    }

    this.setData({ diagnosing: true })

    try {
      const notionApiService = require('../../utils/notionApiService.js')
      const notionConfig = this.data.currentUser.notionConfig

      console.log('\n========== 开始诊断四数据库结构 ==========')

      // 诊断 Main Records
      const mainResult = await notionApiService.getDatabaseSchema(
        notionConfig.apiKey,
        notionConfig.mainRecordsDatabaseId || notionConfig.mainDatabaseId
      )

      // 诊断 Activity Details
      const activityResult = await notionApiService.getDatabaseSchema(
        notionConfig.apiKey,
        notionConfig.activityDatabaseId
      )

      // 诊断 Goals (如果配置了)
      let goalsResult = null
      if (notionConfig.goalsDatabaseId) {
        goalsResult = await notionApiService.getDatabaseSchema(
          notionConfig.apiKey,
          notionConfig.goalsDatabaseId
        )
      }

      // 诊断 Todos (如果配置了)
      let todosResult = null
      if (notionConfig.todosDatabaseId) {
        todosResult = await notionApiService.getDatabaseSchema(
          notionConfig.apiKey,
          notionConfig.todosDatabaseId
        )
      }

      // 打印诊断结果
      console.log('\n📝 Main Records 数据库:')
      if (mainResult.success) {
        console.log('  标题:', mainResult.title)
        console.log('  字段数:', mainResult.totalFields)
        console.log('  字段列表:', mainResult.fieldNames.join(', '))
      } else {
        console.error('  ❌ 错误:', mainResult.error)
      }

      console.log('\n⏱️ Activity Details 数据库:')
      if (activityResult.success) {
        console.log('  标题:', activityResult.title)
        console.log('  字段数:', activityResult.totalFields)
        console.log('  字段列表:', activityResult.fieldNames.join(', '))
      } else {
        console.error('  ❌ 错误:', activityResult.error)
      }

      if (goalsResult) {
        console.log('\n🎯 Goals 数据库:')
        if (goalsResult.success) {
          console.log('  标题:', goalsResult.title)
          console.log('  字段数:', goalsResult.totalFields)
          console.log('  字段列表:', goalsResult.fieldNames.join(', '))
        } else {
          console.error('  ❌ 错误:', goalsResult.error)
        }
      }

      if (todosResult) {
        console.log('\n✅ Todos 数据库:')
        if (todosResult.success) {
          console.log('  标题:', todosResult.title)
          console.log('  字段数:', todosResult.totalFields)
          console.log('  字段列表:', todosResult.fieldNames.join(', '))
        } else {
          console.error('  ❌ 错误:', todosResult.error)
        }
      }

      console.log('\n========== 诊断完成 ==========\n')

      // 显示结果弹窗
      const mainFields = mainResult.success ? mainResult.fieldNames.join(', ') : '获取失败'
      const activityFields = activityResult.success ? activityResult.fieldNames.join(', ') : '获取失败'

      wx.showModal({
        title: '数据库诊断结果',
        content: `📝 Main Records (${mainResult.totalFields || 0}字段):\n${mainFields}\n\n⏱️ Activities (${activityResult.totalFields || 0}字段):\n${activityFields}\n\n详细信息请查看控制台`,
        showCancel: false,
        confirmText: '知道了'
      })

      toast.success('诊断完成，请查看控制台')
    } catch (error) {
      console.error('诊断失败:', error)
      toast.error('诊断失败: ' + error.message)
    } finally {
      this.setData({ diagnosing: false })
    }
  },

  // 修复数据库结构
  fixDatabaseStructure: async function() {
    if (!this.data.notionConfigured) {
      toast.error('请先配置Notion集成')
      return
    }

    wx.showModal({
      title: '修复数据库结构',
      content: '将为目标数据库添加以下字段：\n• Estimated Hours (预计投入时间)\n• Start Date (起始时间)\n• User ID (用户标识)\n• Total Time Investment (时间汇总-Rollup)\n\n是否继续？',
      success: async (res) => {
        if (!res.confirm) return

        this.setData({ fixing: true })

        try {
          const notionApiService = require('../../utils/notionApiService.js')
          const notionConfig = this.data.currentUser.notionConfig

          if (!notionConfig.goalsDatabaseId) {
            toast.error('未配置目标数据库ID')
            return
          }

          console.log('开始修复目标数据库结构...')
          console.log('目标数据库ID:', notionConfig.goalsDatabaseId)
          console.log('活动明细表ID:', notionConfig.activityDatabaseId)

          const result = await notionApiService.fixGoalsDatabaseStructure(
            notionConfig.apiKey,
            notionConfig.goalsDatabaseId,
            notionConfig.activityDatabaseId
          )

          if (result.success) {
            console.log('✅ 修复成功')
            wx.showModal({
              title: '修复成功',
              content: `已成功添加以下字段：\n${result.addedFields.join('\n')}\n\n现在可以正常创建和编辑目标了！`,
              showCancel: false,
              confirmText: '知道了'
            })
            toast.success('数据库结构修复成功')
          } else {
            console.error('❌ 修复失败:', result.error)
            wx.showModal({
              title: '修复失败',
              content: result.error,
              showCancel: false,
              confirmText: '知道了'
            })
            toast.error('修复失败: ' + result.error)
          }
        } catch (error) {
          console.error('修复异常:', error)
          toast.error('修复异常: ' + error.message)
        } finally {
          this.setData({ fixing: false })
        }
      }
    })
  },

  // 切换自动同步
  toggleAutoSync: function(e) {
    const autoSync = e.detail.value
    const preferences = { ...this.data.preferences, autoSync }
    
    userManager.updateUserPreferences(preferences)
    this.setData({ preferences })
    
    toast.success(autoSync ? '自动同步已启用' : '自动同步已关闭')
  },

  // 切换提醒
  toggleReminder: function(e) {
    const reminderEnabled = e.detail.value
    const preferences = { ...this.data.preferences, reminderEnabled }
    
    userManager.updateUserPreferences(preferences)
    this.setData({ preferences })
    
    toast.success(reminderEnabled ? '提醒已启用' : '提醒已关闭')
  },

  // 提醒间隔改变
  onReminderIntervalChange: function(e) {
    const reminderInterval = e.detail.value
    const preferences = { ...this.data.preferences, reminderInterval }
    
    userManager.updateUserPreferences(preferences)
    this.setData({ preferences })
  },

  // 导出数据
  exportData: function() {
    const userData = userManager.exportUserData()
    if (!userData) {
      toast.error('导出失败，没有可导出的数据')
      return
    }

    // 在实际环境中，这里可以保存文件或分享
    const dataStr = JSON.stringify(userData, null, 2)
    console.log('导出数据:', dataStr)
    
    wx.showModal({
      title: '数据导出成功',
      content: `已导出${userData.memos.length}条记录。数据已复制到控制台，实际应用中可保存为文件。`,
      showCancel: false
    })
  },

  // 导入数据
  importData: function() {
    // 在实际环境中，这里可以选择文件进行导入
    wx.showModal({
      title: '导入数据',
      content: '此功能需要选择数据文件进行导入，暂不可用。',
      showCancel: false
    })
  },

  // 清除所有数据
  clearAllData: function() {
    wx.showModal({
      title: '⚠️ 危险操作',
      content: '确定要清除当前用户的所有数据吗？此操作不可恢复！',
      confirmText: '确定清除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          userManager.clearUserData(this.data.currentUser.id)
          this.loadUserData()
          toast.success('数据已清除')
          
          // 刷新其他页面
          const pages = getCurrentPages()
          pages.forEach(page => {
            if (page.route !== 'pages/settings/settings' && page.loadPageData) {
              page.loadPageData()
            }
          })
        }
      }
    })
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账户吗？数据将被保存。',
      confirmText: '退出登录',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          const success = userManager.logout()
          if (success) {
            toast.success('已退出登录')
            
            // 跳转到登录页面
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/login/login'
              })
            }, 1000)
          } else {
            toast.error('退出失败')
          }
        }
      }
    })
  },

  // 删除当前用户
  deleteCurrentUser: function() {
    if (this.data.users.length <= 1) {
      toast.error('至少需要保留一个用户')
      return
    }

    wx.showModal({
      title: '⚠️ 删除用户',
      content: '确定要删除当前用户及其所有数据吗？此操作不可恢复！',
      confirmText: '确定删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          const success = userManager.deleteUser(this.data.currentUser.id)
          if (success) {
            this.loadUserData()
            toast.success('用户已删除')
            
            // 刷新其他页面
            const pages = getCurrentPages()
            pages.forEach(page => {
              if (page.route !== 'pages/settings/settings' && page.loadPageData) {
                page.loadPageData()
              }
            })
          } else {
            toast.error('删除失败')
          }
        }
      }
    })
  },

  // 加载箴言数据
  loadQuoteData: function() {
    const app = getApp()
    const allQuotes = app.getAllQuotes()
    const favoriteQuotes = allQuotes.filter(quote => quote.isFavorite)
    const userQuotes = allQuotes.filter(quote => quote.source === '用户添加')
    const categories = Object.keys(app.getQuoteCategories())
    const currentQuote = app.globalData.currentQuote

    this.setData({
      quoteStats: {
        total: allQuotes.length,
        favorites: favoriteQuotes.length,
        user: userQuotes.length,
        categories: categories.length
      },
      currentQuotePreview: currentQuote && typeof currentQuote === 'object' ? currentQuote : null
    })
  },

  // 跳转到箴言管理页面
  goToQuoteManager: function() {
    wx.navigateTo({
      url: '/pages/quote-manager/quote-manager'
    })
  },

  // 刷新箴言
  refreshQuote: function() {
    const app = getApp()
    const newQuote = app.refreshQuote()
    if (newQuote) {
      this.setData({
        currentQuotePreview: newQuote
      })
      toast.success('已刷新箴言')
    }
  },

  // 格式化时间
  formatTime: function(date) {
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
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  }
})