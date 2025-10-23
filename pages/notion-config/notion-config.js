// pages/notion-config/notion-config.js
const userManager = require('../../utils/userManager.js')
const notionSync = require('../../utils/notionSync.js')

Page({
  data: {
    userId: '',
    userEmail: '',
    notionConfig: {
      apiKey: '',
      databaseId: '',
      enabled: false,
      syncEnabled: true,
      databases: {
        goals: '',
        todos: '',
        mainRecords: '',
        activityDetails: '',
        dailyStatus: '',
        happyThings: '',
        quotes: '',  // 箴言库
        knowledge: ''  // 知识库
      }
    },
    showApiKey: false,
    apiKeyError: false,
    databaseIdError: false,
    testing: false,
    saving: false,
    canTest: false,
    canSave: false,
    connectionResult: null,
    configStatus: {
      step: 0
    },
    showHelp: false,
    helpContent: {},
    showAdvanced: true  // 是否显示高级配置（七数据库ID），默认展开
  },

  onLoad: function (options) {
    // 🔧 重定向到设置页面（Notion配置功能已整合到设置页面）
    console.log('⚠️ notion-config页面已弃用，重定向到设置页面')
    wx.redirectTo({
      url: '/pages/settings/settings',
      fail: () => {
        // 如果重定向失败，尝试switchTab（如果settings是tab页面）
        wx.switchTab({
          url: '/pages/settings/settings'
        })
      }
    })
  },

  // 原有的onLoad逻辑（已废弃）
  _oldOnLoad: function (options) {
    const userId = options.userId
    if (userId) {
      this.setData({ userId })
      this.loadUserConfigFromCloud(userId)
    } else {
      // 如果没有传入userId，使用当前用户
      const currentUser = userManager.getCurrentUser()
      if (currentUser) {
        this.setData({
          userId: currentUser.id,
          userEmail: currentUser.email
        })
        this.loadUserConfigFromCloud(currentUser.id)
      } else {
        // 没有当前用户，返回登录页
        wx.redirectTo({
          url: '/pages/login/login'
        })
      }
    }
  },

  // 从云端加载用户配置
  loadUserConfigFromCloud: async function (userId) {
    try {
      wx.showLoading({ title: '加载配置中...' })

      const apiService = require('../../utils/apiService.js')
      const currentUser = userManager.getCurrentUser()

      // 先尝试从云端获取最新配置
      const result = await apiService.getUserByEmail(currentUser.email)

      if (result.success && result.user && result.user.notionConfig) {
        console.log('从云端加载到的notionConfig:', result.user.notionConfig)

        // 更新本地userManager
        userManager.updateUser(userId, {
          notionConfig: result.user.notionConfig
        })

        // 🔧 关键修复：刷新currentUser，确保所有页面都能访问到最新配置
        userManager.switchUser(userId)

        // 显示配置
        this.displayUserConfig(result.user.notionConfig)
      } else {
        // 云端没有配置，使用本地配置
        console.log('云端没有配置，使用本地配置')
        this.loadUserConfig(userId)
      }

      wx.hideLoading()
    } catch (error) {
      console.error('从云端加载配置失败:', error)
      wx.hideLoading()
      // 失败时使用本地配置
      this.loadUserConfig(userId)
    }
  },

  // 加载用户配置（本地）
  loadUserConfig: function (userId) {
    const user = userManager.getUsers().find(u => u.id === userId)
    if (user) {
      this.displayUserConfig(user.notionConfig)
    }
  },

  // 显示用户配置
  displayUserConfig: function (notionConfig) {
    const defaultConfig = {
      apiKey: '',
      databaseId: '',
      enabled: false,
      syncEnabled: true,
      databases: {
        goals: '',
        todos: '',
        mainRecords: '',
        activityDetails: '',
        dailyStatus: '',
        happyThings: '',
        quotes: '',  // 箴言库
        knowledge: ''  // 知识库
      }
    }

    // 合并用户配置和默认配置
    const userConfig = notionConfig || {}
    const mergedConfig = {
      ...defaultConfig,
      ...userConfig,
      databases: {
        ...defaultConfig.databases,
        ...(userConfig.databases || {})
      }
    }

    this.setData({
      notionConfig: mergedConfig
    }, () => {
      this.updateConfigStatus()
      this.checkCanSave()

      // 如果databases中有配置，自动展开高级配置
      const hasDatabases = Object.values(mergedConfig.databases || {}).some(id => id && id.trim())
      if (hasDatabases) {
        this.setData({ showAdvanced: true })
      }
    })
  },

  // 更新配置状态
  updateConfigStatus: function () {
    const { notionConfig } = this.data
    let step = 0
    
    if (notionConfig.apiKey.trim()) step = 1
    if (step >= 1 && notionConfig.databaseId.trim()) step = 2

    this.setData({
      'configStatus.step': step
    })
  },

  // 验证Notion API密钥格式 - 简化验证，只检查基本要求
  validateApiKey: function (apiKey) {
    // 只要不为空且长度合理就行，具体格式通过实际连接测试验证
    return apiKey && apiKey.trim().length > 10
  },

  // 验证Notion数据库ID格式 - 简化验证
  validateDatabaseId: function (databaseId) {
    // 只要不为空且长度合理就行，具体格式通过实际连接测试验证
    return databaseId && databaseId.trim().length > 10
  },

  // API密钥输入
  onApiKeyInput: function (e) {
    const apiKey = e.detail.value.trim()
    
    this.setData({
      'notionConfig.apiKey': apiKey
    }, () => {
      this.updateConfigStatus()
      this.checkCanSave()
      this.validateInputs()
    })
  },

  // 数据库ID输入
  onDatabaseIdInput: function (e) {
    const databaseId = e.detail.value.trim()

    this.setData({
      'notionConfig.databaseId': databaseId
    }, () => {
      this.updateConfigStatus()
      this.checkCanSave()
      this.validateInputs()
    })
  },

  // 切换高级配置显示
  toggleAdvanced: function () {
    this.setData({
      showAdvanced: !this.data.showAdvanced
    })
  },

  // 各个数据库ID输入
  onGoalsDbInput: function (e) {
    this.setData({
      'notionConfig.databases.goals': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  onTodosDbInput: function (e) {
    this.setData({
      'notionConfig.databases.todos': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  onMainRecordsDbInput: function (e) {
    this.setData({
      'notionConfig.databases.mainRecords': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  onActivityDetailsDbInput: function (e) {
    this.setData({
      'notionConfig.databases.activityDetails': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  onDailyStatusDbInput: function (e) {
    this.setData({
      'notionConfig.databases.dailyStatus': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  onHappyThingsDbInput: function (e) {
    this.setData({
      'notionConfig.databases.happyThings': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  onQuotesDbInput: function (e) {
    this.setData({
      'notionConfig.databases.quotes': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  onKnowledgeDbInput: function (e) {
    this.setData({
      'notionConfig.databases.knowledge': e.detail.value.trim()
    }, () => {
      this.checkCanSave()
    })
  },

  // 验证输入格式 - 简化版本
  validateInputs: function () {
    const { notionConfig } = this.data
    
    // 重置错误状态
    this.setData({ 
      apiKeyError: false,
      databaseIdError: false 
    })

    // 只检查是否为空，不检查具体格式
    return notionConfig.apiKey.trim() && notionConfig.databaseId.trim()
  },

  // 同步开关
  onSyncEnabledChange: function (e) {
    this.setData({
      'notionConfig.syncEnabled': e.detail.value
    }, () => {
      this.checkCanSave()
    })
  },

  // Notion集成开关
  onNotionEnabledChange: function (e) {
    this.setData({
      'notionConfig.enabled': e.detail.value
    }, () => {
      this.checkCanSave()
    })
  },

  // 切换API密钥显示
  toggleApiKeyVisibility: function () {
    this.setData({
      showApiKey: !this.data.showApiKey
    })
  },

  // 检查是否可以保存
  checkCanSave: function () {
    const { notionConfig } = this.data
    const canSave = notionConfig.apiKey.trim() && notionConfig.databaseId.trim()
    this.setData({ canSave })
  },


  // 保存配置
  saveConfig: async function () {
    if (this.data.saving) return

    const { userId, notionConfig } = this.data
    
    if (!notionConfig.apiKey.trim() || !notionConfig.databaseId.trim()) {
      wx.showToast({
        title: '请填写完整配置',
        icon: 'error'
      })
      return
    }

    this.setData({ saving: true })

    try {
      // 先测试连接并初始化数据库结构
      console.log('开始测试Notion连接...')
      wx.showLoading({ title: '初始化数据库...' })
      
      const apiService = require('../../utils/apiService.js')
      const testResult = await apiService.testNotionConnection(
        notionConfig.apiKey, 
        notionConfig.databaseId
      )

      console.log('Notion连接测试结果:', testResult)
      wx.hideLoading()

      if (!testResult.success) {
        console.log('连接测试失败，停止保存')
        wx.showToast({
          title: '连接失败: ' + testResult.error,
          icon: 'error',
          duration: 3000
        })
        this.setData({ saving: false })
        return
      }
      
      console.log('连接测试成功，继续保存配置...')

      // 🔧 确保notionConfig包含完整的databases对象
      console.log('📝 保存前的notionConfig:', notionConfig)
      console.log('📝 保存前的databases:', notionConfig.databases)
      console.log('📝 保存前的databases.knowledge:', notionConfig.databases?.knowledge)

      const completeNotionConfig = {
        ...notionConfig,
        databases: {
          goals: notionConfig.databases?.goals || '',
          todos: notionConfig.databases?.todos || '',
          mainRecords: notionConfig.databases?.mainRecords || '',
          activityDetails: notionConfig.databases?.activityDetails || '',
          dailyStatus: notionConfig.databases?.dailyStatus || '',
          happyThings: notionConfig.databases?.happyThings || '',
          quotes: notionConfig.databases?.quotes || '',
          knowledge: notionConfig.databases?.knowledge || ''
        }
      }

      console.log('🔍 完整的notionConfig:', completeNotionConfig)
      console.log('🔍 完整的databases:', completeNotionConfig.databases)
      console.log('🔍 完整的databases.knowledge:', completeNotionConfig.databases.knowledge)

      // 保存配置 - 同时保存到本地和云数据库
      const localSuccess = userManager.configureNotion(userId, completeNotionConfig)

      // 同步到云数据库 - 使用邮箱而不是userId
      console.log('正在更新用户云数据库，userEmail:', this.data.userEmail, 'notionConfig:', completeNotionConfig)
      console.log('调用updateUserByEmail的完整参数:', { userEmail: this.data.userEmail, updates: { notionConfig: completeNotionConfig } })
      const cloudResult = await apiService.updateUserByEmail(this.data.userEmail, { notionConfig: completeNotionConfig })
      console.log('云数据库更新结果:', cloudResult)
      
      // 验证更新：重新查询用户数据
      console.log('验证更新结果，重新查询用户数据...')
      const verifyResult = await apiService.getUserByEmail(this.data.userEmail)
      console.log('重新查询的用户数据:', verifyResult)
      if (verifyResult.success && verifyResult.user) {
        console.log('查询到的notionConfig:', verifyResult.user.notionConfig)
      }
      
      if (localSuccess && cloudResult.success) {
        // 强制刷新本地用户数据，确保当前用户的notionConfig是最新的
        const refreshedUser = userManager.getUsers().find(u => u.id === userId)
        if (refreshedUser) {
          userManager.switchUser(refreshedUser.id) // 重新设置当前用户，触发数据刷新
        }
        
        wx.showToast({
          title: '配置保存成功！数据库已初始化',
          icon: 'success',
          duration: 2000
        })

        // 询问是否返回首页
        setTimeout(() => {
          wx.showModal({
            title: '配置完成',
            content: 'Notion集成已启用，数据库结构已初始化。是否返回首页？',
            confirmText: '返回首页',
            cancelText: '继续配置',
            success: (res) => {
              if (res.confirm) {
                wx.switchTab({
                  url: '/pages/home/home'
                })
              }
            }
          })
        }, 2000)
      } else {
        wx.showToast({
          title: '保存失败',
          icon: 'error'
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '配置失败: ' + error.message,
        icon: 'error',
        duration: 3000
      })
    } finally {
      this.setData({ saving: false })
    }
  },

  // 显示API密钥帮助
  showApiKeyHelp: function () {
    this.setData({
      showHelp: true,
      helpContent: {
        title: '获取Notion API密钥',
        steps: [
          '访问 https://www.notion.so/my-integrations',
          '点击"新建集成"或"New integration"',
          '填写集成名称，选择工作区',
          '点击"提交"创建集成',
          '复制生成的"Internal Integration Secret"',
          '支持两种格式：',
          '新格式：ntn_ + 43位字符（总长47位）',
          '示例：ntn_313793477676LiqamZbn7TBVYB2EQOBaeZo7Jqt0f',
          '旧格式：secret_ + 48位字符（总长51位）',
          '示例：secret_abc123XYZ789_def456UVW012_ghi789RST345'
        ]
      }
    })
  },

  // 显示数据库ID帮助
  showDatabaseIdHelp: function () {
    this.setData({
      showHelp: true,
      helpContent: {
        title: '获取Notion数据库ID',
        steps: [
          '📋 方式一：单数据库（简单模式）',
          '- 只配置一个主数据库ID即可',
          '- 适合简单使用场景',
          '',
          '📋 方式二：八数据库架构（推荐）',
          '- 需要配置Goals、Todos、Main Records、Activity Details、Daily Status、Happy Things、Quotes、Knowledge八个数据库',
          '- 功能更强大，支持目标管理、待办事项、每日状态、开心事管理、每日箴言、知识库等',
          '',
          '🔧 如何获取数据库ID：',
          '1. 打开Notion数据库页面',
          '2. 点击右上角"共享"按钮',
          '3. 添加你创建的集成',
          '4. 复制数据库URL',
          '5. 从URL中提取32位ID',
          '示例：https://notion.so/1a2b3c4d5e6f7890abcdef1234567890',
          '数据库ID就是：1a2b3c4d5e6f7890abcdef1234567890'
        ]
      }
    })
  },

  // 显示同步机制帮助
  showSyncHelp: function () {
    this.setData({
      showHelp: true,
      helpContent: {
        title: '同步机制说明',
        steps: [
          '启用自动同步后，新记录会自动同步到Notion',
          '同步包括文本内容、标签、时间戳等信息',
          '语音记录会转换为文本后同步',
          '可以随时在设置中开启或关闭同步',
          '历史记录可以批量同步到Notion',
          '数据在本地和Notion双向保存'
        ]
      }
    })
  },

  // 隐藏帮助
  hideHelp: function () {
    this.setData({ showHelp: false })
  },

  // 阻止事件冒泡
  stopPropagation: function () {
    // 阻止点击模态框内容时关闭
  },

  // 返回上一页
  onBack: function () {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({
        url: '/pages/home/home'
      })
    }
  }
})