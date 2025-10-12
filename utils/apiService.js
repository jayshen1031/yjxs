/**
 * API服务模块
 * 直接调用Notion API，不依赖云函数
 */

// 预先声明所有依赖模块
const notionApiService = require('./notionApiService.js')
const userManager = require('./userManager.js')
const { getCurrentEnv } = require('../envList.js')

class ApiService {
  constructor() {
    // 使用云函数进行真正的数据库操作
    this.useDirectApi = false
    this.mockMode = false // 禁用模拟模式，使用真正的云函数
    this.envId = getCurrentEnv() // 使用统一的云环境ID配置
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

  // 通用云函数调用方法（带重试机制）
  async callCloudFunction(action, data = {}, retryCount = 0) {
    // 确保云开发已初始化
    this.ensureCloudInit()

    return new Promise((resolve, reject) => {
      console.log(`ApiService: 准备调用云函数 memo-notion-sync, action: ${action}, 重试次数: ${retryCount}`)
      console.log(`ApiService: 传递的数据:`, data)

      wx.cloud.callFunction({
        name: 'memo-notion-sync',
        config: {
          env: this.envId  // 使用统一的云环境ID配置
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

          // 如果是 access_token 错误且未超过最大重试次数，重新初始化并重试
          const isTokenError = err.errMsg && (
            err.errMsg.includes('access_token') ||
            err.errMsg.includes('token') ||
            err.errMsg.includes('invalid credential')
          )

          if (isTokenError && retryCount < 2) {
            console.log(`检测到 access_token 错误，重新初始化云环境并重试...`)

            // 强制重新初始化
            this.isInitialized = false
            this.ensureCloudInit()

            // 延迟后重试
            setTimeout(() => {
              this.callCloudFunction(action, data, retryCount + 1)
                .then(resolve)
                .catch(reject)
            }, 500)
          } else {
            // 其他错误或达到最大重试次数，直接返回错误
            reject(new Error(`云函数调用失败: ${err.errMsg || err.message}`))
          }
        }
      })
    })
  }


  // 测试Notion连接
  async testNotionConnection(apiKey, databaseId) {
    return await notionApiService.testConnection(apiKey, databaseId)
  }

  // 保存用户配置 - 只保存到本地
  async saveUserConfig(userId, notionConfig) {
    try {
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
    return await notionApiService.syncMemoToNotion(apiKey, databaseId, memo)
  }

  // 同步用户备忘录到Notion（通过邮箱匹配用户）
  async syncUserMemoToNotion(userEmail, memo) {
    try {
      const user = userManager.getUserByEmail(userEmail)
      const currentUser = userManager.getCurrentUser()

      console.log('Notion同步调试信息:')
      console.log('- 传入的userEmail:', userEmail)
      console.log('- 当前用户邮箱:', currentUser?.email)
      console.log('- 找到的用户:', user?.email)
      console.log('- 用户Notion配置:', user?.notionConfig)
      console.log('- 配置enabled状态:', user?.notionConfig?.enabled)
      console.log('- 配置apiKey存在:', !!user?.notionConfig?.apiKey)

      if (!user) {
        return {
          success: false,
          error: `找不到用户邮箱: ${userEmail}`
        }
      }

      if (!user.notionConfig) {
        return {
          success: false,
          error: '用户没有Notion配置'
        }
      }

      if (!user.notionConfig.enabled) {
        return {
          success: false,
          error: `Notion集成未启用，当前状态: ${user.notionConfig.enabled}`
        }
      }

      const { apiKey } = user.notionConfig

      // 优先使用新的databases结构
      const mainDatabaseId = user.notionConfig.databases?.mainRecords ||
                            user.notionConfig.mainRecordsDatabaseId ||
                            user.notionConfig.mainDatabaseId ||
                            user.notionConfig.databaseId

      if (!mainDatabaseId) {
        return {
          success: false,
          error: '主记录表数据库ID未配置'
        }
      }

      console.log('- 使用主记录表ID:', mainDatabaseId)
      return await this.syncMemoToNotion(apiKey, mainDatabaseId, memo)
    } catch (error) {
      return {
        success: false,
        error: '同步失败: ' + error.message
      }
    }
  }

  // 同步备忘录到Notion（完整版本，包含时间投入数据）
  async syncUserMemoToNotionComplete(userEmail, memo) {
    try {
      const user = userManager.getUserByEmail(userEmail)
      
      if (!user || !user.notionConfig || !user.notionConfig.enabled) {
        return {
          success: false,
          error: '用户未配置Notion或未启用同步'
        }
      }

      const { apiKey, databaseId } = user.notionConfig
      
      // 先同步主记录
      const mainResult = await notionApiService.syncMemoToNotion(apiKey, databaseId, memo)
      
      if (mainResult.success) {
        // 如果有时间投入数据且用户配置了子数据库，则同步时间投入
        // 注意：此处不直接调用notionSync以避免循环依赖
        // 时间投入同步由调用方（app.js）负责处理
      }
      
      return mainResult
    } catch (error) {
      return {
        success: false,
        error: '同步失败: ' + error.message
      }
    }
  }

  // 从Notion获取备忘录列表
  async getMemoListFromNotion(apiKey, databaseId) {
    return await notionApiService.getMemoListFromNotion(apiKey, databaseId)
  }

  // 批量同步备忘录
  async batchSyncMemos(apiKey, databaseId, memos) {
    return await notionApiService.batchSyncMemos(apiKey, databaseId, memos)
  }

  // 创建Notion数据库
  async createNotionDatabase(databaseData, apiKey) {
    return await notionApiService.createDatabase(databaseData, apiKey)
  }

  // 创建Notion页面
  async createNotionPage(pageData, apiKey) {
    return await notionApiService.createPageGeneric(pageData, apiKey)
  }

  // 删除用户备忘录（包含Notion同步）
  async deleteUserMemo(userEmail, memo) {
    try {
      const user = userManager.getUserByEmail(userEmail)

      // 如果用户配置了Notion且备忘录已同步，先从Notion删除
      if (user && user.notionConfig && user.notionConfig.enabled && memo.notionPageId) {
        const { apiKey, activityDatabaseId, activitiesDatabaseId } = user.notionConfig

        // 传递activityDatabaseId用于级联删除
        const memoWithDbId = {
          ...memo,
          activityDatabaseId: activityDatabaseId || activitiesDatabaseId
        }

        const result = await notionApiService.deleteMemoFromNotion(apiKey, memoWithDbId)
        
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

  // 为现有用户设置密码（临时功能）
  async setPasswordForUser(email, password) {
    return await this.callCloudFunction('setPasswordForUser', { email, password })
  }

  // ========== 主记录表（Main Records）API ==========

  // 创建主记录
  async createMainRecord(userId, apiKey, recordData, userEmail = null) {
    return await this.callCloudFunction('createMainRecord', { userId, userEmail, apiKey, recordData })
  }

  // 更新主记录
  async updateMainRecord(userId, apiKey, recordId, updates, userEmail = null) {
    return await this.callCloudFunction('updateMainRecord', { userId, userEmail, apiKey, recordId, updates })
  }

  // 获取主记录列表
  async getMainRecords(userId, apiKey, options = {}, userEmail = null) {
    return await this.callCloudFunction('getMainRecords', { userId, userEmail, apiKey, ...options })
  }

  // 删除主记录
  async deleteMainRecord(userId, apiKey, recordId) {
    return await this.callCloudFunction('deleteMainRecord', { userId, apiKey, recordId })
  }

  // ========== 活动明细表（Activity Details）API ==========

  // 创建活动明细
  async createActivity(userId, apiKey, activityData, userEmail = null) {
    return await this.callCloudFunction('createActivity', { userId, userEmail, apiKey, activityData })
  }

  // 更新活动明细
  async updateActivity(userId, apiKey, activityId, updates, userEmail = null) {
    return await this.callCloudFunction('updateActivity', { userId, userEmail, apiKey, activityId, updates })
  }

  // 获取活动明细列表
  async getActivities(userId, apiKey, options = {}, userEmail = null) {
    return await this.callCloudFunction('getActivities', { userId, userEmail, apiKey, ...options })
  }

  // 删除活动明细
  async deleteActivity(userId, apiKey, activityId) {
    return await this.callCloudFunction('deleteActivity', { userId, apiKey, activityId })
  }

  // ========== 目标管理API ==========

  // 创建目标
  async createGoal(userId, apiKey, goalData) {
    return await this.callCloudFunction('createGoal', { userId, apiKey, goalData })
  }

  // 更新目标
  async updateGoal(userId, apiKey, goalId, updates) {
    return await this.callCloudFunction('updateGoal', { userId, apiKey, goalId, updates })
  }

  // 获取目标列表
  async getGoals(userId, apiKey) {
    return await this.callCloudFunction('getGoals', { userId, apiKey })
  }

  // 删除目标
  async deleteGoal(userId, apiKey, goalId) {
    return await this.callCloudFunction('deleteGoal', { userId, apiKey, goalId })
  }

  // ========== 待办管理API ==========

  // 创建待办
  async createTodo(userId, apiKey, todoData) {
    return await this.callCloudFunction('createTodo', { userId, apiKey, todoData })
  }

  // 更新待办
  async updateTodo(userId, apiKey, todoId, updates) {
    return await this.callCloudFunction('updateTodo', { userId, apiKey, todoId, updates })
  }

  // 获取待办列表
  async getTodos(userId, apiKey, filter = 'all') {
    return await this.callCloudFunction('getTodos', { userId, apiKey, filter })
  }

  // 删除待办
  async deleteTodo(userId, apiKey, todoId) {
    return await this.callCloudFunction('deleteTodo', { userId, apiKey, todoId })
  }

  // ========== 关联关系管理API ==========

  // 将待办关联到目标
  async linkTodoToGoal(userId, apiKey, todoId, goalId) {
    return await this.callCloudFunction('linkTodoToGoal', { userId, apiKey, todoId, goalId })
  }

  // 将活动关联到待办
  async linkActivityToTodo(userId, apiKey, activityId, todoId) {
    return await this.callCloudFunction('linkActivityToTodo', { userId, apiKey, activityId, todoId })
  }

  // 将活动关联到目标
  async linkActivityToGoal(userId, apiKey, activityId, goalId) {
    return await this.callCloudFunction('linkActivityToGoal', { userId, apiKey, activityId, goalId })
  }

  // 将活动关联到主记录
  async linkActivityToMainRecord(userId, apiKey, activityId, mainRecordId) {
    return await this.callCloudFunction('linkActivityToMainRecord', { userId, apiKey, activityId, mainRecordId })
  }

  // ========== 统计分析API ==========

  // 获取目标统计
  async getGoalStatistics(userId, apiKey) {
    return await this.callCloudFunction('getGoalStatistics', { userId, apiKey })
  }

  // 获取待办统计
  async getTodoStatistics(userId, apiKey) {
    return await this.callCloudFunction('getTodoStatistics', { userId, apiKey })
  }

  // 按目标统计时间投入
  async getTimeInvestmentByGoal(userId, apiKey, goalId = null) {
    return await this.callCloudFunction('getTimeInvestmentByGoal', { userId, apiKey, goalId })
  }

  // ========== 四数据库架构创建API ==========

  // 创建四数据库架构
  async createQuadDatabases(userId, apiKey, parentPageId) {
    return await this.callCloudFunction('createQuadDatabases', { userId, apiKey, parentPageId })
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