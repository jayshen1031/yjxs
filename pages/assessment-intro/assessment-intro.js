// pages/assessment-intro/assessment-intro.js
Page({
  data: {
    hasHistory: false,
    historyCount: 0,
    selectedRole: 'adult' // 默认选择成年人
  },

  onLoad: function(options) {
    this.checkHistory()
  },

  /**
   * 检查是否有历史评估记录
   */
  checkHistory: function() {
    try {
      const assessments = wx.getStorageSync('human30_assessments') || []
      this.setData({
        hasHistory: assessments.length > 0,
        historyCount: assessments.length
      })
    } catch (e) {
      console.error('读取历史评估失败:', e)
    }
  },

  /**
   * 选择角色
   */
  selectRole: function(e) {
    const role = e.currentTarget.dataset.role
    this.setData({
      selectedRole: role
    })
  },

  /**
   * 开始评估
   */
  startAssessment: function() {
    const { selectedRole } = this.data
    const timeEstimate = selectedRole === 'student' ? '15-25分钟' : '30-45分钟'
    const roleText = selectedRole === 'student' ? '学生版' : '成年人版'

    wx.showModal({
      title: '开始评估',
      content: `即将开始${roleText}评估，预计需要${timeEstimate}。建议在安静的环境下进行。确定开始吗？`,
      confirmText: '开始',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 创建新的评估会话
          const sessionId = 'assessment_' + Date.now()

          wx.setStorageSync('current_assessment_session', {
            id: sessionId,
            startTime: Date.now(),
            userRole: selectedRole, // 保存用户角色
            currentQuadrant: 'mind',
            messages: [],
            progress: {
              mind: 0,
              body: 0,
              spirit: 0,
              vocation: 0
            }
          })

          // 跳转到评估页面
          wx.navigateTo({
            url: '/pages/assessment/assessment'
          })
        }
      }
    })
  },

  /**
   * 查看历史记录
   */
  viewHistory: function() {
    wx.showToast({
      title: '历史记录功能开发中',
      icon: 'none'
    })
    // TODO: 跳转到历史记录页面
    // wx.navigateTo({
    //   url: '/pages/assessment-history/assessment-history'
    // })
  },

  /**
   * 返回上一页
   */
  goBack: function() {
    wx.navigateBack()
  }
})
