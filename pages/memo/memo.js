const app = getApp()
const userManager = require('../../utils/userManager.js')
const MarkdownHelper = require('../../utils/markdownHelper.js')
const apiService = require('../../utils/apiService.js')
const tagManager = require('../../utils/tagManager.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    recordMode: 'normal', // 'normal' | 'planning'
    inputType: 'text', // 默认为文本输入类型
    textContent: '',
    // 价值分类内容
    neutralContent: '',    // 中性内容
    valuableContent: '',   // 有价值内容  
    wastefulContent: '',   // 无价值内容
    // 有价值时间投入统计
    valuableTimeEntries: [], // 格式: [{activity: '', minutes: 0, tags: []}]
    currentActivity: '',     // 当前正在添加的活动名称
    currentMinutes: '',      // 当前正在添加的分钟数
    currentActivityTags: [], // 当前活动的标签
    totalValuableMinutes: 0, // 总投入分钟数
    canAddTimeEntry: false,  // 是否可以添加时间投入
    // 中性活动时间投入统计
    neutralTimeEntries: [],  // 中性活动时间投入 [{activity: '', minutes: 0, tags: []}]
    currentNeutralActivity: '',
    currentNeutralMinutes: '',
    currentNeutralActivityTags: [],
    totalNeutralMinutes: 0,
    canAddNeutralTimeEntry: false,
    // 无价值活动时间投入统计
    wastefulTimeEntries: [], // 无价值活动时间投入 [{activity: '', minutes: 0, tags: []}]
    currentWastefulActivity: '',
    currentWastefulMinutes: '',
    currentWastefulActivityTags: [],
    totalWastefulMinutes: 0,
    canAddWastefulTimeEntry: false,
    customTag: '',
    currentCustomTag: '', // 当前输入的自定义标签
    selectedTags: [],
    maxLength: 500,
    // 语音输入相关
    isRecording: false,
    recordingTime: 0,
    currentVoiceType: '', // 当前正在录音的分类：'valuable'|'neutral'|'wasteful'|'planning'
    canSave: false,
    isSaving: false, // 防止重复提交
    editFromPage: 'timeline', // 编辑模式来源页面
    availableTags: [], // 将从tagManager加载用户标签
    // 时间选择相关
    selectedDateType: 'today', // 'today' | 'yesterday' | 'custom'
    startTimeIndex: 0, // 开始时间选项索引
    endTimeIndex: 1, // 结束时间选项索引
    startTimeDisplay: '', // 开始时间显示
    endTimeDisplay: '', // 结束时间显示
    selectedTimeDisplay: '', // 完整时间显示
    customDate: '',
    customDateDisplay: '',
    todayDate: '',
    timeOptions: [], // 时间选项数组
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
    currentTemplates: [],
    // 目标关联相关
    availableGoals: [],
    selectedGoalId: '',
    // 编辑模式相关
    isEditMode: false,
    editingMemoId: '',
    originalMemo: null,
    // 目标投入相关
    goalTimeInvestment: 60, // 默认60分钟(1小时)
    goalValueAssessment: 'medium', // 默认中等价值
    goalInvestmentNote: '',
    valueOptions: [
      { value: 'very_low', emoji: '😐', label: '收获很少' },
      { value: 'low', emoji: '🙂', label: '有一些收获' },
      { value: 'medium', emoji: '😊', label: '收获不错' },
      { value: 'high', emoji: '😄', label: '收获很大' },
      { value: 'very_high', emoji: '🤩', label: '超预期收获' }
    ]
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

    // 加载用户标签
    this.loadUserTags()

    // 检查是否为编辑模式
    if (options.editId) {
      this.initEditMode(options.editId)
    } else {
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
    }

    // 初始化模板
    this.updateCurrentTemplates()

    // 初始化录音管理器
    this.initRecorderManager()

    // 初始化音频播放器
    this.initAudioContext()

    // 初始化时间段设置
    this.initTimeSettings()

    // 加载可关联的目标
    this.loadAvailableGoals()
  },

  onShow: function() {
    console.log('memo page onShow called')

    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }

    // 重新加载用户标签（可能在其他页面有更新）
    this.loadUserTags()

    // 检查是否有通过全局数据传递的编辑参数（用于tabBar页面编辑）
    console.log('checking globalData.editMemo:', app.globalData.editMemo)
    if (app.globalData.editMemo) {
      const { editId, type, fromPage } = app.globalData.editMemo
      console.log('onShow: found edit params in globalData:', editId, type, 'from:', fromPage)

      // 记住来源页面用于取消编辑时返回
      this.setData({
        editFromPage: fromPage || 'timeline'
      })

      // 清除全局数据，避免重复触发
      app.globalData.editMemo = null

      // 初始化编辑模式
      console.log('calling initEditMode with editId:', editId)
      this.initEditMode(editId)
    } else {
      console.log('no edit params found in globalData')
    }

    // 重新加载目标数据，以防其他页面有更新
    this.loadAvailableGoals()

    // 更新保存按钮状态
    this.updateCanSave()
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

  // 加载用户标签
  loadUserTags: function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.email) {
      console.warn('用户未登录或邮箱不存在，使用默认标签')
      this.setData({
        availableTags: tagManager.getUserTags(null)
      })
      return
    }

    try {
      // 从tagManager加载用户标签
      const userTags = tagManager.getUserTags(currentUser.email)
      console.log(`加载用户 [${currentUser.email}] 标签:`, userTags)

      this.setData({
        availableTags: userTags
      })

      // 异步从云端加载最新标签
      tagManager.loadFromCloud(currentUser.email).then(cloudTags => {
        if (cloudTags && cloudTags.length > 0) {
          // 合并默认标签和云端标签
          const allTags = tagManager.getUserTags(currentUser.email)
          this.setData({
            availableTags: allTags
          })
          console.log('云端标签已同步:', allTags)
        }
      }).catch(err => {
        console.error('从云端加载标签失败:', err)
        // 不影响使用，已经加载了本地标签
      })
    } catch (error) {
      console.error('加载用户标签失败:', error)
      // 使用默认标签
      this.setData({
        availableTags: tagManager.getUserTags(null)
      })
    }
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
      console.log('录音结束', res, '当前语音类型:', this.data.currentVoiceType)
      this.setData({ 
        isRecording: false
      })
      this.stopRecordingTimer()
      
      // 保存临时文件路径
      this.tempFilePath = res.tempFilePath
      
      // 语音转文字（真实云函数实现）
      if (this.data.currentVoiceType) {
        this.recognizeVoice(res.tempFilePath)
      } else {
        wx.showToast({
          title: '录音类型未知',
          icon: 'error'
        })
      }
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
    
    // 生成时间选项 (早上6点到晚上11点，加晚睡时间段)
    const timeOptions = this.generateTimeOptions()
    
    // 获取当前时间对应的索引 (默认开始时间为当前时间前1小时)
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeValue = currentHour + (currentMinute >= 30 ? 0.5 : 0.0)
    
    // 找到最接近当前时间的索引
    let defaultStartIndex = 0
    let defaultEndIndex = 1
    
    for (let i = 0; i < timeOptions.length; i++) {
      if (timeOptions[i].value >= currentTimeValue) {
        // 找到第一个大于等于当前时间的选项，往前推1-2小时作为默认开始时间
        defaultStartIndex = Math.max(0, i - 2) // 往前推1小时(2个半小时选项)
        defaultEndIndex = Math.min(timeOptions.length - 1, defaultStartIndex + 2) // 默认选择1小时时间段
        break
      }
    }
    
    // 如果当前时间太早(6点前)或太晚(2:30后)，使用默认值
    if (defaultStartIndex === 0 && defaultEndIndex === 1 && timeOptions.length > 2) {
      defaultEndIndex = 2 // 默认选择1小时时间段
    }
    
    // 确保不超出范围
    if (defaultStartIndex >= timeOptions.length) defaultStartIndex = timeOptions.length - 2
    if (defaultEndIndex >= timeOptions.length) defaultEndIndex = timeOptions.length - 1
    
    this.setData({
      todayDate: todayStr,
      customDate: todayStr,
      customDateDisplay: this.formatDateDisplay(todayStr),
      timeOptions: timeOptions,
      startTimeIndex: defaultStartIndex,
      endTimeIndex: defaultEndIndex,
      startTimeDisplay: timeOptions[defaultStartIndex].label,
      endTimeDisplay: timeOptions[defaultEndIndex].label,
      selectedTimeDisplay: this.getSelectedTimeDisplay('today', defaultStartIndex, defaultEndIndex)
    })
  },

  // 生成时间选项 (6:00-23:30 半小时粒度 + 晚睡时间段)
  generateTimeOptions: function() {
    const options = []
    
    // 早上6点到晚上11点半 (主要活动时间，半小时粒度)
    for (let hour = 6; hour <= 23; hour++) {
      // 整点时间
      const timeStr1 = `${hour.toString().padStart(2, '0')}:00`
      const label1 = hour <= 12 ? `上午 ${timeStr1}` : 
                    hour <= 18 ? `下午 ${timeStr1}` : 
                    `晚上 ${timeStr1}`
      
      options.push({
        value: hour + 0.0, // 用小数表示半小时，如 6.0, 6.5, 7.0, 7.5
        time: timeStr1,
        label: label1
      })
      
      // 半小时时间
      const timeStr2 = `${hour.toString().padStart(2, '0')}:30`
      const label2 = hour <= 12 ? `上午 ${timeStr2}` : 
                    hour <= 18 ? `下午 ${timeStr2}` : 
                    `晚上 ${timeStr2}`
      
      options.push({
        value: hour + 0.5,
        time: timeStr2,
        label: label2
      })
    }
    
    // 晚睡时间段 (24:00, 24:30, 01:00, 01:30, 02:00, 02:30)
    const lateNightTimes = [
      { hour: 0, minute: 0, display: '24:00' },   // 次日0:00显示为24:00
      { hour: 0, minute: 30, display: '24:30' }, // 次日0:30显示为24:30
      { hour: 1, minute: 0, display: '01:00' },
      { hour: 1, minute: 30, display: '01:30' },
      { hour: 2, minute: 0, display: '02:00' },
      { hour: 2, minute: 30, display: '02:30' }
    ]
    
    lateNightTimes.forEach(time => {
      options.push({
        value: time.hour === 0 ? (24 + time.minute / 60) : (time.hour + time.minute / 60),
        time: time.display,
        label: `晚睡 ${time.display}`
      })
    })
    
    return options
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

  // 选择日期类型 (今天/昨天/其他日期)
  selectDateType: function(e) {
    const dateType = e.currentTarget.dataset.type
    let targetDate
    
    // 根据选择的日期类型确定目标日期
    switch (dateType) {
      case 'today':
        targetDate = new Date()
        break
      case 'yesterday':
        targetDate = new Date()
        targetDate.setDate(targetDate.getDate() - 1)
        break
      case 'custom':
        // 保持当前的customDate
        targetDate = new Date(this.data.customDate || this.data.todayDate)
        break
    }
    
    // 更新自定义日期显示
    const dateStr = this.formatDate(targetDate)
    const displayText = this.formatDateDisplay(dateStr)
    
    this.setData({
      selectedDateType: dateType,
      customDate: dateStr,
      customDateDisplay: displayText,
      selectedTimeDisplay: this.getSelectedTimeDisplay(dateType, this.data.startTimeIndex, this.data.endTimeIndex)
    })
  },

  // 开始时间选择
  onStartTimeChange: function(e) {
    const startIndex = parseInt(e.detail.value)
    let endIndex = this.data.endTimeIndex
    
    // 确保结束时间不早于开始时间
    if (endIndex <= startIndex) {
      endIndex = Math.min(startIndex + 1, this.data.timeOptions.length - 1)
    }
    
    this.setData({
      startTimeIndex: startIndex,
      endTimeIndex: endIndex,
      startTimeDisplay: this.data.timeOptions[startIndex].label,
      endTimeDisplay: this.data.timeOptions[endIndex].label,
      selectedTimeDisplay: this.getSelectedTimeDisplay(this.data.selectedDateType, startIndex, endIndex)
    })
  },

  // 结束时间选择
  onEndTimeChange: function(e) {
    const endIndex = parseInt(e.detail.value)
    let startIndex = this.data.startTimeIndex
    
    // 确保开始时间不晚于结束时间
    if (startIndex >= endIndex) {
      startIndex = Math.max(0, endIndex - 1)
    }
    
    this.setData({
      startTimeIndex: startIndex,
      endTimeIndex: endIndex,
      startTimeDisplay: this.data.timeOptions[startIndex].label,
      endTimeDisplay: this.data.timeOptions[endIndex].label,
      selectedTimeDisplay: this.getSelectedTimeDisplay(this.data.selectedDateType, startIndex, endIndex)
    })
  },

  // 获取选中时间的完整显示文本
  getSelectedTimeDisplay: function(dateType, startIndex, endIndex) {
    if (!this.data.timeOptions || this.data.timeOptions.length === 0) return '时间待定'
    
    let dateText = ''
    switch (dateType) {
      case 'today':
        dateText = '今天'
        break
      case 'yesterday':
        dateText = '昨天'
        break
      case 'custom':
        dateText = this.data.customDateDisplay || '指定日期'
        break
    }
    
    // 安全检查索引范围
    const validStartIndex = Math.min(Math.max(0, startIndex), this.data.timeOptions.length - 1)
    const validEndIndex = Math.min(Math.max(0, endIndex), this.data.timeOptions.length - 1)
    
    const startTime = this.data.timeOptions[validStartIndex]
    const endTime = this.data.timeOptions[validEndIndex]
    
    if (!startTime || !endTime) return `${dateText} 时间待定`
    
    return `${dateText} ${startTime.time}-${endTime.time}`
  },

  // 自定义日期选择
  onDateChange: function(e) {
    const selectedDate = e.detail.value
    const displayText = this.formatDateDisplay(selectedDate)
    
    this.setData({
      customDate: selectedDate,
      customDateDisplay: displayText,
      selectedTimeDisplay: this.getSelectedTimeDisplay('custom', this.data.startTimeIndex, this.data.endTimeIndex)
    })
  },

  // 获取最终使用的时间戳
  getFinalTimestamp: function() {
    // 明日规划模式：直接使用当前时间
    if (this.data.recordMode === 'planning') {
      return Date.now()
    }

    // 日常记录模式：基于选中的日期和开始时间计算时间戳
    let targetDate

    // 确定目标日期
    switch (this.data.selectedDateType) {
      case 'today':
        targetDate = new Date()
        break
      case 'yesterday':
        targetDate = new Date()
        targetDate.setDate(targetDate.getDate() - 1)
        break
      case 'custom':
        targetDate = new Date(this.data.customDate)
        break
      default:
        targetDate = new Date()
    }

    // 设置开始时间
    if (this.data.timeOptions && this.data.timeOptions[this.data.startTimeIndex]) {
      const startTimeOption = this.data.timeOptions[this.data.startTimeIndex]
      let timeValue = startTimeOption.value

      // 处理跨日情况 (晚睡时间段)
      if (timeValue >= 24) {
        targetDate.setDate(targetDate.getDate() + 1)
        timeValue = timeValue - 24
      }

      // 提取小时和分钟
      const hour = Math.floor(timeValue)
      const minute = (timeValue % 1) === 0.5 ? 30 : 0

      targetDate.setHours(hour, minute, 0, 0)
    }

    return targetDate.getTime()
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

  // 价值分类输入处理
  onValuableInput: function(e) {
    const content = e.detail.value
    this.setData({
      valuableContent: content,
      // 可选：提供格式化建议
      valuableContentFormatted: this.formatContentPreview(content)
    })
    this.updateCanSave()
  },

  onNeutralInput: function(e) {
    const content = e.detail.value
    this.setData({
      neutralContent: content,
      neutralContentFormatted: this.formatContentPreview(content)
    })
    this.updateCanSave()
  },

  onWastefulInput: function(e) {
    const content = e.detail.value
    this.setData({
      wastefulContent: content,
      wastefulContentFormatted: this.formatContentPreview(content)
    })
    this.updateCanSave()
  },

  // 格式化内容预览
  formatContentPreview: function(content) {
    if (!content) return ''
    
    try {
      // 自动格式化内容
      const formatted = MarkdownHelper.autoFormat(content)
      
      // 生成格式化建议
      const suggestions = MarkdownHelper.suggestFormatting(content)
      
      return {
        formatted: formatted,
        suggestions: suggestions,
        hasFormatting: formatted !== content
      }
    } catch (error) {
      console.error('格式化预览错误:', error)
      return { formatted: content, suggestions: [], hasFormatting: false }
    }
  },

  // 应用Markdown格式化
  applyMarkdownFormatting: function(contentType) {
    const contentMap = {
      'valuable': 'valuableContent',
      'neutral': 'neutralContent', 
      'wasteful': 'wastefulContent',
      'planning': 'textContent'
    }
    
    const contentField = contentMap[contentType]
    if (!contentField) return
    
    const originalContent = this.data[contentField]
    const formatted = MarkdownHelper.autoFormat(originalContent)
    
    if (formatted !== originalContent) {
      this.setData({
        [contentField]: formatted
      })
      
      wx.showToast({
        title: '格式已优化',
        icon: 'success',
        duration: 1000
      })
    } else {
      wx.showToast({
        title: '无需格式化',
        icon: 'none',
        duration: 1000
      })
    }
  },

  // 时间投入统计相关方法
  onActivityInput: function(e) {
    const activity = e.detail.value
    this.setData({
      currentActivity: activity
    })
    this.updateCanAddTimeEntry()
  },

  onMinutesInput: function(e) {
    const minutes = e.detail.value
    this.setData({
      currentMinutes: minutes
    })
    this.updateCanAddTimeEntry()
  },

  // 检查是否可以添加时间投入
  updateCanAddTimeEntry: function() {
    const activity = this.data.currentActivity.trim()
    const minutes = parseInt(this.data.currentMinutes)
    
    // 活动名称不为空，分钟数为正数且是5的倍数
    const canAdd = activity.length > 0 && 
                   minutes > 0 && 
                   minutes % 5 === 0 &&
                   minutes <= 300 // 最多5小时
    
    this.setData({
      canAddTimeEntry: canAdd
    })
  },

  // 切换活动标签
  // 显示标签选择器
  showTagSelector: function(e) {
    console.log('showTagSelector called', e)
    const index = e.currentTarget.dataset.index
    const type = e.currentTarget.dataset.type || 'valuable'

    console.log('index:', index, 'type:', type)

    let entries, entriesKey
    if (type === 'neutral') {
      entries = this.data.neutralTimeEntries
      entriesKey = 'neutralTimeEntries'
    } else if (type === 'wasteful') {
      entries = this.data.wastefulTimeEntries
      entriesKey = 'wastefulTimeEntries'
    } else {
      entries = this.data.valuableTimeEntries
      entriesKey = 'valuableTimeEntries'
    }

    const entry = entries[index]
    if (!entry) {
      console.error('未找到活动记录:', index)
      return
    }

    const currentTags = entry.tags || []
    console.log('当前标签:', currentTags)

    // 使用action-sheet显示标签选择
    const that = this
    wx.showActionSheet({
      itemList: this.data.availableTags.map(tag => {
        return currentTags.indexOf(tag) > -1 ? `✅ ${tag}` : tag
      }),
      success(res) {
        console.log('选择了标签索引:', res.tapIndex)
        const selectedTag = that.data.availableTags[res.tapIndex]
        const newEntries = [...entries]
        const tagIndex = currentTags.indexOf(selectedTag)

        if (!newEntries[index].tags) {
          newEntries[index].tags = []
        }

        if (tagIndex > -1) {
          // 移除标签
          newEntries[index].tags.splice(tagIndex, 1)
          console.log('移除标签:', selectedTag)
        } else {
          // 添加标签
          newEntries[index].tags.push(selectedTag)
          console.log('添加标签:', selectedTag)
        }

        that.setData({
          [entriesKey]: newEntries
        })

        wx.showToast({
          title: tagIndex > -1 ? '已移除标签' : '已添加标签',
          icon: 'success',
          duration: 1000
        })
      },
      fail(err) {
        console.error('showActionSheet失败:', err)
      }
    })
  },

  toggleActivityTag: function(e) {
    const tag = e.currentTarget.dataset.tag
    const type = e.currentTarget.dataset.type || 'valuable'

    let tagsKey, currentTags
    if (type === 'neutral') {
      tagsKey = 'currentNeutralActivityTags'
      currentTags = this.data.currentNeutralActivityTags
    } else if (type === 'wasteful') {
      tagsKey = 'currentWastefulActivityTags'
      currentTags = this.data.currentWastefulActivityTags
    } else {
      tagsKey = 'currentActivityTags'
      currentTags = this.data.currentActivityTags
    }

    const index = currentTags.indexOf(tag)
    let newTags = [...currentTags]
    let action = ''

    if (index > -1) {
      newTags.splice(index, 1)
      action = '移除'
    } else {
      newTags.push(tag)
      action = '添加'
    }

    this.setData({
      [tagsKey]: newTags
    })

    // 提供视觉反馈
    wx.showToast({
      title: `${action}标签: ${tag}`,
      icon: 'success',
      duration: 800
    })
  },

  // 自定义标签输入
  onCustomTagInput: function(e) {
    console.log('onCustomTagInput:', e.detail.value)
    this.setData({
      currentCustomTag: e.detail.value
    })
    console.log('currentCustomTag更新为:', this.data.currentCustomTag)
  },

  // 添加自定义标签
  addCustomTag: function(e) {
    console.log('addCustomTag called', e)
    const type = e.currentTarget.dataset.type || 'valuable'
    const customTag = this.data.currentCustomTag.trim()

    console.log('type:', type, 'customTag:', customTag)

    if (!customTag) {
      console.log('标签为空，返回')
      return
    }

    // 检查标签是否已存在
    if (this.data.availableTags.indexOf(customTag) > -1) {
      console.log('标签已存在')
      wx.showToast({
        title: '标签已存在',
        icon: 'none',
        duration: 1500
      })
      return
    }

    // 获取当前用户
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.email) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      })
      return
    }

    // 使用tagManager添加标签（会自动持久化）
    const success = tagManager.addTag(currentUser.email, customTag)

    if (!success) {
      wx.showToast({
        title: '标签添加失败',
        icon: 'error',
        duration: 1500
      })
      return
    }

    // 重新加载标签列表
    const newAvailableTags = tagManager.getUserTags(currentUser.email)
    console.log('新标签列表:', newAvailableTags)

    // 同时选中这个新标签
    let tagsKey, currentTags
    if (type === 'neutral') {
      tagsKey = 'currentNeutralActivityTags'
      currentTags = this.data.currentNeutralActivityTags
    } else if (type === 'wasteful') {
      tagsKey = 'currentWastefulActivityTags'
      currentTags = this.data.currentWastefulActivityTags
    } else {
      tagsKey = 'currentActivityTags'
      currentTags = this.data.currentActivityTags
    }

    const newCurrentTags = [...currentTags, customTag]
    console.log('当前选中标签:', newCurrentTags)

    this.setData({
      availableTags: newAvailableTags,
      [tagsKey]: newCurrentTags,
      currentCustomTag: ''
    })

    console.log('标签添加成功并已持久化')
    wx.showToast({
      title: '标签已添加',
      icon: 'success',
      duration: 1000
    })
  },

  // 添加时间投入记录（统一处理三种类型）
  addTimeEntry: function(e) {
    const type = e.currentTarget.dataset.type || 'valuable'

    let activity, minutes, tags, entries, totalKey, activityKey, minutesKey, tagsKey, canAddKey

    if (type === 'neutral') {
      if (!this.data.canAddNeutralTimeEntry) return
      activity = this.data.currentNeutralActivity.trim()
      minutes = parseInt(this.data.currentNeutralMinutes)
      tags = this.data.currentNeutralActivityTags
      entries = this.data.neutralTimeEntries
      totalKey = 'totalNeutralMinutes'
      activityKey = 'currentNeutralActivity'
      minutesKey = 'currentNeutralMinutes'
      tagsKey = 'currentNeutralActivityTags'
      canAddKey = 'canAddNeutralTimeEntry'
    } else if (type === 'wasteful') {
      if (!this.data.canAddWastefulTimeEntry) return
      activity = this.data.currentWastefulActivity.trim()
      minutes = parseInt(this.data.currentWastefulMinutes)
      tags = this.data.currentWastefulActivityTags
      entries = this.data.wastefulTimeEntries
      totalKey = 'totalWastefulMinutes'
      activityKey = 'currentWastefulActivity'
      minutesKey = 'currentWastefulMinutes'
      tagsKey = 'currentWastefulActivityTags'
      canAddKey = 'canAddWastefulTimeEntry'
    } else {
      if (!this.data.canAddTimeEntry) return
      activity = this.data.currentActivity.trim()
      minutes = parseInt(this.data.currentMinutes)
      tags = this.data.currentActivityTags
      entries = this.data.valuableTimeEntries
      totalKey = 'totalValuableMinutes'
      activityKey = 'currentActivity'
      minutesKey = 'currentMinutes'
      tagsKey = 'currentActivityTags'
      canAddKey = 'canAddTimeEntry'
    }

    // 检查是否已存在相同活动
    const existingIndex = entries.findIndex(entry => entry.activity === activity)

    let newEntries = [...entries]

    if (existingIndex !== -1) {
      // 如果活动已存在，累加时间并合并标签
      newEntries[existingIndex].minutes += minutes
      if (tags && tags.length > 0) {
        const existingTags = newEntries[existingIndex].tags || []
        newEntries[existingIndex].tags = [...new Set([...existingTags, ...tags])]
      }
      wx.showToast({
        title: `已累加到"${activity}"`,
        icon: 'success',
        duration: 1500
      })
    } else {
      // 添加新的时间投入记录
      newEntries.push({
        activity: activity,
        minutes: minutes,
        tags: tags || []
      })
      wx.showToast({
        title: '活动已添加',
        icon: 'success',
        duration: 1000
      })
    }

    // 计算总时间
    const totalMinutes = newEntries.reduce((sum, entry) => sum + entry.minutes, 0)

    // 构建更新数据对象
    const updateData = {}
    if (type === 'neutral') {
      updateData.neutralTimeEntries = newEntries
      updateData[totalKey] = totalMinutes
      updateData[activityKey] = ''
      updateData[minutesKey] = ''
      updateData[tagsKey] = []
      updateData[canAddKey] = false
    } else if (type === 'wasteful') {
      updateData.wastefulTimeEntries = newEntries
      updateData[totalKey] = totalMinutes
      updateData[activityKey] = ''
      updateData[minutesKey] = ''
      updateData[tagsKey] = []
      updateData[canAddKey] = false
    } else {
      updateData.valuableTimeEntries = newEntries
      updateData[totalKey] = totalMinutes
      updateData[activityKey] = ''
      updateData[minutesKey] = ''
      updateData[tagsKey] = []
      updateData[canAddKey] = false
    }

    this.setData(updateData)
    this.updateCanSave()
  },

  // 移除时间投入记录（统一处理三种类型）
  removeTimeEntry: function(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const type = e.currentTarget.dataset.type || 'valuable'

    let entries, entriesKey, totalKey, entry

    if (type === 'neutral') {
      entries = this.data.neutralTimeEntries
      entriesKey = 'neutralTimeEntries'
      totalKey = 'totalNeutralMinutes'
      entry = entries[index]
    } else if (type === 'wasteful') {
      entries = this.data.wastefulTimeEntries
      entriesKey = 'wastefulTimeEntries'
      totalKey = 'totalWastefulMinutes'
      entry = entries[index]
    } else {
      entries = this.data.valuableTimeEntries
      entriesKey = 'valuableTimeEntries'
      totalKey = 'totalValuableMinutes'
      entry = entries[index]
    }
    
    wx.showModal({
      title: '删除时间投入',
      content: `确定删除"${entry.activity}"的${entry.minutes}分钟投入记录吗？`,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const newEntries = entries.filter((_, i) => i !== index)
          const totalMinutes = newEntries.reduce((sum, entry) => sum + entry.minutes, 0)

          this.setData({
            [entriesKey]: newEntries,
            [totalKey]: totalMinutes
          })

          wx.showToast({
            title: '已删除',
            icon: 'success',
            duration: 1000
          })

          this.updateCanSave()
        }
      }
    })
  },

  // === 中性活动时间投入处理方法 ===
  onNeutralActivityInput: function(e) {
    const activity = e.detail.value
    this.setData({
      currentNeutralActivity: activity
    })
    this.updateCanAddNeutralTimeEntry()
  },

  onNeutralMinutesInput: function(e) {
    const minutes = e.detail.value
    this.setData({
      currentNeutralMinutes: minutes
    })
    this.updateCanAddNeutralTimeEntry()
  },

  updateCanAddNeutralTimeEntry: function() {
    const activity = this.data.currentNeutralActivity.trim()
    const minutes = parseInt(this.data.currentNeutralMinutes)
    
    const canAdd = activity.length > 0 && 
                   minutes > 0 && 
                   minutes % 5 === 0 &&
                   minutes <= 300
    
    this.setData({
      canAddNeutralTimeEntry: canAdd
    })
  },

  addNeutralTimeEntry: function() {
    if (!this.data.canAddNeutralTimeEntry) return
    
    const activity = this.data.currentNeutralActivity.trim()
    const minutes = parseInt(this.data.currentNeutralMinutes)
    
    const existingIndex = this.data.neutralTimeEntries.findIndex(
      entry => entry.activity === activity
    )
    
    let newEntries = [...this.data.neutralTimeEntries]
    
    if (existingIndex !== -1) {
      newEntries[existingIndex].minutes += minutes
      wx.showToast({
        title: `已累加到"${activity}"`,
        icon: 'success',
        duration: 1500
      })
    } else {
      newEntries.push({
        activity: activity,
        minutes: minutes
      })
      wx.showToast({
        title: '中性时间投入已添加',
        icon: 'success',
        duration: 1000
      })
    }
    
    const totalMinutes = newEntries.reduce((sum, entry) => sum + entry.minutes, 0)
    
    this.setData({
      neutralTimeEntries: newEntries,
      totalNeutralMinutes: totalMinutes,
      currentNeutralActivity: '',
      currentNeutralMinutes: '',
      canAddNeutralTimeEntry: false
    })
    
    this.updateCanSave()
  },

  removeNeutralTimeEntry: function(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const entry = this.data.neutralTimeEntries[index]
    
    wx.showModal({
      title: '删除时间投入',
      content: `确定删除"${entry.activity}"的${entry.minutes}分钟投入记录吗？`,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const newEntries = this.data.neutralTimeEntries.filter((_, i) => i !== index)
          const totalMinutes = newEntries.reduce((sum, entry) => sum + entry.minutes, 0)
          
          this.setData({
            neutralTimeEntries: newEntries,
            totalNeutralMinutes: totalMinutes
          })
          
          wx.showToast({
            title: '已删除',
            icon: 'success',
            duration: 1000
          })
          
          this.updateCanSave()
        }
      }
    })
  },

  // === 无价值活动时间投入处理方法 ===
  onWastefulActivityInput: function(e) {
    const activity = e.detail.value
    this.setData({
      currentWastefulActivity: activity
    })
    this.updateCanAddWastefulTimeEntry()
  },

  onWastefulMinutesInput: function(e) {
    const minutes = e.detail.value
    this.setData({
      currentWastefulMinutes: minutes
    })
    this.updateCanAddWastefulTimeEntry()
  },

  updateCanAddWastefulTimeEntry: function() {
    const activity = this.data.currentWastefulActivity.trim()
    const minutes = parseInt(this.data.currentWastefulMinutes)
    
    const canAdd = activity.length > 0 && 
                   minutes > 0 && 
                   minutes % 5 === 0 &&
                   minutes <= 300
    
    this.setData({
      canAddWastefulTimeEntry: canAdd
    })
  },

  addWastefulTimeEntry: function() {
    if (!this.data.canAddWastefulTimeEntry) return
    
    const activity = this.data.currentWastefulActivity.trim()
    const minutes = parseInt(this.data.currentWastefulMinutes)
    
    const existingIndex = this.data.wastefulTimeEntries.findIndex(
      entry => entry.activity === activity
    )
    
    let newEntries = [...this.data.wastefulTimeEntries]
    
    if (existingIndex !== -1) {
      newEntries[existingIndex].minutes += minutes
      wx.showToast({
        title: `已累加到"${activity}"`,
        icon: 'success',
        duration: 1500
      })
    } else {
      newEntries.push({
        activity: activity,
        minutes: minutes
      })
      wx.showToast({
        title: '低效时间投入已添加',
        icon: 'success',
        duration: 1000
      })
    }
    
    const totalMinutes = newEntries.reduce((sum, entry) => sum + entry.minutes, 0)
    
    this.setData({
      wastefulTimeEntries: newEntries,
      totalWastefulMinutes: totalMinutes,
      currentWastefulActivity: '',
      currentWastefulMinutes: '',
      canAddWastefulTimeEntry: false
    })
    
    this.updateCanSave()
  },

  removeWastefulTimeEntry: function(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const entry = this.data.wastefulTimeEntries[index]
    
    wx.showModal({
      title: '删除时间投入',
      content: `确定删除"${entry.activity}"的${entry.minutes}分钟投入记录吗？`,
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const newEntries = this.data.wastefulTimeEntries.filter((_, i) => i !== index)
          const totalMinutes = newEntries.reduce((sum, entry) => sum + entry.minutes, 0)
          
          this.setData({
            wastefulTimeEntries: newEntries,
            totalWastefulMinutes: totalMinutes
          })
          
          wx.showToast({
            title: '已删除',
            icon: 'success',
            duration: 1000
          })
          
          this.updateCanSave()
        }
      }
    })
  },

  // 使用文本模板
  useTemplate: function(e) {
    const template = e.currentTarget.dataset.template
    this.setData({
      textContent: this.data.textContent + template
    })
    this.updateCanSave()
  },

  // 切换语音输入（开始/停止）
  toggleVoiceInput: function(e) {
    const voiceType = e.currentTarget.dataset.type
    console.log('切换语音输入，类型:', voiceType, '当前录音状态:', this.data.isRecording)
    
    if (this.data.isRecording) {
      // 如果正在录音，则停止录音
      this.stopVoiceRecording()
    } else {
      // 如果未在录音，则开始录音
      this.startVoiceRecording(voiceType)
    }
  },

  // 开始语音录音
  startVoiceRecording: function(voiceType) {
    console.log('开始语音录音，类型:', voiceType)
    
    this.setData({
      currentVoiceType: voiceType
    })
    
    // 检查录音权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record']) {
          this.beginVoiceRecording()
        } else {
          // 请求录音权限
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.beginVoiceRecording()
            },
            fail: () => {
              wx.showModal({
                title: '需要录音权限',
                content: '语音输入需要麦克风权限，请在设置中开启',
                confirmText: '去设置',
                cancelText: '取消',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
            }
          })
        }
      }
    })
  },

  // 开始语音录音
  beginVoiceRecording: function() {
    if (this.data.isRecording) return
    
    console.log('开始录音...')
    wx.showToast({
      title: '开始录音...',
      icon: 'none',
      duration: 1000
    })
    
    this.setData({
      isRecording: true,
      recordingTime: 0
    })
    
    // 启动录音计时器
    this.recordingTimer = setInterval(() => {
      this.setData({
        recordingTime: this.data.recordingTime + 1
      })
      
      // 最长录音60秒
      if (this.data.recordingTime >= 60) {
        this.stopVoiceRecording()
      }
    }, 1000)
    
    // 开始录音
    this.recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
      frameSize: 50
    })
  },

  // 停止语音录音
  stopVoiceRecording: function() {
    if (!this.data.isRecording) return
    
    console.log('停止录音...')
    this.setData({
      isRecording: false
    })
    
    // 清除计时器
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
    }
    
    // 停止录音
    this.recorderManager.stop()
    
    wx.showToast({
      title: '录音完成',
      icon: 'success',
      duration: 1000
    })
  },

  // 将语音识别结果填充到对应分类输入框
  fillVoiceTextToCategory: function(text) {
    const voiceType = this.data.currentVoiceType
    console.log('填充语音文本到分类:', voiceType, text)
    
    if (!text || !voiceType) return
    
    // 根据不同的语音类型填充到对应的输入框
    switch(voiceType) {
      case 'valuable':
        this.setData({
          valuableContent: (this.data.valuableContent + ' ' + text).trim()
        })
        break
      case 'neutral':
        this.setData({
          neutralContent: (this.data.neutralContent + ' ' + text).trim()
        })
        break
      case 'wasteful':
        this.setData({
          wastefulContent: (this.data.wastefulContent + ' ' + text).trim()
        })
        break
      case 'planning':
        this.setData({
          textContent: (this.data.textContent + ' ' + text).trim()
        })
        break
      default:
        console.warn('未知的语音类型:', voiceType)
    }
    
    // 清空当前语音类型
    this.setData({
      currentVoiceType: ''
    })
    
    // 更新保存状态
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
              // 标记为语音输入类型
              this.setData({ inputType: 'voice' })
              
              // 根据当前语音类型填充到对应的输入框
              this.fillVoiceTextToCategory(res.result.text)
              
              // 如果是模拟结果，提示用户可以编辑
              if (res.result.source === 'mock') {
                wx.showToast({
                  title: '请检查并编辑识别结果',
                  icon: 'none',
                  duration: 2000
                })
              } else {
                wx.showToast({
                  title: '语音输入成功',
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
            
            // 如果是 access_token 相关错误，重新初始化并重试
            if (err.errMsg && (err.errMsg.includes('access_token') || err.errMsg.includes('token'))) {
              console.log('云函数调用失败，可能是 token 问题，重新初始化...')
              this.refreshCloudTokenAndRetry(filePath)
            } else {
              this.fallbackToManualInput()
            }
          }
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('音频上传失败:', err)
        
        // 如果是 access_token 过期，尝试重新初始化云环境并重试
        if (err.message && err.message.includes('access_token expired')) {
          console.log('检测到 access_token 过期，重新初始化云环境...')
          this.refreshCloudTokenAndRetry(filePath)
        } else {
          // 其他错误，提供重试或手动输入选项
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
      }
    })
  },

  // 刷新云环境 token 并重试
  refreshCloudTokenAndRetry: function(filePath) {
    const app = getApp()
    
    wx.showLoading({ title: '重新连接云服务...' })
    
    // 重新初始化云环境
    try {
      const envId = app.globalData.cloudEnvId || 'yjxs-8gmvazxg8a03a0f3'
      
      wx.cloud.init({
        env: envId,
        traceUser: true
      })
      
      // 等待一下再重试
      setTimeout(() => {
        wx.hideLoading()
        console.log('云环境重新初始化完成，重试语音识别...')
        
        wx.showToast({
          title: '重新连接成功，正在重试...',
          icon: 'none',
          duration: 2000
        })
        
        // 重试语音识别
        setTimeout(() => {
          this.recognizeVoiceWithCloud(filePath)
        }, 1000)
      }, 1500)
      
    } catch (error) {
      wx.hideLoading()
      console.error('重新初始化云环境失败:', error)
      
      wx.showModal({
        title: '云服务连接失败',
        content: '无法重新连接云服务，请选择手动输入或稍后重试',
        confirmText: '手动输入',
        cancelText: '稍后重试',
        success: (res) => {
          if (res.confirm) {
            this.fallbackToManualInput()
          }
        }
      })
    }
  },

  // 识别失败时的备用方案
  fallbackToManualInput: function() {
    wx.showModal({
      title: '切换到手动输入',
      content: '语音识别暂时不可用，您可以直接在输入框中输入文字',
      confirmText: '知道了',
      showCancel: false,
      success: () => {
        // 清空当前语音类型，让用户可以正常输入文字
        this.setData({
          currentVoiceType: ''
        })
      }
    })
  },

  // 原有的备用方案保持不变
  fallbackToManualInputOld: function() {
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

  // 解析内容用于编辑
  parseContentForEdit: function(content, type, recordMode) {
    const result = {
      textContent: '',
      voiceContent: '',
      neutralContent: '',
      valuableContent: '',
      wastefulContent: ''
    }
    
    // 如果type未定义，根据内容结构推断类型
    if (!type) {
      type = 'text' // 默认为文本类型
    }
    
    if (type === 'voice') {
      result.voiceContent = content
      return result
    }
    
    if (recordMode === 'planning') {
      result.textContent = content
      return result
    }
    
    // 解析价值分类内容（正常模式的文本记录）
    if (content.includes('🌟 有价值的活动：')) {
      // 这是新格式的记录，需要拆分
      const sections = content.split('\n\n')
      
      sections.forEach(section => {
        if (section.startsWith('🌟 有价值的活动：')) {
          result.valuableContent = section.replace('🌟 有价值的活动：\n', '')
        } else if (section.startsWith('😐 中性的活动：')) {
          result.neutralContent = section.replace('😐 中性的活动：\n', '')
        } else if (section.startsWith('🗑️ 低效的活动：')) {
          result.wastefulContent = section.replace('🗑️ 低效的活动：\n', '')
        }
      })
    } else {
      // 这是旧格式的记录，放到中性内容中
      result.neutralContent = content
    }
    
    return result
  },

  // 获取最终的合并内容
  getFinalContent: function() {
    if (this.data.recordMode === 'planning') {
      return this.data.textContent
    }
    
    // 正常模式：合并三个分类的内容
    const parts = []
    
    if (this.data.valuableContent && this.data.valuableContent.trim()) {
      parts.push(`🌟 有价值的活动：\n${this.data.valuableContent.trim()}`)
    }
    
    if (this.data.neutralContent && this.data.neutralContent.trim()) {
      parts.push(`😐 中性的活动：\n${this.data.neutralContent.trim()}`)
    }
    
    if (this.data.wastefulContent && this.data.wastefulContent.trim()) {
      parts.push(`🗑️ 低效的活动：\n${this.data.wastefulContent.trim()}`)
    }
    
    return parts.join('\n\n')
  },

  // 保存备忘录
  saveMemo: async function() {
    // 防止重复提交
    if (this.data.isSaving) {
      return
    }

    // 获取最终内容
    const finalContent = this.getFinalContent()

    if (!finalContent.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'error'
      })
      return
    }

    // 设置保存状态
    this.setData({ isSaving: true })

    // 获取当前用户和Notion配置
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      wx.showToast({
        title: '用户未登录',
        icon: 'error'
      })
      this.setData({ isSaving: false })
      return
    }

    const notionConfig = currentUser.notionConfig
    if (!notionConfig || !notionConfig.apiKey || !notionConfig.mainRecordsDatabaseId) {
      wx.showToast({
        title: 'Notion未配置，保存到本地',
        icon: 'none'
      })
      // 降级到本地存储
      await this.saveToLocal()
      return
    }

    // 获取最终时间戳
    const finalTimestamp = this.getFinalTimestamp()
    const timestamp = new Date(finalTimestamp)

    try {
      // 准备Main Record数据
      const recordData = {
        title: this.data.recordMode === 'planning' ? '明日规划' : '每日记录',
        content: finalContent.trim(),
        date: timestamp.toISOString().split('T')[0],
        recordType: this.data.recordMode === 'planning' ? '明日规划' : '日常记录',
        timePeriod: this.getTimePeriod(timestamp),
        tags: this.data.selectedTags,
        relatedGoalId: this.data.selectedGoalId || null
      }

      let mainRecordResult

      if (this.data.isEditMode && this.data.originalMemo.notionPageId) {
        // 编辑模式：更新现有Main Record (暂不支持，先创建新的)
        console.warn('编辑模式暂时创建新记录而非更新')
      }

      // 使用前端直接调用创建Main Record（绕过云函数网络限制）
      const mainDatabaseId = notionConfig.mainRecordsDatabaseId || notionConfig.mainDatabaseId
      if (!mainDatabaseId) {
        throw new Error('未配置主记录表数据库ID')
      }

      const properties = {
        'Title': {
          title: [{ text: { content: recordData.title } }]
        },
        'Content': {
          rich_text: [{ text: { content: recordData.content || '' } }]
        },
        'Date': {
          date: { start: recordData.date }
        },
        'Record Type': {
          select: { name: recordData.recordType || '日常记录' }
        },
        'Time Period': {
          select: { name: recordData.timePeriod || '上午' }
        },
        'User ID': {
          rich_text: [{ text: { content: currentUser.email } }]
        }
      }

      // 添加标签
      if (recordData.tags && recordData.tags.length > 0) {
        properties['Tags'] = {
          multi_select: recordData.tags.map(tag => ({ name: tag }))
        }
      }

      const pageData = {
        parent: { database_id: mainDatabaseId },
        properties: properties
      }

      console.log('创建Main Record - 数据库ID:', mainDatabaseId)
      console.log('创建Main Record - properties:', properties)

      mainRecordResult = await notionApiService.createPageGeneric(pageData, notionConfig.apiKey)

      if (!mainRecordResult.success) {
        throw new Error(mainRecordResult.error || '创建Main Record失败')
      }

      const mainRecordId = mainRecordResult.pageId || mainRecordResult.data?.id

      if (!mainRecordId) {
        console.error('未获取到mainRecordId:', mainRecordResult)
        throw new Error('创建主记录成功但未返回页面ID')
      }

      console.log('主记录创建成功，ID:', mainRecordId)

      // 创建Activity Details（时间投入记录）
      await this.createActivityDetails(
        notionConfig,
        mainRecordId,
        timestamp,
        currentUser.email
      )

      // 保存成功，同步到本地存储
      const memo = {
        id: this.data.isEditMode ? this.data.originalMemo.id : 'memo_' + Date.now(),
        content: finalContent.trim(),
        type: this.data.inputType,
        recordMode: this.data.recordMode,
        tags: this.data.selectedTags,
        timestamp: finalTimestamp,
        isPlanning: this.data.recordMode === 'planning',
        userId: currentUser.id,
        notionPageId: mainRecordId,
        valuableTimeEntries: this.data.valuableTimeEntries || [],
        neutralTimeEntries: this.data.neutralTimeEntries || [],
        wastefulTimeEntries: this.data.wastefulTimeEntries || [],
        relatedGoalId: this.data.selectedGoalId
      }

      if (this.data.isEditMode) {
        app.updateMemo(memo)
      } else {
        app.saveMemo(memo)
      }

      // 如果是规划模式，创建待办
      if (this.data.recordMode === 'planning') {
        const todoItems = this.splitPlanningContent(memo.content)
        if (todoItems.length > 0) {
          this.createTodosFromPlanning(memo, todoItems)
        }
      }

      wx.showToast({
        title: this.data.isEditMode ? '更新成功' : '保存成功',
        icon: 'success',
        complete: () => {
          this.setData({ isSaving: false })
          this.resetForm()
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      })

    } catch (error) {
      console.error('保存到Notion失败:', error)
      wx.showToast({
        title: '保存失败：' + error.message,
        icon: 'none',
        duration: 2000
      })
      this.setData({ isSaving: false })
    }
  },

  // 获取时间段
  getTimePeriod: function(date) {
    const hour = date.getHours()
    if (hour >= 5 && hour < 8) return '早晨'
    if (hour >= 8 && hour < 12) return '上午'
    if (hour >= 12 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 22) return '晚上'
    return '深夜'
  },

  // 创建Activity Details
  createActivityDetails: async function(notionConfig, mainRecordId, timestamp, userEmail) {
    const allEntries = [
      ...this.data.valuableTimeEntries.map(e => ({ ...e, type: '有价值' })),
      ...this.data.neutralTimeEntries.map(e => ({ ...e, type: '中性' })),
      ...this.data.wastefulTimeEntries.map(e => ({ ...e, type: '低效' }))
    ]

    const activityDatabaseId = notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId
    if (!activityDatabaseId) {
      console.warn('未配置活动明细表数据库ID，跳过活动记录')
      return
    }

    for (const entry of allEntries) {
      try {
        const properties = {
          'Name': {
            title: [{ text: { content: entry.activity } }]
          },
          'Description': {
            rich_text: [{ text: { content: `${entry.type}活动，投入${entry.minutes}分钟` } }]
          },
          'Start Time': {
            date: { start: timestamp.toISOString() }
          },
          'End Time': {
            date: { start: new Date(timestamp.getTime() + entry.minutes * 60000).toISOString() }
          },
          'Duration': {
            number: entry.minutes
          },
          'Activity Type': {
            select: { name: entry.type === '有价值' ? '学习' : (entry.type === '中性' ? '生活' : '休息') }
          },
          'User ID': {
            rich_text: [{ text: { content: userEmail } }]
          }
        }

        // 添加标签
        if (entry.tags && entry.tags.length > 0) {
          properties['Tags'] = {
            multi_select: entry.tags.map(tag => ({ name: tag }))
          }
        }

        // 添加关联的主记录
        if (mainRecordId) {
          properties['Related Main Record'] = {
            relation: [{ id: mainRecordId }]
          }
        }

        // 添加关联的目标
        if (this.data.selectedGoalId) {
          properties['Related Goal'] = {
            relation: [{ id: this.data.selectedGoalId }]
          }
        }

        const pageData = {
          parent: { database_id: activityDatabaseId },
          properties: properties
        }

        const result = await notionApiService.createPageGeneric(pageData, notionConfig.apiKey)

        if (!result.success) {
          console.error('创建Activity失败:', result.error)
        } else {
          console.log('Activity创建成功，ID:', result.pageId)
        }

      } catch (error) {
        console.error('创建Activity Detail失败:', error)
      }
    }
  },

  // 降级到本地存储
  saveToLocal: async function() {
    const finalContent = this.getFinalContent()
    const finalTimestamp = this.getFinalTimestamp()
    const currentUser = userManager.getCurrentUser()

    const memo = {
      id: this.data.isEditMode ? this.data.originalMemo.id : 'memo_' + Date.now(),
      content: finalContent.trim(),
      type: this.data.inputType,
      recordMode: this.data.recordMode,
      tags: this.data.selectedTags,
      timestamp: finalTimestamp,
      isPlanning: this.data.recordMode === 'planning',
      userId: currentUser?.id || 'default_user',
      valuableTimeEntries: this.data.valuableTimeEntries || [],
      neutralTimeEntries: this.data.neutralTimeEntries || [],
      wastefulTimeEntries: this.data.wastefulTimeEntries || [],
      relatedGoalId: this.data.selectedGoalId
    }

    try {
      if (this.data.isEditMode) {
        app.updateMemo(memo)
      } else {
        app.saveMemo(memo)
      }

      // 如果是规划模式，创建待办
      if (this.data.recordMode === 'planning') {
        const todoItems = this.splitPlanningContent(memo.content)
        if (todoItems.length > 0) {
          this.createTodosFromPlanning(memo, todoItems)
        }
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success',
        complete: () => {
          this.setData({ isSaving: false })
          this.resetForm()
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      })
    } catch (error) {
      console.error('保存到本地失败:', error)
      this.setData({ isSaving: false })
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
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
    let canSave = false
    
    if (this.data.recordMode === 'planning') {
      // 规划模式检查textContent
      canSave = this.data.textContent && this.data.textContent.trim().length > 0
    } else {
      // 正常模式检查三个分类内容，至少有一个不为空
      const hasValuable = this.data.valuableContent && this.data.valuableContent.trim().length > 0
      const hasNeutral = this.data.neutralContent && this.data.neutralContent.trim().length > 0
      const hasWasteful = this.data.wastefulContent && this.data.wastefulContent.trim().length > 0
      canSave = hasValuable || hasNeutral || hasWasteful
    }
    
    this.setData({ canSave })
  },

  // 加载可关联的目标
  loadAvailableGoals: function() {
    try {
      // 只获取进行中的目标
      const goals = app.getGoals().filter(goal => goal.status === 'active')
      this.setData({
        availableGoals: goals
      })
    } catch (error) {
      console.error('加载可关联目标失败:', error)
      this.setData({
        availableGoals: []
      })
    }
  },

  // 选择关联目标
  selectGoal: function(e) {
    const goalId = e.currentTarget.dataset.goalId
    const currentSelected = this.data.selectedGoalId
    
    // 如果已经选中，则取消选择
    if (currentSelected === goalId) {
      this.setData({
        selectedGoalId: ''
      })
    } else {
      this.setData({
        selectedGoalId: goalId
      })
    }
  },

  // 清除目标选择
  clearGoalSelection: function() {
    this.setData({
      selectedGoalId: '',
      goalTimeInvestment: 60,
      goalValueAssessment: 'medium',
      goalInvestmentNote: ''
    })
  },

  // 时间投入变更
  onTimeInvestmentChange: function(e) {
    this.setData({
      goalTimeInvestment: e.detail.value
    })
  },

  // 价值评估选择
  selectValueAssessment: function(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      goalValueAssessment: value
    })
  },

  // 投入说明输入
  onInvestmentNoteInput: function(e) {
    this.setData({
      goalInvestmentNote: e.detail.value
    })
  },

  // 重置表单
  resetForm: function() {
    // 重新初始化时间设置
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeValue = currentHour + (currentMinute >= 30 ? 0.5 : 0.0)
    let defaultStartIndex = 0
    let defaultEndIndex = 1
    
    if (this.data.timeOptions && this.data.timeOptions.length > 0) {
      // 找到最接近当前时间的索引
      for (let i = 0; i < this.data.timeOptions.length; i++) {
        if (this.data.timeOptions[i].value >= currentTimeValue) {
          // 往前推1小时作为默认开始时间
          defaultStartIndex = Math.max(0, i - 2) // 2个半小时选项 = 1小时
          defaultEndIndex = Math.min(this.data.timeOptions.length - 1, defaultStartIndex + 2) // 默认1小时时间段
          break
        }
      }
    }
    
    this.setData({
      inputType: 'text', // 重置为默认文本输入
      textContent: '',
      voiceContent: '',
      neutralContent: '',
      valuableContent: '',
      wastefulContent: '',
      selectedTags: [],
      customTag: '',
      selectedGoalId: '',
      goalTimeInvestment: 60,
      goalValueAssessment: 'medium',
      goalInvestmentNote: '',
      // 重置时间投入统计数据
      valuableTimeEntries: [],
      currentActivity: '',
      currentMinutes: '',
      totalValuableMinutes: 0,
      canAddTimeEntry: false,
      selectedDateType: 'today',
      startTimeIndex: defaultStartIndex,
      endTimeIndex: defaultEndIndex,
      startTimeDisplay: this.data.timeOptions && this.data.timeOptions[defaultStartIndex] ? 
        this.data.timeOptions[defaultStartIndex].label : '上午 06:00',
      endTimeDisplay: this.data.timeOptions && this.data.timeOptions[defaultEndIndex] ? 
        this.data.timeOptions[defaultEndIndex].label : '上午 07:00',
      selectedTimeDisplay: this.getSelectedTimeDisplay('today', defaultStartIndex, defaultEndIndex),
      canSave: false,
      isEditMode: false,
      editingMemoId: '',
      originalMemo: null
    })
    
    // 清理录音相关状态
    if (this.tempFilePath) {
      this.tempFilePath = ''
    }
    this.setData({
      isRecording: false,
      isPlaying: false,
      recordingTime: 0
    })
  },

  // 初始化编辑模式
  initEditMode: function(memoId) {
    console.log('initEditMode called with memoId:', memoId)
    const memoList = app.getMemoList()
    console.log('total memos in list:', memoList.length)
    const memo = memoList.find(m => m.id === memoId)
    console.log('found memo:', memo)
    
    if (!memo) {
      console.error('memo not found for id:', memoId)
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      })
      // 重置表单到新建状态
      this.resetForm()
      return
    }

    // 格式化原始时间和时间段
    const memoDate = new Date(memo.timestamp)
    const dateStr = this.formatDate(memoDate)
    const displayText = this.formatDateDisplay(dateStr)
    
    // 确定日期类型
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    let selectedDateType = 'custom'
    if (dateStr === this.formatDate(today)) {
      selectedDateType = 'today'
    } else if (dateStr === this.formatDate(yesterday)) {
      selectedDateType = 'yesterday'
    }
    
    // 获取对应的时间索引 (根据记录时间找到最接近的时间选项)
    const memoHour = memoDate.getHours()
    const memoMinute = memoDate.getMinutes()
    const memoTimeValue = memoHour + (memoMinute >= 30 ? 0.5 : 0.0)
    let startTimeIndex = 0
    let endTimeIndex = 1
    
    // 根据记录时间找到最接近的时间索引
    if (this.data.timeOptions && this.data.timeOptions.length > 0) {
      for (let i = 0; i < this.data.timeOptions.length; i++) {
        const option = this.data.timeOptions[i]
        // 精确匹配时间值，包括半小时
        if (Math.abs(option.value - memoTimeValue) < 0.1 || 
            (option.value > 24 && Math.abs(option.value - 24 - memoTimeValue) < 0.1)) {
          startTimeIndex = i
          endTimeIndex = Math.min(i + 2, this.data.timeOptions.length - 1) // 默认1小时时间段
          break
        }
      }
    } else {
      // 如果timeOptions还没有初始化，使用默认值
      startTimeIndex = 0
      endTimeIndex = 1
    }

    // 设置编辑模式数据
    console.log('setting edit mode data for memo:', memo.content)
    console.log('memo type:', memo.type, 'content:', memo.content)
    
    // 解析内容到对应字段
    const parsedContent = this.parseContentForEdit(memo.content, memo.type, memo.recordMode)
    
    // 计算已有时间投入数据的总时间
    const existingTimeEntries = memo.valuableTimeEntries || []
    const existingTotalMinutes = existingTimeEntries.reduce((sum, entry) => sum + (entry.minutes || 0), 0)
    
    this.setData({
      isEditMode: true,
      editingMemoId: memoId,
      originalMemo: memo,
      inputType: memo.type,
      recordMode: memo.recordMode || 'normal',
      textContent: parsedContent.textContent,
      voiceContent: parsedContent.voiceContent,
      neutralContent: parsedContent.neutralContent,
      valuableContent: parsedContent.valuableContent,
      wastefulContent: parsedContent.wastefulContent,
      selectedTags: memo.tags || [],
      selectedGoalId: memo.relatedGoalId || '',
      goalTimeInvestment: memo.goalTimeInvestment || 60,
      goalValueAssessment: memo.goalValueAssessment || 'medium',
      goalInvestmentNote: memo.goalInvestmentNote || '',
      // 加载已有的时间投入数据
      valuableTimeEntries: existingTimeEntries,
      totalValuableMinutes: existingTotalMinutes,
      selectedDateType: selectedDateType,
      customDate: dateStr,
      customDateDisplay: displayText,
      startTimeIndex: startTimeIndex,
      endTimeIndex: endTimeIndex,
      startTimeDisplay: this.data.timeOptions && this.data.timeOptions[startTimeIndex] ? 
        this.data.timeOptions[startTimeIndex].label : '上午 06:00',
      endTimeDisplay: this.data.timeOptions && this.data.timeOptions[endTimeIndex] ? 
        this.data.timeOptions[endTimeIndex].label : '上午 07:00',
      selectedTimeDisplay: this.getSelectedTimeDisplay(selectedDateType, startTimeIndex, endTimeIndex)
    })
    
    console.log('after setData, textContent should be:', memo.type === 'text' ? memo.content : '')
    console.log('current page data textContent:', this.data.textContent)

    // 如果是语音记录，设置音频路径
    if (memo.type === 'voice' && memo.audioPath) {
      this.tempFilePath = memo.audioPath
    }

    // 更新模板
    this.updateCurrentTemplates()
    
    // 更新保存状态
    this.updateCanSave()

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '编辑记录'
    })
  },

  // 处理目标关联变更
  handleGoalLinkChange: function(memo) {
    const originalGoalId = this.data.originalMemo.relatedGoalId
    const newGoalId = memo.relatedGoalId
    const originalTimeInvestment = this.data.originalMemo.goalTimeInvestment || 0
    const newTimeInvestment = memo.goalTimeInvestment || 0

    // 如果目标关联发生了变化
    if (originalGoalId !== newGoalId) {
      try {
        // 从原目标中移除关联和时间投入
        if (originalGoalId) {
          app.unlinkMemoFromGoal(originalGoalId, memo.id)
          if (originalTimeInvestment > 0) {
            app.subtractGoalTimeInvestment(originalGoalId, originalTimeInvestment)
          }
        }
        
        // 添加到新目标
        if (newGoalId) {
          app.linkMemoToGoal(newGoalId, memo.id)
          if (newTimeInvestment > 0) {
            app.addGoalTimeInvestment(newGoalId, newTimeInvestment)
          }
        }
      } catch (error) {
        console.error('目标关联变更失败:', error)
      }
    } else if (originalGoalId && originalTimeInvestment !== newTimeInvestment) {
      // 目标关联没变，但时间投入发生了变化
      try {
        const timeDiff = newTimeInvestment - originalTimeInvestment
        if (timeDiff > 0) {
          app.addGoalTimeInvestment(originalGoalId, timeDiff)
        } else if (timeDiff < 0) {
          app.subtractGoalTimeInvestment(originalGoalId, Math.abs(timeDiff))
        }
      } catch (error) {
        console.error('时间投入变更失败:', error)
      }
    }
  },

  // 格式化日期显示
  formatDateDisplay: function(dateStr) {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 取消编辑
  cancelEdit: function() {
    console.log('cancel edit clicked, from page:', this.data.editFromPage)
    
    // 确认是否取消编辑
    wx.showModal({
      title: '确认取消',
      content: '取消编辑将丢失未保存的修改，确定要取消吗？',
      confirmText: '确定取消',
      cancelText: '继续编辑',
      success: (res) => {
        if (res.confirm) {
          // 重置表单到新建状态
          this.resetForm()
          
          // 重置页面标题
          wx.setNavigationBarTitle({
            title: '语寄心声'
          })
          
          // 返回来源页面
          const fromPage = this.data.editFromPage
          if (fromPage === 'history') {
            wx.switchTab({
              url: '/pages/history/history'
            })
          } else {
            // 默认返回时间线页面
            wx.switchTab({
              url: '/pages/timeline/timeline'
            })
          }
        }
      }
    })
  },

  // 智能拆分规划内容
  splitPlanningContent: function(content) {
    // 按换行符拆分
    const lines = content.split('\n')

    // 过滤空行和只有空格的行
    const validLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)

    return validLines
  },

  // 从规划创建今日待办（支持批量）
  createTodosFromPlanning: function(memo, todoItems) {
    try {
      let successCount = 0
      const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // 批量创建待办
      todoItems.forEach(item => {
        const todoData = {
          title: item,
          description: memo.content, // 保留完整规划内容作为描述
          type: '临时待办',
          priority: '重要不紧急',
          scope: '今日', // 关键：标记为今日待办
          dueDate: tomorrowDate, // 明天的日期
          tags: ['明日规划', ...memo.tags],
          relatedGoalId: memo.relatedGoalId || ''
        }

        try {
          app.createTodo(todoData)
          successCount++
        } catch (err) {
          console.error('创建单个待办失败:', err)
        }
      })

      if (successCount > 0) {
        wx.showToast({
          title: `成功创建${successCount}个待办`,
          icon: 'success',
          duration: 2000
        })
      } else {
        throw new Error('所有待办创建失败')
      }
    } catch (error) {
      console.error('批量创建待办失败:', error)
      wx.showToast({
        title: '创建待办失败',
        icon: 'none'
      })
    }
  }
})