const app = getApp()
const userManager = require('../../utils/userManager.js')
const apiService = require('../../utils/apiService.js')
const notionApiService = require('../../utils/notionApiService.js')

Page({
  data: {
    selectedDate: '',
    selectedDateDisplay: '',
    todayDate: '',
    showFilterPanel: false,
    selectedTags: [],
    timeRange: 'today',  // 默认只显示今天的记录
    sortBy: 'time_asc',  // 默认按时间升序排列（最早的在前）
    refreshing: false,
    
    // 统计数据 - 改为以时间为中心
    stats: {
      totalMinutes: 0,        // 总时长（分钟）
      valuableMinutes: 0,     // 有价值活动时长
      neutralMinutes: 0,      // 中性活动时长
      wastefulMinutes: 0,     // 低效活动时长
      activityCount: 0,       // 活动总数
      todayMinutes: 0         // 今日时长
    },
    
    // 筛选选项
    allTags: [],
    timeRangeOptions: [
      { label: '全部', value: 'all' },
      { label: '今天', value: 'today' },
      { label: '最近3天', value: '3days' },
      { label: '最近一周', value: 'week' },
      { label: '最近一月', value: 'month' }
    ],
    sortOptions: [
      { label: '时间降序', value: 'time_desc' },
      { label: '时间升序', value: 'time_asc' },
      { label: '内容长度', value: 'length' }
    ],
    
    // 记录数据
    allMemos: [],
    filteredMemos: [],
    groupedMemos: [],
    
    // 分页
    pageSize: 20,
    currentPage: 1,
    hasMore: true,
    isLoading: false,
    
    // 播放状态
    currentPlayingId: null
  },

  // 音频播放器
  innerAudioContext: null,

  /**
   * 清理活动名称中的类型前缀
   * 去除：🌟 有价值的活动：、😐 中性的活动：、🗑️ 低效的活动：等前缀
   */
  cleanActivityName: function(name) {
    if (!name) return name

    // 定义需要清理的前缀模式
    const prefixPatterns = [
      /^🌟\s*有价值的活动[：:]\s*/,
      /^😐\s*中性的活动[：:]\s*/,
      /^🗑️\s*低效的活动[：:]\s*/,
      /^有价值的活动[：:]\s*/,
      /^中性的活动[：:]\s*/,
      /^低效的活动[：:]\s*/,
      /^🌟\s*/,
      /^😐\s*/,
      /^🗑️\s*/
    ]

    let cleanedName = name
    for (const pattern of prefixPatterns) {
      cleanedName = cleanedName.replace(pattern, '')
    }

    return cleanedName.trim()
  },

  onLoad: function() {
    console.log('📚 History页面加载')

    try {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return
      }

      // 确保使用正确的默认值
      this.setData({
        sortBy: 'time_asc',   // 时间升序（最早的在前）
        timeRange: 'today'    // 只显示今天
      })

      this.initData()
      this.initAudioContext()
      this.loadAllMemos()

      console.log('🎉 History页面加载完成')
    } catch (error) {
      console.error('❌ History页面加载失败:', error)
      wx.showToast({
        title: '页面加载失败',
        icon: 'none',
        duration: 3000
      })
    }
  },

  onShow: function() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return
    }

    // 确保使用正确的默认排序（时间升序）
    if (this.data.sortBy === 'time_desc') {
      this.setData({ sortBy: 'time_asc' })
    }

    this.loadAllMemos()
  },

  // 下拉刷新
  onRefresh: function() {
    console.log('🔄 触发下拉刷新')
    this.setData({ refreshing: true })
    this.loadAllMemos().then(() => {
      this.setData({ refreshing: false })
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    }).catch(() => {
      this.setData({ refreshing: false })
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    })
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

  onUnload: function() {
    this.cleanup()
  },

  // 初始化数据
  initData: function() {
    const today = new Date()
    const todayStr = this.formatDate(today)
    
    this.setData({
      selectedDate: todayStr,
      selectedDateDisplay: '今天',
      todayDate: todayStr
    })
  },

  // 初始化音频播放器
  initAudioContext: function() {
    this.innerAudioContext = wx.createInnerAudioContext()
    
    this.innerAudioContext.onPlay(() => {
      this.updatePlayingStatus(this.data.currentPlayingId, true)
    })

    this.innerAudioContext.onEnded(() => {
      this.updatePlayingStatus(this.data.currentPlayingId, false)
      this.setData({ currentPlayingId: null })
    })

    this.innerAudioContext.onError((err) => {
      console.error('播放错误', err)
      this.updatePlayingStatus(this.data.currentPlayingId, false)
      this.setData({ currentPlayingId: null })
    })
  },

  // 加载所有备忘录
  loadAllMemos: async function() {
    try {
      const currentUser = userManager.getCurrentUser()
      if (!currentUser) {
        console.log('用户未登录，使用本地数据')
        this.loadMemosFromLocal()
        return
      }

      const notionConfig = currentUser.notionConfig
      const mainDatabaseId = notionConfig?.databases?.mainRecords || notionConfig?.mainDatabaseId

      console.log('🔍 History - 用户Notion配置:', {
        hasConfig: !!notionConfig,
        hasApiKey: !!notionConfig?.apiKey,
        mainDatabaseId: mainDatabaseId,
        email: currentUser.email
      })

      if (!notionConfig || !notionConfig.apiKey || !mainDatabaseId) {
        console.log('Notion未配置，使用本地数据')
        this.loadMemosFromLocal()
        return
      }

      console.log('🔍 准备查询Notion - 邮箱:', currentUser.email, '数据库ID:', mainDatabaseId)

      // 首先尝试使用邮箱过滤查询
      let result = await notionApiService.queryMainRecords(
        notionConfig.apiKey,
        mainDatabaseId,
        currentUser.email,
        {} // 加载所有主记录
      )

      // ⭐ 如果没有找到记录，尝试不过滤User ID（诊断用）
      if (result.success && result.records.length === 0) {
        console.log('⚠️ 使用邮箱过滤没有找到记录，尝试查询全部记录（不过滤User ID）')

        // 直接查询数据库，不过滤User ID
        const allRecordsResult = await notionApiService.queryDatabase(
          notionConfig.apiKey,
          mainDatabaseId,
          {
            sorts: [{ property: 'Record Date', direction: 'descending' }],
            page_size: 100
          }
        )

        if (allRecordsResult.success && allRecordsResult.data.results.length > 0) {
          console.log('✅ 不过滤User ID查询到记录:', allRecordsResult.data.results.length)
          console.log('🔍 数据库中的User ID值:')
          allRecordsResult.data.results.slice(0, 5).forEach((page, i) => {
            const userId = page.properties['User ID']?.rich_text?.[0]?.text?.content || '(空)'
            const title = page.properties['Name']?.title?.[0]?.text?.content || '(无标题)'
            console.log(`  ${i + 1}. User ID: "${userId}" | 标题: ${title}`)
          })
          console.log('🔍 当前用户邮箱:', `"${currentUser.email}"`)

          // 手动解析所有记录（临时方案，帮助诊断问题）
          const records = allRecordsResult.data.results.map(page => {
            const props = page.properties
            let recordType = '日常记录'
            if (props['Type']?.select?.name) {
              const typeValue = props['Type'].select.name
              recordType = typeValue === 'planning' ? '明日规划' : '日常记录'
            } else if (props['Record Type']?.select?.name) {
              recordType = props['Record Type'].select.name
            }

            return {
              id: page.id,
              title: props['Name']?.title?.[0]?.text?.content || props['Title']?.title?.[0]?.text?.content || '',
              content: props['Summary']?.rich_text?.[0]?.text?.content || props['Content']?.rich_text?.[0]?.text?.content || '',
              date: props['Record Date']?.date?.start || props['Date']?.date?.start || '',
              recordType: recordType,
              timePeriod: props['Time Period']?.select?.name || '',
              tags: props['Tags']?.multi_select?.map(tag => tag.name) || [],
              userId: props['User ID']?.rich_text?.[0]?.text?.content || '',
              startTime: props['Start Time']?.rich_text?.[0]?.text?.content || '',
              endTime: props['End Time']?.rich_text?.[0]?.text?.content || ''
            }
          })

          // 使用解析后的记录覆盖result
          result = {
            success: true,
            records: records,
            total: records.length
          }

          console.log('✅ 临时使用全部记录（不过滤User ID），共', records.length, '条')
        }
      }

      if (!result.success) {
        console.error('❌ 加载Main Records失败:', result.error)
        wx.showToast({
          title: `Notion查询失败: ${result.error}`,
          icon: 'none',
          duration: 3000
        })
        this.loadMemosFromLocal()
        return
      }

      const records = result.records || []

      console.log('📊 从Notion获取的主记录数据:', records)
      console.log('📊 主记录数量:', records.length)

      // 特别检查"王者荣耀"相关的主记录
      const wangzheRecord = records.find(r => r.content && r.content.includes('王者荣耀'))
      if (wangzheRecord) {
        console.log('🎮 找到"王者荣耀"主记录:', {
          id: wangzheRecord.id,
          title: wangzheRecord.title,
          content: wangzheRecord.content,
          recordType: wangzheRecord.recordType
        })
      }

      // 如果没有记录，给用户明确提示
      if (records.length === 0) {
        console.warn('⚠️ 未查询到任何主记录')
        console.log('检查项:')
        console.log('  1. 用户邮箱:', currentUser.email)
        console.log('  2. 主数据库ID:', mainDatabaseId)
        console.log('  3. 是否已创建过记录?')

        wx.showModal({
          title: '未找到记录',
          content: `Notion数据库中没有找到记录。\n\n当前用户: ${currentUser.email}\n\n请确认:\n1. 是否已创建过记录？\n2. Notion数据库ID是否正确？`,
          showCancel: true,
          cancelText: '使用本地数据',
          confirmText: '知道了',
          success: (res) => {
            if (res.cancel) {
              this.loadMemosFromLocal()
            }
          }
        })
      }
      if (records.length > 0) {
        console.log('📊 第一条主记录详情:', records[0])
      }

      // ⚠️ 根据ID去重（防止重复记录）
      const uniqueRecords = []
      const seenIds = new Set()
      records.forEach(record => {
        if (!seenIds.has(record.id)) {
          seenIds.add(record.id)
          uniqueRecords.push(record)
        } else {
          console.warn('⚠️ 发现重复记录ID:', record.id, record.title)
        }
      })

      console.log('📋 去重后主记录数量:', uniqueRecords.length)
      if (uniqueRecords.length !== records.length) {
        console.warn(`⚠️ 去除了 ${records.length - uniqueRecords.length} 条重复记录`)
      }

      // 打印前3个主记录的ID，方便对比
      if (uniqueRecords.length > 0) {
        console.log('📋 前3个主记录的ID:')
        uniqueRecords.slice(0, 3).forEach((rec, index) => {
          console.log(`  ${index + 1}. ID: ${rec.id}, 标题: ${rec.title}`)
        })
      }

      // 加载所有主记录的活动明细
      const activityDetailsDatabaseId = notionConfig.databases?.activityDetails || notionConfig.activityDetailsDatabaseId
      let allActivities = []

      if (activityDetailsDatabaseId) {
        console.log('🔍 开始加载活动明细，数据库ID:', activityDetailsDatabaseId)
        const activitiesResult = await notionApiService.queryActivities(
          notionConfig.apiKey,
          activityDetailsDatabaseId,
          currentUser.email,
          {}
        )

        if (activitiesResult.success && activitiesResult.activities) {
          allActivities = activitiesResult.activities
          console.log('📊 加载活动明细成功，数量:', allActivities.length)

          // 特别检查"王者荣耀"活动
          const wangzheActivity = allActivities.find(act => act.name && act.name.includes('王者荣耀'))
          if (wangzheActivity) {
            console.log('🎮 找到"王者荣耀"活动:', {
              name: wangzheActivity.name,
              relatedMainRecordId: wangzheActivity.relatedMainRecordId,
              activityType: wangzheActivity.activityType,
              duration: wangzheActivity.duration,
              startTime: wangzheActivity.startTime,
              endTime: wangzheActivity.endTime
            })
          }

          // 打印前3个活动的详细信息，查看关联字段
          if (allActivities.length > 0) {
            console.log('📊 前3个活动详情:')
            allActivities.slice(0, 3).forEach((act, i) => {
              console.log(`  ${i + 1}. ${act.name}`, {
                relatedMainRecordId: act.relatedMainRecordId,
                relatedGoalId: act.relatedGoalId,
                relatedTodoId: act.relatedTodoId,
                startTime: act.startTime,
                endTime: act.endTime,
                duration: act.duration
              })
            })
          }
        } else {
          console.warn('⚠️ 加载活动明细失败:', activitiesResult.error)
        }
      }

      // 转换Main Records为memo格式
      const processedMemos = uniqueRecords.map(record => {
        const recordDate = new Date(record.date)
        const timePeriod = record.timePeriod || this.getTimePeriodFromTime(recordDate)

        // 查找该主记录关联的活动明细
        const relatedActivities = allActivities.filter(activity => {
          const isMatch = activity.relatedMainRecordId === record.id
          if (!isMatch && record.content && record.content.includes('王者荣耀')) {
            console.log(`🔍 检查主记录 "${record.title}" (ID: ${record.id})`)
            console.log(`   活动 "${activity.name}" 的关联ID: ${activity.relatedMainRecordId}`)
            console.log(`   是否匹配: ${isMatch}`)
          }
          return isMatch
        }).map(activity => {
          // ⭐ 活动明细不需要单独的开始/结束时间，只显示时长
          return {
            name: this.cleanActivityName(activity.name), // 清理活动名称前缀
            duration: activity.duration,
            activityType: activity.activityType
          }
        })

        if (relatedActivities.length > 0) {
          console.log(`📌 主记录 ${record.title} 关联了 ${relatedActivities.length} 个活动:`, relatedActivities)
        }

        // 从主记录中获取开始和结束时间（如果有的话）
        let actualStartTime = null
        let actualEndTime = null
        if (record.startTime && record.endTime) {
          // 检查是否为"睡眠"时间
          if (record.startTime === '睡眠' || record.endTime === '睡眠') {
            // 睡眠时间保持为字符串，不解析为Date对象
            actualStartTime = '睡眠'
            actualEndTime = '睡眠'
            console.log(`😴 主记录 ${record.title} 时间范围: 睡眠`)
          } else {
            // startTime 和 endTime 是 "HH:MM" 格式
            const [startHour, startMin] = record.startTime.split(':').map(Number)
            const [endHour, endMin] = record.endTime.split(':').map(Number)
            actualStartTime = new Date(recordDate)
            actualStartTime.setHours(startHour, startMin, 0, 0)
            actualEndTime = new Date(recordDate)
            actualEndTime.setHours(endHour, endMin, 0, 0)
            console.log(`⏰ 主记录 ${record.title} 时间范围: ${record.startTime} - ${record.endTime}`)
          }
        }

        // 计算实际发生时间（用于排序）⭐
        let sortTimestamp = recordDate.getTime()
        if (actualStartTime && actualStartTime !== '睡眠') {
          // 优先使用主记录的实际开始时间（排除睡眠）
          sortTimestamp = actualStartTime.getTime()
        } else if (relatedActivities.length > 0) {
          // 否则查找最早的活动开始时间
          const earliestActivity = allActivities
            .filter(act => act.relatedMainRecordId === record.id && act.startTime)
            .sort((a, b) => {
              // 解析时间字符串 "HH:MM"
              const parseTime = (timeStr) => {
                const [h, m] = timeStr.split(':').map(Number)
                return h * 60 + m // 转换为分钟数比较
              }
              return parseTime(a.startTime) - parseTime(b.startTime)
            })[0]

          if (earliestActivity && earliestActivity.startTime) {
            const [hour, min] = earliestActivity.startTime.split(':').map(Number)
            const activityTime = new Date(recordDate)
            activityTime.setHours(hour, min, 0, 0)
            sortTimestamp = activityTime.getTime()
          }
        }

        return {
          id: record.id,
          content: record.content, // Summary字段的内容
          timestamp: recordDate.getTime(), // 记录创建时间
          sortTimestamp: sortTimestamp, // ⭐ 实际发生时间（用于排序）
          type: 'text',
          tags: record.tags || [],
          notionPageId: record.id,
          timeStr: actualStartTime === '睡眠' ? '睡眠' : this.formatTime(actualStartTime || recordDate),
          dateStr: this.formatDate(recordDate),
          timePeriod: timePeriod,
          timePeriodDisplay: this.formatMainRecordTimePeriodDisplay(
            { ...record, startTime: actualStartTime, endTime: actualEndTime },
            actualStartTime || recordDate,
            timePeriod
          ),
          periodColor: actualStartTime === '睡眠' ? '#8b5cf6' : this.getTimePeriodColorFromTime(actualStartTime || recordDate),
          category: this.getCategoryFromContent(record.content),
          categoryColor: this.getCategoryColorFromContent(record.content),
          isPlaying: false,
          isPlanning: record.recordType === '明日规划',
          // 主记录特有信息
          title: record.title,
          recordType: record.recordType,
          // ⭐ 原始时间字段（用于编辑）
          startTime: record.startTime,
          endTime: record.endTime,
          // 关联的活动明细
          activities: relatedActivities
        }
      })

      // 提取所有标签
      const allTags = new Set()
      uniqueRecords.forEach(record => {
        if (record.tags) {
          record.tags.forEach(tag => allTags.add(tag))
        }
      })

      // ⚠️ 再次对processedMemos进行ID去重（双重保险）
      const uniqueMemos = []
      const seenMemoIds = new Set()
      processedMemos.forEach(memo => {
        if (!seenMemoIds.has(memo.id)) {
          seenMemoIds.add(memo.id)
          uniqueMemos.push(memo)
        } else {
          console.warn('⚠️ processedMemos中发现重复ID:', memo.id, memo.content?.substring(0, 20))
        }
      })

      console.log('📌 转换后的processedMemos数量:', processedMemos.length)
      console.log('📌 去重后的uniqueMemos数量:', uniqueMemos.length)
      if (processedMemos.length !== uniqueMemos.length) {
        console.warn(`⚠️ processedMemos中去除了 ${processedMemos.length - uniqueMemos.length} 条重复`)
      }

      if (uniqueMemos.length > 0) {
        console.log('📌 第一条转换后的memo:', uniqueMemos[0])
      }

      // 计算统计数据
      const stats = this.calculateStats(uniqueMemos)

      this.setData({
        allMemos: uniqueMemos,
        allTags: Array.from(allTags),
        stats: stats
      })

      console.log('📌 setData完成，准备applyFilters')
      this.applyFilters()
      console.log('📌 applyFilters完成，当前groupedMemos数量:', this.data.groupedMemos?.length || 0)

      // 详细输出第一个分组的内容
      if (this.data.groupedMemos && this.data.groupedMemos.length > 0) {
        const firstGroup = this.data.groupedMemos[0]
        console.log('📌 第一个分组详情:')
        console.log('  - 日期:', firstGroup.dateDisplay)
        console.log('  - 记录数:', firstGroup.memos?.length || 0)
        if (firstGroup.memos && firstGroup.memos.length > 0) {
          console.log('  - 前3条记录ID:')
          firstGroup.memos.slice(0, 3).forEach((m, i) => {
            console.log(`    ${i + 1}. ID: ${m.id}, 内容: ${m.content?.substring(0, 30)}...`)
          })
        }
      }

    } catch (error) {
      console.error('加载Activities异常:', error)
      this.loadMemosFromLocal()
    }
  },

  // 从本地加载备忘录
  loadMemosFromLocal: function() {
    const memoList = app.getMemoList()
    const processedMemos = memoList.map(memo => ({
      ...memo,
      sortTimestamp: memo.timestamp, // ⭐ 本地数据使用记录时间作为排序时间
      timeStr: this.formatTime(new Date(memo.timestamp)),
      dateStr: this.formatDate(new Date(memo.timestamp)),
      timePeriodDisplay: this.formatTimePeriodDisplay(memo),
      timePeriod: this.getTimePeriod(memo),
      periodColor: this.getTimePeriodColor(memo),
      category: this.getCategory(memo),
      categoryColor: this.getCategoryColor(memo),
      isPlaying: false
    }))

    // 提取所有标签
    const allTags = new Set()
    memoList.forEach(memo => {
      if (memo.tags) {
        memo.tags.forEach(tag => allTags.add(tag))
      }
    })

    // 计算统计数据
    const stats = this.calculateStats(memoList)

    this.setData({
      allMemos: processedMemos,
      allTags: Array.from(allTags),
      stats: stats
    })

    this.applyFilters()
  },

  // 格式化主记录时间段显示
  formatMainRecordTimePeriodDisplay: function(record, recordDate, timePeriod) {
    if (!recordDate) {
      return '时间未知'
    }

    // 获取日期显示
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    // recordDate可能是Date对象或字符串"睡眠"
    let memoDate
    if (recordDate === '睡眠') {
      memoDate = today // 默认使用今天日期
    } else {
      memoDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
    }

    let dateStr = ''
    if (memoDate.getTime() === today.getTime()) {
      dateStr = '今天'
    } else if (memoDate.getTime() === yesterday.getTime()) {
      dateStr = '昨天'
    } else {
      if (recordDate === '睡眠') {
        dateStr = '今天'
      } else {
        dateStr = `${recordDate.getMonth() + 1}月${recordDate.getDate()}日`
      }
    }

    // 检查是否为睡眠时间
    if (record.startTime === '睡眠' || record.endTime === '睡眠') {
      return `${dateStr} 😴 睡眠`
    }

    // 如果有具体的开始时间，使用之
    let startTime, endTime
    if (record.startTime && record.endTime && typeof record.startTime.getHours === 'function') {
      startTime = `${record.startTime.getHours().toString().padStart(2, '0')}:${record.startTime.getMinutes().toString().padStart(2, '0')}`
      endTime = `${record.endTime.getHours().toString().padStart(2, '0')}:${record.endTime.getMinutes().toString().padStart(2, '0')}`
    } else if (recordDate !== '睡眠' && (recordDate.getHours() > 0 || recordDate.getMinutes() > 0)) {
      // 如果recordDate包含具体时间（不是00:00），使用它
      startTime = `${recordDate.getHours().toString().padStart(2, '0')}:${recordDate.getMinutes().toString().padStart(2, '0')}`
      const endDate = new Date(recordDate.getTime() + 60 * 60 * 1000)
      endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
    } else {
      // 如果都没有具体时间，只显示时间段标签
      return `${dateStr} ${timePeriod}`
    }

    // 返回日期 + 时间范围 (附带时间段标签)
    return `${dateStr} ${startTime}-${endTime} (${timePeriod})`
  },

  // 格式化活动时间段显示（保留用于兼容性）
  formatActivityTimePeriodDisplay: function(activity) {
    if (!activity || !activity.startTime) {
      return '时间未知'
    }

    const startTime = new Date(activity.startTime)
    const endTime = new Date(activity.endTime)

    const startTimeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
    const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`

    return `${startTimeStr} - ${endTimeStr} (${activity.duration}分钟)`
  },

  // 根据时间获取时间段
  getTimePeriodFromTime: function(date) {
    const hour = date.getHours()
    if (hour >= 5 && hour < 8) return '早晨'
    if (hour >= 8 && hour < 12) return '上午'
    if (hour >= 12 && hour < 14) return '中午'
    if (hour >= 14 && hour < 18) return '下午'
    if (hour >= 18 && hour < 22) return '晚上'
    return '深夜'
  },

  // 根据时间段获取颜色
  getTimePeriodColorFromTime: function(date) {
    const period = this.getTimePeriodFromTime(date)
    const colorMap = {
      '早晨': '#f59e0b',
      '上午': '#10b981',
      '中午': '#ef4444',
      '下午': '#3b82f6',
      '晚上': '#8b5cf6',
      '深夜': '#6b7280'
    }
    return colorMap[period] || '#3b82f6'
  },

  // 根据活动类型获取颜色
  getActivityCategoryColor: function(activityType) {
    const colorMap = {
      '工作': '#3b82f6',
      '学习': '#10b981',
      '运动': '#f59e0b',
      '休息': '#8b5cf6',
      '生活': '#6b7280'
    }
    return colorMap[activityType] || '#3b82f6'
  },

  // 编辑记录
  editMemo: function(e) {
    const memoId = e.currentTarget.dataset.id
    console.log('编辑记录:', memoId)

    // 先从allMemos中找，如果没找到再从groupedMemos中找
    let memo = this.data.allMemos.find(m => m.id === memoId)

    if (!memo) {
      // 从groupedMemos中查找
      for (const group of this.data.groupedMemos) {
        const found = group.memos.find(m => m.id === memoId)
        if (found) {
          memo = found
          break
        }
      }
    }

    if (!memo) {
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      })
      return
    }

    // 将activities转换为timeEntries格式
    const valuableTimeEntries = []
    const neutralTimeEntries = []
    const wastefulTimeEntries = []

    console.log('📝 准备编辑记录:', {
      id: memo.id,
      content: memo.content,
      hasActivities: !!(memo.activities && memo.activities.length > 0),
      activitiesCount: memo.activities ? memo.activities.length : 0
    })

    if (memo.activities && memo.activities.length > 0) {
      console.log('🔄 开始转换activities到timeEntries:', memo.activities)

      memo.activities.forEach((activity, index) => {
        const cleanedName = this.cleanActivityName(activity.name)
        console.log(`  活动${index + 1}:`, {
          name: cleanedName,
          duration: activity.duration,
          activityType: activity.activityType
        })

        const entry = {
          activity: cleanedName,
          minutes: activity.duration || 0,
          type: activity.activityType || '有价值',
          tags: [],
          goalId: '',
          goalTitle: '',
          todoId: '',
          todoTitle: '',
          todoStatus: '进行中'
        }

        // 根据活动类型分类
        if (activity.activityType && activity.activityType.includes('有价值')) {
          valuableTimeEntries.push(entry)
          console.log(`    → 分类为: 有价值`)
        } else if (activity.activityType && activity.activityType.includes('低效')) {
          wastefulTimeEntries.push(entry)
          console.log(`    → 分类为: 低效`)
        } else {
          neutralTimeEntries.push(entry)
          console.log(`    → 分类为: 中性`)
        }
      })

      console.log('✅ 转换完成:', {
        valuableCount: valuableTimeEntries.length,
        neutralCount: neutralTimeEntries.length,
        wastefulCount: wastefulTimeEntries.length
      })
    } else {
      console.warn('⚠️ 该记录没有activities数组，无法加载时间投入数据')
    }

    // 构建完整的memo对象（补充编辑所需的字段）
    const editMemo = {
      ...memo,
      valuableTimeEntries: valuableTimeEntries,
      neutralTimeEntries: neutralTimeEntries,
      wastefulTimeEntries: wastefulTimeEntries,
      recordMode: memo.isPlanning ? 'planning' : 'daily'
    }

    console.log('准备编辑的memo对象:', editMemo)

    // 通过globalData传递完整的memo对象
    const app = getApp()
    app.globalData.editMemo = {
      editId: memoId,
      memoData: editMemo,
      fromPage: 'history'
    }

    // 使用switchTab跳转到memo页面（tabBar页面）
    wx.switchTab({
      url: '/pages/memo/memo'
    })
  },

  // 删除记录
  deleteMemo: function(e) {
    const memoId = e.currentTarget.dataset.id
    const memo = this.data.allMemos.find(m => m.id === memoId)

    if (!memo) {
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条记录吗？\n\n${memo.content ? memo.content.substring(0, 30) + '...' : '无内容'}`,
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          await this.performDelete(memo)
        }
      }
    })
  },

  // 执行删除操作
  performDelete: async function(memo) {
    try {
      wx.showLoading({ title: '删除中...' })

      const currentUser = userManager.getCurrentUser()
      const notionConfig = currentUser?.notionConfig

      // 如果有Notion配置，同时删除Notion中的记录
      if (notionConfig && notionConfig.apiKey && memo.notionPageId) {
        console.log('🗑️ 开始删除主记录和关联的活动明细')

        // 1. 先查询并归档所有关联的活动明细
        const activityDatabaseId = notionConfig.databases?.activityDetails
        if (activityDatabaseId) {
          console.log('🔍 查询关联的活动明细记录...')

          try {
            // 查询与此主记录关联的所有活动明细
            // Notion API relation filter语法: https://developers.notion.com/reference/post-database-query-filter
            const queryResult = await notionApiService.queryDatabase(
              notionConfig.apiKey,
              activityDatabaseId,
              {
                filter: {
                  property: 'Related Main Record',
                  relation: {
                    contains: memo.notionPageId
                  }
                },
                page_size: 100 // 最多查询100条关联记录
              }
            )

            if (queryResult.success && queryResult.data && queryResult.data.results) {
              const activities = queryResult.data.results
              console.log(`📝 找到 ${activities.length} 条关联的活动明细`)

              // 归档每个活动明细
              for (const activity of activities) {
                console.log(`🗑️ 归档活动明细: ${activity.id}`)
                await notionApiService.updatePageProperties(
                  notionConfig.apiKey,
                  activity.id,
                  {
                    'Archived': { checkbox: true }
                  }
                )
              }

              console.log('✅ 所有活动明细已归档')
            } else {
              console.warn('⚠️ 查询活动明细失败或没有找到关联记录')
            }
          } catch (activityError) {
            console.error('❌ 删除活动明细时出错:', activityError)
            // 继续执行主记录删除，不因活动明细删除失败而中断
          }
        }

        // 2. 归档主记录
        console.log('🗑️ 归档主记录:', memo.notionPageId)
        const archiveResult = await notionApiService.updatePageProperties(
          notionConfig.apiKey,
          memo.notionPageId,
          {
            'Archived': { checkbox: true }
          }
        )

        if (!archiveResult.success) {
          console.warn('⚠️ 主记录归档失败，仅删除本地记录:', archiveResult.error)
        } else {
          console.log('✅ 主记录已归档')
        }
      }

      // 3. 删除本地记录
      app.deleteMemo(memo.id)

      wx.hideLoading()
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })

      // 重新加载数据
      this.loadAllMemos()

    } catch (error) {
      console.error('❌ 删除失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '删除失败：' + error.message,
        icon: 'none'
      })
    }
  },

  // 显示统计详情（调试用）
  showStatsDebug: function() {
    const today = new Date().toDateString()
    const todayActivities = []

    this.data.allMemos.forEach(memo => {
      const isToday = new Date(memo.timestamp).toDateString() === today
      if (isToday && memo.activities && memo.activities.length > 0) {
        memo.activities.forEach(activity => {
          todayActivities.push({
            name: this.cleanActivityName(activity.name),
            type: activity.activityType,
            duration: activity.duration,
            recordTime: new Date(memo.timestamp).toLocaleString()
          })
        })
      }
    })

    const debugInfo = `今日统计详情：
有价值: ${this.data.stats.valuableMinutes}分钟
低效: ${this.data.stats.wastefulMinutes}分钟

今日活动(${todayActivities.length}项)：
${todayActivities.map((a, i) => `${i+1}. ${a.name} - ${a.type} - ${a.duration}分钟`).join('\n')}

当前日期: ${today}
当前时间: ${new Date().toLocaleString()}`

    wx.showModal({
      title: '统计调试信息',
      content: debugInfo,
      showCancel: false
    })
  },

  // 计算统计数据
  calculateStats: function(memoList) {
    const today = new Date().toDateString()

    // 今日统计
    let todayValuableMinutes = 0
    let todayNeutralMinutes = 0
    let todayWastefulMinutes = 0
    let todayActivityCount = 0
    let todayTotalMinutes = 0

    // 全部统计（用于总览）
    let totalMinutes = 0
    let totalActivityCount = 0

    console.log('📊 开始计算统计数据，记录数:', memoList.length)
    console.log('📊 今日日期字符串:', today)

    memoList.forEach(memo => {
      const isToday = new Date(memo.timestamp).toDateString() === today

      // 统计每条记录的活动明细
      if (memo.activities && memo.activities.length > 0) {
        if (isToday) {
          console.log(`📌 [今日] 记录 ${memo.title} 有 ${memo.activities.length} 个活动`)
        }

        memo.activities.forEach(activity => {
          const duration = activity.duration || 0
          const activityType = activity.activityType || ''

          // 全部统计
          totalMinutes += duration
          totalActivityCount++

          // 只统计今日的分类数据
          if (isToday) {
            todayTotalMinutes += duration
            todayActivityCount++

            console.log(`  - ${activity.name}: ${duration}分钟, 类型: ${activityType}`)

            if (activityType.includes('有价值') || activityType === 'valuable') {
              todayValuableMinutes += duration
              console.log(`    ✅ 今日有价值: +${duration}分钟`)
            } else if (activityType.includes('低效') || activityType === 'wasteful') {
              todayWastefulMinutes += duration
              console.log(`    ❌ 今日低效: +${duration}分钟`)
            } else {
              todayNeutralMinutes += duration
              console.log(`    ⚪ 今日中性: +${duration}分钟`)
            }
          }
        })
      }
    })

    console.log('📊 今日统计:', {
      todayTotalMinutes,
      todayValuableMinutes,
      todayNeutralMinutes,
      todayWastefulMinutes,
      todayActivityCount
    })

    console.log('📊 总体统计:', {
      totalMinutes,
      totalActivityCount
    })

    return {
      totalMinutes: totalMinutes,              // 历史总时长
      valuableMinutes: todayValuableMinutes,   // 今日有价值
      neutralMinutes: todayNeutralMinutes,     // 今日中性
      wastefulMinutes: todayWastefulMinutes,   // 今日低效
      activityCount: totalActivityCount,       // 历史总活动数
      todayMinutes: todayTotalMinutes          // 今日总时长
    }
  },

  // 格式化日期
  formatDate: function(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  },

  // 格式化时间
  formatTime: function(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  },

  // 格式化时间段显示
  formatTimePeriodDisplay: function(memo) {
    if (!memo || !memo.timestamp) {
      return '时间未知'
    }

    // 获取记录的开始时间
    const recordDate = new Date(memo.timestamp)
    const startTime = `${recordDate.getHours().toString().padStart(2, '0')}:${recordDate.getMinutes().toString().padStart(2, '0')}`
    
    // 获取日期显示
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const memoDate = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
    
    let dateStr = ''
    if (memoDate.getTime() === today.getTime()) {
      dateStr = '今天'
    } else if (memoDate.getTime() === yesterday.getTime()) {
      dateStr = '昨天'
    } else {
      dateStr = `${recordDate.getMonth() + 1}月${recordDate.getDate()}日`
    }

    // 尝试从memo数据中获取时间段信息
    if (memo.startTime && memo.endTime) {
      return `${dateStr} ${memo.startTime}-${memo.endTime}`
    }
    
    // 如果没有时间段信息，则基于开始时间推算一个小时的时间段
    const endDate = new Date(recordDate.getTime() + 60 * 60 * 1000) // 加1小时
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
    
    return `${dateStr} ${startTime}-${endTime}`
  },

  // 日期选择
  onDateChange: function(e) {
    const selectedDate = e.detail.value
    const today = new Date().toDateString()
    const selectedDateObj = new Date(selectedDate)
    
    let dateDisplay = selectedDate
    if (selectedDateObj.toDateString() === today) {
      dateDisplay = '今天'
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (selectedDateObj.toDateString() === yesterday.toDateString()) {
        dateDisplay = '昨天'
      }
    }

    this.setData({
      selectedDate: selectedDate,
      selectedDateDisplay: dateDisplay
    })

    this.applyFilters()
  },

  // 切换筛选面板
  toggleFilterPanel: function() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    })
  },

  // 切换标签筛选
  toggleTagFilter: function(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = [...this.data.selectedTags]
    
    const index = selectedTags.indexOf(tag)
    if (index !== -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tag)
    }
    
    this.setData({ selectedTags })
    this.applyFilters()
  },

  // 设置时间范围
  setTimeRange: function(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ timeRange: range })
    this.applyFilters()
  },

  // 设置排序方式
  setSortBy: function(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy: sortBy })
    this.applyFilters()
  },

  // 应用筛选
  applyFilters: function() {
    console.log('🔧 applyFilters开始 - allMemos数量:', this.data.allMemos?.length || 0)
    if (this.data.allMemos && this.data.allMemos.length > 0) {
      console.log('🔧 第一条allMemo:', this.data.allMemos[0])
    }

    let filteredMemos = [...this.data.allMemos]

    // 标签筛选
    if (this.data.selectedTags.length > 0) {
      filteredMemos = filteredMemos.filter(memo => {
        if (!memo.tags) return false
        return this.data.selectedTags.some(tag => memo.tags.includes(tag))
      })
    }

    // 时间范围筛选
    const now = new Date()
    switch (this.data.timeRange) {
      case 'today':
        const today = now.toDateString()
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp).toDateString() === today
        })
        break
      case '3days':
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp) >= threeDaysAgo
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp) >= weekAgo
        })
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filteredMemos = filteredMemos.filter(memo => {
          return new Date(memo.timestamp) >= monthAgo
        })
        break
    }

    // 排序 ⭐ 使用实际发生时间（sortTimestamp）而不是记录创建时间（timestamp）
    console.log('📊 当前排序方式:', this.data.sortBy)
    switch (this.data.sortBy) {
      case 'time_desc':
        filteredMemos.sort((a, b) => (b.sortTimestamp || b.timestamp) - (a.sortTimestamp || a.timestamp))
        console.log('📊 使用实际发生时间降序排序（最新在前）')
        break
      case 'time_asc':
        filteredMemos.sort((a, b) => (a.sortTimestamp || a.timestamp) - (b.sortTimestamp || b.timestamp))
        console.log('📊 使用实际发生时间升序排序（最早在前）')
        break
      case 'length':
        filteredMemos.sort((a, b) => b.content.length - a.content.length)
        console.log('📊 使用内容长度排序')
        break
    }

    // 打印排序后的前3条记录的实际发生时间
    if (filteredMemos.length > 0) {
      console.log('📊 排序后前3条记录（按实际发生时间）:')
      filteredMemos.slice(0, 3).forEach((memo, i) => {
        const time = new Date(memo.sortTimestamp || memo.timestamp)
        console.log(`  ${i + 1}. ${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')} - ${memo.content?.substring(0, 20)}`)
      })
    }

    // 按日期分组
    const groupedMemos = this.groupMemosByDate(filteredMemos)

    console.log('🔧 过滤后的memos数量:', filteredMemos.length)
    console.log('🔧 分组后的groups数量:', groupedMemos.length)
    if (groupedMemos.length > 0) {
      console.log('🔧 第一个group:', groupedMemos[0])
    }

    // 重新计算统计数据（基于筛选后的记录）
    const stats = this.calculateStats(filteredMemos)

    this.setData({
      filteredMemos: filteredMemos,
      groupedMemos: groupedMemos,
      stats: stats,  // 更新统计数据
      currentPage: 1,
      hasMore: filteredMemos.length > this.data.pageSize
    })

    console.log('🔧 setData完成，页面应该已刷新')
  },

  // 按日期分组
  groupMemosByDate: function(memos) {
    const groups = {}
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    memos.forEach(memo => {
      // 使用实际发生时间而不是记录创建时间 ⭐
      const memoDate = new Date(memo.sortTimestamp || memo.timestamp)
      const dateKey = memo.dateStr

      if (!groups[dateKey]) {
        let dateDisplay = dateKey
        if (memoDate.toDateString() === today.toDateString()) {
          dateDisplay = '今天'
        } else if (memoDate.toDateString() === yesterday.toDateString()) {
          dateDisplay = '昨天'
        } else {
          dateDisplay = `${memoDate.getMonth() + 1}月${memoDate.getDate()}日`
        }

        groups[dateKey] = {
          date: dateKey,
          dateDisplay: dateDisplay,
          timestamp: memoDate.getTime(), // 添加时间戳用于排序
          memos: []
        }
      }

      groups[dateKey].memos.push(memo)
    })

    // 将分组转为数组并按日期排序
    const groupArray = Object.values(groups)

    // 根据当前排序方式决定日期分组的顺序
    if (this.data.sortBy === 'time_desc') {
      // 时间降序：最新的日期在前
      groupArray.sort((a, b) => b.timestamp - a.timestamp)
    } else {
      // 时间升序或其他：最早的日期在前
      groupArray.sort((a, b) => a.timestamp - b.timestamp)
    }

    return groupArray
  },

  // 查看备忘录详情
  viewMemoDetail: function(e) {
    const memo = e.currentTarget.dataset.memo
    console.log('查看详情', memo)
  },

  // 播放语音
  playVoice: function(e) {
    const memo = e.currentTarget.dataset.memo
    
    if (!memo.audioPath) {
      wx.showToast({
        title: '音频文件不存在',
        icon: 'error'
      })
      return
    }

    if (this.data.currentPlayingId && this.data.currentPlayingId !== memo.id) {
      this.innerAudioContext.stop()
      this.updatePlayingStatus(this.data.currentPlayingId, false)
    }

    if (memo.isPlaying) {
      this.innerAudioContext.pause()
      this.updatePlayingStatus(memo.id, false)
      this.setData({ currentPlayingId: null })
    } else {
      this.innerAudioContext.src = memo.audioPath
      this.innerAudioContext.play()
      this.setData({ currentPlayingId: memo.id })
    }
  },

  // 更新播放状态
  updatePlayingStatus: function(memoId, isPlaying) {
    const groupedMemos = this.data.groupedMemos.map(group => ({
      ...group,
      memos: group.memos.map(memo => {
        if (memo.id === memoId) {
          return { ...memo, isPlaying }
        }
        return memo
      })
    }))

    this.setData({ groupedMemos })
  },

  // 编辑备忘录（已删除重复定义，使用577行的版本）

  // 删除备忘录
  deleteMemo: async function(e) {
    const memoId = e.currentTarget.dataset.id
    console.log('删除记录:', memoId)

    // 从 allMemos 或 groupedMemos 查找 memo 对象
    let memo = this.data.allMemos.find(m => m.id === memoId)
    if (!memo) {
      for (const group of this.data.groupedMemos) {
        const found = group.memos.find(m => m.id === memoId)
        if (found) {
          memo = found
          break
        }
      }
    }

    if (!memo) {
      wx.showToast({ title: '记录不存在', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (res.confirm) {
          // 如果正在播放音频，先停止
          if (memo.isPlaying && this.innerAudioContext) {
            this.innerAudioContext.stop()
          }

          // 显示删除中状态
          wx.showLoading({ title: '删除中...' })

          try {
            // 传递完整的memo对象给deleteMemo，包含notionPageId等信息
            const success = await app.deleteMemo(memoId, memo)
            wx.hideLoading()

            if (success) {
              // 删除成功后重新加载
              await this.loadAllMemos()
              wx.showToast({
                title: '已删除并同步',
                icon: 'success',
                duration: 2000
              })
            } else {
              wx.showToast({
                title: '删除失败',
                icon: 'error'
              })
            }
          } catch (error) {
            wx.hideLoading()
            console.error('删除备忘录错误:', error)
            wx.showToast({
              title: '删除失败: ' + error.message,
              icon: 'none',
              duration: 3000
            })
          }
        }
      }
    })
  },

  // 清除筛选
  clearFilters: function() {
    this.setData({
      selectedTags: [],
      timeRange: 'all',
      sortBy: 'time_desc'
    })
    this.applyFilters()
  },

  // 加载更多
  loadMore: function() {
    if (this.data.isLoading || !this.data.hasMore) return

    this.setData({ isLoading: true })

    setTimeout(() => {
      const nextPage = this.data.currentPage + 1
      const startIndex = (nextPage - 1) * this.data.pageSize
      const hasMore = startIndex < this.data.filteredMemos.length

      this.setData({
        currentPage: nextPage,
        hasMore: hasMore,
        isLoading: false
      })
    }, 1000)
  },

  // 清理资源
  cleanup: function() {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  },

  // 计算属性：是否有激活的筛选
  get hasActiveFilters() {
    return this.data.selectedTags.length > 0 || 
           this.data.timeRange !== 'all' || 
           this.data.sortBy !== 'time_desc'
  },

  // 根据时间和类型获取时间段
  getTimePeriod: function(memo) {
    if (memo.isPlanning) {
      return '规划'
    }

    const date = new Date(memo.timestamp)
    const hour = date.getHours()

    if (hour >= 5 && hour < 9) {
      return '早晨'
    } else if (hour >= 9 && hour < 12) {
      return '上午'
    } else if (hour >= 12 && hour < 14) {
      return '中午'
    } else if (hour >= 14 && hour < 18) {
      return '下午'
    } else if (hour >= 18 && hour < 23) {
      return '晚上'
    } else {
      return '休息'
    }
  },

  // 获取时间段对应的颜色
  getTimePeriodColor: function(memo) {
    const period = this.getTimePeriod(memo)
    const colorMap = {
      '早晨': 'morning',
      '上午': 'forenoon',
      '中午': 'noon',
      '下午': 'afternoon',
      '晚上': 'evening',
      '规划': 'planning',
      '休息': 'rest'
    }
    return colorMap[period] || 'default'
  },

  // 智能识别内容分类
  getCategory: function(memo) {
    if (!memo || !memo.content) {
      return '生活'
    }
    const content = memo.content.toLowerCase()
    
    // 工作相关关键词
    const workKeywords = ['工作', '项目', '会议', '同事', '客户', '业务', '任务', '汇报', '加班', '绩效', '考核']
    if (workKeywords.some(keyword => content.includes(keyword))) {
      return '工作'
    }
    
    // 学习相关关键词  
    const studyKeywords = ['学习', '学到', '课程', '书', '知识', '技能', '培训', '考试', '阅读', '笔记']
    if (studyKeywords.some(keyword => content.includes(keyword))) {
      return '学习'
    }
    
    // 成长相关关键词
    const growthKeywords = ['反思', '总结', '成长', '进步', '改进', '提升', '收获', '感悟', '经验', '教训']
    if (growthKeywords.some(keyword => content.includes(keyword))) {
      return '成长'
    }
    
    // 理财相关关键词
    const financeKeywords = ['理财', '投资', '消费', '买', '花费', '存钱', '基金', '股票', '财务', '预算']
    if (financeKeywords.some(keyword => content.includes(keyword))) {
      return '理财'
    }
    
    // 健康相关关键词
    const healthKeywords = ['健康', '运动', '锻炼', '跑步', '健身', '饮食', '吃', '睡觉', '休息', '医生']
    if (healthKeywords.some(keyword => content.includes(keyword))) {
      return '健康'
    }
    
    // 社交相关关键词
    const socialKeywords = ['朋友', '聚会', '聊天', '约', '见面', '社交', '聚餐', '派对', '活动', '相处']
    if (socialKeywords.some(keyword => content.includes(keyword))) {
      return '社交'
    }
    
    // 目标相关关键词
    const goalKeywords = ['目标', '计划', '打算', '准备', '要做', '完成', '达成', '实现', '规划']
    if (goalKeywords.some(keyword => content.includes(keyword)) || memo.isPlanning) {
      return '目标'
    }
    
    // 心情相关关键词
    const moodKeywords = ['开心', '难过', '生气', '焦虑', '紧张', '兴奋', '失落', '感觉', '心情', '情绪']
    if (moodKeywords.some(keyword => content.includes(keyword))) {
      return '心情'
    }
    
    // 想法相关关键词
    const ideaKeywords = ['想法', '想到', '思考', '觉得', '认为', '想起', '突然', '灵感', '想象']
    if (ideaKeywords.some(keyword => content.includes(keyword))) {
      return '想法'
    }
    
    // 默认返回生活
    return '生活'
  },

  // 获取内容分类对应的颜色
  getCategoryColor: function(memo) {
    const category = this.getCategory(memo)
    const colorMap = {
      '生活': 'life',
      '工作': 'work',
      '学习': 'study',
      '成长': 'growth',
      '理财': 'finance',
      '健康': 'health',
      '社交': 'social',
      '目标': 'goal',
      '想法': 'idea',
      '心情': 'mood'
    }
    return colorMap[category] || 'default'
  },

  // 从内容文本中识别分类
  getCategoryFromContent: function(content) {
    if (!content) {
      return '生活'
    }
    const contentLower = content.toLowerCase()

    // 工作相关关键词
    const workKeywords = ['工作', '项目', '会议', '同事', '客户', '业务', '任务', '汇报', '加班', '绩效', '考核']
    if (workKeywords.some(keyword => contentLower.includes(keyword))) {
      return '工作'
    }

    // 学习相关关键词
    const studyKeywords = ['学习', '学到', '课程', '书', '知识', '技能', '培训', '考试', '阅读', '笔记']
    if (studyKeywords.some(keyword => contentLower.includes(keyword))) {
      return '学习'
    }

    // 成长相关关键词
    const growthKeywords = ['反思', '总结', '成长', '进步', '改进', '提升', '收获', '感悟', '经验', '教训']
    if (growthKeywords.some(keyword => contentLower.includes(keyword))) {
      return '成长'
    }

    // 理财相关关键词
    const financeKeywords = ['理财', '投资', '消费', '买', '花费', '存钱', '基金', '股票', '财务', '预算']
    if (financeKeywords.some(keyword => contentLower.includes(keyword))) {
      return '理财'
    }

    // 健康相关关键词
    const healthKeywords = ['健康', '运动', '锻炼', '跑步', '健身', '饮食', '吃', '睡觉', '休息', '医生']
    if (healthKeywords.some(keyword => contentLower.includes(keyword))) {
      return '健康'
    }

    // 社交相关关键词
    const socialKeywords = ['朋友', '聚会', '聊天', '约', '见面', '社交', '聚餐', '派对', '活动', '相处']
    if (socialKeywords.some(keyword => contentLower.includes(keyword))) {
      return '社交'
    }

    // 目标相关关键词
    const goalKeywords = ['目标', '计划', '打算', '准备', '要做', '完成', '达成', '实现', '规划']
    if (goalKeywords.some(keyword => contentLower.includes(keyword))) {
      return '目标'
    }

    // 心情相关关键词
    const moodKeywords = ['开心', '难过', '生气', '焦虑', '紧张', '兴奋', '失落', '感觉', '心情', '情绪']
    if (moodKeywords.some(keyword => contentLower.includes(keyword))) {
      return '心情'
    }

    // 想法相关关键词
    const ideaKeywords = ['想法', '想到', '思考', '觉得', '认为', '想起', '突然', '灵感', '想象']
    if (ideaKeywords.some(keyword => contentLower.includes(keyword))) {
      return '想法'
    }

    // 默认返回生活
    return '生活'
  },

  // 从内容文本中获取分类颜色
  getCategoryColorFromContent: function(content) {
    const category = this.getCategoryFromContent(content)
    const colorMap = {
      '生活': 'life',
      '工作': 'work',
      '学习': 'study',
      '成长': 'growth',
      '理财': 'finance',
      '健康': 'health',
      '社交': 'social',
      '目标': 'goal',
      '想法': 'idea',
      '心情': 'mood'
    }
    return colorMap[category] || 'default'
  }
})