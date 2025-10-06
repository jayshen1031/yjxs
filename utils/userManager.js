/**
 * 用户管理模块
 * 处理用户身份认证、数据隔离和Notion集成
 */

const { storage } = require('./util.js')

class UserManager {
  constructor() {
    this.currentUser = null
    this.users = []
    this.notionConfig = null
    this.init()
  }

  // 初始化用户管理器
  init() {
    this.loadUsers()
    this.loadCurrentUser()
    this.loadNotionConfig()
  }

  // 加载用户列表
  loadUsers() {
    this.users = storage.get('users', [])
  }

  // 加载当前用户
  loadCurrentUser() {
    const currentUserId = storage.get('currentUserId')
    if (currentUserId) {
      this.currentUser = this.users.find(user => user.id === currentUserId) || null
    }
  }

  // 加载Notion配置
  loadNotionConfig() {
    this.notionConfig = storage.get('notionConfig', {
      enabled: false,
      apiKey: '',
      databaseId: '',
      syncEnabled: true
    })
  }

  // 创建新用户
  createUser(userInfo) {
    // 验证输入参数
    if (!userInfo || typeof userInfo !== 'object') {
      throw new Error('用户信息参数无效')
    }
    
    // 验证必需的邮箱
    if (!userInfo.email || typeof userInfo.email !== 'string' || !userInfo.email.trim()) {
      throw new Error('邮箱地址是必需的')
    }

    // 检查邮箱是否已存在
    const existingUser = this.users.find(user => 
      user.email.toLowerCase() === userInfo.email.toLowerCase()
    )
    if (existingUser) {
      throw new Error('该邮箱已被注册')
    }

    const emailPrefix = (userInfo.email && userInfo.email.includes('@')) ? userInfo.email.split('@')[0] : 'user'
    const newUser = {
      id: this.generateUserId(),
      email: userInfo.email.trim(),
      name: userInfo.name || emailPrefix,
      displayName: userInfo.displayName || userInfo.name || emailPrefix,
      avatar: userInfo.avatar || '',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      notionConfig: {
        enabled: false,
        apiKey: '',
        databaseId: '',
        syncEnabled: true
      },
      preferences: {
        reminderEnabled: true,
        reminderInterval: 60,
        theme: 'default',
        autoSync: true
      }
    }

    this.users.push(newUser)
    this.saveUsers()
    return newUser
  }

  // 切换用户
  switchUser(userId) {
    const user = this.users.find(u => u.id === userId)
    if (user) {
      this.currentUser = user
      user.lastLoginAt = Date.now()
      storage.set('currentUserId', userId)
      this.saveUsers()
      return true
    }
    return false
  }

  // 退出登录
  logout() {
    this.currentUser = null
    storage.remove('currentUserId')
    return true
  }

  // 获取当前用户
  getCurrentUser() {
    return this.currentUser
  }

  // 获取用户列表
  getUsers() {
    return this.users
  }

  // 根据邮箱查找用户
  getUserByEmail(email) {
    if (!email || typeof email !== 'string') {
      return null
    }
    return this.users.find(user => 
      user.email && user.email.toLowerCase() === email.toLowerCase()
    )
  }

  // 更新用户信息
  updateUser(userId, updates) {
    const userIndex = this.users.findIndex(u => u.id === userId)
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...updates }
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = this.users[userIndex]
      }
      this.saveUsers()
      return true
    }
    return false
  }

  // 删除用户
  deleteUser(userId) {
    const userIndex = this.users.findIndex(u => u.id === userId)
    if (userIndex !== -1) {
      // 删除用户数据
      this.clearUserData(userId)
      
      // 从用户列表中移除
      this.users.splice(userIndex, 1)
      
      // 如果删除的是当前用户，切换到其他用户或清空
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = this.users.length > 0 ? this.users[0] : null
        storage.set('currentUserId', this.currentUser ? this.currentUser.id : '')
      }
      
      this.saveUsers()
      return true
    }
    return false
  }

  // 配置用户的Notion集成
  configureNotion(userId, notionConfig) {
    const user = this.users.find(u => u.id === userId)
    if (user) {
      user.notionConfig = { ...user.notionConfig, ...notionConfig }
      this.saveUsers()
      return true
    }
    return false
  }

  // 获取用户的备忘录数据键
  getUserDataKey(dataType) {
    if (!this.currentUser) return null
    return `user_${this.currentUser.id}_${dataType}`
  }

  // 获取用户备忘录列表
  getUserMemos() {
    const key = this.getUserDataKey('memos')
    return key ? storage.get(key, []) : []
  }

  // 保存用户备忘录
  saveUserMemos(memos) {
    const key = this.getUserDataKey('memos')
    if (key) {
      storage.set(key, memos)
      return true
    }
    return false
  }

  // 获取用户偏好设置
  getUserPreferences() {
    return this.currentUser ? this.currentUser.preferences : {}
  }

  // 更新用户偏好设置
  updateUserPreferences(preferences) {
    if (this.currentUser) {
      this.currentUser.preferences = { ...this.currentUser.preferences, ...preferences }
      this.saveUsers()
      return true
    }
    return false
  }

  // 清除用户数据
  clearUserData(userId) {
    const dataKeys = ['memos', 'settings', 'cache']
    dataKeys.forEach(key => {
      storage.remove(`user_${userId}_${key}`)
    })
  }

  // 检查用户是否已配置Notion
  isNotionConfigured(userId = null) {
    const user = userId ? this.users.find(u => u.id === userId) : this.currentUser
    return user && user.notionConfig && user.notionConfig.enabled && 
           user.notionConfig.apiKey && user.notionConfig.databaseId
  }

  // 生成用户ID
  generateUserId() {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 保存用户列表
  saveUsers() {
    storage.set('users', this.users)
  }

  // 获取用户统计信息
  getUserStats(userId = null) {
    const user = userId ? this.users.find(u => u.id === userId) : this.currentUser
    if (!user) return null

    const memos = this.getUserMemos()
    const today = new Date().toDateString()
    const todayMemos = memos.filter(memo => {
      return new Date(memo.timestamp).toDateString() === today
    })

    return {
      totalMemos: memos.length,
      todayMemos: todayMemos.length,
      textMemos: memos.filter(m => m.type === 'text').length,
      voiceMemos: memos.filter(m => m.type === 'voice').length,
      planningMemos: memos.filter(m => m.isPlanning).length,
      lastActivity: memos.length > 0 ? Math.max(...memos.map(m => m.timestamp)) : user.createdAt
    }
  }

  // 导出用户数据
  exportUserData(userId = null) {
    const user = userId ? this.users.find(u => u.id === userId) : this.currentUser
    if (!user) return null

    const memos = this.getUserMemos()
    const stats = this.getUserStats(userId)

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        preferences: user.preferences
      },
      memos: memos,
      stats: stats,
      exportedAt: Date.now()
    }
  }

  // 导入用户数据
  importUserData(userData) {
    try {
      // 创建或更新用户
      let user = this.users.find(u => u.id === userData.user.id)
      if (!user) {
        user = this.createUser(userData.user)
      } else {
        this.updateUser(user.id, userData.user)
      }

      // 导入备忘录数据
      if (userData.memos && Array.isArray(userData.memos)) {
        const key = `user_${user.id}_memos`
        storage.set(key, userData.memos)
      }

      return { success: true, user: user }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// 创建全局用户管理器实例
const userManager = new UserManager()

module.exports = userManager