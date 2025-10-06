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
      syncEnabled: true
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
    helpContent: {}
  },

  onLoad: function (options) {
    const userId = options.userId
    if (userId) {
      this.setData({ userId })
      this.loadUserConfig(userId)
    } else {
      // 如果没有传入userId，使用当前用户
      const currentUser = userManager.getCurrentUser()
      if (currentUser) {
        this.setData({ userId: currentUser.id })
        this.loadUserConfig(currentUser.id)
      } else {
        // 没有当前用户，返回登录页
        wx.redirectTo({
          url: '/pages/login/login'
        })
      }
    }
  },

  // 加载用户配置
  loadUserConfig: function (userId) {
    const user = userManager.getUsers().find(u => u.id === userId)
    if (user) {
      this.setData({
        userEmail: user.email,
        notionConfig: user.notionConfig ? { ...user.notionConfig } : {
          apiKey: '',
          databaseId: '',
          enabled: false,
          syncEnabled: true
        }
      }, () => {
        this.updateConfigStatus()
        this.checkCanSave()
      })
    }
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

      // 保存配置 - 同时保存到本地和云数据库
      const localSuccess = userManager.configureNotion(userId, notionConfig)
      
      // 同步到云数据库 - 使用邮箱而不是userId
      console.log('正在更新用户云数据库，userEmail:', this.data.userEmail, 'notionConfig:', notionConfig)
      console.log('调用updateUserByEmail的完整参数:', { userEmail: this.data.userEmail, updates: { notionConfig } })
      const cloudResult = await apiService.updateUserByEmail(this.data.userEmail, { notionConfig })
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
          '打开你要同步的Notion数据库页面',
          '点击右上角的"共享"按钮',
          '在"邀请"区域添加你刚创建的集成',
          '复制数据库页面的URL',
          '从URL中提取32位十六进制ID',
          '格式：32位十六进制字符（0-9，a-f）',
          '示例：1a2b3c4d5e6f7890abcdef1234567890',
          '或带连字符：1a2b3c4d-5e6f-7890-abcd-ef1234567890'
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