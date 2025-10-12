const userManager = require('../../utils/userManager.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    formattedDate: '',
    lastUpdateTime: '', // 上次更新时间
    statusData: {
      date: '',
      fullDate: '',
      mood: '',
      energyLevel: '',
      stressLevel: '',
      wakeUpTime: '',
      bedTime: '',
      sleepHours: '',
      sleepQuality: '',
      weight: '',
      waterIntake: '',
      exerciseDuration: '',
      exerciseType: [],
      meals: [],
      dietNotes: '',
      meditation: false,
      meditationDuration: '',
      reading: false,
      readingDuration: '',
      notes: '',
      highlights: '',
      userId: ''
    },

    // 选项索引
    moodIndex: 0,
    energyIndex: 0,
    stressIndex: 0,
    sleepQualityIndex: 0,

    // 心情选项
    moodOptions: [
      { value: '😊 开心', label: '😊 开心' },
      { value: '💪 充满动力', label: '💪 充满动力' },
      { value: '😌 平静', label: '😌 平静' },
      { value: '😕 迷茫', label: '😕 迷茫' },
      { value: '😔 沮丧', label: '😔 沮丧' },
      { value: '😰 焦虑', label: '😰 焦虑' },
      { value: '😴 疲惫', label: '😴 疲惫' },
      { value: '😤 压力大', label: '😤 压力大' }
    ],

    // 精力选项
    energyOptions: [
      { value: '🔋 充沛', label: '🔋 充沛' },
      { value: '⚡ 良好', label: '⚡ 良好' },
      { value: '🔌 一般', label: '🔌 一般' },
      { value: '🪫 疲惫', label: '🪫 疲惫' },
      { value: '💤 耗尽', label: '💤 耗尽' }
    ],

    // 压力选项
    stressOptions: [
      { value: '😌 无压力', label: '😌 无压力' },
      { value: '🙂 轻微', label: '🙂 轻微' },
      { value: '😐 中等', label: '😐 中等' },
      { value: '😰 较高', label: '😰 较高' },
      { value: '😫 非常高', label: '😫 非常高' }
    ],

    // 睡眠质量选项
    sleepQualityOptions: [
      { value: '😴 很好', label: '😴 很好' },
      { value: '🙂 良好', label: '🙂 良好' },
      { value: '😐 一般', label: '😐 一般' },
      { value: '😕 较差', label: '😕 较差' },
      { value: '😣 很差', label: '😣 很差' }
    ],

    // 运动类型（多选）
    exerciseTypes: [
      { value: '🏃 跑步', label: '🏃 跑步', selected: false },
      { value: '🚴 骑行', label: '🚴 骑行', selected: false },
      { value: '🏊 游泳', label: '🏊 游泳', selected: false },
      { value: '🏋️ 力量训练', label: '🏋️ 力量训练', selected: false },
      { value: '🧘 瑜伽', label: '🧘 瑜伽', selected: false },
      { value: '🚶 散步', label: '🚶 散步', selected: false }
    ],

    // 用餐选项（多选）
    mealOptions: [
      { value: '🌅 早餐', label: '🌅 早餐', selected: false },
      { value: '☀️ 午餐', label: '☀️ 午餐', selected: false },
      { value: '🌙 晚餐', label: '🌙 晚餐', selected: false },
      { value: '🍎 加餐', label: '🍎 加餐', selected: false }
    ],

    // 是否存在记录（用于判断是创建还是更新）
    existingPageId: null
  },

  onLoad: function(options) {
    this.initPage()
  },

  // 初始化页面
  initPage: function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }, 1500)
      return
    }

    // 设置当前日期
    const today = new Date()
    const dateStr = this.formatDate(today)
    const formattedDateStr = this.formatDateChinese(today)

    this.setData({
      'statusData.date': dateStr,
      'statusData.fullDate': dateStr,
      'statusData.userId': currentUser.email,
      formattedDate: formattedDateStr
    })

    // 加载今日状态（如果存在）
    this.loadTodayStatus()
  },

  // 加载今日状态
  loadTodayStatus: async function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser || !currentUser.notionConfig?.databases?.dailyStatus) {
      return
    }

    wx.showLoading({ title: '加载中...' })

    try {
      const databaseId = currentUser.notionConfig.databases.dailyStatus
      const dateStr = this.data.statusData.date

      // 查询今日记录
      const result = await notionApiService.queryDatabase(
        currentUser.notionConfig.apiKey,
        databaseId,
        {
          filter: {
            property: 'Date',
            title: {
              equals: dateStr
            }
          },
          page_size: 1
        }
      )

      wx.hideLoading()

      if (result.success && result.data?.results?.length > 0) {
        const page = result.data.results[0]
        const status = this.parseNotionPage(page)
        this.loadExistingData(status, page.id, page.last_edited_time)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载今日状态失败:', error)
    }
  },

  // 解析Notion页面数据
  parseNotionPage: function(page) {
    const props = page.properties
    return {
      date: this.getTitleValue(props['Date']),
      fullDate: this.getDateValue(props['Full Date']),
      mood: this.getSelectValue(props['Mood']),
      energyLevel: this.getSelectValue(props['Energy Level']),
      stressLevel: this.getSelectValue(props['Stress Level']),
      wakeUpTime: this.getRichTextValue(props['Wake Up Time']),
      bedTime: this.getRichTextValue(props['Bed Time']),
      sleepHours: this.getNumberValue(props['Sleep Hours']),
      sleepQuality: this.getSelectValue(props['Sleep Quality']),
      weight: this.getNumberValue(props['Weight']),
      waterIntake: this.getNumberValue(props['Water Intake']),
      exerciseDuration: this.getNumberValue(props['Exercise Duration']),
      exerciseType: this.getMultiSelectValue(props['Exercise Type']),
      meals: this.getMultiSelectValue(props['Meals']),
      dietNotes: this.getRichTextValue(props['Diet Notes']),
      meditation: this.getCheckboxValue(props['Meditation']),
      meditationDuration: this.getNumberValue(props['Meditation Duration']),
      reading: this.getCheckboxValue(props['Reading']),
      readingDuration: this.getNumberValue(props['Reading Duration']),
      notes: this.getRichTextValue(props['Notes']),
      highlights: this.getRichTextValue(props['Highlights']),
      userId: this.getRichTextValue(props['User ID'])
    }
  },

  // 获取标题属性值
  getTitleValue: function(prop) {
    if (prop?.title && prop.title.length > 0) {
      return prop.title[0].plain_text || ''
    }
    return ''
  },

  // 获取日期属性值
  getDateValue: function(prop) {
    return prop?.date?.start || ''
  },

  // 获取选择属性值
  getSelectValue: function(prop) {
    return prop?.select?.name || ''
  },

  // 获取多选属性值
  getMultiSelectValue: function(prop) {
    if (prop?.multi_select && prop.multi_select.length > 0) {
      return prop.multi_select.map(item => item.name)
    }
    return []
  },

  // 获取富文本属性值
  getRichTextValue: function(prop) {
    if (prop?.rich_text && prop.rich_text.length > 0) {
      return prop.rich_text.map(t => t.plain_text).join('')
    }
    return ''
  },

  // 获取数字属性值
  getNumberValue: function(prop) {
    return prop?.number || ''
  },

  // 获取复选框属性值
  getCheckboxValue: function(prop) {
    return prop?.checkbox || false
  },

  // 加载已有数据
  loadExistingData: function(status, pageId, lastEditedTime) {
    console.log('加载已有数据:', status)

    // 找到对应的选项索引
    const moodIndex = this.data.moodOptions.findIndex(opt => opt.value === status.mood)
    const energyIndex = this.data.energyOptions.findIndex(opt => opt.value === status.energyLevel)
    const stressIndex = this.data.stressOptions.findIndex(opt => opt.value === status.stressLevel)
    const sleepQualityIndex = this.data.sleepQualityOptions.findIndex(opt => opt.value === status.sleepQuality)

    // 更新运动类型选择状态
    const exerciseTypes = this.data.exerciseTypes.map(type => ({
      ...type,
      selected: status.exerciseType.includes(type.value)
    }))

    // 更新用餐选择状态
    const mealOptions = this.data.mealOptions.map(meal => ({
      ...meal,
      selected: status.meals.includes(meal.value)
    }))

    // 格式化上次更新时间
    const updateTime = this.formatUpdateTime(lastEditedTime)

    this.setData({
      statusData: {
        ...this.data.statusData,
        ...status
      },
      moodIndex: moodIndex >= 0 ? moodIndex : 0,
      energyIndex: energyIndex >= 0 ? energyIndex : 0,
      stressIndex: stressIndex >= 0 ? stressIndex : 0,
      sleepQualityIndex: sleepQualityIndex >= 0 ? sleepQualityIndex : 0,
      exerciseTypes: exerciseTypes,
      mealOptions: mealOptions,
      existingPageId: pageId,
      lastUpdateTime: updateTime
    })

    wx.showToast({
      title: '已加载今日记录',
      icon: 'success',
      duration: 1500
    })
  },

  // 格式化更新时间
  formatUpdateTime: function(isoString) {
    if (!isoString) return ''

    const date = new Date(isoString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) {
      return '刚刚更新'
    } else if (minutes < 60) {
      return `${minutes}分钟前更新`
    } else if (hours < 24) {
      return `${hours}小时前更新`
    } else {
      const h = date.getHours()
      const m = date.getMinutes()
      return `今天 ${h}:${m < 10 ? '0' + m : m} 更新`
    }
  },

  // 日期变更
  onDateChange: function(e) {
    const date = e.detail.value
    const formattedDate = this.formatDateChinese(new Date(date))

    this.setData({
      'statusData.date': date,
      'statusData.fullDate': date,
      formattedDate: formattedDate
    })

    // 重新加载该日期的状态
    this.loadTodayStatus()
  },

  // 心情变更
  onMoodChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      moodIndex: index,
      'statusData.mood': this.data.moodOptions[index].value
    })
  },

  // 精力变更
  onEnergyChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      energyIndex: index,
      'statusData.energyLevel': this.data.energyOptions[index].value
    })
  },

  // 压力变更
  onStressChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      stressIndex: index,
      'statusData.stressLevel': this.data.stressOptions[index].value
    })
  },

  // 起床时间变更
  onWakeUpTimeChange: function(e) {
    this.setData({
      'statusData.wakeUpTime': e.detail.value
    })
  },

  // 睡觉时间变更
  onBedTimeChange: function(e) {
    this.setData({
      'statusData.bedTime': e.detail.value
    })
  },

  // 睡眠时长输入
  onSleepHoursInput: function(e) {
    this.setData({
      'statusData.sleepHours': e.detail.value
    })
  },

  // 睡眠质量变更
  onSleepQualityChange: function(e) {
    const index = parseInt(e.detail.value)
    this.setData({
      sleepQualityIndex: index,
      'statusData.sleepQuality': this.data.sleepQualityOptions[index].value
    })
  },

  // 体重输入
  onWeightInput: function(e) {
    this.setData({
      'statusData.weight': e.detail.value
    })
  },

  // 饮水量输入
  onWaterIntakeInput: function(e) {
    this.setData({
      'statusData.waterIntake': e.detail.value
    })
  },

  // 运动时长输入
  onExerciseDurationInput: function(e) {
    this.setData({
      'statusData.exerciseDuration': e.detail.value
    })
  },

  // 运动类型切换
  toggleExerciseType: function(e) {
    const index = e.currentTarget.dataset.index
    const exerciseTypes = this.data.exerciseTypes
    exerciseTypes[index].selected = !exerciseTypes[index].selected

    // 更新选中的运动类型
    const selectedTypes = exerciseTypes.filter(t => t.selected).map(t => t.value)

    this.setData({
      exerciseTypes: exerciseTypes,
      'statusData.exerciseType': selectedTypes
    })
  },

  // 用餐切换
  toggleMeal: function(e) {
    const index = e.currentTarget.dataset.index
    const mealOptions = this.data.mealOptions
    mealOptions[index].selected = !mealOptions[index].selected

    // 更新选中的用餐
    const selectedMeals = mealOptions.filter(m => m.selected).map(m => m.value)

    this.setData({
      mealOptions: mealOptions,
      'statusData.meals': selectedMeals
    })
  },

  // 饮食备注输入
  onDietNotesInput: function(e) {
    this.setData({
      'statusData.dietNotes': e.detail.value
    })
  },

  // 冥想开关
  onMeditationChange: function(e) {
    this.setData({
      'statusData.meditation': e.detail.value
    })
  },

  // 冥想时长输入
  onMeditationDurationInput: function(e) {
    this.setData({
      'statusData.meditationDuration': e.detail.value
    })
  },

  // 阅读开关
  onReadingChange: function(e) {
    this.setData({
      'statusData.reading': e.detail.value
    })
  },

  // 阅读时长输入
  onReadingDurationInput: function(e) {
    this.setData({
      'statusData.readingDuration': e.detail.value
    })
  },

  // 今日亮点输入
  onHighlightsInput: function(e) {
    this.setData({
      'statusData.highlights': e.detail.value
    })
  },

  // 备注输入
  onNotesInput: function(e) {
    this.setData({
      'statusData.notes': e.detail.value
    })
  },

  // 保存状态
  saveStatus: async function() {
    const currentUser = userManager.getCurrentUser()
    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!currentUser.notionConfig?.databases?.dailyStatus) {
      wx.showModal({
        title: '提示',
        content: '请先配置Notion每日状态库',
        confirmText: '去配置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/notion-config/notion-config'
            })
          }
        }
      })
      return
    }

    wx.showLoading({ title: this.data.existingPageId ? '更新中...' : '保存中...' })

    try {
      const databaseId = currentUser.notionConfig.databases.dailyStatus
      const properties = this.buildNotionProperties()

      let result

      if (this.data.existingPageId) {
        // 更新已有记录 - 只更新实际填写的字段
        result = await notionApiService.updatePageGeneric(
          this.data.existingPageId,
          properties,
          currentUser.notionConfig.apiKey
        )

        if (result.success) {
          const updateTime = this.formatUpdateTime(new Date().toISOString())
          this.setData({ lastUpdateTime: updateTime })
        }
      } else {
        // 创建新记录
        const pageData = {
          parent: { database_id: databaseId },
          properties: properties
        }

        result = await notionApiService.createPageGeneric(
          pageData,
          currentUser.notionConfig.apiKey
        )

        if (result.success && result.data?.id) {
          this.setData({
            existingPageId: result.data.id,
            lastUpdateTime: '刚刚更新'
          })
        }
      }

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: this.data.existingPageId ? '更新成功' : '保存成功',
          icon: 'success',
          duration: 1500
        })
      } else {
        throw new Error(result.error || '操作失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('保存每日状态失败:', error)
      wx.showModal({
        title: '操作失败',
        content: error.message || '请检查网络连接',
        showCancel: false
      })
    }
  },

  // 构建Notion properties格式
  buildNotionProperties: function() {
    const data = this.data.statusData

    return {
      'Date': {
        title: [{ text: { content: data.date || '' } }]
      },
      'Full Date': {
        date: data.fullDate ? { start: data.fullDate } : null
      },
      'Mood': {
        select: data.mood ? { name: data.mood } : null
      },
      'Energy Level': {
        select: data.energyLevel ? { name: data.energyLevel } : null
      },
      'Stress Level': {
        select: data.stressLevel ? { name: data.stressLevel } : null
      },
      'Wake Up Time': {
        rich_text: data.wakeUpTime ? [{ text: { content: data.wakeUpTime } }] : []
      },
      'Bed Time': {
        rich_text: data.bedTime ? [{ text: { content: data.bedTime } }] : []
      },
      'Sleep Hours': {
        number: data.sleepHours ? parseFloat(data.sleepHours) : null
      },
      'Sleep Quality': {
        select: data.sleepQuality ? { name: data.sleepQuality } : null
      },
      'Weight': {
        number: data.weight ? parseFloat(data.weight) : null
      },
      'Water Intake': {
        number: data.waterIntake ? parseInt(data.waterIntake) : null
      },
      'Exercise Duration': {
        number: data.exerciseDuration ? parseInt(data.exerciseDuration) : null
      },
      'Exercise Type': {
        multi_select: data.exerciseType ? data.exerciseType.map(t => ({ name: t })) : []
      },
      'Meals': {
        multi_select: data.meals ? data.meals.map(m => ({ name: m })) : []
      },
      'Diet Notes': {
        rich_text: data.dietNotes ? [{ text: { content: data.dietNotes } }] : []
      },
      'Meditation': {
        checkbox: data.meditation || false
      },
      'Meditation Duration': {
        number: data.meditationDuration ? parseInt(data.meditationDuration) : null
      },
      'Reading': {
        checkbox: data.reading || false
      },
      'Reading Duration': {
        number: data.readingDuration ? parseInt(data.readingDuration) : null
      },
      'Notes': {
        rich_text: data.notes ? [{ text: { content: data.notes } }] : []
      },
      'Highlights': {
        rich_text: data.highlights ? [{ text: { content: data.highlights } }] : []
      },
      'User ID': {
        rich_text: data.userId ? [{ text: { content: data.userId } }] : []
      }
    }
  },

  // 格式化日期 (YYYY-MM-DD)
  formatDate: function(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 格式化日期（中文）
  formatDateChinese: function(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const weekday = weekdays[date.getDay()]
    return `${year}年${month}月${day}日 星期${weekday}`
  }
})
