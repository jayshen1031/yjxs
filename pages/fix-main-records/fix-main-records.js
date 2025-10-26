const userManager = require('../../utils/userManager.js')
const { patchMainRecordsDatabase } = require('../../utils/patchMainRecordsDatabase.js')

Page({
  data: {
    userEmail: '',
    mainRecordsDatabaseId: '',
    canFix: false,
    isFixing: false,
    result: null
  },

  onLoad: function() {
    this.loadUserConfig()
  },

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

    const canFix = !!(notionConfig?.apiKey && mainRecordsDatabaseId)

    this.setData({
      userEmail: currentUser.email,
      mainRecordsDatabaseId: mainRecordsDatabaseId,
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

  startFix: async function() {
    this.setData({
      isFixing: true,
      result: null
    })

    wx.showLoading({ title: '修复中...' })

    try {
      const currentUser = userManager.getCurrentUser()
      const notionConfig = currentUser.notionConfig

      const result = await patchMainRecordsDatabase(
        notionConfig.apiKey,
        this.data.mainRecordsDatabaseId
      )

      wx.hideLoading()

      if (result.success) {
        this.setData({
          isFixing: false,
          result: {
            success: true,
            message: '✅ 成功添加 Start Time 和 End Time 字段！\n\n现在可以正常保存记录了。'
          }
        })

        wx.showToast({
          title: '修复成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      wx.hideLoading()

      this.setData({
        isFixing: false,
        result: {
          success: false,
          message: '❌ 修复失败：' + error.message
        }
      })

      wx.showToast({
        title: '修复失败',
        icon: 'error'
      })
    }
  },

  reset: function() {
    this.setData({
      result: null
    })
  }
})
