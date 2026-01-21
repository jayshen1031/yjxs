const app = getApp()
const userManager = require('../../utils/userManager.js')
const notionApiService = require('../../utils/notionApiService.js')
const apiService = require('../../utils/apiService.js')

Page({
  data: {
    // 当前步骤 (1-5)
    currentStep: 1,

    // 步骤1：基本信息
    email: '',
    password: '',
    passwordConfirm: '',
    displayName: '',
    showPassword: false,
    showPasswordConfirm: false,
    emailError: '',
    passwordError: '',
    passwordConfirmError: '',

    // 步骤2：Notion账户准备
    hasNotionAccount: null, // null未选择, true有账户, false没有账户

    // 步骤3：Notion配置
    notionApiKey: '',
    notionApiKeyError: '',
    testing: false,
    testResult: '',
    testSuccess: false,

    // 父页面配置
    parentPageId: '',
    parentPageIdError: '',
    creatingParentPage: false,
    parentPageCreated: false,

    // 步骤4：数据库创建
    databases: [
      { name: '目标库 (Goals)', icon: '🎯', desc: '管理人生目标和阶段目标', creating: false, created: false },
      { name: '待办库 (Todos)', icon: '✅', desc: '管理待办事项和任务', creating: false, created: false },
      { name: '主记录表 (Main Records)', icon: '📝', desc: '每日记录汇总', creating: false, created: false },
      { name: '活动明细表 (Activity Details)', icon: '⏱️', desc: '时间投入明细', creating: false, created: false },
      { name: '每日状态库 (Daily Status)', icon: '📊', desc: '每日状态追踪', creating: false, created: false },
      { name: '开心库 (Happy Things)', icon: '😊', desc: '开心事记录', creating: false, created: false },
      { name: '箴言库 (Quotes)', icon: '💬', desc: '激励箴言管理', creating: false, created: false },
      { name: '知识库 (Knowledge)', icon: '📚', desc: '知识管理和学习笔记', creating: false, created: false }
    ],
    creatingDatabases: false,
    databasesCreated: false,
    creationProgress: 0,
    creationStatus: '',

    // 注册状态
    registering: false,

    // 创建的数据库ID
    createdDatabaseIds: {}
  },

  onLoad(options) {
    console.log('注册页面加载')
  },

  /**
   * 计算是否可以进入下一步
   */
  computed_canProceed() {
    const { currentStep, email, password, passwordConfirm, hasNotionAccount, notionApiKey, testSuccess, databasesCreated } = this.data

    switch (currentStep) {
      case 1:
        // 步骤1：基本信息
        return this.isValidEmail(email) &&
               password.length >= 6 &&
               password === passwordConfirm
      case 2:
        // 步骤2：Notion账户准备
        return hasNotionAccount !== null
      case 3:
        // 步骤3：API配置和父页面
        return testSuccess && this.data.parentPageId.length > 0
      case 4:
        // 步骤4：数据库创建
        return databasesCreated
      default:
        return false
    }
  },

  /**
   * 验证邮箱格式
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * 步骤1：输入事件
   */
  onEmailInput(e) {
    const email = e.detail.value
    this.setData({ email })

    if (email && !this.isValidEmail(email)) {
      this.setData({ emailError: '请输入有效的邮箱地址' })
    } else {
      this.setData({ emailError: '' })
    }

    this.updateCanProceed()
  },

  onPasswordInput(e) {
    const password = e.detail.value
    this.setData({ password })

    if (password && password.length < 6) {
      this.setData({ passwordError: '密码至少需要6位字符' })
    } else {
      this.setData({ passwordError: '' })
    }

    // 如果确认密码已输入，检查是否匹配
    if (this.data.passwordConfirm) {
      if (password !== this.data.passwordConfirm) {
        this.setData({ passwordConfirmError: '两次输入的密码不一致' })
      } else {
        this.setData({ passwordConfirmError: '' })
      }
    }

    this.updateCanProceed()
  },

  onPasswordConfirmInput(e) {
    const passwordConfirm = e.detail.value
    this.setData({ passwordConfirm })

    if (passwordConfirm && passwordConfirm !== this.data.password) {
      this.setData({ passwordConfirmError: '两次输入的密码不一致' })
    } else {
      this.setData({ passwordConfirmError: '' })
    }

    this.updateCanProceed()
  },

  onDisplayNameInput(e) {
    this.setData({ displayName: e.detail.value })
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  togglePasswordConfirm() {
    this.setData({ showPasswordConfirm: !this.data.showPasswordConfirm })
  },

  /**
   * 步骤2：Notion账户准备
   */
  selectHasAccount(e) {
    const hasAccount = e.currentTarget.dataset.value === 'true'
    this.setData({ hasNotionAccount: hasAccount })
    this.updateCanProceed()
  },

  copyNotionSignupUrl() {
    wx.setClipboardData({
      data: 'https://www.notion.so/signup',
      success: () => {
        wx.showToast({
          title: 'Notion注册链接已复制',
          icon: 'success',
          duration: 2000
        })
      }
    })
  },

  /**
   * 步骤3：Notion配置
   */
  onNotionApiKeyInput(e) {
    const notionApiKey = e.detail.value.trim()
    this.setData({
      notionApiKey,
      testSuccess: false,
      testResult: '',
      notionApiKeyError: ''
    })
    this.updateCanProceed()
  },

  copyNotionUrl() {
    wx.setClipboardData({
      data: 'https://www.notion.so/my-integrations',
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  },

  async testNotionConnection() {
    const { notionApiKey } = this.data

    if (!notionApiKey) {
      wx.showToast({
        title: '请先输入API Key',
        icon: 'none'
      })
      return
    }

    this.setData({ testing: true, testResult: '', testSuccess: false })

    try {
      // 测试API Key是否有效（尝试获取用户信息）
      const result = await notionApiService.testConnection(notionApiKey)

      if (result.success) {
        this.setData({
          testing: false,
          testResult: '✓ 连接成功！API Key有效',
          testSuccess: true
        })
        this.updateCanProceed()
      } else {
        this.setData({
          testing: false,
          testResult: `✗ 连接失败：${result.error}`,
          testSuccess: false
        })
      }
    } catch (error) {
      console.error('测试Notion连接失败:', error)
      this.setData({
        testing: false,
        testResult: '✗ 连接失败，请检查API Key是否正确',
        testSuccess: false
      })
    }
  },

  /**
   * 父页面ID输入
   */
  onParentPageIdInput(e) {
    const parentPageId = e.detail.value.trim()
    this.setData({
      parentPageId,
      parentPageIdError: ''
    })
    this.updateCanProceed()
  },

  /**
   * 复制父页面创建指引
   */
  copyCreatePageGuide() {
    wx.showModal({
      title: '📄 创建父页面指引',
      content: '1. 在Notion中点击左侧"+ 新页面"\n2. 输入标题"语寄心声 - 数据中心"\n3. 点击右上角"共享"\n4. 添加您创建的集成\n5. 复制页面URL\n6. 粘贴到下方输入框',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  /**
   * 步骤4：创建Notion数据库
   */
  async createNotionDatabases() {
    const { notionApiKey, parentPageId } = this.data

    // 从URL中提取page ID
    let extractedPageId = parentPageId
    if (parentPageId.includes('notion.so/')) {
      // 从URL中提取ID (格式: https://www.notion.so/xxx-32位ID 或 https://www.notion.so/32位ID)
      const match = parentPageId.match(/([a-f0-9]{32})/i)
      if (match) {
        extractedPageId = match[1]
      }
    }

    this.setData({
      creatingDatabases: true,
      creationProgress: 0,
      creationStatus: '准备创建数据库...'
    })

    try {
      // 使用工具类创建数据库
      const { createQuadDatabases } = require('../../utils/notionQuadDatabaseCreator.js')

      // 创建数据库，使用用户提供的父页面ID
      const result = await createQuadDatabases(notionApiKey, extractedPageId)

      if (!result.success) {
        throw new Error(result.error || '创建数据库失败')
      }

      // 更新UI显示所有数据库已创建
      const databases = this.data.databases.map(db => ({
        ...db,
        creating: false,
        created: true
      }))

      this.setData({
        databases: databases,
        creatingDatabases: false,
        databasesCreated: true,
        creationProgress: 100,
        creationStatus: '所有数据库创建完成！',
        createdDatabaseIds: result.databases
      })

      this.updateCanProceed()

      wx.showToast({
        title: '数据库创建成功',
        icon: 'success'
      })

    } catch (error) {
      console.error('创建数据库失败:', error)
      this.setData({
        creatingDatabases: false,
        creationStatus: `创建失败：${error.message}`
      })

      wx.showModal({
        title: '创建失败',
        content: error.message || '创建数据库时发生错误，请重试',
        showCancel: false
      })
    }
  },

  /**
   * 步骤导航
   */
  async nextStep() {
    const { currentStep } = this.data

    if (currentStep === 1) {
      // 验证基本信息
      if (!this.computed_canProceed()) {
        wx.showToast({
          title: '请完善注册信息',
          icon: 'none'
        })
        return
      }
      this.setData({ currentStep: 2 })
    } else if (currentStep === 2) {
      // 验证Notion账户状态
      if (this.data.hasNotionAccount === null) {
        wx.showToast({
          title: '请选择您的Notion账户状态',
          icon: 'none'
        })
        return
      }
      this.setData({ currentStep: 3 })
    } else if (currentStep === 3) {
      // 验证Notion连接
      if (!this.data.testSuccess) {
        wx.showToast({
          title: '请先测试Notion连接',
          icon: 'none'
        })
        return
      }
      this.setData({ currentStep: 4 })
    } else if (currentStep === 4) {
      // 验证数据库创建
      if (!this.data.databasesCreated) {
        wx.showToast({
          title: '请先创建Notion数据库',
          icon: 'none'
        })
        return
      }
      // 完成注册并跳转到步骤5
      await this.finishRegistration()
    }
  },

  prevStep() {
    const { currentStep } = this.data
    if (currentStep > 1) {
      this.setData({ currentStep: currentStep - 1 })
      this.updateCanProceed()
    }
  },

  /**
   * 完成注册
   */
  async finishRegistration() {
    const { email, password, displayName, notionApiKey, createdDatabaseIds } = this.data

    this.setData({ registering: true })

    try {
      // ⚡ 确保云开发环境已初始化
      const app = getApp()
      if (!app.globalData.cloudReady) {
        console.warn('云开发环境未就绪，正在等待初始化...')
        wx.showToast({
          title: '正在初始化...',
          icon: 'loading',
          duration: 2000
        })

        // 等待云开发环境就绪（最多等待3秒）
        let waitCount = 0
        while (!app.globalData.cloudReady && waitCount < 30) {
          await new Promise(resolve => setTimeout(resolve, 100))
          waitCount++
        }

        if (!app.globalData.cloudReady) {
          wx.hideToast()
          wx.showToast({
            title: '云服务初始化失败，请重试',
            icon: 'none',
            duration: 3000
          })
          this.setData({ registering: false })
          return
        }

        wx.hideToast()
        console.log('✅ 云开发环境已就绪')
      }

      // 🔐 0. 获取微信openid（用于用户身份隔离）
      let wxOpenId = ''
      try {
        const loginRes = await wx.cloud.callFunction({ name: 'login' })
        wxOpenId = loginRes.result.openid
        console.log('✅ 获取微信openid成功:', wxOpenId)
      } catch (err) {
        console.error('❌ 获取openid失败:', err)
        wx.showToast({
          title: '获取微信身份失败，请重试',
          icon: 'none',
          duration: 2000
        })
        this.setData({ registering: false })
        return
      }

      // 1. 创建本地用户
      const userName = displayName || email.split('@')[0]
      const userInfo = {
        email: email,
        name: userName,
        displayName: displayName || userName,
        password: password,  // 添加密码用于验证
        openid: wxOpenId     // 🔐 保存openid用于身份验证
      }
      console.log('准备创建用户，参数:', userInfo)
      const newUser = userManager.createUser(userInfo)
      console.log('用户创建成功:', newUser.id, 'openid:', wxOpenId)

      // 2. 配置Notion
//       console.log('🔍 注册流程 - notionApiKey值:', notionApiKey)
//       console.log('🔍 注册流程 - createdDatabaseIds:', createdDatabaseIds)

      const notionConfig = {
        apiKey: notionApiKey,
        databases: createdDatabaseIds,
        enabled: true  // ⭐ 添加enabled标记，表示已配置
      }
      userManager.configureNotion(newUser.id, notionConfig)
      console.log('Notion配置完成:', notionConfig)

      // 3. 同步到云端（使用createUserWithPassword）
      try {
        const syncData = {
          email: email,
          password: password,
          name: userName,
          displayName: displayName || userName,
          notionConfig: notionConfig
        }
        console.log('准备同步到云端:', syncData)
        const syncResult = await apiService.createUserWithPassword(syncData)
        console.log('云端同步成功:', syncResult)

        if (!syncResult.success) {
          throw new Error(syncResult.error || '云端同步失败')
        }
      } catch (error) {
        console.error('同步到云端失败，仅保存到本地:', error)
        // 提示用户但不中断流程
        wx.showToast({
          title: '云端同步失败，仅本地保存',
          icon: 'none',
          duration: 2000
        })
      }

      // 4. 设置为当前用户
      userManager.switchUser(newUser.id)
      console.log('设置当前用户成功')

      this.setData({
        registering: false,
        currentStep: 5
      })

    } catch (error) {
      console.error('注册失败:', error)
      this.setData({ registering: false })

      wx.showModal({
        title: '注册失败',
        content: error.message || '注册过程中发生错误，请重试',
        showCancel: false
      })
    }
  },

  /**
   * 步骤4：完成引导
   */
  goToMemo() {
    wx.redirectTo({
      url: '/pages/memo/memo'
    })
  },

  goToGoals() {
    wx.redirectTo({
      url: '/pages/goals-todos/goals-todos'
    })
  },

  goToQuotes() {
    wx.redirectTo({
      url: '/pages/quote-manager/quote-manager'
    })
  },

  completeRegistration() {
    wx.switchTab({
      url: '/pages/home/home'
    })
  },

  /**
   * 返回登录
   */
  backToLogin() {
    wx.navigateBack()
  },

  /**
   * 更新是否可以继续
   */
  updateCanProceed() {
    this.setData({
      canProceed: this.computed_canProceed()
    })
  }
})
