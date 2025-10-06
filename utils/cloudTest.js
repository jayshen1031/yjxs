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
        envId: 'cloud1-2g49srond2b01891'
      }
    } catch (error) {
      console.error('云开发环境测试失败:', error)
      return {
        success: false,
        error: error.message,
        envId: 'cloud1-2g49srond2b01891'
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
  async testNotionDirectly(apiKey, databaseId) {
    try {
      if (!apiKey || !databaseId) {
        throw new Error('API Key或Database ID不能为空')
      }

      // 使用wx.request直接测试Notion API
      const response = await this.makeNotionRequest('/users/me', apiKey)
      
      if (response.statusCode === 200) {
        const user = response.data
        
        // 如果提供了数据库ID，也测试数据库访问
        let database = null
        if (databaseId) {
          const dbResponse = await this.makeNotionRequest(`/databases/${databaseId}`, apiKey)
          if (dbResponse.statusCode === 200) {
            database = dbResponse.data
          }
        }

        return {
          success: true,
          message: 'Notion连接测试成功',
          user: {
            id: user.id,
            name: user.name,
            email: user.person?.email
          },
          database: database ? {
            id: database.id,
            title: database.title
          } : null
        }
      } else {
        throw new Error(`Notion API返回错误: ${response.statusCode}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Notion连接测试失败'
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
      envId: 'cloud1-2g49srond2b01891',
      isReady: this.isReady
    }
  }
}

// 创建全局实例
const cloudTest = new CloudTest()

module.exports = cloudTest