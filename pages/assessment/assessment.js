// pages/assessment/assessment.js
const app = getApp()
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    // 会话信息
    sessionId: '',
    userRole: 'adult', // 用户角色：adult 或 student
    messages: [],
    currentQuadrant: 'mind',
    questionCount: 0,
    estimatedTotal: 24,

    // UI状态
    userInput: '',
    isLoading: false,
    isRecording: false,
    scrollToView: '',
    overallProgress: 0,

    // 象限信息
    currentQuadrantInfo: {
      icon: '🧠',
      name: 'Mind 象限'
    },

    quadrantMap: {
      mind: { icon: '🧠', name: 'Mind 象限', nameCn: '心智' },
      body: { icon: '💪', name: 'Body 象限', nameCn: '身体' },
      spirit: { icon: '🌟', name: 'Spirit 象限', nameCn: '精神' },
      vocation: { icon: '💼', name: 'Vocation 象限', nameCn: '事业' }
    }
  },

  onLoad: function(options) {
    // 加载会话
    const session = wx.getStorageSync('current_assessment_session')
    if (session) {
      const userRole = session.userRole || 'adult'
      const estimatedTotal = userRole === 'student' ? 16 : 24 // 学生版16题，成年人版24题

      this.setData({
        sessionId: session.id,
        userRole: userRole,
        estimatedTotal: estimatedTotal,
        messages: session.messages || [],
        currentQuadrant: session.currentQuadrant || 'mind',
        questionCount: session.messages ? session.messages.filter(m => m.role === 'user').length : 0
      })

      // 如果是新会话，开始对话
      if (!session.messages || session.messages.length === 0) {
        this.startAssessment()
      } else {
        this.updateProgress()
      }
    } else {
      // 没有会话，返回引导页
      wx.redirectTo({
        url: '/pages/assessment-intro/assessment-intro'
      })
    }
  },

  /**
   * 开始评估
   */
  startAssessment: function() {
    this.setData({ isLoading: true })

    // 调用云函数获取第一个问题
    wx.cloud.callFunction({
      name: 'human30-assessment',
      data: {
        action: 'chat',
        data: {
          messages: [],
          sessionId: this.data.sessionId,
          userRole: this.data.userRole // 传递用户角色
        }
      }
    }).then(res => {
      console.log('开始评估响应:', res)

      if (res.result.success) {
        const aiMessage = {
          role: 'assistant',
          content: res.result.data.message
        }

        this.addMessage(aiMessage)
      } else {
        // 使用降级响应
        if (res.result.fallback) {
          this.addMessage({
            role: 'assistant',
            content: res.result.message
          })
        } else {
          wx.showToast({
            title: 'API调用失败',
            icon: 'error'
          })
        }
      }
    }).catch(err => {
      console.error('云函数调用失败:', err)
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    }).finally(() => {
      this.setData({ isLoading: false })
    })
  },

  /**
   * 输入变化
   */
  onInput: function(e) {
    this.setData({
      userInput: e.detail.value
    })
  },

  /**
   * 提交答案
   */
  submitAnswer: function() {
    const { userInput, messages, sessionId } = this.data

    if (!userInput.trim()) {
      wx.showToast({
        title: '请输入回答',
        icon: 'none'
      })
      return
    }

    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: userInput
    }

    this.addMessage(userMessage)

    // 清空输入
    this.setData({
      userInput: '',
      isLoading: true
    })

    // 调用云函数获取AI回复
    const conversationMessages = [...messages, userMessage]

    wx.cloud.callFunction({
      name: 'human30-assessment',
      data: {
        action: 'chat',
        data: {
          messages: conversationMessages,
          sessionId: sessionId,
          userRole: this.data.userRole // 传递用户角色
        }
      }
    }).then(res => {
      console.log('AI响应:', res)

      if (res.result.success) {
        const aiMessage = {
          role: 'assistant',
          content: res.result.data.message
        }

        this.addMessage(aiMessage)

        // 检查是否完成评估
        this.checkIfComplete(aiMessage.content)
      } else {
        if (res.result.fallback) {
          this.addMessage({
            role: 'assistant',
            content: res.result.message
          })
        } else {
          wx.showToast({
            title: 'AI回复失败',
            icon: 'error'
          })
        }
      }
    }).catch(err => {
      console.error('提交答案失败:', err)
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    }).finally(() => {
      this.setData({ isLoading: false })
    })
  },

  /**
   * 添加消息
   */
  addMessage: function(message) {
    const { messages } = this.data
    messages.push(message)

    this.setData({
      messages,
      scrollToView: `msg-${messages.length - 1}`,
      questionCount: messages.filter(m => m.role === 'user').length
    })

    // 更新会话存储
    this.updateSession()
    this.updateProgress()
  },

  /**
   * 更新会话
   */
  updateSession: function() {
    const session = wx.getStorageSync('current_assessment_session') || {}
    session.messages = this.data.messages
    session.currentQuadrant = this.data.currentQuadrant
    session.lastUpdate = Date.now()

    wx.setStorageSync('current_assessment_session', session)
  },

  /**
   * 更新进度
   */
  updateProgress: function() {
    const { questionCount, estimatedTotal } = this.data
    const progress = Math.min(Math.round((questionCount / estimatedTotal) * 100), 95)

    this.setData({
      overallProgress: progress
    })

    // 根据问题数量更新当前象限
    if (questionCount >= 3 && questionCount < 8) {
      this.updateQuadrant('body')
    } else if (questionCount >= 8 && questionCount < 13) {
      this.updateQuadrant('spirit')
    } else if (questionCount >= 13) {
      this.updateQuadrant('vocation')
    }
  },

  /**
   * 更新象限
   */
  updateQuadrant: function(quadrant) {
    if (this.data.currentQuadrant !== quadrant) {
      const quadrantInfo = this.data.quadrantMap[quadrant]
      this.setData({
        currentQuadrant: quadrant,
        currentQuadrantInfo: quadrantInfo
      })

      // 显示象限切换提示
      wx.showToast({
        title: `进入${quadrantInfo.nameCn}象限`,
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 检查是否完成评估
   */
  checkIfComplete: function(content) {
    // 扩展关键词检测，涵盖更多可能的报告标志
    const reportKeywords = [
      'YOUR METATYPE', '你的元类型', '元类型', 'METATYPE',
      'LIFESTYLE ARCHETYPE', '生活方式原型', '生活原型',
      'QUADRANT BREAKDOWN', '象限分析', '象限分解',
      'CORE PROBLEM', '核心问题',
      'TRANSFORMATION STRATEGY', '转型策略', '行动计划',
      'GLITCH ASSESSMENT', '评估完成', 'ASSESSMENT RESULTS',
      '📊 Mind:', '📊 Body:', '📊 Spirit:', '📊 Vocation:'
    ]

    const hasReportKeyword = reportKeywords.some(keyword => content.includes(keyword))

    if (hasReportKeyword) {
      wx.showModal({
        title: '评估完成',
        content: '是否查看完整报告？',
        confirmText: '查看报告',
        cancelText: '稍后查看',
        success: (res) => {
          if (res.confirm) {
            this.generateReport()
          }
        }
      })
    }
  },

  /**
   * 生成完整报告
   */
  generateReport: function() {
    wx.showLoading({ title: '生成报告中...' })

    wx.cloud.callFunction({
      name: 'human30-assessment',
      data: {
        action: 'generateReport',
        data: {
          messages: this.data.messages,
          sessionId: this.data.sessionId,
          userRole: this.data.userRole // 传递用户角色
        }
      }
    }).then(res => {
      wx.hideLoading()

      if (res.result.success) {
        // 保存报告
        const report = res.result.data.report
        const reportId = res.result.data.reportId

        // 保存到本地存储（备份）
        try {
          const localReports = wx.getStorageSync('human30_local_reports') || {}
          localReports[reportId] = {
            report: report,
            createdAt: Date.now()
          }
          wx.setStorageSync('human30_local_reports', localReports)
        } catch (err) {
          console.error('保存报告到本地存储失败:', err)
        }

        // 保存到Notion知识库
        const currentUser = app.globalData.currentUser
        const hasNotion = currentUser?.notionConfig?.databases?.knowledge

        if (hasNotion) {
          // 有Notion配置，保存并跳转到知识库
          this.saveReportToKnowledge(report, reportId)

          // 清除当前会话
          wx.removeStorageSync('current_assessment_session')

          // 提示并跳转到知识库
          wx.showModal({
            title: '评估完成',
            content: '报告已保存到知识库，是否立即查看？',
            confirmText: '查看报告',
            cancelText: '返回首页',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.switchTab({
                  url: '/pages/knowledge/knowledge'
                })
                // 延迟提示
                setTimeout(() => {
                  wx.showToast({
                    title: '请选择"评估报告"分类',
                    icon: 'none',
                    duration: 2500
                  })
                }, 800)
              } else {
                wx.switchTab({
                  url: '/pages/home/home'
                })
              }
            }
          })
        } else {
          // 没有Notion配置，提示用户
          wx.removeStorageSync('current_assessment_session')

          wx.showModal({
            title: '评估完成',
            content: '报告已生成。建议配置Notion后可以将报告保存到知识库长期查看。',
            confirmText: '配置Notion',
            cancelText: '返回首页',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({
                  url: '/pages/notion-config/notion-config'
                })
              } else {
                wx.switchTab({
                  url: '/pages/home/home'
                })
              }
            }
          })
        }
      } else {
        wx.showToast({
          title: '生成报告失败',
          icon: 'error'
        })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('生成报告失败:', err)
      wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    })
  },

  /**
   * 保存进度
   */
  saveProgress: function() {
    wx.showModal({
      title: '暂停保存',
      content: '评估进度已自动保存，下次打开时可继续。确定要退出吗？',
      confirmText: '退出',
      cancelText: '继续评估',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack()
        }
      }
    })
  },

  /**
   * 语音输入（占位，需要实现）
   */
  startVoiceInput: function() {
    wx.showToast({
      title: '语音输入功能开发中',
      icon: 'none'
    })
  },

  stopVoiceInput: function() {
    this.setData({ isRecording: false })
  },

  /**
   * 保存报告到Notion知识库
   */
  saveReportToKnowledge: async function(report, reportId) {
    try {
      const currentUser = app.globalData.currentUser
      if (!currentUser || !currentUser.notionConfig) {
        console.log('未配置Notion，跳过保存到知识库')
        return
      }

      const { apiKey, databases } = currentUser.notionConfig
      const knowledgeDatabaseId = databases?.knowledge

      if (!knowledgeDatabaseId) {
        console.log('未配置知识库，跳过保存')
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
      console.log('✅ 评估报告已保存到知识库')

      // 显示成功提示（不阻塞）
      setTimeout(() => {
        wx.showToast({
          title: '已保存到知识库',
          icon: 'success',
          duration: 2000
        })
      }, 1000)

    } catch (err) {
      console.error('保存报告到知识库失败:', err)
      // 失败不影响主流程，只记录日志
    }
  }
})
