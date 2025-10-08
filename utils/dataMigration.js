/**
 * 数据迁移工具
 * 处理从单数据库到双数据库架构的平滑迁移
 */

class DataMigration {
  constructor() {
    this.migrationStatus = {
      isRequired: false,
      isCompleted: false,
      backupCreated: false,
      existingRecordsCount: 0,
      migratedRecordsCount: 0,
      errors: []
    }
  }

  // 检查是否需要迁移
  async checkMigrationNeeded() {
    try {
      const userManager = require('./userManager.js')
      const currentUser = userManager.getCurrentUser()
      
      if (!currentUser || !currentUser.notionConfig || !currentUser.notionConfig.enabled) {
        return {
          needed: false,
          reason: '用户未配置Notion'
        }
      }

      // 检查是否已经有时间投入数据库ID
      if (currentUser.notionConfig.timeInvestmentDatabaseId) {
        return {
          needed: false,
          reason: '已经配置了双数据库架构'
        }
      }

      // 检查本地是否有包含时间投入数据的记录
      const memos = userManager.getUserMemos()
      const hasTimeInvestmentData = memos.some(memo => 
        memo.valuableTimeEntries?.length > 0 || 
        memo.wastefulTimeEntries?.length > 0 ||
        memo.neutralTimeEntries?.length > 0
      )

      // 检查Notion中是否有已同步的记录
      let notionRecordsCount = 0
      try {
        const apiService = require('./apiService.js')
        const notionResult = await this.getNotionRecordsCount(currentUser)
        notionRecordsCount = notionResult.count || 0
      } catch (error) {
        console.warn('无法获取Notion记录数:', error)
      }

      this.migrationStatus.existingRecordsCount = memos.length
      this.migrationStatus.isRequired = hasTimeInvestmentData || notionRecordsCount > 0

      return {
        needed: this.migrationStatus.isRequired,
        reason: hasTimeInvestmentData ? '本地有时间投入数据需要迁移' : '有已同步记录需要重新组织',
        localRecords: memos.length,
        notionRecords: notionRecordsCount,
        timeInvestmentRecords: memos.filter(memo => 
          memo.valuableTimeEntries?.length > 0 || 
          memo.wastefulTimeEntries?.length > 0 ||
          memo.neutralTimeEntries?.length > 0
        ).length
      }
    } catch (error) {
      console.error('检查迁移需求失败:', error)
      return {
        needed: false,
        reason: '检查失败: ' + error.message
      }
    }
  }

  // 获取Notion中的记录数量
  async getNotionRecordsCount(user) {
    try {
      const notionApiService = require('./notionApiService.js')
      const result = await notionApiService.queryDatabase(
        user.notionConfig.apiKey, 
        user.notionConfig.databaseId,
        {
          page_size: 1 // 只获取数量，不需要完整数据
        }
      )
      
      return {
        success: result.success,
        count: result.success ? (result.data.results?.length || 0) : 0
      }
    } catch (error) {
      return { success: false, count: 0, error: error.message }
    }
  }

