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
      databaseId: ''
    },
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
    syncing: false
  },

  onLoad: function() {
    this.loadUserData()
    this.loadSyncStatus()
  },

  onShow: function() {
    this.loadUserData()
    this.loadSyncStatus()
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

    const notionConfig = currentUser && currentUser.notionConfig ? currentUser.notionConfig : {
      enabled: false,
      apiKey: '',
      databaseId: ''
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

  // 配置Notion
  configureNotion: function() {
    wx.navigateTo({
      url: `/pages/notion-config/notion-config?userId=${this.data.currentUser.id}`
    })
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

  // 切换API Key显示
  toggleApiKeyVisibility: function() {
    this.setData({
      showApiKey: !this.data.showApiKey
    })
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
      // 直接测试Notion API连接（跳过云开发环境测试）
      const cloudTest = require('../../utils/cloudTest.js')
      const notionTest = await cloudTest.testNotionDirectly(apiKey, databaseId)
      
      if (notionTest.success) {
        // 保存配置到本地
        userManager.configureNotion(this.data.currentUser.id, this.data.notionConfig)
        this.loadSyncStatus()
        
        let message = 'Notion连接测试成功'
        if (notionTest.user) {
          message += `\n用户: ${notionTest.user.name}`
        }
        if (notionTest.database) {
          message += `\n数据库: ${notionTest.database.title[0]?.plain_text || 'Database'}`
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

  // 同步到Notion
  syncToNotion: async function() {
    if (!this.data.notionConfigured) {
      toast.error('请先配置Notion集成')
      return
    }

    this.setData({ syncing: true })
    
    try {
      const apiService = require('../../utils/apiService.js')
      
      // 同步本地所有备忘录到Notion
      const memos = userManager.getUserMemos()
      const unsyncedMemos = memos.filter(memo => memo.syncStatus !== 'synced')
      
      if (unsyncedMemos.length === 0) {
        toast.success('所有数据已同步')
        this.setData({ syncing: false })
        return
      }

      let successCount = 0
      for (const memo of unsyncedMemos) {
        const result = await apiService.syncUserMemoToNotion(this.data.currentUser.id, memo)
        if (result.success) {
          successCount++
        }
      }
      
      this.loadUserData()
      toast.success(`同步完成，成功同步${successCount}条记录`)
      
      // 刷新其他页面数据
      const pages = getCurrentPages()
      pages.forEach(page => {
        if (page.route !== 'pages/settings/settings' && page.loadPageData) {
          page.loadPageData()
        }
      })
    } catch (error) {
      toast.error('同步失败: ' + error.message)
    } finally {
      this.setData({ syncing: false })
    }
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