// pages/update-notion/update-notion.js
const userManager = require('../../utils/userManager.js')

Page({
  data: {
    updated: false,
    error: null,
    config: null
  },

  onLoad: function() {
    this.updateNotionConfig()
  },

  async updateNotionConfig() {
    try {
      const currentUser = userManager.getCurrentUser()

      if (!currentUser) {
        this.setData({
          error: '没有找到当前用户，请先登录'
        })
        return
      }

      // 检查是否有API Key
      if (!currentUser.notionConfig?.apiKey) {
        this.setData({
          error: '请先配置Notion API Key！\n\n请前往"设置" → "Notion集成配置"页面配置API Key。'
        })
        return
      }

      // 六个数据库ID
      const databaseIds = {
        goals: '28774e5ad9378137bb2edc914308f718',           // 目标库
        todos: '28774e5ad9378170adf8c4f50ffbfc6b',           // 待办库
        mainRecords: '28774e5ad937812f9b02c6dc78ef2b16',    // 主记录
        activityDetails: '28774e5ad93781218b8ae0c69b7891c4', // 活动明细
        dailyStatus: '28a74e5ad93781339a5fdc2138403f61',    // 每日状态库
        happyThings: '28a74e5ad9378173a957f017ae1196bc'     // 开心库
      }

      // 更新配置
      const updatedConfig = {
        ...currentUser.notionConfig,
        databases: {
          goals: databaseIds.goals,
          todos: databaseIds.todos,
          mainRecords: databaseIds.mainRecords,
          activityDetails: databaseIds.activityDetails,
          dailyStatus: databaseIds.dailyStatus,
          happyThings: databaseIds.happyThings
        },
        // 兼容字段（向后兼容）
        mainDatabaseId: databaseIds.mainRecords,
        activityDatabaseId: databaseIds.activityDetails,
        databaseId: databaseIds.mainRecords,
        dailyStatusDatabaseId: databaseIds.dailyStatus,
        happyThingsDatabaseId: databaseIds.happyThings,
        goalsDatabaseId: databaseIds.goals,
        todosDatabaseId: databaseIds.todos,
        enabled: true // 启用Notion集成
      }

      // 保存到本地
      const success = userManager.configureNotion(currentUser.id, updatedConfig)

      if (success) {
//         console.log('✅ 本地配置更新成功')

        // 同步到云端
        wx.showLoading({ title: '同步到云端...' })
        const apiService = require('../../utils/apiService.js')
        const result = await apiService.updateUserByEmail(currentUser.email, {
          notionConfig: updatedConfig
        })
        wx.hideLoading()

        if (result.success) {
//           console.log('✅ 云端同步成功')
          this.setData({
            updated: true,
            config: updatedConfig
          })

          wx.showToast({
            title: '配置更新成功！',
            icon: 'success',
            duration: 2000
          })

          // 2秒后返回设置页面
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/home/home'
            })
          }, 2000)
        } else {
          throw new Error('云端同步失败: ' + result.error)
        }
      } else {
        throw new Error('本地配置更新失败')
      }
    } catch (error) {
      console.error('❌ 配置更新失败:', error)
      this.setData({
        error: error.message
      })
      wx.showToast({
        title: '更新失败: ' + error.message,
        icon: 'error',
        duration: 3000
      })
    }
  }
})
