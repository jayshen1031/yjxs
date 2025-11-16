// pages/assessment-history/assessment-history.js
Page({
  data: {
    assessments: [], // 评估历史列表
    latestLevel: '-', // 最新等级
    scoreChange: 0 // 分数变化
  },

  onLoad: function(options) {
    this.loadAssessments()
  },

  /**
   * 加载评估历史
   */
  loadAssessments: function() {
    try {
      // 从本地存储读取
      const assessments = wx.getStorageSync('human30_assessments') || []

      console.log('📊 加载评估历史:', assessments.length)

      // 按时间倒序排列
      const sortedAssessments = assessments.sort((a, b) => {
        return new Date(b.completedAt) - new Date(a.completedAt)
      })

      // 格式化数据
      const formattedAssessments = sortedAssessments.map(assessment => {
        return this.formatAssessment(assessment)
      })

      // 计算分数变化
      let scoreChange = 0
      if (formattedAssessments.length >= 2) {
        const latest = formattedAssessments[0].totalScore
        const previous = formattedAssessments[1].totalScore
        scoreChange = latest - previous
      }

      // 获取最新等级
      const latestLevel = formattedAssessments.length > 0 ?
        this.getLevelText(formattedAssessments[0].level) : '-'

      this.setData({
        assessments: formattedAssessments,
        latestLevel: latestLevel,
        scoreChange: scoreChange
      })

      console.log('✅ 评估历史加载完成:', {
        count: formattedAssessments.length,
        latestLevel,
        scoreChange
      })
    } catch (error) {
      console.error('❌ 加载评估历史失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  /**
   * 格式化评估数据
   */
  formatAssessment: function(assessment) {
    // 格式化日期
    const date = new Date(assessment.completedAt)
    const dateDisplay = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`

    // 格式化角色
    const roleText = assessment.role === 'student' ? '学生版' : '成年人版'

    // 格式化等级
    const levelText = this.getLevelText(assessment.level)

    // 格式化维度分数
    const dimensionList = []
    if (assessment.dimensionScores) {
      for (const [key, value] of Object.entries(assessment.dimensionScores)) {
        // 获取维度名称
        const dimensionName = this.getDimensionName(key)
        dimensionList.push({
          key: key,
          name: dimensionName,
          score: value,
          percentage: (value / 100) * 100 // 假设满分100
        })
      }
    }

    // 计算用时（分钟）
    let duration = 0
    if (assessment.startedAt && assessment.completedAt) {
      const start = new Date(assessment.startedAt)
      const end = new Date(assessment.completedAt)
      duration = Math.round((end - start) / 1000 / 60)
    }

    return {
      ...assessment,
      dateDisplay,
      roleText,
      levelText,
      dimensionList,
      duration
    }
  },

  /**
   * 获取等级文本
   */
  getLevelText: function(level) {
    const levelMap = {
      'beginner': '初级',
      'developing': '发展中',
      'intermediate': '中级',
      'advanced': '高级',
      'expert': '专家'
    }
    return levelMap[level] || '未知'
  },

  /**
   * 获取维度名称
   */
  getDimensionName: function(key) {
    const nameMap = {
      'self_awareness': '自我觉察',
      'emotional_intelligence': '情绪智能',
      'thinking_ability': '思维能力',
      'learning_ability': '学习能力',
      'creativity': '创造力',
      'communication': '沟通能力',
      'collaboration': '协作能力',
      'leadership': '领导力',
      'adaptability': '适应力',
      'resilience': '韧性'
    }
    return nameMap[key] || key
  },

  /**
   * 查看评估详情
   */
  viewAssessmentDetail: function(e) {
    const assessment = e.currentTarget.dataset.assessment
    console.log('📋 查看评估详情:', assessment.id)

    // 跳转到报告页面，传递评估ID
    wx.navigateTo({
      url: `/pages/assessment-report/assessment-report?assessmentId=${assessment.id}`
    })
  },

  /**
   * 开始新评估
   */
  startNewAssessment: function() {
    console.log('🚀 开始新评估')
    wx.navigateTo({
      url: '/pages/assessment-intro/assessment-intro'
    })
  }
})
