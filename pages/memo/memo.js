const app = getApp()
const userManager = require('../../utils/userManager.js')

Page({
  data: {
    recordMode: 'normal', // 'normal' | 'planning'
    inputType: 'text', // 'text' | 'voice'
    textContent: '',
    voiceContent: '',
    customTag: '',
    selectedTags: [],
    maxLength: 500,
    isRecording: false,
    isPlaying: false,
    recordingTime: 0,
    canSave: false,
    isSaving: false, // 防止重复提交
    availableTags: ['工作', '生活', '学习', '心情', '想法', '计划', '总结', '感悟'],
    // 时间选择相关
    timeMode: 'now', // 'now' | 'custom'
    customDate: '',
    customTime: '',
    customDateDisplay: '',
    customTimeDisplay: '',
    currentTimeDisplay: '',
    todayDate: '',
    textTemplates: [
      '今天感觉...',
      '学到了...',
      '计划明天...',
      '值得记录的是...',
      '反思一下...'
    ],
    planningTemplates: [
      '明天要完成...',
      '明天的重点任务：',
      '明天需要注意...',
      '明天的目标是...',
      '明天计划学习...',
      '明天要联系...'
    ],
    currentTemplates: []
  },

  // 录音管理器
  recorderManager: null,
  // 播放管理器
  innerAudioContext: null,
  // 录音定时器
  recordingTimer: null,
  // 临时录音文件路径
  tempFilePath: '',

  onLoad: function(options) {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }

    // 从参数获取输入类型和记录模式
    if (options.type) {
      this.setData({
        inputType: options.type
      })
    }
    
    if (options.mode) {
      this.setData({
        recordMode: options.mode
      })
    }

    // 初始化模板
    this.updateCurrentTemplates()

    // 初始化录音管理器
    this.initRecorderManager()
    
    // 初始化音频播放器
    this.initAudioContext()
    
    // 初始化时间
    this.initTimeSettings()
  },

  onShow: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      wx.reLaunch({
        url: '/pages/login/login'
      })
      return false
    }
    return true
  },

  onLoad: function(options) {
    // 初始化录音管理器
    this.initRecorderManager()
    this.initAudioContext()
  },

  onShow: function() {
    // 页面显示时重置某些状态
    this.updateCanSave()
  },

  onUnload: function() {
    // 清理资源
    this.cleanup()
  },

  // 初始化录音管理器
  initRecorderManager: function() {
    console.log('初始化录音管理器')
    this.recorderManager = wx.getRecorderManager()

    this.recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({ isRecording: true, recordingTime: 0 })
      this.startRecordingTimer()
    })

    this.recorderManager.onStop((res) => {
      console.log('录音结束', res)
      this.setData({ 
        isRecording: false,
        voiceContent: '录音完成，点击播放试听' // 临时文本
      })
      this.stopRecordingTimer()
      
      // 保存临时文件为永久文件
      this.saveAudioFile(res.tempFilePath)
      
      // 语音转文字（模拟实现）
      this.recognizeVoice(res.tempFilePath)
    })

    this.recorderManager.onError((err) => {
      console.error('录音错误', err)
      this.setData({ isRecording: false })
      this.stopRecordingTimer()
      wx.showToast({
        title: '录音失败',
        icon: 'error'
      })
    })
  },

  // 初始化音频播放器
  initAudioContext: function() {
    this.innerAudioContext = wx.createInnerAudioContext()
    
    this.innerAudioContext.onPlay(() => {
      this.setData({ isPlaying: true })
    })

    this.innerAudioContext.onEnded(() => {
      this.setData({ isPlaying: false })
    })

    this.innerAudioContext.onError((err) => {
      console.error('播放错误', err)
      this.setData({ isPlaying: false })
      wx.showToast({
        title: '播放失败',
        icon: 'error'
      })
    })
  },

  // 选择日常记录模式
  selectNormalMode: function() {
    this.setData({ recordMode: 'normal' })
    this.updateCurrentTemplates()
  },

  // 选择规划模式
  selectPlanningMode: function() {
    this.setData({ recordMode: 'planning' })
    this.updateCurrentTemplates()
  },

  // 更新当前模板
  updateCurrentTemplates: function() {
    const templates = this.data.recordMode === 'planning' 
      ? this.data.planningTemplates 
      : this.data.textTemplates
    
    this.setData({
      currentTemplates: templates
    })
  },

  // 初始化时间设置
  initTimeSettings: function() {
    const now = new Date()
    const todayStr = this.formatDate(now)
    const timeStr = this.formatTime(now)
    
    this.setData({
      customDate: todayStr,
      customTime: timeStr,
      customDateDisplay: this.formatDateDisplay(todayStr),
      customTimeDisplay: this.formatCustomTimeDisplay(todayStr, timeStr),
      currentTimeDisplay: this.formatCurrentTimeDisplay(now),
      todayDate: todayStr
    })
  },

  // 格式化日期 YYYY-MM-DD
  formatDate: function(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 格式化时间 HH:MM
  formatTime: function(date) {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  // 格式化日期显示
  formatDateDisplay: function(dateStr) {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
    return `${month}月${day}日 周${weekDay}`
  },

  // 格式化自定义时间显示
  formatCustomTimeDisplay: function(dateStr, timeStr) {
    const dateDisplay = this.formatDateDisplay(dateStr)
    return `${dateDisplay} ${timeStr}`
  },

  // 格式化当前时间显示
  formatCurrentTimeDisplay: function(date) {
    const timeStr = this.formatTime(date)
    return `现在 ${timeStr}`
  },

  // 选择时间模式
  selectTimeMode: function(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ timeMode: mode })
    
    if (mode === 'now') {
      // 更新当前时间显示
      const now = new Date()
      this.setData({
        currentTimeDisplay: this.formatCurrentTimeDisplay(now)
      })
    }
  },

  // 日期选择
  onDateChange: function(e) {
    const selectedDate = e.detail.value
    this.setData({
      customDate: selectedDate,
      customDateDisplay: this.formatDateDisplay(selectedDate),
      customTimeDisplay: this.formatCustomTimeDisplay(selectedDate, this.data.customTime)
    })
  },

  // 时间选择
  onTimeChange: function(e) {
    const selectedTime = e.detail.value
    this.setData({
      customTime: selectedTime,
      customTimeDisplay: this.formatCustomTimeDisplay(this.data.customDate, selectedTime)
    })
  },

  // 获取最终使用的时间戳
  getFinalTimestamp: function() {
    if (this.data.timeMode === 'custom') {
      // 使用自定义时间
      const dateTimeStr = `${this.data.customDate} ${this.data.customTime}:00`
      return new Date(dateTimeStr).getTime()
    } else {
      // 使用当前时间
      return new Date().getTime()
    }
  },

  // 选择文字输入
  selectTextInput: function() {
    this.setData({ inputType: 'text' })
  },

  // 选择语音输入
  selectVoiceInput: function() {
    this.setData({ inputType: 'voice' })
    this.checkRecordPermission()
  },

  // 检查录音权限
  checkRecordPermission: function() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              console.log('录音权限授权成功')
            },
            fail: () => {
              wx.showModal({
                title: '需要录音权限',
                content: '语音记录功能需要录音权限，请在设置中开启',
                showCancel: false
              })
            }
          })
        }
      }
    })
  },

  // 文本输入
  onTextInput: function(e) {
    this.setData({
      textContent: e.detail.value
    })
    this.updateCanSave()
  },

  // 使用文本模板
  useTemplate: function(e) {
    const template = e.currentTarget.dataset.template
    this.setData({
      textContent: this.data.textContent + template
    })
    this.updateCanSave()
  },

  // 开始录音
  startRecording: function() {
    if (this.data.isRecording) return

    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record']) {
          this.recorderManager.start({
            duration: 60000, // 最长60秒
            sampleRate: 16000, // 16kHz采样率，语音识别推荐
            numberOfChannels: 1, // 单声道
            encodeBitRate: 48000, // 降低码率以减少文件大小和成本
            format: 'mp3' // mp3格式兼容性好
          })
        } else {
          this.checkRecordPermission()
        }
      }
    })
  },

  // 停止录音
  stopRecording: function() {
    if (this.data.isRecording) {
      this.recorderManager.stop()
    }
  },

  // 取消录音
  cancelRecording: function() {
    if (this.data.isRecording) {
      this.recorderManager.stop()
      this.setData({
        isRecording: false,
        recordingTime: 0
      })
      this.stopRecordingTimer()
    }
  },

  // 开始录音计时
  startRecordingTimer: function() {
    this.recordingTimer = setInterval(() => {
      this.setData({
        recordingTime: this.data.recordingTime + 1
      })
    }, 1000)
  },

  // 停止录音计时
  stopRecordingTimer: function() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
    }
  },

  // 真实语音识别功能
  recognizeVoice: function(filePath) {
    wx.showLoading({ title: '语音转文字中...' })
    
    // 直接使用云函数进行语音识别（最稳定的方案）
    this.recognizeVoiceWithCloud(filePath)
  },

  // 使用云函数进行语音识别（主要方案）
  recognizeVoiceWithCloud: function(filePath) {
    wx.showLoading({ title: '语音转文字中...' })
    
    // 上传音频文件到云存储
    wx.cloud.uploadFile({
      cloudPath: `voice/${Date.now()}.mp3`,
      filePath: filePath,
      success: (uploadRes) => {
        console.log('音频上传成功:', uploadRes.fileID)
        
        // 调用云函数进行语音识别
        wx.cloud.callFunction({
          name: 'speechRecognition',
          data: {
            fileID: uploadRes.fileID
          },
          success: (res) => {
            wx.hideLoading()
            console.log('语音识别结果:', res.result)
            
            if (res.result && res.result.success && res.result.text) {
              this.setData({
                voiceContent: res.result.text,
                showVoiceToText: true
              })
              
              // 如果是模拟结果，提示用户可以编辑
              if (res.result.source === 'mock') {
                wx.showToast({
                  title: '请检查并编辑识别结果',
                  icon: 'none',
                  duration: 2000
                })
              } else {
                wx.showToast({
                  title: '识别成功',
                  icon: 'success'
                })
              }
            } else {
              this.fallbackToManualInput()
            }
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('云函数识别失败:', err)
            this.fallbackToManualInput()
          }
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('音频上传失败:', err)
        
        // 上传失败时直接提供手动输入选项
        wx.showModal({
          title: '音频上传失败',
          content: '网络连接异常，请检查网络后重试，或选择手动输入文字',
          confirmText: '手动输入',
          cancelText: '重试',
          success: (res) => {
            if (res.confirm) {
              this.fallbackToManualInput()
            } else {
              // 重试
              this.recognizeVoiceWithCloud(filePath)
            }
          }
        })
      }
    })
  },

  // 识别失败时的备用方案
  fallbackToManualInput: function() {
    this.setData({
      voiceContent: '语音识别失败，请手动输入文字或重新录制'
    })
    
    wx.showModal({
      title: '语音识别失败',
      content: '无法自动转换为文字，您可以手动编辑或重新录制',
      confirmText: '手动编辑',
      cancelText: '重新录制',
      success: (res) => {
        if (res.confirm) {
          // 切换到文本编辑模式
          this.setData({
            showVoiceToText: true
          })
        } else {
          // 重新录制
          this.reRecord()
        }
      }
    })
  },

  // 编辑语音识别结果
  onVoiceTextEdit: function(e) {
    this.setData({
      voiceContent: e.detail.value
    })
  },

  // 播放录音
  playRecording: function() {
    if (!this.tempFilePath) {
      wx.showToast({
        title: '没有录音文件',
        icon: 'error'
      })
      return
    }

    // 确保音频上下文已初始化
    if (!this.innerAudioContext) {
      this.initAudioContext()
    }

    if (this.data.isPlaying) {
      this.innerAudioContext.pause()
      this.setData({ isPlaying: false })
    } else {
      this.innerAudioContext.src = this.tempFilePath
      this.innerAudioContext.play()
    }
  },

  // 重新录制
  reRecord: function() {
    this.setData({
      voiceContent: '',
      recordingTime: 0,
      isPlaying: false
    })
    this.tempFilePath = ''
    this.innerAudioContext.stop()
  },


  // 切换标签选择
  toggleTag: function(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = [...this.data.selectedTags]
    
    const index = selectedTags.indexOf(tag)
    let action = ''
    
    if (index !== -1) {
      selectedTags.splice(index, 1)
      action = '移除'
    } else {
      selectedTags.push(tag)
      action = '添加'
    }
    
    this.setData({ selectedTags })
    
    // 提供视觉反馈
    wx.showToast({
      title: `${action}标签: ${tag}`,
      icon: 'success',
      duration: 1000
    })
  },

  // 自定义标签输入
  onCustomTagInput: function(e) {
    this.setData({
      customTag: e.detail.value
    })
  },

  // 添加自定义标签
  addCustomTag: function() {
    const customTag = this.data.customTag.trim()
    
    if (!customTag) {
      wx.showToast({
        title: '请输入标签内容',
        icon: 'none'
      })
      return
    }

    const selectedTags = [...this.data.selectedTags]
    if (selectedTags.indexOf(customTag) === -1) {
      selectedTags.push(customTag)
      
      // 同时添加到可用标签列表（避免重复）
      const availableTags = [...this.data.availableTags]
      if (availableTags.indexOf(customTag) === -1) {
        availableTags.push(customTag)
      }
      
      this.setData({
        selectedTags,
        availableTags,
        customTag: ''
      })
      
      wx.showToast({
        title: `添加标签: ${customTag}`,
        icon: 'success',
        duration: 1000
      })
    } else {
      wx.showToast({
        title: '标签已存在',
        icon: 'none',
        duration: 1500
      })
    }
  },

  // 保存备忘录
  saveMemo: function() {
    // 防止重复提交
    if (this.data.isSaving) {
      return
    }
    
    const content = this.data.inputType === 'text' ? this.data.textContent : this.data.voiceContent
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'error'
      })
      return
    }

    // 设置保存状态
    this.setData({ isSaving: true })

    // 获取最终时间戳（可能是当前时间或用户选择的时间）
    const finalTimestamp = this.getFinalTimestamp()
    
    const memo = {
      id: Date.now().toString(),
      content: content.trim(),
      type: this.data.inputType,
      recordMode: this.data.recordMode,
      tags: this.data.selectedTags,
      timestamp: finalTimestamp,
      audioPath: this.data.inputType === 'voice' ? this.tempFilePath : null,
      isPlanning: this.data.recordMode === 'planning'
    }

    console.log('准备保存备忘录:', memo)

    // 保存到应用数据（app.js中已经包含自动同步逻辑）
    app.saveMemo(memo)
    
    // 注释掉重复的同步调用，避免重复同步
    // this.syncToNotion(memo)

    wx.showToast({
      title: '保存成功',
      icon: 'success',
      complete: () => {
        // 重置保存状态
        this.setData({ isSaving: false })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    })
  },

  // 手动同步到Notion
  syncToNotion: async function(memo) {
    try {
      const userManager = require('../../utils/userManager.js')
      const apiService = require('../../utils/apiService.js')
      
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('没有当前用户，跳过Notion同步')
        return
      }

      console.log('开始同步到Notion:', currentUser.id, memo)
      
      const result = await apiService.syncUserMemoToNotion(currentUser.id, memo)
      
      if (result.success) {
        console.log('Notion同步成功:', result)
        // 静默同步，不显示成功提示，避免打扰用户
      } else {
        console.error('Notion同步失败:', result.error)
        // 只在同步失败时显示提示
        wx.showToast({
          title: 'Notion同步失败',
          icon: 'none',
          duration: 1500
        })
      }
    } catch (error) {
      console.error('同步到Notion异常:', error)
    }
  },

  // 清理资源
  cleanup: function() {
    this.stopRecordingTimer()
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  },

  // 计算是否可以保存
  updateCanSave: function() {
    const content = this.data.inputType === 'text' ? this.data.textContent : this.data.voiceContent
    const canSave = content && content.trim().length > 0
    this.setData({ canSave })
  }
})