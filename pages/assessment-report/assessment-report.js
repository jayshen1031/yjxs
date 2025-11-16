// pages/assessment-report/assessment-report.js
const app = getApp()
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    reportId: '',
    report: '',
    reportDate: '',
    isLoading: true,
    errorMsg: ''
  },

  onLoad: function(options) {
    const reportId = options.reportId
    if (!reportId) {
      this.setData({
        isLoading: false,
        errorMsg: '未找到报告ID'
      })
      return
    }

    this.setData({ reportId })
    this.loadReport(reportId)
  },

  /**
   * 加载报告（始终从本地存储）
   */
  loadReport: function(reportId) {
    // 所有报告都从本地存储加载（已保存到知识库，不需要云数据库）
    this.loadLocalReport(reportId)
  },

  /**
   * 从本地存储加载报告
   */
  loadLocalReport: function(reportId) {
    try {
      const localReports = wx.getStorageSync('human30_local_reports') || {}
      const reportData = localReports[reportId]

      if (reportData) {
        this.setData({
          report: reportData.report,
          reportDate: this.formatDate(reportData.createdAt || Date.now()),
          isLoading: false
        })
      } else {
        this.setData({
          isLoading: false,
          errorMsg: '未找到本地报告'
        })
      }
    } catch (err) {
      console.error('加载本地报告失败:', err)
      this.setData({
        isLoading: false,
        errorMsg: '加载报告失败：' + err.message
      })
    }
  },

  /**
   * 格式化日期
   */
  formatDate: function(timestamp) {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}年${month}月${day}日`
  },

  /**
   * 分享报告
   */
  shareReport: function() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    wx.showToast({
      title: '点击右上角分享',
      icon: 'none'
    })
  },

  /**
   * 保存报告到Notion知识库
   */
  saveReport: async function() {
    const { report } = this.data

    wx.showLoading({ title: '保存中...' })

    try {
      const currentUser = app.globalData.currentUser
      if (!currentUser || !currentUser.notionConfig) {
        wx.hideLoading()
        wx.showModal({
          title: '提示',
          content: '请先配置Notion集成',
          showCancel: false
        })
        return
      }

      const { apiKey, databases } = currentUser.notionConfig
      const knowledgeDatabaseId = databases?.knowledge

      if (!knowledgeDatabaseId) {
        wx.hideLoading()
        wx.showModal({
          title: '提示',
          content: '请先配置知识库数据库',
          showCancel: false
        })
        return
      }

      // 提取Metatype作为标题
      let title = 'HUMAN 3.0 评估报告'
      const metatypeMatch = report.match(/YOUR METATYPE[:：]\s*(.+?)[\n\r]/i) ||
                           report.match(/你的元类型[:：]\s*(.+?)[\n\r]/i)
      if (metatypeMatch) {
        title = `HUMAN 3.0 评估报告 - ${metatypeMatch[1].trim()}`
      }

      // 创建知识库条目
      const properties = {
        'Title': {
          title: [{ text: { content: title } }]
        },
        'Content': {
          rich_text: [{ text: { content: report } }]
        },
        'Category': {
          select: { name: '评估报告' }
        },
        'Source': {
          select: { name: 'HUMAN 3.0' }
        },
        'Importance': {
          select: { name: '高' }
        },
        'Status': {
          select: { name: '已发布' }
        },
        'Tags': {
          multi_select: [
            { name: 'HUMAN 3.0' },
            { name: '个人发展' },
            { name: '自我评估' }
          ]
        }
      }

      await notionApiService.createPageGeneric(apiKey, knowledgeDatabaseId, properties)

      wx.hideLoading()
      wx.showToast({
        title: '已保存到知识库',
        icon: 'success'
      })

    } catch (err) {
      console.error('保存报告到知识库失败:', err)
      wx.hideLoading()
      wx.showModal({
        title: '保存失败',
        content: err.message || '未知错误',
        showCancel: false
      })
    }
  },

  /**
   * 在知识库中查看
   */
  viewInKnowledge: function() {
    wx.switchTab({
      url: '/pages/knowledge/knowledge'
    })
    // 提示用户筛选评估报告分类
    setTimeout(() => {
      wx.showToast({
        title: '请选择"评估报告"分类',
        icon: 'none',
        duration: 2500
      })
    }, 500)
  },

  /**
   * 返回首页
   */
  backToHome: function() {
    wx.switchTab({
      url: '/pages/home/home'
    })
  },

  /**
   * 用户分享
   */
  onShareAppMessage: function() {
    return {
      title: '我的HUMAN 3.0发展评估报告',
      path: `/pages/assessment-report/assessment-report?reportId=${this.data.reportId}`,
      imageUrl: ''
    }
  }
})
