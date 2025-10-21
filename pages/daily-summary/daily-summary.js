/**
 * 今日总结页面
 */

const app = getApp()
const dailySummaryService = require('../../utils/dailySummaryService.js')

Page({
  data: {
    loading: false,
    hasData: false,

    // 今日数据
    todayData: null,

    // AI生成的总结
    summary: '',

    // 提示词（可查看）
    prompt: '',

    // 显示模式
    showPrompt: false,

    // 生成状态
    generateStatus: '', // 'idle' | 'loading' | 'success' | 'error'
    errorMessage: ''
  },

  onLoad: function() {
    this.loadTodayData()
  },

  /**
   * 加载今日数据
   */
  loadTodayData: async function() {
    try {
      this.setData({ loading: true })

      const todayData = await dailySummaryService.getTodayFullData()

      console.log('📅 今日数据加载成功:', todayData)

      // 计算格式化的数据
      const totalHours = (todayData.stats.totalMinutes / 60).toFixed(1)
      const valuablePercent = todayData.stats.totalMinutes > 0
        ? (todayData.stats.valuableMinutes / todayData.stats.totalMinutes * 100).toFixed(1)
        : 0
      const neutralPercent = todayData.stats.totalMinutes > 0
        ? (todayData.stats.neutralMinutes / todayData.stats.totalMinutes * 100).toFixed(1)
        : 0
      const wastefulPercent = todayData.stats.totalMinutes > 0
        ? (todayData.stats.wastefulMinutes / todayData.stats.totalMinutes * 100).toFixed(1)
        : 0

      this.setData({
        loading: false,
        hasData: todayData.activities.length > 0,
        todayData: todayData,
        totalHours: totalHours,
        valuablePercent: valuablePercent,
        neutralPercent: neutralPercent,
        wastefulPercent: wastefulPercent
      })

      if (!this.data.hasData) {
        wx.showToast({
          title: '今日暂无记录',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('❌ 加载今日数据失败:', error)
      this.setData({
        loading: false,
        hasData: false
      })
      wx.showToast({
        title: '加载失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  },

  /**
   * 生成AI总结
   */
  generateSummary: async function() {
    try {
      this.setData({
        generateStatus: 'loading'
      })

      wx.showLoading({ title: '生成中...' })

      const result = await dailySummaryService.generateDailySummary('full')

      wx.hideLoading()

      if (result.success) {
        this.setData({
          generateStatus: 'success',
          summary: result.summary || '（AI服务待集成，当前显示提示词）',
          prompt: result.prompt
        })

        wx.showToast({
          title: '生成成功',
          icon: 'success'
        })
      } else {
        this.setData({
          generateStatus: 'error',
          errorMessage: result.error
        })

        wx.showToast({
          title: result.error,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 生成总结失败:', error)
      this.setData({
        generateStatus: 'error',
        errorMessage: error.message
      })

      wx.showToast({
        title: '生成失败',
        icon: 'error'
      })
    }
  },

  /**
   * 生成快速总结
   */
  generateQuickSummary: async function() {
    try {
      wx.showLoading({ title: '生成中...' })

      const result = await dailySummaryService.generateDailySummary('quick')

      wx.hideLoading()

      if (result.success) {
        this.setData({
          summary: result.summary || '（AI服务待集成）',
          prompt: result.prompt
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 生成快速总结失败:', error)
    }
  },

  /**
   * 切换提示词显示
   */
  togglePrompt: function() {
    this.setData({
      showPrompt: !this.data.showPrompt
    })
  },

  /**
   * 复制总结
   */
  copySummary: function() {
    wx.setClipboardData({
      data: this.data.summary,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  /**
   * 复制提示词
   */
  copyPrompt: function() {
    wx.setClipboardData({
      data: this.data.prompt,
      success: () => {
        wx.showToast({
          title: '提示词已复制',
          icon: 'success'
        })
      }
    })
  },

  /**
   * 保存总结到Notion
   */
  saveSummary: async function() {
    if (!this.data.summary) {
      wx.showToast({
        title: '请先生成总结',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const result = await dailySummaryService.saveSummaryToNotion(this.data.summary)

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: '已保存到Notion',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '保存失败: ' + result.error,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('❌ 保存总结失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  },

  /**
   * 分享总结
   */
  shareSummary: function() {
    // TODO: 实现分享功能
    wx.showToast({
      title: '分享功能待开发',
      icon: 'none'
    })
  }
})
