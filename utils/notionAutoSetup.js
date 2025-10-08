/**
 * Notion自动配置助手
 * 处理自动创建子数据库的配置流程
 */

class NotionAutoSetup {
  constructor() {
    this.setupStatus = {
      mainDbConnected: false,
      timeInvestmentDbCreated: false,
      manualSetupRequired: false,
      lastSetupTime: null,
      setupMessages: []
    }
  }

  // 执行完整的Notion配置流程
  async performAutoSetup(apiKey, databaseId) {
    try {
      console.log('开始执行Notion自动配置流程')
      
      const notionSync = require('./notionSync.js')
      const userManager = require('./userManager.js')
      
      // 第一步：初始化主数据库连接
      const connectionResult = await notionSync.initializeConnection(apiKey, databaseId)
      
      if (!connectionResult.success) {
        return {
          success: false,
          error: connectionResult.error,
          setupStatus: this.setupStatus
        }
      }
      
      // 更新配置状态
      this.setupStatus.mainDbConnected = true
      this.setupStatus.setupMessages.push('✅ 主数据库连接成功')
      
      // 检查时间投入数据库创建结果
      if (connectionResult.data && connectionResult.data.timeInvestmentDb) {
        const timeDbResult = connectionResult.data.timeInvestmentDb
        
        if (timeDbResult.success) {
          this.setupStatus.timeInvestmentDbCreated = true
          this.setupStatus.setupMessages.push('✅ 时间投入数据库自动创建成功')
          this.setupStatus.setupMessages.push(`📋 数据库ID: ${timeDbResult.databaseId}`)
        } else {
          this.setupStatus.manualSetupRequired = true
          this.setupStatus.setupMessages.push('⚠️ 时间投入数据库自动创建失败')
          this.setupStatus.setupMessages.push(`💡 ${timeDbResult.message}`)
        }
      }
      
      this.setupStatus.lastSetupTime = Date.now()
      
      return {
        success: true,
        setupStatus: this.setupStatus,
        message: connectionResult.message,
        needsManualSetup: this.setupStatus.manualSetupRequired
      }
    } catch (error) {
      console.error('Notion自动配置异常:', error)
      
      this.setupStatus.manualSetupRequired = true
      this.setupStatus.setupMessages.push('❌ 自动配置失败: ' + error.message)
      
      return {
        success: false,
        error: error.message,
        setupStatus: this.setupStatus,
        needsManualSetup: true
      }
    }
  }

  // 获取配置指导信息
  getSetupGuidance() {
    if (this.setupStatus.manualSetupRequired) {
      return {
        title: '需要手动配置',
        type: 'manual',
        steps: [
          '1. 打开您的Notion工作区',
          '2. 在主记录数据库所在的页面中创建新数据库',
          '3. 将数据库命名为"时间投入记录"',
          '4. 按照配置文档添加必要字段',
          '5. 复制新数据库的ID到设置页面'
        ],
        docLink: 'NOTION_DUAL_DATABASE_SETUP.md',
        message: '由于权限限制，无法自动创建子数据库。请参考配置文档手动创建。'
      }
    } else if (this.setupStatus.timeInvestmentDbCreated) {
      return {
        title: '配置完成',
        type: 'success',
        message: '双数据库架构已成功配置，可以开始使用时间投入追踪功能！',
        features: [
          '✅ 主记录自动同步到Notion',
          '✅ 时间投入数据规范化存储',
          '✅ 活动名称智能去重',
          '✅ 支持复杂时间分析'
        ]
      }
    } else {
      return {
        title: '配置进行中',
        type: 'progress',
        message: '正在配置双数据库架构...',
        currentStatus: this.setupStatus.setupMessages
      }
    }
  }

  // 检查是否需要显示手动配置提示
  shouldShowManualSetupPrompt() {
    return this.setupStatus.mainDbConnected && this.setupStatus.manualSetupRequired
  }

  // 重置配置状态
  resetSetupStatus() {
    this.setupStatus = {
      mainDbConnected: false,
      timeInvestmentDbCreated: false,
      manualSetupRequired: false,
      lastSetupTime: null,
      setupMessages: []
    }
  }

  // 保存配置状态到本地存储
  saveSetupStatus() {
    try {
      wx.setStorageSync('notionSetupStatus', this.setupStatus)
    } catch (error) {
      console.error('保存配置状态失败:', error)
    }
  }

  // 从本地存储加载配置状态
  loadSetupStatus() {
    try {
      const saved = wx.getStorageSync('notionSetupStatus')
      if (saved) {
        this.setupStatus = { ...this.setupStatus, ...saved }
      }
    } catch (error) {
      console.error('加载配置状态失败:', error)
    }
  }

  // 格式化配置状态为用户友好的消息
  formatStatusMessage() {
    const messages = []
    
    if (this.setupStatus.mainDbConnected) {
      messages.push('🔗 主数据库连接正常')
    }
    
    if (this.setupStatus.timeInvestmentDbCreated) {
      messages.push('📊 时间投入数据库已配置')
    } else if (this.setupStatus.manualSetupRequired) {
      messages.push('⚠️ 需要手动创建时间投入数据库')
    }
    
    if (this.setupStatus.lastSetupTime) {
      const lastSetup = new Date(this.setupStatus.lastSetupTime).toLocaleString()
      messages.push(`⏰ 最后配置时间: ${lastSetup}`)
    }
    
    return messages.join('\n')
  }

  // 检查配置是否完整
  isSetupComplete() {
    return this.setupStatus.mainDbConnected && 
           (this.setupStatus.timeInvestmentDbCreated || !this.setupStatus.manualSetupRequired)
  }

  // 获取下一步操作建议
  getNextStepSuggestion() {
    if (!this.setupStatus.mainDbConnected) {
      return '请先配置Notion主数据库连接'
    }
    
    if (this.setupStatus.manualSetupRequired) {
      return '请手动创建时间投入数据库，参考配置文档'
    }
    
    if (this.isSetupComplete()) {
      return '配置完成，可以开始使用'
    }
    
    return '继续配置流程'
  }
}

// 创建全局实例
const notionAutoSetup = new NotionAutoSetup()

module.exports = notionAutoSetup