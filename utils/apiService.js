/**
 * API服务模块
 * 直接调用Notion API，不依赖云函数
 */

class ApiService {
  constructor() {
    // 使用云函数进行真正的数据库操作
    this.useDirectApi = false
    this.mockMode = false // 禁用模拟模式，使用真正的云函数
    this.envId = 'cloud1-2g49srond2b01891' // 云环境ID
    this.isInitialized = false
  }

  // 确保云开发已初始化
  ensureCloudInit() {
    if (this.isInitialized) return

    const app = getApp()
    if (app && app.globalData.cloudReady) {
      console.log('ApiService: 使用App已初始化的云环境')
      this.isInitialized = true
      return
    }

    // 如果App还没初始化，自己初始化
    if (typeof wx !== 'undefined' && wx.cloud) {
      console.log('ApiService: 自行初始化云环境:', this.envId)
      wx.cloud.init({
        env: this.envId,
        traceUser: true
      })
      this.isInitialized = true
    }
  }

  // 通用云函数调用方法
  async callCloudFunction(action, data = {}) {
    // 确保云开发已初始化
    this.ensureCloudInit()
    
    return new Promise((resolve, reject) => {
      console.log(`ApiService: 准备调用云函数 memo-notion-sync, action: ${action}`)
      console.log(`ApiService: 传递的数据:`, data)
      
      wx.cloud.callFunction({
        name: 'memo-notion-sync',
        config: {
          env: 'cloud1-2g49srond2b01891'  // 强制指定云环境
        },
        data: {
          action,
          data
        },
        success: (res) => {
          console.log(`云函数调用 ${action} 成功:`, res)
          
          if (res.result) {
            resolve(res.result)
          } else {
            reject(new Error('云函数返回结果为空'))
          }
        },
        fail: (err) => {
          console.error(`云函数调用失败 ${action}:`, err)
          console.error('当前云环境ID:', this.envId)
          console.error('App云环境状态:', getApp()?.globalData)
          
          // 直接返回错误，不使用模拟模式
          reject(new Error(`云函数调用失败: ${err.errMsg || err.message}`))
        }
      })
    })
  }


  // 测试Notion连接
  async testNotionConnection(apiKey, databaseId) {
    const notionApiService = require('./notionApiService.js')
    return await notionApiService.testConnection(apiKey, databaseId)
  }

  // 保存用户配置 - 只保存到本地
  async saveUserConfig(userId, notionConfig) {
    try {
      const userManager = require('./userManager.js')
      const success = userManager.configureNotion(userId, notionConfig)
      return {
        success: success,
        message: success ? '配置保存成功' : '配置保存失败'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 同步备忘录到Notion
  async syncMemoToNotion(apiKey, databaseId, memo) {
    const notionApiService = require('./notionApiService.js')
    return await notionApiService.syncMemoToNotion(apiKey, databaseId, memo)
  }

  // 同步用户备忘录到Notion（根据用户ID获取配置）
  async syncUserMemoToNotion(userId, memo) {
    try {
      const userManager = require('./userManager.js')
      const user = userManager.getUsers().find(u => u.id === userId)
      
      if (!user || !user.notionConfig || !user.notionConfig.enabled) {
        return {
          success: false,
          error: '用户未配置Notion或未启用同步'
        }
      }

      const { apiKey, databaseId } = user.notionConfig
      return await this.syncMemoToNotion(apiKey, databaseId, memo)
    } catch (error) {
      return {
        success: false,
        error: '同步失败: ' + error.message
      }
    }
  }

  // 从Notion获取备忘录列表
  async getMemoListFromNotion(apiKey, databaseId) {
    const notionApiService = require('./notionApiService.js')
    return await notionApiService.getMemoListFromNotion(apiKey, databaseId)
  }

  // 批量同步备忘录
  async batchSyncMemos(apiKey, databaseId, memos) {
    const notionApiService = require('./notionApiService.js')
    return await notionApiService.batchSyncMemos(apiKey, databaseId, memos)
  }

  // 删除用户备忘录（包含Notion同步）
  async deleteUserMemo(userId, memo) {
    try {
      const userManager = require('./userManager.js')
      const user = userManager.getUsers().find(u => u.id === userId)
      
      // 如果用户配置了Notion且备忘录已同步，先从Notion删除
      if (user && user.notionConfig && user.notionConfig.enabled && memo.notionPageId) {
        const { apiKey } = user.notionConfig
        const notionApiService = require('./notionApiService.js')
        const result = await notionApiService.deleteMemoFromNotion(apiKey, memo)
        
        if (!result.success) {
          console.warn('从Notion删除失败，但继续删除本地记录:', result.error)
        } else {
          console.log('已从Notion删除备忘录:', result.message)
        }
      }

      return {
        success: true,
        message: '删除成功'
      }
    } catch (error) {
      console.error('删除备忘录异常:', error)
      return {
        success: false,
        error: '删除失败: ' + error.message
      }
    }
  }

  // ========== 云端用户管理接口 ==========
  
  // 根据邮箱查找用户
  async getUserByEmail(email) {
    return await this.callCloudFunction('getUserByEmail', { email })
  }

  // 创建新用户
  async createUser(userData) {
    return await this.callCloudFunction('createUser', userData)
  }

  // 创建带密码的用户
  async createUserWithPassword(userData) {
    return await this.callCloudFunction('createUserWithPassword', userData)
  }

  // 密码登录
  async loginWithPassword(email, password) {
    return await this.callCloudFunction('loginWithPassword', { email, password })
  }

  // 更新用户最后登录时间
  async updateUserLogin(userId) {
    return await this.callCloudFunction('updateUserLogin', { userId })
  }

  // 获取最近登录的用户列表（可选功能）
  async getRecentUsers(limit = 10) {
    return await this.callCloudFunction('getRecentUsers', { limit })
  }

  // 更新用户信息
  async updateUser(userId, updates) {
    return await this.callCloudFunction('updateUser', { userId, updates })
  }

  // 通过邮箱更新用户信息
  async updateUserByEmail(email, updates) {
    return await this.callCloudFunction('updateUserByEmail', { email, updates })
  }

  // 删除用户
  async deleteUser(userId) {
    return await this.callCloudFunction('deleteUser', { userId })
  }

  // 格式化错误信息
  formatError(error) {
    if (error.status) {
      switch (error.status) {
        case 400:
          return '请求参数错误'
        case 401:
          return '认证失败'
        case 403:
          return '没有访问权限'
        case 404:
          return '资源不存在'
        case 429:
          return '请求过于频繁，请稍后重试'
        case 500:
          return '服务器内部错误'
        default:
          return `服务器错误 (${error.status}): ${error.message}`
      }
    }
    return error.message || '未知错误'
  }
}

// 创建全局实例
const apiService = new ApiService()

module.exports = apiService