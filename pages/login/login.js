// pages/login/login.js
console.log('==========================================')
console.log('[Login] 文件开始执行')
console.log('[Login] 当前时间:', new Date().toISOString())
console.log('==========================================')

const userManager = require('../../utils/userManager.js')
const { formatTime } = require('../../utils/util.js')

console.log('[Login] 依赖加载完成')
console.log('[Login] userManager type:', typeof userManager)
console.log('[Login] formatTime type:', typeof formatTime)

Page({
  data: {
    users: [],
    newUserName: '',
    newUserEmail: '',
    newUserPassword: '',
    newUserPasswordConfirm: '',
    emailError: '',
    passwordError: '',
    isEmailValid: false,
    isPasswordValid: false,
    creating: false,
    loading: false,
    hasUsers: false,
    showCreateUser: false,  // 控制创建新用户区域的显示
    showExistingLogin: false,  // 控制已有账号登录区域的显示，根据用户数量动态设置
    loginEmail: '',
    loginPassword: '',
    loginEmailError: '',
    loginPasswordError: '',
    isLoginEmailValid: false,
    isLoginPasswordValid: false,
    logging: false,
    showPassword: false,        // 控制密码显示/隐藏
    showConfirmPassword: false, // 控制确认密码显示/隐藏
    rememberPassword: false     // 记住密码选项
  },

  onLoad: function (options) {
    console.log('=================================================')
    console.log('[Login Page] onLoad started')
    console.log('[Login Page] userManager available:', !!userManager)
    console.log('[Login Page] formatTime available:', !!formatTime)
    console.log('=================================================')

    // 强制初始化输入字段，避免undefined
    this.setData({
      loginEmail: '',
      newUserEmail: '',
      newUserName: '',
      emailError: '',
      loginEmailError: ''
    })

    console.log('[Login Page] Initial data set')

    // 恢复记住的密码
    this.loadRememberedPassword()

    // 延迟加载用户列表，等待云开发初始化
    setTimeout(() => {
      console.log('[Login Page] Loading users after delay')
      this.loadUsers()
    }, 500)
  },

  // 加载记住的密码
  loadRememberedPassword: function() {
    const rememberedEmail = wx.getStorageSync('rememberedEmail')
    const rememberedPassword = wx.getStorageSync('rememberedPassword')
    
    if (rememberedEmail && rememberedPassword) {
      this.setData({
        loginEmail: rememberedEmail,
        loginPassword: rememberedPassword,
        rememberPassword: true
      })
    }
  },

  onShow: function () {
    // 每次显示页面时也重新初始化，确保不会有undefined
    this.setData({
      loginEmailError: this.data.loginEmailError || '',
      emailError: this.data.emailError || ''
    })
    // 强制重新加载用户列表，确保Notion配置状态是最新的
    console.log('登录页面显示，重新加载用户列表')
    this.loadUsers()
  },

  // 加载用户列表 - 从云端获取最近登录的用户
  async loadUsers() {
    console.log('[Login Page] loadUsers started')
    try {
      const apiService = require('../../utils/apiService.js')
      console.log('[Login Page] apiService loaded successfully')

      // 从云端获取最近登录的用户列表
      console.log('[Login Page] Calling getRecentUsers...')
      const result = await apiService.getRecentUsers()
      console.log('[Login Page] getRecentUsers result:', result)

      let users = []
      if (result.success && result.users) {
        console.log('云端返回的用户列表:', result.users)
        users = result.users.map(user => {
          // ✅ 更新判断逻辑：支持新旧两种配置方式
          const hasApiKey = user.notionConfig && user.notionConfig.apiKey
          const hasEnabled = user.notionConfig && user.notionConfig.enabled

          // 检查是否有数据库配置（支持新旧两种方式）
          const hasNewDatabases = user.notionConfig && user.notionConfig.databases && (
            user.notionConfig.databases.goals ||
            user.notionConfig.databases.mainRecords ||
            user.notionConfig.databases.todos
          )
          const hasOldDatabase = user.notionConfig && user.notionConfig.databaseId

          const notionConfigured = hasApiKey && hasEnabled && (hasNewDatabases || hasOldDatabase)

          console.log(`用户 ${user.email} 的notionConfig:`, user.notionConfig, 'configured:', notionConfigured)
          return {
            ...user,
            lastLoginText: this.formatLastLogin(user.lastLoginAt),
            notionConfigured: notionConfigured
          }
        })
      }

      console.log('[Login Page] Setting user data, count:', users.length)
      this.setData({
        users: users,
        hasUsers: users.length > 0,
        showCreateUser: users.length === 0,
        showExistingLogin: users.length === 0  // 有用户时默认折叠，无用户时默认展开
      })
      console.log('[Login Page] User data set successfully')
    } catch (error) {
      console.error('[Login Page] 加载用户列表失败:', error)
      console.error('[Login Page] Error stack:', error.stack)

      // 显示错误提示
      wx.showToast({
        title: '加载用户列表失败',
        icon: 'none',
        duration: 2000
      })

      // 降级到默认状态
      this.setData({
        users: [],
        hasUsers: false,
        showCreateUser: true,
        showExistingLogin: true  // 无用户时展开已有账号登录区域
      })
      console.log('[Login Page] Fallback to default state')
    }
  },

  // 切换创建新用户区域的显示
  toggleCreateUser: function () {
    this.setData({
      showCreateUser: !this.data.showCreateUser
    })
  },

  // 切换已有账号登录区域的显示
  toggleExistingLogin: function () {
    this.setData({
      showExistingLogin: !this.data.showExistingLogin
    })
  },

  // 格式化最后登录时间
  formatLastLogin: function (timestamp) {
    if (!timestamp) return '从未登录'
    
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    
    return formatTime(new Date(timestamp), 'MM-dd')
  },

  // 选择用户 - 从云端同步最新数据
  async selectUser(e) {
    const userId = e.currentTarget.dataset.userId
    this.setData({ loading: true })

    try {
      // 根据userId找到对应的用户邮箱
      const selectedUser = this.data.users.find(u => u.id === userId)
      if (!selectedUser) {
        throw new Error('未找到用户信息')
      }

      console.log('快速选择用户，准备同步云端数据...')
      
      // 从云端获取最新的用户数据
      const apiService = require('../../utils/apiService.js')
      const result = await apiService.getUserByEmail(selectedUser.email)
      
      if (result.success && result.user) {
        const cloudUser = result.user
        console.log('快速登录-从云端获取的用户数据:', cloudUser)
        console.log('快速登录-用户的notionConfig:', cloudUser.notionConfig)
        
        // 创建或更新本地用户缓存
        let localUser = userManager.getUserByEmail(selectedUser.email)
        if (!localUser) {
          localUser = userManager.createUser({
            id: cloudUser.id,
            email: cloudUser.email,
            name: cloudUser.name,
            displayName: cloudUser.displayName
          })
        }
        
        // 同步云端的Notion配置到本地
        console.log('快速登录-开始同步notionConfig到本地...')
        const notionConfigToSync = cloudUser.notionConfig || {
          enabled: false,
          apiKey: '',
          databaseId: '',
          syncEnabled: true
        }
        console.log('快速登录-要同步的notionConfig:', notionConfigToSync)
        userManager.configureNotion(localUser.id, notionConfigToSync)
        console.log('快速登录-notionConfig同步完成')
        
        // 更新云端的最后登录时间
        await apiService.updateUserLogin(cloudUser.id)
        
        // 切换到该用户
        const success = userManager.switchUser(localUser.id)
        
        if (success) {
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          })

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/home/home'
            })
          }, 1500)
        } else {
          throw new Error('用户切换失败')
        }
      } else {
        // 安全处理错误信息
        const errorMsg = result.error || '获取用户数据失败'
        throw new Error(typeof errorMsg === 'string' ? errorMsg : '获取用户数据失败')
      }
    } catch (error) {
      console.error('快速登录失败:', error)
      
      // 确保错误信息是字符串
      let errorMessage = '登录失败'
      if (error && error.message) {
        errorMessage = typeof error.message === 'string' ? error.message : '登录失败'
        if (errorMessage.length > 30) {
          errorMessage = errorMessage.substring(0, 30) + '...'
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      })
    }

    this.setData({ loading: false })
  },

  // 邮箱验证
  validateEmail: function (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // 检查邮箱是否已存在
  checkEmailExists: function (email) {
    if (!email || !this.data.users) {
      return false
    }
    return this.data.users.some(user => 
      user.email && user.email.toLowerCase() === email.toLowerCase()
    )
  },

  // 用户名输入
  onUserNameInput: function (e) {
    // 安全检查事件对象
    if (!e || !e.detail) {
      console.warn('onUserNameInput: 事件对象无效')
      return
    }
    
    // 检查是否是"undefine"字符串，如果是则使用空字符串
    let rawValue = e.detail.value
    if (rawValue === 'undefine' || rawValue === 'undefined') {
      rawValue = ''
    }
    
    const value = rawValue || ''
    this.setData({
      newUserName: value
    })
  },

  // 新用户密码输入
  onUserPasswordInput: function (e) {
    const password = e.detail.value || ''
    let passwordError = ''
    let isPasswordValid = false

    if (password.length === 0) {
      passwordError = ''
    } else if (password.length < 6) {
      passwordError = '密码至少需要6位字符'
    } else {
      isPasswordValid = true
    }

    this.setData({
      newUserPassword: password,
      passwordError: passwordError,
      isPasswordValid: isPasswordValid
    })

    // 检查确认密码
    if (this.data.newUserPasswordConfirm) {
      this.validatePasswordConfirm()
    }
  },

  // 确认密码输入
  onUserPasswordConfirmInput: function (e) {
    const confirmPassword = e.detail.value || ''
    this.setData({
      newUserPasswordConfirm: confirmPassword
    })
    this.validatePasswordConfirm()
  },

  // 验证确认密码
  validatePasswordConfirm: function () {
    const { newUserPassword, newUserPasswordConfirm } = this.data
    if (newUserPasswordConfirm && newUserPassword !== newUserPasswordConfirm) {
      this.setData({
        passwordError: '两次输入的密码不一致',
        isPasswordValid: false
      })
    } else if (newUserPasswordConfirm && newUserPassword === newUserPasswordConfirm && newUserPassword.length >= 6) {
      this.setData({
        passwordError: '',
        isPasswordValid: true
      })
    }
  },

  // 切换密码显示
  togglePasswordVisibility: function () {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  // 切换确认密码显示
  toggleConfirmPasswordVisibility: function () {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    })
  },

  // 邮箱输入
  onUserEmailInput: function (e) {
    // 安全检查事件对象
    if (!e || !e.detail) {
      console.warn('onUserEmailInput: 事件对象无效')
      return
    }
    
    // 检查是否是"undefine"字符串，如果是则使用空字符串
    let rawValue = e.detail.value
    if (rawValue === 'undefine' || rawValue === 'undefined') {
      rawValue = ''
    }
    
    const value = rawValue || ''
    const email = value.trim()
    let emailError = ''
    let isEmailValid = false

    // 根据输入长度进行不同的验证策略
    if (email.length === 0) {
      // 输入为空时，清除所有错误信息
      emailError = ''
      isEmailValid = false
    } else if (email.length >= 3 && email.includes('@')) {
      // 有@符号且长度足够时才验证格式
      if (this.validateEmail(email)) {
        if (this.checkEmailExists(email)) {
          emailError = '该邮箱已被注册'
        } else {
          isEmailValid = true
        }
      } else {
        emailError = '请输入有效的邮箱地址'
      }
    } else if (email.length >= 10) {
      // 输入较长但没有@符号
      emailError = '请输入有效的邮箱地址'
    } else {
      // 其他情况（短输入）不显示错误，让用户继续输入
      emailError = ''
      isEmailValid = false
    }

    this.setData({
      newUserEmail: email,
      emailError: emailError || '',  // 确保永远不是undefined
      isEmailValid: isEmailValid
    })
  },

  // 登录邮箱输入 - 简化版本，只记录输入值
  onLoginEmailInput(e) {
    // 安全检查事件对象
    if (!e || !e.detail) {
      console.warn('onLoginEmailInput: 事件对象无效')
      return
    }
    
    const email = e.detail.value || ''
    
    this.setData({
      loginEmail: email,
      loginEmailError: '',  // 清空错误信息
      isLoginEmailValid: false  // 输入时不做验证
    })
  },

  // 登录密码输入
  onLoginPasswordInput: function (e) {
    const password = e.detail.value || ''
    
    this.setData({
      loginPassword: password,
      loginPasswordError: '',  // 清空错误信息
      isLoginPasswordValid: false  // 输入时不做验证
    })
  },

  // 记住密码选项
  onRememberPasswordChange: function (e) {
    // checkbox-group返回的是数组，如果选中则包含'remember'
    const checked = e.detail.value.includes('remember')
    this.setData({
      rememberPassword: checked
    })
  },

  // 创建新用户 - 同时在云端 memo_users 集合中创建
  async createUser() {
    const { newUserName, newUserEmail, newUserPassword, isEmailValid, isPasswordValid } = this.data
    
    if (!isEmailValid) {
      wx.showToast({
        title: '请输入有效的邮箱地址',
        icon: 'error'
      })
      return
    }

    if (!isPasswordValid) {
      wx.showToast({
        title: '请设置有效的密码',
        icon: 'error'
      })
      return
    }

    this.setData({ creating: true })

    try {
      const apiService = require('../../utils/apiService.js')
      
      // 生成显示名称：优先使用输入的名称，否则使用邮箱前缀
      const emailPrefix = (newUserEmail && newUserEmail.includes('@')) ? newUserEmail.split('@')[0] : 'user'
      const displayName = newUserName.trim() || emailPrefix
      
      // 在云端创建用户（带密码）
      const result = await apiService.createUserWithPassword({
        email: newUserEmail.trim(),
        password: newUserPassword,
        name: displayName,
        displayName: displayName
      })

      if (result.success && result.user) {
        const cloudUser = result.user
        
        // 在本地创建用户缓存
        const localUser = userManager.createUser({
          id: cloudUser.id, // 使用云端分配的ID
          email: cloudUser.email,
          name: cloudUser.name,
          displayName: cloudUser.displayName
        })

        // 自动切换到新用户
        userManager.switchUser(localUser.id)

        wx.showToast({
          title: '账户创建成功',
          icon: 'success',
          duration: 2000
        })

        // 询问是否自动创建Notion数据库
        wx.showModal({
          title: '初始化Notion',
          content: `欢迎 ${displayName}！是否现在自动创建8个Notion数据库？只需提供API Key和父页面ID即可自动完成配置。`,
          confirmText: '立即创建',
          cancelText: '稍后配置',
          success: (res) => {
            if (res.confirm) {
              // 跳转到设置页面的自动创建区域
              wx.switchTab({
                url: '/pages/settings/settings'
              })
            } else {
              // 直接进入首页
              wx.switchTab({
                url: '/pages/home/home'
              })
            }
          }
        })
      } else {
        // 安全处理错误信息，确保不会有undefined.split()的问题
        const errorMsg = result.error || '用户创建失败'
        throw new Error(typeof errorMsg === 'string' ? errorMsg : '用户创建失败')
      }

    } catch (error) {
      // 确保错误信息是字符串
      let errorMessage = '创建失败'
      if (error && error.message) {
        errorMessage = typeof error.message === 'string' ? error.message : '创建失败'
        if (errorMessage.length > 50) {
          errorMessage = errorMessage.substring(0, 50) + '...'
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      })
      console.error('创建用户失败:', error)
    }

    this.setData({ 
      creating: false,
      newUserName: '',
      newUserEmail: '',
      emailError: '',
      isEmailValid: false,
      showCreateUser: false  // 创建完成后收起创建区域
    })
  },


  // 密码登录 - 通过云端 memo_users 集合验证
  async loginWithPassword() {
    const { loginEmail, loginPassword, rememberPassword } = this.data
    
    // 在登录时才做验证
    if (!loginEmail || !loginEmail.trim()) {
      this.setData({ loginEmailError: '请输入邮箱地址' })
      return
    }
    
    if (!this.validateEmail(loginEmail.trim())) {
      this.setData({ loginEmailError: '请输入有效的邮箱地址' })
      return
    }

    if (!loginPassword || !loginPassword.trim()) {
      this.setData({ loginPasswordError: '请输入密码' })
      return
    }

    this.setData({ logging: true })

    try {
      console.log('开始密码登录流程:', { loginEmail: loginEmail.trim(), passwordLength: loginPassword.length })
      const apiService = require('../../utils/apiService.js')
      
      // 密码登录验证
      const result = await apiService.loginWithPassword(loginEmail.trim(), loginPassword)
      console.log('云函数返回结果:', result)
      
      if (result.success && result.user) {
        const cloudUser = result.user
        console.log('从云端获取的用户数据:', cloudUser)
        console.log('用户的notionConfig:', cloudUser.notionConfig)
        
        // 创建或更新本地用户缓存
        let localUser = null
        try {
          console.log('尝试获取本地用户:', loginEmail)
          localUser = userManager.getUserByEmail(loginEmail)
          console.log('获取本地用户结果:', localUser)
        } catch (getUserError) {
          console.error('获取本地用户失败:', getUserError)
        }
        
        if (!localUser) {
          try {
            // 确保所有必需的用户信息都存在
            const safeUserData = {
              id: cloudUser.id || 'temp_' + Date.now(),
              email: cloudUser.email || loginEmail.trim(),
              name: cloudUser.name || 'User',
              displayName: cloudUser.displayName || cloudUser.name || 'User'
            }
            console.log('创建本地用户，安全数据:', safeUserData)
            localUser = userManager.createUser(safeUserData)
            console.log('创建本地用户成功:', localUser)
          } catch (createUserError) {
            console.error('创建本地用户失败:', createUserError)
            throw new Error('创建本地用户失败: ' + createUserError.message)
          }
        }
        
        // 同步云端的Notion配置到本地
        try {
          console.log('开始同步notionConfig到本地...')
          const notionConfigToSync = cloudUser.notionConfig || {
            enabled: false,
            apiKey: '',
            databaseId: '',
            syncEnabled: true
          }
          console.log('要同步的notionConfig:', notionConfigToSync)
          userManager.configureNotion(localUser.id, notionConfigToSync)
          console.log('notionConfig同步完成')
        } catch (configError) {
          console.error('Notion配置同步失败:', configError)
          // 不抛出错误，继续登录流程
        }

        // 🔐 获取并保存微信openid（用于用户身份隔离）
        try {
          const loginRes = await wx.cloud.callFunction({ name: 'login' })
          const wxOpenId = loginRes.result.openid
          console.log('✅ 获取微信openid成功:', wxOpenId)
          userManager.updateUserOpenId(localUser.id, wxOpenId)
        } catch (openidErr) {
          console.warn('⚠️ 获取openid失败，继续登录流程:', openidErr)
          // 不阻塞登录流程
        }

        // 更新云端的最后登录时间
        await apiService.updateUserLogin(cloudUser.id)

        // 切换到该用户
        userManager.switchUser(localUser.id)

        // 处理记住密码
        if (rememberPassword) {
          wx.setStorageSync('rememberedEmail', loginEmail.trim())
          wx.setStorageSync('rememberedPassword', loginPassword) // 简单存储，实际应加密
        } else {
          wx.removeStorageSync('rememberedEmail')
          wx.removeStorageSync('rememberedPassword')
        }
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        })

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home'
          })
        }, 1500)
        
      } else {
        // 安全处理错误信息，确保不会有undefined.split()的问题
        const errorMsg = result.error || '该邮箱尚未注册'
        throw new Error(typeof errorMsg === 'string' ? errorMsg : '登录失败')
      }

    } catch (error) {
      wx.showToast({
        title: '登录失败',
        icon: 'error'
      })
      console.error('邮箱登录失败:', error)
      
      // 确保错误信息是字符串，而不是undefined
      let errorMessage = '登录失败，请检查邮箱地址或网络连接'
      
      if (error && error.message) {
        // 确保错误消息是字符串类型
        errorMessage = typeof error.message === 'string' ? error.message : errorMessage
        
        // 如果错误消息过长，截取前100个字符
        if (errorMessage.length > 100) {
          errorMessage = errorMessage.substring(0, 100) + '...'
        }
      }
      
      this.setData({
        loginEmailError: errorMessage
      })
    }

    this.setData({ 
      logging: false,
      loginEmail: '',
      isLoginEmailValid: false
    })
  },

  // 跳转到Notion配置页面
  navigateToNotionConfig: function (userId) {
    console.log('跳转到Notion配置页面，userId:', userId)
    wx.navigateTo({
      url: `/pages/notion-config/notion-config?userId=${userId}`,
      success: () => {
        console.log('跳转成功')
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        wx.showToast({
          title: '页面跳转失败',
          icon: 'error'
        })
      }
    })
  },

  // 长按用户项显示菜单
  onUserLongPress: function (e) {
    const userId = e.currentTarget.dataset.userId
    const user = this.data.users.find(u => u.id === userId)
    
    wx.showActionSheet({
      itemList: ['编辑用户', '配置Notion', '删除用户'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 编辑用户
            this.editUser(user)
            break
          case 1: // 配置Notion
            this.navigateToNotionConfig(userId)
            break
          case 2: // 删除用户
            this.deleteUser(user)
            break
        }
      }
    })
  },

  // 编辑用户
  editUser: function (user) {
    wx.showModal({
      title: '编辑用户',
      content: '此功能正在开发中',
      showCancel: false
    })
  },

  // 删除用户
  deleteUser: function (user) {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除用户"${user.name}"吗？此操作将删除所有相关数据且无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          const success = userManager.deleteUser(user.id)
          
          if (success) {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadUsers()
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  /**
   * 跳转到完整注册页面
   */
  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  }
})