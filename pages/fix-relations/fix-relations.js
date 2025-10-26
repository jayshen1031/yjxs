const userManager = require('../../utils/userManager.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    userEmail: '',
    mainRecordsDatabaseId: '',
    activityDetailsDatabaseId: '',
    canFix: false,
    isFixing: false,
    showProgress: false,
    logs: [],
    result: null
  },

  onLoad: function() {
    this.loadUserConfig()
  },

  // 加载用户配置
  loadUserConfig: function() {
    const currentUser = userManager.getCurrentUser()

    if (!currentUser) {
      wx.showModal({
        title: '未登录',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.reLaunch({ url: '/pages/login/login' })
        }
      })
      return
    }

    const notionConfig = currentUser.notionConfig
    const mainRecordsDatabaseId = notionConfig?.databases?.mainRecords || notionConfig?.mainDatabaseId
    const activityDetailsDatabaseId = notionConfig?.databases?.activityDetails || notionConfig?.activityDetailsDatabaseId

    const canFix = !!(
      notionConfig?.apiKey &&
      mainRecordsDatabaseId &&
      activityDetailsDatabaseId
    )

    this.setData({
      userEmail: currentUser.email,
      mainRecordsDatabaseId: mainRecordsDatabaseId,
      activityDetailsDatabaseId: activityDetailsDatabaseId,
      canFix: canFix
    })

    if (!canFix) {
      wx.showModal({
        title: '配置不完整',
        content: '请先在设置中配置 Notion 集成和数据库ID',
        showCancel: false
      })
    }
  },

  // 开始修复
  startFix: async function() {
    this.setData({
      isFixing: true,
      showProgress: true,
      logs: [],
      result: null
    })

    this.addLog('🔧 开始修复活动关联关系...')

    try {
      const currentUser = userManager.getCurrentUser()
      const notionConfig = currentUser.notionConfig

      // 1. 加载所有主记录
      this.addLog('\n📋 步骤1: 加载主记录...')
      const mainRecordsResult = await notionApiService.queryMainRecords(
        notionConfig.apiKey,
        this.data.mainRecordsDatabaseId,
        this.data.userEmail,
        {}
      )

      if (!mainRecordsResult.success) {
        throw new Error('加载主记录失败: ' + mainRecordsResult.error)
      }

      const mainRecords = mainRecordsResult.records || []
      this.addLog(`✅ 加载了 ${mainRecords.length} 条主记录`)

      // 2. 加载所有活动明细
      this.addLog('\n📊 步骤2: 加载活动明细...')
      const activitiesResult = await notionApiService.queryActivities(
        notionConfig.apiKey,
        this.data.activityDetailsDatabaseId,
        this.data.userEmail,
        {}
      )

      if (!activitiesResult.success) {
        throw new Error('加载活动明细失败: ' + activitiesResult.error)
      }

      const activities = activitiesResult.activities || []
      this.addLog(`✅ 加载了 ${activities.length} 条活动明细`)

      // 3. 按日期建立主记录索引
      this.addLog('\n🗂️ 步骤3: 建立日期索引...')
      const mainRecordsByDate = {}
      mainRecords.forEach(record => {
        const dateKey = record.date
        if (!mainRecordsByDate[dateKey]) {
          mainRecordsByDate[dateKey] = []
        }
        mainRecordsByDate[dateKey].push(record)
      })
      this.addLog(`✅ 建立了 ${Object.keys(mainRecordsByDate).length} 个日期索引`)

      // 4. 修复活动关联
      this.addLog('\n🔗 步骤4: 修复活动关联...')
      let fixedCount = 0
      let skippedCount = 0
      let errorCount = 0

      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i]

        try {
          // 检查是否已有关联
          if (activity.relatedMainRecordId) {
            this.addLog(`⏭️ [${i + 1}/${activities.length}] 跳过 "${activity.name}" - 已有关联`)
            skippedCount++
            continue
          }

          // 从活动的startTime提取日期
          const activityDate = activity.startTime.split('T')[0]

          // 查找同一天的主记录
          const matchingRecords = mainRecordsByDate[activityDate]

          if (!matchingRecords || matchingRecords.length === 0) {
            this.addLog(`⚠️ [${i + 1}/${activities.length}] "${activity.name}" (${activityDate}) 找不到匹配的主记录`)
            skippedCount++
            continue
          }

          // 如果有多条主记录，选择第一条
          const targetMainRecord = matchingRecords[0]

          this.addLog(`🔗 [${i + 1}/${activities.length}] "${activity.name}" → "${targetMainRecord.title}"`)

          // 更新活动的关联字段
          const updateResult = await notionApiService.updatePageProperties(
            notionConfig.apiKey,
            activity.id,
            {
              'Related Main Record': {  // ✅ 修正：Record → Related Main Record
                relation: [{ id: targetMainRecord.id }]
              }
            }
          )

          if (updateResult.success) {
            fixedCount++
            this.addLog(`  ✅ 成功`)
          } else {
            errorCount++
            this.addLog(`  ❌ 失败: ${updateResult.error}`)
          }

          // 延迟，避免API限流
          await this.sleep(300)

        } catch (error) {
          errorCount++
          this.addLog(`❌ [${i + 1}/${activities.length}] 处理 "${activity.name}" 时出错: ${error.message}`)
        }
      }

      // 5. 显示结果
      this.setData({
        isFixing: false,
        result: {
          success: true,
          fixed: fixedCount,
          skipped: skippedCount,
          errors: errorCount,
          total: activities.length
        }
      })

      this.addLog('\n✅ 修复完成！')

      wx.showToast({
        title: `成功修复 ${fixedCount} 条`,
        icon: 'success'
      })

    } catch (error) {
      this.setData({
        isFixing: false,
        result: {
          success: false,
          error: error.message
        }
      })

      this.addLog(`\n❌ 修复失败: ${error.message}`)

      wx.showToast({
        title: '修复失败',
        icon: 'error'
      })
    }
  },

  // 添加日志
  addLog: function(message) {
    const logs = this.data.logs
    logs.push(message)
    this.setData({ logs })

    // 自动滚动到底部
    setTimeout(() => {
      wx.pageScrollTo({
        scrollTop: 10000,
        duration: 300
      })
    }, 100)
  },

  // 延迟函数
  sleep: function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  // 重置
  reset: function() {
    this.setData({
      showProgress: false,
      logs: [],
      result: null
    })
  }
})
