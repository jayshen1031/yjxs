/**
 * 云开发环境测试工具
 * 用于验证云开发环境是否正常工作
 */

class CloudTest {
  constructor() {
    this.isReady = false
  }

  // 测试云开发环境基本连接
  async testCloudEnvironment() {
    try {
      if (!wx.cloud) {
        throw new Error('云开发SDK未加载')
      }

      // 测试云开发初始化状态
      const app = getApp()
      if (!app.globalData.cloudReady) {
        throw new Error('云开发环境未初始化')
      }

      // 测试数据库连接
      const db = wx.cloud.database()
      const testResult = await db.collection('test').limit(1).get()
      
      console.log('云开发环境测试成功:', testResult)
      this.isReady = true
      
      return {
        success: true,
        message: '云开发环境连接正常',
        envId: 'yjxs-3gbxme0rd1c50635'
      }
    } catch (error) {
      console.error('云开发环境测试失败:', error)
      return {
        success: false,
        error: error.message,
        envId: 'yjxs-3gbxme0rd1c50635'
      }
    }
  }

  // 测试简单的云函数调用
  async testSimpleCloudFunction() {
    try {
      // 先测试一个系统自带的简单功能
      const result = await wx.cloud.callFunction({
        name: 'memo-notion-sync',
        data: {
          action: 'ping',
          data: { message: 'test' }
        }
      })

      return {
        success: true,
        message: '云函数调用成功',
        result: result
      }
    } catch (error) {
      console.error('云函数调用失败:', error)
      return {
        success: false,
        error: error.message,
        details: '请确保云函数已正确上传到云端'
      }
    }
  }

  // 简化的Notion连接测试（不依赖云函数）
  async testNotionDirectly(apiKey, parentPageId = null) {
    try {
      if (!apiKey) {
        throw new Error('API Key不能为空')
      }

      console.log('开始测试Notion连接...')

      // 使用notionApiService进行测试
      const notionApiService = require('./notionApiService.js')
      const result = await notionApiService.testConnection(apiKey, parentPageId)

      console.log('Notion连接测试结果:', result)

      if (result.success) {
        let message = 'Notion连接测试成功'

        if (result.user) {
          message += `\n用户: ${result.user.name || 'Unknown'}`
        }

        return {
          success: true,
          message: message,
          user: result.user
        }
      } else {
        return {
          success: false,
          error: result.error || 'Notion连接测试失败'
        }
      }
    } catch (error) {
      console.error('Notion连接测试异常:', error)
      return {
        success: false,
        error: error.message || 'Notion连接测试失败'
      }
    }
  }

  // 自动创建四数据库
  async autoCreateDatabases(apiKey, parentPageId) {
    try {
      if (!apiKey || !parentPageId) {
        throw new Error('API Key和父页面ID不能为空')
      }

      console.log('开始自动创建四数据库架构...')

      const notionApiService = require('./notionApiService.js')
      const result = await notionApiService.createQuadDatabases(apiKey, parentPageId)

      console.log('四数据库创建结果:', result)

      if (result.success) {
        return {
          success: true,
          message: '四数据库创建成功！',
          goalsDatabaseId: result.goalsDatabaseId,
          todosDatabaseId: result.todosDatabaseId,
          mainDatabaseId: result.mainDatabaseId,
          activityDatabaseId: result.activityDatabaseId,
          tables: result.tables
        }
      } else {
        return {
          success: false,
          error: result.error || '创建数据库失败'
        }
      }
    } catch (error) {
      console.error('自动创建数据库异常:', error)
      return {
        success: false,
        error: error.message || '创建数据库失败'
      }
    }
  }

  // 发送Notion API请求的辅助方法
  makeNotionRequest(endpoint, apiKey) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://api.notion.com/v1${endpoint}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        success: resolve,
        fail: reject
      })
    })
  }

  // 获取云开发环境信息
  getEnvironmentInfo() {
    const app = getApp()
    return {
      cloudReady: app.globalData.cloudReady,
      envId: 'yjxs-3gbxme0rd1c50635',
      isReady: this.isReady
    }
  }
}

// 创建全局实例
const cloudTest = new CloudTest()

module.exports = cloudTest