  // 创建数据备份
  async createBackup() {
    try {
      const userManager = require('./userManager.js')
      const currentUser = userManager.getCurrentUser()
      
      if (!currentUser) {
        throw new Error('未找到当前用户')
      }

      const backupData = {
        timestamp: Date.now(),
        version: '1.0.0',
        user: {
          id: currentUser.id,
          email: currentUser.email,
          notionConfig: currentUser.notionConfig
        },
        localMemos: userManager.getUserMemos(),
        migrationInfo: {
          reason: '双数据库架构升级前备份',
          originalStructure: 'single-database',
          targetStructure: 'dual-database'
        }
      }

      // 保存备份到本地存储
      const backupKey = `migration_backup_${currentUser.id}_${Date.now()}`
      wx.setStorageSync(backupKey, backupData)
      
      // 记录备份信息
      const backupList = wx.getStorageSync('migration_backups') || []
      backupList.push({
        key: backupKey,
        timestamp: backupData.timestamp,
        userId: currentUser.id,
        recordsCount: backupData.localMemos.length
      })
      wx.setStorageSync('migration_backups', backupList)

      this.migrationStatus.backupCreated = true
      
      return {
        success: true,
        backupKey: backupKey,
        recordsCount: backupData.localMemos.length,
        message: '数据备份创建成功'
      }
    } catch (error) {
      console.error('创建备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 提供迁移选项给用户
  getMigrationOptions() {
    return {
      option1: {
        title: '🔄 升级到双数据库架构（推荐）',
        description: '将现有数据迁移到新的双数据库架构，获得更好的时间分析功能',
        benefits: [
          '✅ 时间投入数据结构化存储',
          '✅ 活动名称智能去重',
          '✅ 支持复杂的时间统计分析',
          '✅ 更好的数据组织和查询性能'
        ],
        risks: [
          '⚠️ 需要创建新的子数据库',
          '⚠️ 数据结构会发生变化',
          '⚠️ 迁移过程可能需要几分钟'
        ],
        action: 'migrate'
      },
      option2: {
        title: '📋 保持现有架构',
        description: '继续使用现有的单数据库架构，禁用新的时间投入功能',
        benefits: [
          '✅ 无需任何改动',
          '✅ 现有数据完全兼容',
          '✅ 立即可用'
        ],
        limitations: [
          '❌ 无法使用新的时间投入分析功能',
          '❌ 无法享受活动名称去重',
          '❌ 数据组织能力有限'
        ],
        action: 'keep_legacy'
      },
      option3: {
        title: '⏸️ 暂时跳过',
        description: '稍后再决定，继续使用现有功能',
        note: '可以随时在设置中重新选择迁移方案',
        action: 'skip'
      }
    }
  }

  // 执行数据迁移
  async performMigration() {
    try {
      console.log('开始执行数据迁移...')
      
      // 1. 创建备份
      console.log('第1步: 创建数据备份')
      const backupResult = await this.createBackup()
      if (!backupResult.success) {
        throw new Error('备份创建失败: ' + backupResult.error)
      }

      // 2. 创建子数据库
      console.log('第2步: 创建时间投入子数据库')
      const userManager = require('./userManager.js')
      const currentUser = userManager.getCurrentUser()
      const notionSync = require('./notionSync.js')
      
      const dbCreationResult = await notionSync.createTimeInvestmentDatabase(currentUser.notionConfig.apiKey)
      if (!dbCreationResult.success) {
        // 如果自动创建失败，标记为需要手动创建
        if (dbCreationResult.manualSetupRequired) {
          return {
            success: true,
            requiresManualSetup: true,
            message: '请手动创建时间投入数据库',
            backupKey: backupResult.backupKey
          }
        } else {
          throw new Error('子数据库创建失败: ' + dbCreationResult.error)
        }
      }

      // 3. 更新用户配置
      console.log('第3步: 更新用户配置')
      userManager.configureNotion(currentUser.id, {
        timeInvestmentDatabaseId: dbCreationResult.databaseId
      })

      // 4. 迁移现有数据
      console.log('第4步: 迁移现有时间投入数据')
      const migrationResult = await this.migrateExistingTimeInvestments(currentUser)

      this.migrationStatus.isCompleted = true
      this.migrationStatus.migratedRecordsCount = migrationResult.migratedCount

      return {
        success: true,
        message: '数据迁移完成',
        backupKey: backupResult.backupKey,
        timeInvestmentDbId: dbCreationResult.databaseId,
        migratedRecords: migrationResult.migratedCount,
        details: migrationResult.details
      }
    } catch (error) {
      console.error('数据迁移失败:', error)
      this.migrationStatus.errors.push(error.message)
      
      return {
        success: false,
        error: error.message,
        migrationStatus: this.migrationStatus
      }
    }
  }

  // 迁移现有的时间投入数据
  async migrateExistingTimeInvestments(user) {
    try {
      const userManager = require('./userManager.js')
      const notionSync = require('./notionSync.js')
      const memos = userManager.getUserMemos()
      
      let migratedCount = 0
      const details = []
      
      for (const memo of memos) {
        if (memo.valuableTimeEntries?.length > 0 || 
            memo.wastefulTimeEntries?.length > 0 ||
            memo.neutralTimeEntries?.length > 0) {
          
          try {
            // 如果memo已经有notionPageId，直接同步时间投入
            if (memo.notionPageId) {
              const result = await notionSync.syncTimeInvestmentsToNotion(memo, user)
              if (result.length > 0) {
                migratedCount += result.length
                details.push({
                  memoId: memo.id,
                  timeInvestments: result.length,
                  status: 'success'
                })
              }
            } else {
              // 如果memo没有notionPageId，需要先同步主记录
              console.log('memo没有notionPageId，跳过时间投入迁移:', memo.id)
              details.push({
                memoId: memo.id,
                status: 'skipped',
                reason: '需要先同步主记录'
              })
            }
          } catch (error) {
            console.error('迁移memo时间投入失败:', memo.id, error)
            details.push({
              memoId: memo.id,
              status: 'failed',
              error: error.message
            })
          }
        }
      }
      
      return {
        migratedCount,
        details,
        message: `成功迁移${migratedCount}条时间投入记录`
      }
    } catch (error) {
      throw new Error('时间投入数据迁移失败: ' + error.message)
    }
  }

  // 启用兼容模式（保持现有架构）
  async enableLegacyMode() {
    try {
      const userManager = require('./userManager.js')
      const currentUser = userManager.getCurrentUser()
      
      if (!currentUser) {
        throw new Error('未找到当前用户')
      }

      // 在用户配置中标记为遗留模式
      userManager.configureNotion(currentUser.id, {
        legacyMode: true,
        timeInvestmentEnabled: false,
        migrationSkipped: true,
        migrationSkippedAt: Date.now()
      })

      return {
        success: true,
        message: '已启用兼容模式，将继续使用现有数据结构'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取迁移状态
  getMigrationStatus() {
    return {
      ...this.migrationStatus,
      timestamp: Date.now()
    }
  }

  // 恢复备份数据
  async restoreFromBackup(backupKey) {
    try {
      const backupData = wx.getStorageSync(backupKey)
      if (!backupData) {
        throw new Error('备份数据不存在')
      }

      const userManager = require('./userManager.js')
      
      // 恢复本地数据
      userManager.saveUserMemos(backupData.localMemos)
      
      // 恢复用户配置
      userManager.configureNotion(backupData.user.id, backupData.user.notionConfig)

      return {
        success: true,
        message: '数据恢复成功',
        restoredRecords: backupData.localMemos.length
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 清理旧备份
  cleanupOldBackups(keepDays = 30) {
    try {
      const backupList = wx.getStorageSync('migration_backups') || []
      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000)
      
      const toDelete = backupList.filter(backup => backup.timestamp < cutoffTime)
      const toKeep = backupList.filter(backup => backup.timestamp >= cutoffTime)
      
      // 删除过期备份
      toDelete.forEach(backup => {
        wx.removeStorageSync(backup.key)
      })
      
      // 更新备份列表
      wx.setStorageSync('migration_backups', toKeep)
      
      return {
        success: true,
        deleted: toDelete.length,
        kept: toKeep.length
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// 创建全局实例
const dataMigration = new DataMigration()

module.exports = dataMigration