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

  // 网络诊断
  async diagnoseNetwork(apiKey = null) {
    try {
      console.log('开始网络诊断...')

      const result = await wx.cloud.callFunction({
        name: 'memo-notion-sync',
        config: {
          env: 'yjxs-3gbxme0rd1c50635'
        },
        data: {
          action: 'diagnoseNetwork',
          data: {
            apiKey: apiKey
          }
        }
      })

      console.log('=== 网络诊断报告 ===')
      console.log('完整结果:', result)

      if (result.result && result.result.diagnostics) {
        const diag = result.result.diagnostics
        console.log('\n时间:', diag.timestamp)
        console.log('\n测试结果:')
        diag.tests.forEach((test, index) => {
          console.log(`\n${index + 1}. ${test.name}`)
          console.log('  状态:', test.status)
          if (test.message) console.log('  消息:', test.message)
          if (test.result) console.log('  结果:', test.result)
          if (test.error) console.log('  错误:', test.error)
          if (test.code) console.log('  错误代码:', test.code)
          if (test.config) console.log('  配置:', JSON.stringify(test.config, null, 2))
        })

        return {
          success: true,
          diagnostics: diag
        }
      }

      return result
    } catch (error) {
      console.error('网络诊断失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 诊断Notion数据库结构
   * 获取指定数据库的所有字段信息，用于排查字段名不匹配问题
   */
  async diagnoseDatabaseSchema(apiKey, databaseId, databaseName = '数据库') {
    try {
      console.log(`\n========== 开始诊断${databaseName}结构 ==========`)
      console.log('数据库ID:', databaseId)

      const notionApiService = require('./notionApiService.js')
      const result = await notionApiService.getDatabaseSchema(apiKey, databaseId)

      if (!result.success) {
        console.error(`❌ 获取${databaseName}结构失败:`, result.error)
        wx.showToast({
          title: '获取数据库结构失败',
          icon: 'none',
          duration: 3000
        })
        return result
      }

      console.log(`✅ ${databaseName}结构获取成功`)
      console.log('数据库标题:', result.title)
      console.log('字段总数:', result.totalFields)
      console.log('\n字段列表:')
      result.fields.forEach((field, index) => {
        console.log(`  ${index + 1}. ${field.name} (${field.type})`)
      })

      // 显示结果弹窗
      const fieldList = result.fields.map((f, i) => `${i + 1}. ${f.name} (${f.type})`).join('\n')
      wx.showModal({
        title: `${databaseName}结构`,
        content: `标题: ${result.title}\n字段数: ${result.totalFields}\n\n字段列表:\n${fieldList}`,
        showCancel: false,
        confirmText: '知道了'
      })

      console.log('========== 诊断完成 ==========\n')
      return result
    } catch (error) {
      console.error('诊断数据库结构异常:', error)
      wx.showToast({
        title: '诊断失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
      return {
        success: false,
        error: error.message
      }
    }
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