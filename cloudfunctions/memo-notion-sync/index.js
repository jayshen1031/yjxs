/**
 * 语寄心声 - Notion同步云函数
 * 处理与Notion API的集成和数据同步
 */

const cloud = require('wx-server-sdk')
const axios = require('axios')
const crypto = require('crypto')

// 初始化云开发环境
cloud.init({
  env: 'yjxs-3gbxme0rd1c50635' // 语寄心声独立云环境
})

const db = cloud.database()

// Notion API配置
const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

// 创建axios实例
const notionApi = axios.create({
  baseURL: NOTION_API_BASE,
  timeout: 20000,  // 增加超时时间到20秒
  headers: {
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  },
  // 添加代理配置（如果需要）
  proxy: false,
  // 强制使用IPv4
  family: 4
})

// 云函数入口
exports.main = async (event, context) => {
  const { action, data } = event
  
  try {
    switch (action) {
      // 网络诊断
      case 'diagnoseNetwork':
        return await diagnoseNetwork(data)

      // Notion相关功能
      case 'testConnection':
        return await testNotionConnection(data)
      case 'saveUserConfig':
        return await saveUserConfig(data)
      case 'syncMemo':
        return await syncMemoToNotion(data)
      case 'getMemos':
        return await getMemosFromNotion(data)
      case 'batchSync':
        return await batchSyncMemos(data)
      case 'createQuadDatabases':
        return await createQuadDatabases(data)
      case 'createGoal':
        return await createGoal(data)
      case 'updateGoal':
        return await updateGoal(data)
      case 'getGoals':
        return await getGoals(data)
      case 'createTodo':
        return await createTodo(data)
      case 'updateTodo':
        return await updateTodo(data)
      case 'getTodos':
        return await getTodos(data)
      case 'deleteGoal':
        return await deleteGoal(data)
      case 'deleteTodo':
        return await deleteTodo(data)

      // 主记录表功能
      case 'createMainRecord':
        return await createMainRecord(data)
      case 'updateMainRecord':
        return await updateMainRecord(data)
      case 'getMainRecords':
        return await getMainRecords(data)
      case 'deleteMainRecord':
        return await deleteMainRecord(data)

      // 活动明细表功能
      case 'createActivity':
        return await createActivity(data)
      case 'updateActivity':
        return await updateActivity(data)
      case 'getActivities':
        return await getActivities(data)
      case 'deleteActivity':
        return await deleteActivity(data)

      // 关联关系管理
      case 'linkTodoToGoal':
        return await linkTodoToGoal(data)
      case 'linkActivityToTodo':
        return await linkActivityToTodo(data)
      case 'linkActivityToGoal':
        return await linkActivityToGoal(data)
      case 'linkActivityToMainRecord':
        return await linkActivityToMainRecord(data)

      // 统计分析功能
      case 'getGoalStatistics':
        return await getGoalStatistics(data)
      case 'getTodoStatistics':
        return await getTodoStatistics(data)
      case 'getTimeInvestmentByGoal':
        return await getTimeInvestmentByGoal(data)

      // 用户管理功能
      case 'createUser':
        return await createUser(data)
      case 'createUserWithPassword':
        return await createUserWithPassword(data)
      case 'loginWithPassword':
        return await loginWithPassword(data)
      case 'setPasswordForUser':
        return await setPasswordForUser(data)
      case 'getUserByEmail':
        return await getUserByEmail(data)
      case 'updateUserLogin':
        return await updateUserLogin(data)
      case 'getRecentUsers':
        return await getRecentUsers(data)
      case 'updateUser':
        return await updateUser(data)
      case 'updateUserByEmail':
        return await updateUserByEmail(data)
      case 'deleteUser':
        return await deleteUser(data)

      // 标签管理功能
      case 'getUserTags':
        return await getUserTags(data)
      case 'syncUserTags':
        return await syncUserTags(data)

      // 每日状态库功能
      case 'createDailyStatus':
        return await createDailyStatus(data)
      case 'updateDailyStatus':
        return await updateDailyStatus(data)
      case 'getDailyStatus':
        return await getDailyStatus(data)
      case 'getDailyStatuses':
        return await getDailyStatuses(data)
      case 'deleteDailyStatus':
        return await deleteDailyStatus(data)

      default:
        throw new Error(`未知操作: ${action}`)
    }
  } catch (error) {
    console.error('语寄心声云函数执行失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// ============== 辅助工具函数 ==============

/**
 * 根据邮箱查询用户（内部辅助函数）
 * @param {string} email - 用户邮箱
 * @returns {Promise<Object>} 用户数据
 */
async function _getUserByEmail(email) {
  if (!email) {
    throw new Error('email参数是必需的')
  }

  const result = await db.collection('memo_users').where({
    email: email
  }).get()

  if (!result.data || result.data.length === 0) {
    throw new Error(`找不到用户邮箱: ${email}`)
  }

  return { data: result.data[0] }
}

// 网络诊断函数
async function diagnoseNetwork(data) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  try {
    // 测试1: DNS解析
    console.log('开始DNS解析测试...')
    const dns = require('dns').promises
    try {
      const addresses = await dns.resolve4('api.notion.com')
      diagnostics.tests.push({
        name: 'DNS解析',
        status: 'success',
        result: addresses,
        message: `成功解析到IP: ${addresses.join(', ')}`
      })
    } catch (dnsError) {
      diagnostics.tests.push({
        name: 'DNS解析',
        status: 'failed',
        error: dnsError.message
      })
    }

    // 测试2: HTTP连接
    console.log('开始HTTP连接测试...')
    try {
      const testResponse = await axios.get('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${data.apiKey || 'test'}`,
          'Notion-Version': NOTION_VERSION
        },
        timeout: 10000
      })
      diagnostics.tests.push({
        name: 'HTTP连接',
        status: 'success',
        message: '成功连接到Notion API'
      })
    } catch (httpError) {
      diagnostics.tests.push({
        name: 'HTTP连接',
        status: 'failed',
        error: httpError.message,
        code: httpError.code,
        response: httpError.response?.status
      })
    }

    // 测试3: axios配置
    diagnostics.tests.push({
      name: 'Axios配置',
      status: 'info',
      config: {
        baseURL: notionApi.defaults.baseURL,
        timeout: notionApi.defaults.timeout,
        proxy: notionApi.defaults.proxy
      }
    })

    return {
      success: true,
      diagnostics
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      diagnostics
    }
  }
}

// 测试Notion连接
async function testNotionConnection(data) {
  const { apiKey, databaseId } = data
  
  if (!apiKey) {
    throw new Error('API Key不能为空')
  }

  try {
    // 测试API连接
    const userResponse = await notionApi.get('/users/me', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    const user = userResponse.data

    // 如果提供了数据库ID，验证数据库
    let database = null
    if (databaseId) {
      const dbResponse = await notionApi.get(`/databases/${databaseId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      database = dbResponse.data
    }

    return {
      success: true,
      message: 'Notion连接测试成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.person?.email
      },
      database: database ? {
        id: database.id,
        title: database.title
      } : null
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Notion连接失败'
    }
  }
}

// 保存用户配置
async function saveUserConfig(data) {
  const { userId, notionConfig } = data
  
  if (!userId || !notionConfig) {
    throw new Error('用户ID和Notion配置不能为空')
  }

  // 先测试连接
  const testResult = await testNotionConnection(notionConfig)
  if (!testResult.success) {
    throw new Error(`配置验证失败: ${testResult.error}`)
  }

  // 保存到云数据库（语寄心声专用集合）
  const userConfigCollection = db.collection('memo_user_configs')
  
  try {
    // 检查是否已存在配置
    const existingConfig = await userConfigCollection.where({
      userId: userId
    }).get()

    const configData = {
      userId,
      notionConfig: {
        apiKey: notionConfig.apiKey,
        databaseId: notionConfig.databaseId,
        syncEnabled: notionConfig.syncEnabled !== false
      },
      updatedAt: db.serverDate()
    }

    if (existingConfig.data.length > 0) {
      // 更新现有配置
      await userConfigCollection.doc(existingConfig.data[0]._id).update({
        data: configData
      })
    } else {
      // 创建新配置
      configData.createdAt = db.serverDate()
      await userConfigCollection.add({
        data: configData
      })
    }

    return {
      success: true,
      message: 'Notion配置保存成功',
      userId
    }
  } catch (error) {
    throw new Error(`配置保存失败: ${error.message}`)
  }
}

// 同步备忘录到Notion
async function syncMemoToNotion(data) {
  const { userId, memo } = data
  
  if (!userId || !memo) {
    throw new Error('用户ID和备忘录数据不能为空')
  }

  // 获取用户配置
  const userConfig = await getUserConfig(userId)
  if (!userConfig || !userConfig.notionConfig.syncEnabled) {
    throw new Error('用户未配置Notion同步或已禁用')
  }

  // 格式化备忘录为Notion页面
  const title = memo.content.length > 50 ? 
    memo.content.substring(0, 50) + '...' : 
    memo.content

  const pageData = {
    parent: {
      database_id: userConfig.notionConfig.databaseId
    },
    properties: {
      'Name': {
        title: [{ text: { content: title } }]
      },
      'content': {
        rich_text: [{ text: { content: memo.content } }]
      },
      'type': {
        select: { name: memo.type || 'text' }
      },
      'user_id': {
        rich_text: [{ text: { content: userId } }]
      },
      'is_planning': {
        checkbox: memo.isPlanning || false
      },
      'sync_status': {
        select: { name: 'synced' }
      }
    }
  }

  // 添加标签
  if (memo.tags && memo.tags.length > 0) {
    pageData.properties.tags = {
      multi_select: memo.tags.map(tag => ({ name: tag }))
    }
  }

  // 添加音频URL
  if (memo.audioPath) {
    pageData.properties.audio_url = {
      url: memo.audioPath
    }
  }

  try {
    const response = await notionApi.post('/pages', pageData, {
      headers: {
        'Authorization': `Bearer ${userConfig.notionConfig.apiKey}`
      }
    })

    return {
      success: true,
      message: '备忘录同步成功',
      pageId: response.data.id,
      memoId: memo.id
    }
  } catch (error) {
    throw new Error(`同步到Notion失败: ${error.message}`)
  }
}

// 从Notion获取备忘录
async function getMemosFromNotion(data) {
  const { userId } = data
  
  // 获取用户配置
  const userConfig = await getUserConfig(userId)
  if (!userConfig) {
    throw new Error('用户未配置Notion集成')
  }

  try {
    const response = await notionApi.post(`/databases/${userConfig.notionConfig.databaseId}/query`, {
      filter: {
        property: 'user_id',
        rich_text: {
          equals: userId
        }
      },
      sorts: [
        {
          property: 'created_time',
          direction: 'descending'
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${userConfig.notionConfig.apiKey}`
      }
    })

    // 转换Notion页面为小程序格式
    const memos = response.data.results.map(page => {
      const props = page.properties
      return {
        id: `notion_${page.id.replace(/-/g, '')}`,
        content: props.content?.rich_text?.[0]?.text?.content || '',
        type: props.type?.select?.name || 'text',
        isPlanning: props.is_planning?.checkbox || false,
        tags: props.tags?.multi_select?.map(tag => tag.name) || [],
        timestamp: new Date(page.created_time).getTime(),
        audioPath: props.audio_url?.url || null,
        syncStatus: 'synced',
        notionPageId: page.id
      }
    })

    return {
      success: true,
      memos,
      count: memos.length
    }
  } catch (error) {
    throw new Error(`获取数据失败: ${error.message}`)
  }
}

// 批量同步备忘录
async function batchSyncMemos(data) {
  const { userId, memos } = data
  
  if (!userId || !Array.isArray(memos)) {
    throw new Error('用户ID和备忘录列表不能为空')
  }

  const results = []
  
  for (const memo of memos) {
    try {
      const result = await syncMemoToNotion({ userId, memo })
      results.push({
        memoId: memo.id,
        success: true,
        pageId: result.pageId
      })
      
      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      results.push({
        memoId: memo.id,
        success: false,
        error: error.message
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  
  return {
    success: true,
    message: `批量同步完成，成功${successCount}条，失败${results.length - successCount}条`,
    results,
    successCount,
    totalCount: results.length
  }
}

// 获取用户配置
async function getUserConfig(userId) {
  const userConfigCollection = db.collection('memo_user_configs')
  const result = await userConfigCollection.where({
    userId: userId
  }).get()
  
  return result.data.length > 0 ? result.data[0] : null
}

// ========== 用户管理功能 ==========

// 创建新用户
async function createUser(data) {
  const { email, name, displayName } = data
  
  if (!email || !email.trim()) {
    throw new Error('邮箱地址是必需的')
  }

  // 检查邮箱是否已存在
  const usersCollection = db.collection('memo_users')
  const existingUser = await usersCollection.where({
    email: email.toLowerCase()
  }).get()
  
  if (existingUser.data.length > 0) {
    throw new Error('该邮箱已被注册')
  }

  // 创建新用户
  const emailPrefix = (email && email.includes('@')) ? email.split('@')[0] : 'user'
  const userData = {
    email: email.toLowerCase(),
    name: name || emailPrefix,
    displayName: displayName || name || emailPrefix,
    createdAt: db.serverDate(),
    lastLoginAt: db.serverDate(),
    notionConfig: {
      enabled: false,
      apiKey: '',
      databaseId: '',
      syncEnabled: true
    },
    preferences: {
      reminderEnabled: true,
      reminderInterval: 60,
      theme: 'default',
      autoSync: true
    }
  }

  try {
    const result = await usersCollection.add({
      data: userData
    })

    return {
      success: true,
      user: {
        id: result._id,
        ...userData,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }
    }
  } catch (error) {
    throw new Error(`创建用户失败: ${error.message}`)
  }
}

// 根据邮箱查找用户
async function getUserByEmail(data) {
  const { email } = data
  
  if (!email) {
    throw new Error('邮箱地址不能为空')
  }

  const usersCollection = db.collection('memo_users')
  const result = await usersCollection.where({
    email: email.toLowerCase()
  }).get()

  if (result.data.length === 0) {
    return {
      success: false,
      error: '该邮箱尚未注册'
    }
  }

  const user = result.data[0]
  return {
    success: true,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      notionConfig: user.notionConfig,
      preferences: user.preferences
    }
  }
}

// 更新用户最后登录时间
async function updateUserLogin(data) {
  const { userId } = data
  
  if (!userId) {
    throw new Error('用户ID不能为空')
  }

  const usersCollection = db.collection('memo_users')
  
  try {
    await usersCollection.doc(userId).update({
      data: {
        lastLoginAt: db.serverDate()
      }
    })

    return {
      success: true,
      message: '登录时间更新成功'
    }
  } catch (error) {
    throw new Error(`更新登录时间失败: ${error.message}`)
  }
}

// 获取最近登录的用户列表
async function getRecentUsers(data) {
  const { limit = 10 } = data

  const usersCollection = db.collection('memo_users')
  
  try {
    const result = await usersCollection
      .orderBy('lastLoginAt', 'desc')
      .limit(limit)
      .get()

    const users = result.data.map(user => ({
      id: user._id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : null,
      notionConfig: user.notionConfig
    }))

    return {
      success: true,
      users: users
    }
  } catch (error) {
    throw new Error(`获取用户列表失败: ${error.message}`)
  }
}

// 更新用户信息
async function updateUser(data) {
  const { userId, updates } = data
  
  console.log('updateUser收到的数据:', { userId, updates })
  
  if (!userId) {
    throw new Error('用户ID不能为空')
  }

  const usersCollection = db.collection('memo_users')
  
  try {
    const updateData = {
      ...updates,
      updatedAt: db.serverDate()
    }
    
    console.log('准备更新的数据:', updateData)
    
    const result = await usersCollection.doc(userId).update({
      data: updateData
    })
    
    console.log('数据库更新结果:', result)

    return {
      success: true,
      message: '用户信息更新成功'
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw new Error(`更新用户信息失败: ${error.message}`)
  }
}

// 通过邮箱更新用户信息
async function updateUserByEmail(data) {
  const { email, updates } = data
  
  console.log('updateUserByEmail收到的数据:', { email, updates })
  
  if (!email) {
    throw new Error('邮箱地址不能为空')
  }

  const usersCollection = db.collection('memo_users')
  
  try {
    const updateData = {
      ...updates,
      updatedAt: db.serverDate()
    }
    
    console.log('准备通过邮箱更新的数据:', updateData)
    
    const result = await usersCollection.where({
      email: email.toLowerCase()
    }).update({
      data: updateData
    })
    
    console.log('通过邮箱更新数据库结果:', result)

    return {
      success: true,
      message: '用户信息更新成功'
    }
  } catch (error) {
    console.error('通过邮箱更新用户信息失败:', error)
    throw new Error(`更新用户信息失败: ${error.message}`)
  }
}

// 删除用户
async function deleteUser(data) {
  const { userId } = data
  
  if (!userId) {
    throw new Error('用户ID不能为空')
  }

  const usersCollection = db.collection('memo_users')
  const userConfigCollection = db.collection('memo_user_configs')
  
  try {
    // 删除用户配置
    const configs = await userConfigCollection.where({
      userId: userId
    }).get()
    
    for (const config of configs.data) {
      await userConfigCollection.doc(config._id).remove()
    }

    // 删除用户记录
    await usersCollection.doc(userId).remove()

    return {
      success: true,
      message: '用户删除成功'
    }
  } catch (error) {
    throw new Error(`删除用户失败: ${error.message}`)
  }
}

// ========== 密码管理功能 ==========

// 简单的密码哈希函数 (生产环境建议使用bcrypt)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

// 验证密码
function verifyPassword(password, hashedPassword) {
  console.log('verifyPassword调用:', { 
    passwordLength: password ? password.length : 0,
    hashedPasswordType: typeof hashedPassword,
    hashedPasswordLength: hashedPassword ? hashedPassword.length : 0,
    includesColon: hashedPassword ? hashedPassword.includes(':') : false
  })
  
  if (!hashedPassword || typeof hashedPassword !== 'string' || !hashedPassword.includes(':')) {
    console.log('密码验证失败: 无效的hashedPassword格式')
    return false
  }
  
  try {
    const [salt, hash] = hashedPassword.split(':')
    console.log('密码哈希分割结果:', { saltLength: salt ? salt.length : 0, hashLength: hash ? hash.length : 0 })
    
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
    const isMatch = hash === verifyHash
    console.log('密码验证完成:', { isMatch })
    return isMatch
  } catch (error) {
    console.error('密码验证异常:', error)
    return false
  }
}

// 创建带密码的用户
async function createUserWithPassword(data) {
  const { email, password, name, displayName, notionConfig } = data

  console.log('createUserWithPassword开始:', { email, name, hasNotionConfig: !!notionConfig })

  if (!email || !email.trim()) {
    throw new Error('邮箱地址是必需的')
  }

  if (!password || password.length < 6) {
    throw new Error('密码至少需要6位字符')
  }

  // 检查邮箱是否已存在
  const usersCollection = db.collection('memo_users')
  const existingUserResult = await usersCollection.where({
    email: email.toLowerCase()
  }).get()

  // 如果用户已存在，验证密码并更新信息
  if (existingUserResult.data.length > 0) {
    const existingUser = existingUserResult.data[0]
    console.log('邮箱已存在，准备验证密码...')

    // 如果旧用户没有密码（旧数据），允许设置新密码
    if (existingUser.passwordHash) {
      // 验证密码
      const isPasswordValid = verifyPassword(password, existingUser.passwordHash)
      if (!isPasswordValid) {
        throw new Error('该邮箱已被注册，密码不正确')
      }
      console.log('密码验证通过，准备更新用户信息...')
    } else {
      console.log('旧用户没有密码，允许设置新密码...')
    }

    // 密码正确或旧用户首次设置密码，更新用户信息
    const updateData = {
      name: name || existingUser.name,
      displayName: displayName || existingUser.displayName,
      passwordHash: hashPassword(password),  // 更新或设置密码
      lastLoginAt: db.serverDate()
    }

    // 如果提供了notionConfig，也更新
    if (notionConfig) {
      const defaultNotionConfig = {
        enabled: false,
        apiKey: '',
        databaseId: '',
        syncEnabled: true,
        databases: {
          goals: '',
          todos: '',
          mainRecords: '',
          activityDetails: '',
          dailyStatus: '',
          happyThings: '',
          quotes: '',
          knowledge: ''
        }
      }
      updateData.notionConfig = { ...defaultNotionConfig, ...existingUser.notionConfig, ...notionConfig }
    }

    console.log('更新数据:', updateData)

    // 执行更新
    await usersCollection.doc(existingUser._id).update({
      data: updateData
    })

    console.log('用户信息更新成功')

    return {
      success: true,
      updated: true,
      user: {
        id: existingUser._id,
        email: existingUser.email,
        name: updateData.name,
        displayName: updateData.displayName,
        notionConfig: updateData.notionConfig || existingUser.notionConfig
      }
    }
  }

  // 创建新用户
  const emailPrefix = (email && email.includes('@')) ? email.split('@')[0] : 'user'

  // 使用传入的notionConfig或默认配置
  const defaultNotionConfig = {
    enabled: false,
    apiKey: '',
    databaseId: '',
    syncEnabled: true,
    databases: {
      goals: '',
      todos: '',
      mainRecords: '',
      activityDetails: '',
      dailyStatus: '',
      happyThings: '',
      quotes: '',
      knowledge: ''
    }
  }

  const userData = {
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name: name || emailPrefix,
    displayName: displayName || name || emailPrefix,
    createdAt: db.serverDate(),
    lastLoginAt: db.serverDate(),
    notionConfig: notionConfig ? { ...defaultNotionConfig, ...notionConfig } : defaultNotionConfig,
    preferences: {
      reminderEnabled: true,
      reminderInterval: 60,
      theme: 'default',
      autoSync: true
    }
  }

  console.log('准备创建用户，notionConfig:', userData.notionConfig)

  try {
    const result = await usersCollection.add({
      data: userData
    })

    return {
      success: true,
      user: {
        id: result._id,
        email: userData.email,
        name: userData.name,
        displayName: userData.displayName,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        notionConfig: userData.notionConfig,
        preferences: userData.preferences
      }
    }
  } catch (error) {
    throw new Error(`创建用户失败: ${error.message}`)
  }
}

// 密码登录
async function loginWithPassword(data) {
  const { email, password } = data
  
  console.log('loginWithPassword开始:', { email, passwordLength: password ? password.length : 0 })
  
  if (!email) {
    throw new Error('邮箱地址不能为空')
  }
  
  if (!password) {
    throw new Error('密码不能为空')
  }

  const usersCollection = db.collection('memo_users')
  const result = await usersCollection.where({
    email: email.toLowerCase()
  }).get()

  console.log('数据库查询结果:', { count: result.data.length })

  if (result.data.length === 0) {
    throw new Error('该邮箱尚未注册')
  }

  const user = result.data[0]
  console.log('找到用户:', { 
    id: user._id, 
    email: user.email, 
    hasPasswordHash: !!user.passwordHash,
    passwordHashType: typeof user.passwordHash,
    passwordHashValue: user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'undefined'
  })
  
  // 检查用户是否设置了密码
  if (!user.passwordHash) {
    throw new Error('该用户尚未设置密码，请联系管理员')
  }
  
  // 验证密码
  console.log('开始验证密码...')
  const isPasswordValid = verifyPassword(password, user.passwordHash)
  console.log('密码验证结果:', isPasswordValid)
  
  if (!isPasswordValid) {
    throw new Error('密码错误')
  }
  
  // 更新最后登录时间
  await usersCollection.doc(user._id).update({
    data: {
      lastLoginAt: db.serverDate()
    }
  })

  return {
    success: true,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastLoginAt: new Date().toISOString(),
      notionConfig: user.notionConfig,
      preferences: user.preferences
    }
  }
}

// 为现有用户设置密码（临时功能）
async function setPasswordForUser(data) {
  const { email, password } = data
  
  if (!email || !password) {
    throw new Error('邮箱和密码不能为空')
  }

  const usersCollection = db.collection('memo_users')
  
  try {
    const result = await usersCollection.where({
      email: email.toLowerCase()
    }).update({
      data: {
        passwordHash: hashPassword(password),
        updatedAt: db.serverDate()
      }
    })

    console.log('为用户设置密码结果:', result)

    return {
      success: true,
      message: '密码设置成功'
    }
  } catch (error) {
    throw new Error(`设置密码失败: ${error.message}`)
  }
}

// ========== Notion四数据库架构相关函数 ==========

/**
 * 创建Notion四数据库架构
 * 为用户自动创建完整的四数据库架构
 */
async function createQuadDatabases(data) {
  const { userId, apiKey, parentPageId } = data

  if (!userId || !apiKey || !parentPageId) {
    throw new Error('userId, apiKey和parentPageId都是必需的')
  }

  try {
    console.log(`为用户${userId}创建Notion五数据库架构...`)

    // 1. 创建目标库（Goals）
    console.log('创建目标库...')
    const goalsDb = await createNotionDatabase(apiKey, parentPageId, {
      title: '🎯 Goals - 目标库',
      properties: getGoalsDatabaseSchema()
    })
    console.log('✅ 目标库创建成功:', goalsDb.id)

    // 2. 创建待办库（Todos），关联目标库
    console.log('创建待办库...')
    const todosDb = await createNotionDatabase(apiKey, parentPageId, {
      title: '✅ Todos - 待办库',
      properties: getTodosDatabaseSchema(goalsDb.id)
    })
    console.log('✅ 待办库创建成功:', todosDb.id)

    // 3. 创建主记录表（Main Records），关联待办库
    console.log('创建主记录表...')
    const mainDb = await createNotionDatabase(apiKey, parentPageId, {
      title: '📝 Main Records - 主记录表',
      properties: getMainRecordsDatabaseSchema(todosDb.id)
    })
    console.log('✅ 主记录表创建成功:', mainDb.id)

    // 4. 创建活动明细表（Activity Details），关联所有表
    console.log('创建活动明细表...')
    const activityDb = await createNotionDatabase(apiKey, parentPageId, {
      title: '⏱️ Activity Details - 活动明细表',
      properties: getActivityDetailsDatabaseSchema(goalsDb.id, todosDb.id, mainDb.id)
    })
    console.log('✅ 活动明细表创建成功:', activityDb.id)

    // 5. 创建每日状态库（Daily Status）- 独立数据库
    console.log('创建每日状态库...')
    const dailyStatusDb = await createNotionDatabase(apiKey, parentPageId, {
      title: '📊 Daily Status - 每日状态库',
      properties: getDailyStatusDatabaseSchema()
    })
    console.log('✅ 每日状态库创建成功:', dailyStatusDb.id)

    // 6. 创建开心库（Happy Things）- 独立数据库
    console.log('创建开心库...')
    const happyThingsDb = await createNotionDatabase(apiKey, parentPageId, {
      title: '😊 Happy Things - 开心库',
      properties: getHappyThingsDatabaseSchema()
    })
    console.log('✅ 开心库创建成功:', happyThingsDb.id)

    // 7. 保存数据库ID到用户配置
    const usersCollection = db.collection('memo_users')
    // 注意：这里需要先查询用户，因为userId可能不是_id
    const userResult = await usersCollection.where({
      userId: userId
    }).get()

    if (userResult.data && userResult.data.length > 0) {
      const user = userResult.data[0]
      await usersCollection.doc(user._id).update({
        data: {
          notionConfig: {
            enabled: true,
            apiKey: apiKey,
            parentPageId: parentPageId,
            databases: {
              goals: goalsDb.id,
              todos: todosDb.id,
              mainRecords: mainDb.id,
              activityDetails: activityDb.id,
              dailyStatus: dailyStatusDb.id,
              happyThings: happyThingsDb.id
            },
            createdAt: db.serverDate()
          }
        }
      })
      console.log('✅ 配置已保存到云数据库')
    } else {
      console.warn('⚠️ 未找到用户记录，无法保存配置')
    }

    console.log('✅ 六数据库架构创建完成！')

    return {
      success: true,
      message: '六数据库架构创建成功（包含每日状态库和开心库）',
      databases: {
        goals: goalsDb.id,
        todos: todosDb.id,
        mainRecords: mainDb.id,
        activityDetails: activityDb.id,
        dailyStatus: dailyStatusDb.id,
        happyThings: happyThingsDb.id
      }
    }
  } catch (error) {
    console.error('创建六数据库失败:', error)
    throw new Error(`创建六数据库失败: ${error.message}`)
  }
}

/**
 * 通用的Notion数据库创建函数
 */
async function createNotionDatabase(apiKey, parentPageId, config) {
  try {
    const response = await notionApi.post('/databases', {
      parent: { page_id: parentPageId },
      title: [{ text: { content: config.title } }],
      properties: config.properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return response.data
  } catch (error) {
    throw new Error(`创建数据库失败: ${error.message}`)
  }
}

/**
 * 目标库数据库结构
 */
function getGoalsDatabaseSchema() {
  return {
    'Name': { title: {} },
    'Description': { rich_text: {} },
    'Category': {
      select: {
        options: [
          { name: '人生目标', color: 'red' },
          { name: '年度目标', color: 'orange' },
          { name: '季度目标', color: 'yellow' },
          { name: '月度目标', color: 'green' },
          { name: '周目标', color: 'blue' }
        ]
      }
    },
    'Type': {
      select: {
        options: [
          { name: '事业', color: 'blue' },
          { name: '健康', color: 'green' },
          { name: '财务', color: 'yellow' },
          { name: '学习', color: 'purple' },
          { name: '人际', color: 'pink' },
          { name: '兴趣', color: 'orange' },
          { name: '家庭', color: 'red' }
        ]
      }
    },
    'Start Date': { date: {} },
    'Target Date': { date: {} },
    'Status': {
      select: {
        options: [
          { name: '未开始', color: 'gray' },
          { name: '进行中', color: 'blue' },
          { name: '已完成', color: 'green' }
        ]
      }
    },
    'Progress': { number: { format: 'percent' } },
    'Priority': {
      select: {
        options: [
          { name: '高', color: 'red' },
          { name: '中', color: 'yellow' },
          { name: '低', color: 'gray' }
        ]
      }
    },
    'User ID': { rich_text: {} },
    'Tags': { multi_select: { options: [] } }
  }
}

/**
 * 待办库数据库结构
 */
function getTodosDatabaseSchema(goalsDatabaseId) {
  return {
    'Title': { title: {} },
    'Description': { rich_text: {} },
    'Todo Type': {
      select: {
        options: [
          { name: '目标导向', color: 'blue' },
          { name: '临时待办', color: 'gray' },
          { name: '习惯养成', color: 'green' }
        ]
      }
    },
    'Due Date': { date: {} },
    'Priority': {
      select: {
        options: [
          { name: '紧急重要', color: 'red' },
          { name: '重要不紧急', color: 'orange' },
          { name: '紧急不重要', color: 'yellow' },
          { name: '不紧急不重要', color: 'gray' }
        ]
      }
    },
    'Status': {
      select: {
        options: [
          { name: '待办', color: 'gray' },
          { name: '进行中', color: 'blue' },
          { name: '已完成', color: 'green' }
        ]
      }
    },
    'Is Completed': { checkbox: {} },
    'Related Goal': {
      relation: {
        database_id: goalsDatabaseId
      }
    },
    'User ID': { rich_text: {} },
    'Tags': { multi_select: { options: [] } }
  }
}

/**
 * 主记录表数据库结构
 */
function getMainRecordsDatabaseSchema(todosDatabaseId) {
  return {
    'Title': { title: {} },
    'Content': { rich_text: {} },
    'Date': { date: {} },
    'Record Type': {
      select: {
        options: [
          { name: '日常记录', color: 'blue' },
          { name: '次日规划', color: 'orange' }
        ]
      }
    },
    'Time Period': {
      select: {
        options: [
          { name: '早晨', color: 'orange' },
          { name: '上午', color: 'yellow' },
          { name: '下午', color: 'blue' },
          { name: '晚上', color: 'purple' }
        ]
      }
    },
    'Related Todos': {
      relation: {
        database_id: todosDatabaseId
      }
    },
    'User ID': { rich_text: {} },
    'Tags': { multi_select: { options: [] } }
  }
}

/**
 * 活动明细表数据库结构
 */
function getActivityDetailsDatabaseSchema(goalsDatabaseId, todosDatabaseId, mainRecordsDatabaseId) {
  return {
    'Name': { title: {} },
    'Description': { rich_text: {} },
    'Start Time': { date: {} },
    'End Time': { date: {} },
    'Duration': { number: {} },
    'Activity Type': {
      select: {
        options: [
          { name: '工作', color: 'blue' },
          { name: '学习', color: 'purple' },
          { name: '运动', color: 'red' },
          { name: '休息', color: 'green' }
        ]
      }
    },
    'Related Goal': {
      relation: {
        database_id: goalsDatabaseId
      }
    },
    'Related Todo': {
      relation: {
        database_id: todosDatabaseId
      }
    },
    'Related Main Record': {
      relation: {
        database_id: mainRecordsDatabaseId
      }
    },
    'User ID': { rich_text: {} },
    'Tags': { multi_select: { options: [] } }
  }
}

// ========== 目标管理相关函数 ==========

/**
 * 创建目标
 */
async function createGoal(data) {
  const { userId, apiKey, goalData } = data

  if (!userId || !apiKey || !goalData) {
    throw new Error('userId, apiKey和goalData都是必需的')
  }

  // 获取用户的数据库ID
  const user = await _getUserByEmail(userId)
  if (!user.data || !user.data.notionConfig || !user.data.notionConfig.databases) {
    throw new Error('用户尚未配置Notion四数据库')
  }

  const goalsDatabaseId = user.data.notionConfig.databases.goals

  try {
    // 创建Notion页面
    const response = await notionApi.post('/pages', {
      parent: { database_id: goalsDatabaseId },
      properties: {
        'Name': {
          title: [{ text: { content: goalData.title } }]
        },
        'Description': {
          rich_text: [{ text: { content: goalData.description || '' } }]
        },
        'Category': {
          select: { name: goalData.category || '月度目标 (Monthly Goal)' }
        },
        'Type': {
          select: { name: goalData.type || '学习' }
        },
        'Priority': {
          select: { name: goalData.priority || '中' }
        },
        'Status': {
          select: { name: '进行中' }
        },
        'Progress': {
          number: 0
        },
        'User ID': {
          rich_text: [{ text: { content: userId } }]
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      goalId: response.data.id,
      message: '目标创建成功'
    }
  } catch (error) {
    throw new Error(`创建目标失败: ${error.message}`)
  }
}

/**
 * 更新目标
 */
async function updateGoal(data) {
  const { userId, apiKey, goalId, updates } = data

  if (!userId || !apiKey || !goalId || !updates) {
    throw new Error('userId, apiKey, goalId和updates都是必需的')
  }

  try {
    const properties = {}

    if (updates.progress !== undefined) {
      properties['Progress'] = { number: updates.progress }
    }
    if (updates.status) {
      properties['Status'] = { select: { name: updates.status } }
    }

    const response = await notionApi.patch(`/pages/${goalId}`, {
      properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '目标更新成功'
    }
  } catch (error) {
    throw new Error(`更新目标失败: ${error.message}`)
  }
}

/**
 * 获取目标列表
 */
async function getGoals(data) {
  const { userId, apiKey } = data

  if (!userId || !apiKey) {
    throw new Error('userId和apiKey都是必需的')
  }

  const user = await _getUserByEmail(userId)
  if (!user.data || !user.data.notionConfig || !user.data.notionConfig.databases) {
    throw new Error('用户尚未配置Notion四数据库')
  }

  const goalsDatabaseId = user.data.notionConfig.databases.goals

  try {
    const response = await notionApi.post(`/databases/${goalsDatabaseId}/query`, {
      filter: {
        property: 'User ID',
        rich_text: {
          equals: userId
        }
      }
      // 移除排序，避免空数据库报错
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      goals: response.data.results || []
    }
  } catch (error) {
    console.error('获取目标列表详细错误:', error.response?.data || error.message)

    // 如果是400错误且数据库为空，返回空数组
    if (error.response?.status === 400) {
      return {
        success: true,
        goals: []
      }
    }

    throw new Error(`获取目标列表失败: ${error.message}`)
  }
}

// ========== 待办事项管理相关函数 ==========

/**
 * 创建待办事项
 */
async function createTodo(data) {
  const { userId, apiKey, todoData } = data

  if (!userId || !apiKey || !todoData) {
    throw new Error('userId, apiKey和todoData都是必需的')
  }

  const user = await _getUserByEmail(userId)
  if (!user.data || !user.data.notionConfig || !user.data.notionConfig.databases) {
    throw new Error('用户尚未配置Notion四数据库')
  }

  const todosDatabaseId = user.data.notionConfig.databases.todos

  try {
    const properties = {
      'Title': {
        title: [{ text: { content: todoData.title } }]
      },
      'Todo Type': {
        select: { name: todoData.todoType || '临时待办' }
      },
      'Priority': {
        select: { name: todoData.priority || '不紧急不重要' }
      },
      'Status': {
        select: { name: '待办' }
      },
      'Is Completed': {
        checkbox: false
      },
      'User ID': {
        rich_text: [{ text: { content: userId } }]
      }
    }

    if (todoData.dueDate) {
      properties['Due Date'] = {
        date: { start: todoData.dueDate }
      }
    }

    if (todoData.relatedGoalId) {
      properties['Related Goal'] = {
        relation: [{ id: todoData.relatedGoalId }]
      }
    }

    const response = await notionApi.post('/pages', {
      parent: { database_id: todosDatabaseId },
      properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      todoId: response.data.id,
      message: '待办事项创建成功'
    }
  } catch (error) {
    throw new Error(`创建待办事项失败: ${error.message}`)
  }
}

/**
 * 更新待办事项
 */
async function updateTodo(data) {
  const { userId, apiKey, todoId, updates } = data

  if (!userId || !apiKey || !todoId || !updates) {
    throw new Error('userId, apiKey, todoId和updates都是必需的')
  }

  try {
    const properties = {}

    if (updates.status) {
      properties['Status'] = { select: { name: updates.status } }
    }
    if (updates.isCompleted !== undefined) {
      properties['Is Completed'] = { checkbox: updates.isCompleted }
    }

    const response = await notionApi.patch(`/pages/${todoId}`, {
      properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '待办事项更新成功'
    }
  } catch (error) {
    throw new Error(`更新待办事项失败: ${error.message}`)
  }
}

/**
 * 获取待办事项列表
 */
async function getTodos(data) {
  const { userId, apiKey, filter = 'all' } = data

  if (!userId || !apiKey) {
    throw new Error('userId和apiKey都是必需的')
  }

  const user = await _getUserByEmail(userId)
  if (!user.data || !user.data.notionConfig || !user.data.notionConfig.databases) {
    throw new Error('用户尚未配置Notion四数据库')
  }

  const todosDatabaseId = user.data.notionConfig.databases.todos

  try {
    const queryData = {
      filter: {
        and: [
          {
            property: 'User ID',
            rich_text: {
              equals: userId
            }
          }
        ]
      }
      // 移除排序，避免空数据库报错
    }

    // 添加额外筛选条件
    if (filter === 'pending') {
      queryData.filter.and.push({
        property: 'Is Completed',
        checkbox: {
          equals: false
        }
      })
    } else if (filter === 'completed') {
      queryData.filter.and.push({
        property: 'Is Completed',
        checkbox: {
          equals: true
        }
      })
    }

    const response = await notionApi.post(`/databases/${todosDatabaseId}/query`, queryData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      todos: response.data.results || []
    }
  } catch (error) {
    console.error('获取待办事项列表详细错误:', error.response?.data || error.message)

    // 如果是400错误且数据库为空，返回空数组
    if (error.response?.status === 400) {
      return {
        success: true,
        todos: []
      }
    }

    throw new Error(`获取待办事项列表失败: ${error.message}`)
  }
}

// ========== 删除功能 ==========

/**
 * 删除目标
 */
async function deleteGoal(data) {
  const { userId, apiKey, goalId } = data

  if (!userId || !apiKey || !goalId) {
    throw new Error('userId, apiKey和goalId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${goalId}`, {
      archived: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '目标删除成功'
    }
  } catch (error) {
    throw new Error(`删除目标失败: ${error.message}`)
  }
}

/**
 * 删除待办事项
 */
async function deleteTodo(data) {
  const { userId, apiKey, todoId } = data

  if (!userId || !apiKey || !todoId) {
    throw new Error('userId, apiKey和todoId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${todoId}`, {
      archived: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '待办事项删除成功'
    }
  } catch (error) {
    throw new Error(`删除待办事项失败: ${error.message}`)
  }
}

// ========== 主记录表（Main Records）管理功能 ==========

/**
 * 创建主记录
 */
async function createMainRecord(data) {
  const { userId, userEmail, apiKey, recordData } = data

  // 优先使用 userEmail，如果没有则使用 userId（兼容性）
  const queryField = userEmail || userId

  if (!queryField || !apiKey || !recordData) {
    throw new Error('用户标识、apiKey和recordData都是必需的')
  }

  // 从memo_users集合查找用户
  const userResult = await _getUserByEmail(queryField)

  if (!userResult.data || !userResult.data.notionConfig) {
    throw new Error('用户尚未配置Notion')
  }

  const notionConfig = userResult.data.notionConfig

  // 兼容性处理：支持旧的databaseId和新的四数据库配置
  let mainRecordsDbId
  if (notionConfig.mainDatabaseId || notionConfig.mainRecordsDatabaseId) {
    mainRecordsDbId = notionConfig.mainDatabaseId || notionConfig.mainRecordsDatabaseId
  } else if (notionConfig.databases && notionConfig.databases.mainRecords) {
    mainRecordsDbId = notionConfig.databases.mainRecords
  } else if (notionConfig.databaseId) {
    // 兼容旧版本配置，使用主数据库ID
    mainRecordsDbId = notionConfig.databaseId
  } else {
    throw new Error('用户尚未配置主记录表数据库ID')
  }

  try {
    // 使用 email 或 userId，优先使用 email
    const userIdentifier = userEmail || userId

    const properties = {
      'Title': {
        title: [{ text: { content: recordData.title } }]
      },
      'Content': {
        rich_text: [{ text: { content: recordData.content || '' } }]
      },
      'Date': {
        date: { start: recordData.date || new Date().toISOString().split('T')[0] }
      },
      'Record Type': {
        select: { name: recordData.recordType || '日常记录' }
      },
      'Time Period': {
        select: { name: recordData.timePeriod || '上午' }
      },
      'User ID': {
        rich_text: [{ text: { content: userIdentifier } }]
      }
    }

    console.log('创建主记录 - 数据库ID:', mainRecordsDbId)
    console.log('创建主记录 - properties:', JSON.stringify(properties, null, 2))

    // 添加关联的待办事项
    if (recordData.relatedTodoIds && recordData.relatedTodoIds.length > 0) {
      properties['Related Todos'] = {
        relation: recordData.relatedTodoIds.map(id => ({ id }))
      }
    }

    // 添加标签
    if (recordData.tags && recordData.tags.length > 0) {
      properties['Tags'] = {
        multi_select: recordData.tags.map(tag => ({ name: tag }))
      }
    }

    // 添加心情
    if (recordData.mood) {
      properties['Mood'] = {
        select: { name: recordData.mood }
      }
    }

    const response = await notionApi.post('/pages', {
      parent: { database_id: mainRecordsDbId },
      properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    console.log('主记录创建成功，pageId:', response.data.id)

    return {
      success: true,
      recordId: response.data.id,
      pageId: response.data.id,  // 添加 pageId 字段以兼容前端
      message: '主记录创建成功'
    }
  } catch (error) {
    console.error('创建主记录失败 - 详细错误:', error)
    console.error('错误状态码:', error.response?.status)
    console.error('错误数据:', JSON.stringify(error.response?.data, null, 2))

    // 提供更详细的错误信息
    const errorDetail = error.response?.data?.message || error.message
    throw new Error(`创建主记录失败: ${errorDetail}`)
  }
}

/**
 * 更新主记录
 */
async function updateMainRecord(data) {
  const { userId, apiKey, recordId, updates } = data

  if (!userId || !apiKey || !recordId || !updates) {
    throw new Error('userId, apiKey, recordId和updates都是必需的')
  }

  try {
    const properties = {}

    if (updates.content) {
      properties['Content'] = {
        rich_text: [{ text: { content: updates.content } }]
      }
    }

    if (updates.mood) {
      properties['Mood'] = {
        select: { name: updates.mood }
      }
    }

    if (updates.relatedTodoIds) {
      properties['Related Todos'] = {
        relation: updates.relatedTodoIds.map(id => ({ id }))
      }
    }

    const response = await notionApi.patch(`/pages/${recordId}`, {
      properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '主记录更新成功'
    }
  } catch (error) {
    throw new Error(`更新主记录失败: ${error.message}`)
  }
}

/**
 * 获取主记录列表
 */
async function getMainRecords(data) {
  const { userId, userEmail, apiKey, filter = 'all', startDate, endDate } = data

  // 优先使用 userEmail，如果没有则使用 userId（兼容性）
  const queryField = userEmail || userId

  if (!queryField || !apiKey) {
    throw new Error('用户标识和apiKey都是必需的')
  }

  // 从memo_users集合查找用户
  const userResult = await _getUserByEmail(queryField)

  if (!userResult.data || !userResult.data.notionConfig) {
    throw new Error('用户尚未配置Notion')
  }

  const notionConfig = userResult.data.notionConfig

  // 兼容性处理
  let mainRecordsDbId
  if (notionConfig.mainDatabaseId || notionConfig.mainRecordsDatabaseId) {
    mainRecordsDbId = notionConfig.mainDatabaseId || notionConfig.mainRecordsDatabaseId
  } else if (notionConfig.databases && notionConfig.databases.mainRecords) {
    mainRecordsDbId = notionConfig.databases.mainRecords
  } else if (notionConfig.databaseId) {
    mainRecordsDbId = notionConfig.databaseId
  } else {
    throw new Error('用户尚未配置主记录表数据库ID')
  }

  try {
    const queryData = {
      filter: {
        and: [
          {
            property: 'User ID',
            rich_text: {
              equals: userId
            }
          }
        ]
      },
      sorts: [
        {
          property: 'Date',
          direction: 'descending'
        }
      ]
    }

    // 按日期范围筛选
    if (startDate) {
      queryData.filter.and.push({
        property: 'Date',
        date: {
          on_or_after: startDate
        }
      })
    }

    if (endDate) {
      queryData.filter.and.push({
        property: 'Date',
        date: {
          on_or_before: endDate
        }
      })
    }

    // 按记录类型筛选
    if (filter !== 'all') {
      queryData.filter.and.push({
        property: 'Record Type',
        select: {
          equals: filter
        }
      })
    }

    const response = await notionApi.post(`/databases/${mainRecordsDbId}/query`, queryData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      records: response.data.results
    }
  } catch (error) {
    throw new Error(`获取主记录列表失败: ${error.message}`)
  }
}

/**
 * 删除主记录
 */
async function deleteMainRecord(data) {
  const { userId, apiKey, recordId } = data

  if (!userId || !apiKey || !recordId) {
    throw new Error('userId, apiKey和recordId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${recordId}`, {
      archived: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '主记录删除成功'
    }
  } catch (error) {
    throw new Error(`删除主记录失败: ${error.message}`)
  }
}

// ========== 活动明细表（Activity Details）管理功能 ==========

/**
 * 创建活动明细
 */
async function createActivity(data) {
  const { userId, userEmail, apiKey, activityData } = data

  // 优先使用 userEmail，如果没有则使用 userId（兼容性）
  const queryField = userEmail || userId

  if (!queryField || !apiKey || !activityData) {
    throw new Error('用户标识、apiKey和activityData都是必需的')
  }

  // 从memo_users集合查找用户
  const userResult = await _getUserByEmail(queryField)

  if (!userResult.data || !userResult.data.notionConfig) {
    throw new Error('用户尚未配置Notion')
  }

  const notionConfig = userResult.data.notionConfig

  // 兼容性处理
  let activityDbId
  if (notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId) {
    activityDbId = notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId
  } else if (notionConfig.databases && notionConfig.databases.activityDetails) {
    activityDbId = notionConfig.databases.activityDetails
  } else {
    throw new Error('用户尚未配置活动明细表数据库ID')
  }

  try {
    const properties = {
      'Name': {
        title: [{ text: { content: activityData.name } }]
      },
      'Description': {
        rich_text: [{ text: { content: activityData.description || '' } }]
      },
      'Activity Type': {
        select: { name: activityData.activityType || '工作' }
      },
      'Duration': {
        number: activityData.duration || 0
      },
      'User ID': {
        rich_text: [{ text: { content: userId } }]
      }
    }

    // 添加时间信息
    if (activityData.startTime) {
      properties['Start Time'] = {
        date: { start: activityData.startTime }
      }
    }

    if (activityData.endTime) {
      properties['End Time'] = {
        date: { start: activityData.endTime }
      }
    }

    // 添加贡献类型
    if (activityData.contributionType) {
      properties['Contribution Type'] = {
        select: { name: activityData.contributionType }
      }
    }

    // 添加价值评估
    if (activityData.valueRating) {
      properties['Value Rating'] = {
        select: { name: activityData.valueRating }
      }
    }

    // 添加关联关系
    if (activityData.relatedGoalId) {
      properties['Related Goal'] = {
        relation: [{ id: activityData.relatedGoalId }]
      }
    }

    if (activityData.relatedTodoId) {
      properties['Related Todo'] = {
        relation: [{ id: activityData.relatedTodoId }]
      }
    }

    if (activityData.relatedMainRecordId) {
      properties['Related Main Record'] = {
        relation: [{ id: activityData.relatedMainRecordId }]
      }
    }

    // 添加标签
    if (activityData.tags && activityData.tags.length > 0) {
      properties['Tags'] = {
        multi_select: activityData.tags.map(tag => ({ name: tag }))
      }
    }

    const response = await notionApi.post('/pages', {
      parent: { database_id: activityDbId },
      properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      activityId: response.data.id,
      message: '活动明细创建成功'
    }
  } catch (error) {
    throw new Error(`创建活动明细失败: ${error.message}`)
  }
}

/**
 * 更新活动明细
 */
async function updateActivity(data) {
  const { userId, apiKey, activityId, updates } = data

  if (!userId || !apiKey || !activityId || !updates) {
    throw new Error('userId, apiKey, activityId和updates都是必需的')
  }

  try {
    const properties = {}

    if (updates.duration !== undefined) {
      properties['Duration'] = { number: updates.duration }
    }

    if (updates.valueRating) {
      properties['Value Rating'] = { select: { name: updates.valueRating } }
    }

    if (updates.contributionType) {
      properties['Contribution Type'] = { select: { name: updates.contributionType } }
    }

    const response = await notionApi.patch(`/pages/${activityId}`, {
      properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '活动明细更新成功'
    }
  } catch (error) {
    throw new Error(`更新活动明细失败: ${error.message}`)
  }
}

/**
 * 获取活动明细列表
 */
async function getActivities(data) {
  const { userId, userEmail, apiKey, filter = {}, startDate, endDate } = data

  // 优先使用 userEmail，如果没有则使用 userId（兼容性）
  const queryField = userEmail || userId

  if (!queryField || !apiKey) {
    throw new Error('用户标识和apiKey都是必需的')
  }

  // 从memo_users集合查找用户
  const userResult = await _getUserByEmail(queryField)

  if (!userResult.data || !userResult.data.notionConfig) {
    throw new Error('用户尚未配置Notion')
  }

  const notionConfig = userResult.data.notionConfig

  // 兼容性处理
  let activityDbId
  if (notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId) {
    activityDbId = notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId
  } else if (notionConfig.databases && notionConfig.databases.activityDetails) {
    activityDbId = notionConfig.databases.activityDetails
  } else {
    throw new Error('用户尚未配置活动明细表数据库ID')
  }

  try {
    const queryData = {
      filter: {
        and: [
          {
            property: 'User ID',
            rich_text: {
              equals: userId
            }
          }
        ]
      },
      sorts: [
        {
          property: 'Start Time',
          direction: 'descending'
        }
      ]
    }

    // 按日期范围筛选
    if (startDate) {
      queryData.filter.and.push({
        property: 'Start Time',
        date: {
          on_or_after: startDate
        }
      })
    }

    if (endDate) {
      queryData.filter.and.push({
        property: 'Start Time',
        date: {
          on_or_before: endDate
        }
      })
    }

    // 按活动类型筛选
    if (filter.activityType) {
      queryData.filter.and.push({
        property: 'Activity Type',
        select: {
          equals: filter.activityType
        }
      })
    }

    const response = await notionApi.post(`/databases/${activityDbId}/query`, queryData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      activities: response.data.results
    }
  } catch (error) {
    throw new Error(`获取活动明细列表失败: ${error.message}`)
  }
}

/**
 * 删除活动明细
 */
async function deleteActivity(data) {
  const { userId, apiKey, activityId } = data

  if (!userId || !apiKey || !activityId) {
    throw new Error('userId, apiKey和activityId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${activityId}`, {
      archived: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '活动明细删除成功'
    }
  } catch (error) {
    throw new Error(`删除活动明细失败: ${error.message}`)
  }
}

// ========== 关联关系管理功能 ==========

/**
 * 将待办关联到目标
 */
async function linkTodoToGoal(data) {
  const { userId, apiKey, todoId, goalId } = data

  if (!userId || !apiKey || !todoId || !goalId) {
    throw new Error('userId, apiKey, todoId和goalId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${todoId}`, {
      properties: {
        'Related Goal': {
          relation: [{ id: goalId }]
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '待办已关联到目标'
    }
  } catch (error) {
    throw new Error(`关联失败: ${error.message}`)
  }
}

/**
 * 将活动关联到待办
 */
async function linkActivityToTodo(data) {
  const { userId, apiKey, activityId, todoId } = data

  if (!userId || !apiKey || !activityId || !todoId) {
    throw new Error('userId, apiKey, activityId和todoId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${activityId}`, {
      properties: {
        'Related Todo': {
          relation: [{ id: todoId }]
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '活动已关联到待办'
    }
  } catch (error) {
    throw new Error(`关联失败: ${error.message}`)
  }
}

/**
 * 将活动关联到目标
 */
async function linkActivityToGoal(data) {
  const { userId, apiKey, activityId, goalId } = data

  if (!userId || !apiKey || !activityId || !goalId) {
    throw new Error('userId, apiKey, activityId和goalId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${activityId}`, {
      properties: {
        'Related Goal': {
          relation: [{ id: goalId }]
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '活动已关联到目标'
    }
  } catch (error) {
    throw new Error(`关联失败: ${error.message}`)
  }
}

/**
 * 将活动关联到主记录
 */
async function linkActivityToMainRecord(data) {
  const { userId, apiKey, activityId, mainRecordId } = data

  if (!userId || !apiKey || !activityId || !mainRecordId) {
    throw new Error('userId, apiKey, activityId和mainRecordId都是必需的')
  }

  try {
    const response = await notionApi.patch(`/pages/${activityId}`, {
      properties: {
        'Related Main Record': {
          relation: [{ id: mainRecordId }]
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return {
      success: true,
      message: '活动已关联到主记录'
    }
  } catch (error) {
    throw new Error(`关联失败: ${error.message}`)
  }
}

// ========== 统计分析功能 ==========

/**
 * 获取目标统计信息
 */
async function getGoalStatistics(data) {
  const { userId, apiKey } = data

  if (!userId || !apiKey) {
    throw new Error('userId和apiKey都是必需的')
  }

  try {
    // 获取所有目标
    const goalsResult = await getGoals({ userId, apiKey })
    const goals = goalsResult.goals

    // 计算统计数据
    const stats = {
      total: goals.length,
      byStatus: {
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        paused: 0,
        cancelled: 0
      },
      byCategory: {},
      byPriority: {
        high: 0,
        medium: 0,
        low: 0
      },
      averageProgress: 0,
      completionRate: 0
    }

    let totalProgress = 0

    goals.forEach(goal => {
      const props = goal.properties

      // 按状态统计
      const status = props.Status?.select?.name
      if (status === '未开始') stats.byStatus.notStarted++
      else if (status === '进行中') stats.byStatus.inProgress++
      else if (status === '已完成') stats.byStatus.completed++
      else if (status === '已暂停') stats.byStatus.paused++
      else if (status === '已取消') stats.byStatus.cancelled++

      // 按分类统计
      const category = props.Category?.select?.name
      if (category) {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
      }

      // 按优先级统计
      const priority = props.Priority?.select?.name
      if (priority === '高') stats.byPriority.high++
      else if (priority === '中') stats.byPriority.medium++
      else if (priority === '低') stats.byPriority.low++

      // 计算平均进度
      const progress = props.Progress?.number || 0
      totalProgress += progress
    })

    if (goals.length > 0) {
      stats.averageProgress = Math.round(totalProgress / goals.length * 100) / 100
      stats.completionRate = Math.round((stats.byStatus.completed / goals.length) * 100) / 100
    }

    return {
      success: true,
      statistics: stats
    }
  } catch (error) {
    throw new Error(`获取目标统计失败: ${error.message}`)
  }
}

/**
 * 获取待办统计信息
 */
async function getTodoStatistics(data) {
  const { userId, apiKey } = data

  if (!userId || !apiKey) {
    throw new Error('userId和apiKey都是必需的')
  }

  try {
    // 获取所有待办
    const todosResult = await getTodos({ userId, apiKey, filter: 'all' })
    const todos = todosResult.todos

    // 计算统计数据
    const stats = {
      total: todos.length,
      byStatus: {
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        delayed: 0
      },
      byType: {
        goalOriented: 0,
        adHoc: 0,
        habit: 0,
        urgent: 0
      },
      byPriority: {
        urgentImportant: 0,
        importantNotUrgent: 0,
        urgentNotImportant: 0,
        notUrgentNotImportant: 0
      },
      completionRate: 0,
      overdueCount: 0
    }

    const now = new Date()

    todos.forEach(todo => {
      const props = todo.properties

      // 按状态统计
      const status = props.Status?.select?.name
      if (status === '待办') stats.byStatus.pending++
      else if (status === '进行中') stats.byStatus.inProgress++
      else if (status === '已完成') stats.byStatus.completed++
      else if (status === '已取消') stats.byStatus.cancelled++
      else if (status === '延期') stats.byStatus.delayed++

      // 按类型统计
      const type = props['Todo Type']?.select?.name
      if (type?.includes('目标导向')) stats.byType.goalOriented++
      else if (type?.includes('临时待办')) stats.byType.adHoc++
      else if (type?.includes('习惯养成')) stats.byType.habit++
      else if (type?.includes('紧急处理')) stats.byType.urgent++

      // 按优先级统计
      const priority = props.Priority?.select?.name
      if (priority === '紧急重要') stats.byPriority.urgentImportant++
      else if (priority === '重要不紧急') stats.byPriority.importantNotUrgent++
      else if (priority === '紧急不重要') stats.byPriority.urgentNotImportant++
      else if (priority === '不紧急不重要') stats.byPriority.notUrgentNotImportant++

      // 统计过期待办
      const dueDate = props['Due Date']?.date?.start
      if (dueDate && new Date(dueDate) < now && status !== '已完成') {
        stats.overdueCount++
      }
    })

    if (todos.length > 0) {
      stats.completionRate = Math.round((stats.byStatus.completed / todos.length) * 100) / 100
    }

    return {
      success: true,
      statistics: stats
    }
  } catch (error) {
    throw new Error(`获取待办统计失败: ${error.message}`)
  }
}

/**
 * 按目标统计时间投入
 */
async function getTimeInvestmentByGoal(data) {
  const { userId, apiKey, goalId } = data

  if (!userId || !apiKey) {
    throw new Error('userId和apiKey都是必需的')
  }

  // 从memo_users集合查找用户
  const userResult = await _getUserByEmail(userId)

  if (!userResult.data || !userResult.data.notionConfig) {
    throw new Error('用户尚未配置Notion')
  }

  const notionConfig = userResult.data.notionConfig

  // 兼容性处理
  let activityDbId
  if (notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId) {
    activityDbId = notionConfig.activityDatabaseId || notionConfig.activitiesDatabaseId
  } else if (notionConfig.databases && notionConfig.databases.activityDetails) {
    activityDbId = notionConfig.databases.activityDetails
  } else {
    throw new Error('用户尚未配置活动明细表数据库ID')
  }

  try {
    const queryData = {
      filter: {
        and: [
          {
            property: 'User ID',
            rich_text: {
              equals: userId
            }
          }
        ]
      }
    }

    // 如果指定了目标ID，只查询该目标的活动
    if (goalId) {
      queryData.filter.and.push({
        property: 'Related Goal',
        relation: {
          contains: goalId
        }
      })
    }

    const response = await notionApi.post(`/databases/${activityDbId}/query`, queryData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    const activities = response.data.results
    let totalMinutes = 0
    const byType = {}

    activities.forEach(activity => {
      const duration = activity.properties.Duration?.number || 0
      const type = activity.properties['Activity Type']?.select?.name || '未分类'

      totalMinutes += duration
      byType[type] = (byType[type] || 0) + duration
    })

    return {
      success: true,
      timeInvestment: {
        totalMinutes,
        totalHours: Math.round(totalMinutes / 60 * 100) / 100,
        activityCount: activities.length,
        byType
      }
    }
  } catch (error) {
    throw new Error(`获取时间投入统计失败: ${error.message}`)
  }
}

// ============ 标签管理功能 ============

/**
 * 获取用户标签
 * @param {Object} data - { email: 用户邮箱 }
 * @returns {Object} { success: true, tags: [...] }
 */
async function getUserTags(data) {
  const { email } = data

  if (!email) {
    throw new Error('用户邮箱不能为空')
  }

  try {
    // 从memo_users集合获取用户的标签数据
    const usersCollection = db.collection('memo_users')
    const userResult = await usersCollection.where({
      email: email
    }).get()

    if (userResult.data.length === 0) {
      // 用户不存在，返回空数组
      return {
        success: true,
        tags: []
      }
    }

    const user = userResult.data[0]
    const tags = user.tags || []

    console.log(`获取用户标签成功 [${email}]:`, tags)

    return {
      success: true,
      tags: tags
    }
  } catch (error) {
    console.error('获取用户标签失败:', error)
    throw new Error(`获取用户标签失败: ${error.message}`)
  }
}

/**
 * 同步用户标签到云端
 * @param {Object} data - { email: 用户邮箱, tags: 标签数组 }
 * @returns {Object} { success: true }
 */
async function syncUserTags(data) {
  const { email, tags } = data

  if (!email) {
    throw new Error('用户邮箱不能为空')
  }

  if (!Array.isArray(tags)) {
    throw new Error('标签数据格式错误')
  }

  try {
    // 更新memo_users集合中用户的标签数据
    const usersCollection = db.collection('memo_users')
    const userResult = await usersCollection.where({
      email: email
    }).get()

    if (userResult.data.length === 0) {
      throw new Error(`用户不存在: ${email}`)
    }

    const userId = userResult.data[0]._id

    await usersCollection.doc(userId).update({
      data: {
        tags: tags,
        lastModified: db.serverDate()
      }
    })

    console.log(`同步用户标签成功 [${email}]:`, tags.length, '个标签')

    return {
      success: true,
      message: '标签同步成功'
    }
  } catch (error) {
    console.error('同步用户标签失败:', error)
    throw new Error(`同步用户标签失败: ${error.message}`)
  }
}

// ========== 每日状态库（Daily Status）相关功能 ==========

/**
 * 获取每日状态库数据库Schema
 */
function getDailyStatusDatabaseSchema() {
  return {
    'Date': { title: {} },
    'Full Date': { date: {} },
    'Mood': {
      select: {
        options: [
          { name: '😊 开心', color: 'green' },
          { name: '💪 充满动力', color: 'blue' },
          { name: '😌 平静', color: 'default' },
          { name: '😕 迷茫', color: 'gray' },
          { name: '😔 沮丧', color: 'brown' },
          { name: '😰 焦虑', color: 'orange' },
          { name: '😴 疲惫', color: 'yellow' },
          { name: '😤 压力大', color: 'red' }
        ]
      }
    },
    'Energy Level': {
      select: {
        options: [
          { name: '🔋 充沛', color: 'green' },
          { name: '⚡ 良好', color: 'blue' },
          { name: '🔌 一般', color: 'yellow' },
          { name: '🪫 疲惫', color: 'orange' },
          { name: '💤 耗尽', color: 'red' }
        ]
      }
    },
    'Stress Level': {
      select: {
        options: [
          { name: '😌 无压力', color: 'green' },
          { name: '🙂 轻微', color: 'blue' },
          { name: '😐 中等', color: 'yellow' },
          { name: '😰 较高', color: 'orange' },
          { name: '😫 非常高', color: 'red' }
        ]
      }
    },
    'Wake Up Time': { rich_text: {} },
    'Bed Time': { rich_text: {} },
    'Sleep Hours': { number: { format: 'number' } },
    'Sleep Quality': {
      select: {
        options: [
          { name: '😴 很好', color: 'green' },
          { name: '🙂 良好', color: 'blue' },
          { name: '😐 一般', color: 'yellow' },
          { name: '😕 较差', color: 'orange' },
          { name: '😣 很差', color: 'red' }
        ]
      }
    },
    'Weight': { number: { format: 'number' } },
    'Water Intake': { number: { format: 'number' } },
    'Exercise Duration': { number: { format: 'number' } },
    'Exercise Type': {
      multi_select: {
        options: [
          { name: '🏃 跑步', color: 'blue' },
          { name: '🚴 骑行', color: 'green' },
          { name: '🏊 游泳', color: 'purple' },
          { name: '🏋️ 力量训练', color: 'red' },
          { name: '🧘 瑜伽', color: 'pink' },
          { name: '🚶 散步', color: 'default' }
        ]
      }
    },
    'Meals': {
      multi_select: {
        options: [
          { name: '🌅 早餐', color: 'yellow' },
          { name: '☀️ 午餐', color: 'orange' },
          { name: '🌙 晚餐', color: 'purple' },
          { name: '🍎 加餐', color: 'green' }
        ]
      }
    },
    'Diet Notes': { rich_text: {} },
    'Meditation': { checkbox: {} },
    'Meditation Duration': { number: { format: 'number' } },
    'Reading': { checkbox: {} },
    'Reading Duration': { number: { format: 'number' } },
    'Notes': { rich_text: {} },
    'Highlights': { rich_text: {} },
    'User ID': { rich_text: {} }
  }
}

/**
 * 开心库（Happy Things）数据库结构
 */
function getHappyThingsDatabaseSchema() {
  return {
    'Title': { title: {} },
    'Content': { rich_text: {} },
    'Category': {
      select: {
        options: [
          { name: '运动', color: 'blue' },
          { name: '美食', color: 'orange' },
          { name: '社交', color: 'pink' },
          { name: '娱乐', color: 'purple' },
          { name: '学习', color: 'green' },
          { name: '创造', color: 'red' },
          { name: '自然', color: 'default' },
          { name: '放松', color: 'yellow' },
          { name: '生活', color: 'brown' }
        ]
      }
    },
    'Emoji': { rich_text: {} },
    'Energy Level': {
      select: {
        options: [
          { name: '轻松', color: 'green' },
          { name: '适中', color: 'blue' },
          { name: '需精力', color: 'orange' }
        ]
      }
    },
    'Duration': { number: { format: 'number' } },
    'Difficulty': {
      select: {
        options: [
          { name: '简单', color: 'green' },
          { name: '中等', color: 'yellow' },
          { name: '复杂', color: 'red' }
        ]
      }
    },
    'Cost': {
      select: {
        options: [
          { name: '免费', color: 'green' },
          { name: '低成本', color: 'blue' },
          { name: '中等', color: 'yellow' },
          { name: '较高', color: 'orange' }
        ]
      }
    },
    'Usage Count': { number: { format: 'number' } },
    'Last Used': { date: {} },
    'Notes': { rich_text: {} },
    'Is System Default': { checkbox: {} },
    'User ID': { rich_text: {} }
  }
}

/**
 * 创建每日状态记录
 */
async function createDailyStatus(data) {
  const { userEmail, statusData } = data

  if (!userEmail || !statusData) {
    throw new Error('userEmail和statusData都是必需的')
  }

  try {
    // 获取用户配置
    const user = await getUserByEmail({ email: userEmail })
    if (!user.success || !user.user.notionConfig?.databases?.dailyStatus) {
      throw new Error('未找到每日状态库配置')
    }

    const { apiKey, databases } = user.user.notionConfig
    const databaseId = databases.dailyStatus

    // 构建Notion属性
    const properties = buildDailyStatusProperties(statusData)

    // 调用Notion API创建记录
    const response = await notionApi.post('/pages', {
      parent: { database_id: databaseId },
      properties: properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    console.log('✅ 每日状态记录创建成功:', response.data.id)

    return {
      success: true,
      message: '每日状态记录创建成功',
      pageId: response.data.id,
      data: response.data
    }
  } catch (error) {
    console.error('创建每日状态记录失败:', error)
    throw new Error(`创建每日状态记录失败: ${error.message}`)
  }
}

/**
 * 更新每日状态记录
 */
async function updateDailyStatus(data) {
  const { userEmail, pageId, statusData } = data

  if (!userEmail || !pageId || !statusData) {
    throw new Error('userEmail, pageId和statusData都是必需的')
  }

  try {
    // 获取用户配置
    const user = await getUserByEmail({ email: userEmail })
    if (!user.success) {
      throw new Error('未找到用户配置')
    }

    const { apiKey } = user.user.notionConfig

    // 构建Notion属性
    const properties = buildDailyStatusProperties(statusData)

    // 调用Notion API更新记录
    const response = await notionApi.patch(`/pages/${pageId}`, {
      properties: properties
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    console.log('✅ 每日状态记录更新成功:', pageId)

    return {
      success: true,
      message: '每日状态记录更新成功',
      data: response.data
    }
  } catch (error) {
    console.error('更新每日状态记录失败:', error)
    throw new Error(`更新每日状态记录失败: ${error.message}`)
  }
}

/**
 * 获取单条每日状态记录（根据日期）
 */
async function getDailyStatus(data) {
  const { userEmail, date } = data

  if (!userEmail || !date) {
    throw new Error('userEmail和date都是必需的')
  }

  try {
    // 获取用户配置
    const user = await getUserByEmail({ email: userEmail })
    if (!user.success || !user.user.notionConfig?.databases?.dailyStatus) {
      throw new Error('未找到每日状态库配置')
    }

    const { apiKey, databases } = user.user.notionConfig
    const databaseId = databases.dailyStatus

    // 查询指定日期的记录
    const response = await notionApi.post(`/databases/${databaseId}/query`, {
      filter: {
        and: [
          {
            property: 'Date',
            title: {
              equals: date
            }
          },
          {
            property: 'User ID',
            rich_text: {
              equals: userEmail
            }
          }
        ]
      },
      sorts: [
        {
          property: 'Full Date',
          direction: 'descending'
        }
      ],
      page_size: 1
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    console.log(`✅ 查询每日状态记录成功 [${date}]`)

    return {
      success: true,
      status: response.data.results.length > 0 ? parseDailyStatusPage(response.data.results[0]) : null,
      exists: response.data.results.length > 0,
      pageId: response.data.results.length > 0 ? response.data.results[0].id : null
    }
  } catch (error) {
    console.error('获取每日状态记录失败:', error)
    throw new Error(`获取每日状态记录失败: ${error.message}`)
  }
}

/**
 * 获取多条每日状态记录（支持日期范围）
 */
async function getDailyStatuses(data) {
  const { userEmail, startDate, endDate, limit = 30 } = data

  if (!userEmail) {
    throw new Error('userEmail是必需的')
  }

  try {
    // 获取用户配置
    const user = await getUserByEmail({ email: userEmail })
    if (!user.success || !user.user.notionConfig?.databases?.dailyStatus) {
      throw new Error('未找到每日状态库配置')
    }

    const { apiKey, databases } = user.user.notionConfig
    const databaseId = databases.dailyStatus

    // 构建筛选条件
    let filter = {
      property: 'User ID',
      rich_text: {
        equals: userEmail
      }
    }

    // 如果有日期范围，添加日期筛选
    if (startDate || endDate) {
      const dateFilters = []

      if (startDate) {
        dateFilters.push({
          property: 'Full Date',
          date: {
            on_or_after: startDate
          }
        })
      }

      if (endDate) {
        dateFilters.push({
          property: 'Full Date',
          date: {
            on_or_before: endDate
          }
        })
      }

      filter = {
        and: [
          {
            property: 'User ID',
            rich_text: {
              equals: userEmail
            }
          },
          ...dateFilters
        ]
      }
    }

    // 查询记录
    const response = await notionApi.post(`/databases/${databaseId}/query`, {
      filter: filter,
      sorts: [
        {
          property: 'Full Date',
          direction: 'descending'
        }
      ],
      page_size: Math.min(limit, 100)
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    const statuses = response.data.results.map(page => parseDailyStatusPage(page))

    console.log(`✅ 查询每日状态记录成功，共 ${statuses.length} 条`)

    return {
      success: true,
      statuses: statuses,
      count: statuses.length,
      hasMore: response.data.has_more
    }
  } catch (error) {
    console.error('获取每日状态记录列表失败:', error)
    throw new Error(`获取每日状态记录列表失败: ${error.message}`)
  }
}

/**
 * 删除每日状态记录
 */
async function deleteDailyStatus(data) {
  const { userEmail, pageId } = data

  if (!userEmail || !pageId) {
    throw new Error('userEmail和pageId都是必需的')
  }

  try {
    // 获取用户配置
    const user = await getUserByEmail({ email: userEmail })
    if (!user.success) {
      throw new Error('未找到用户配置')
    }

    const { apiKey } = user.user.notionConfig

    // 归档页面（Notion的软删除）
    await notionApi.patch(`/pages/${pageId}`, {
      archived: true
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    console.log('✅ 每日状态记录删除成功:', pageId)

    return {
      success: true,
      message: '每日状态记录删除成功'
    }
  } catch (error) {
    console.error('删除每日状态记录失败:', error)
    throw new Error(`删除每日状态记录失败: ${error.message}`)
  }
}

/**
 * 构建每日状态Notion属性
 */
function buildDailyStatusProperties(statusData) {
  const properties = {}

  // 标题字段（日期）
  if (statusData.date) {
    properties['Date'] = {
      title: [{ text: { content: statusData.date } }]
    }
  }

  // 完整日期
  if (statusData.fullDate) {
    properties['Full Date'] = {
      date: { start: statusData.fullDate }
    }
  }

  // 心情
  if (statusData.mood) {
    properties['Mood'] = {
      select: { name: statusData.mood }
    }
  }

  // 精力水平
  if (statusData.energyLevel) {
    properties['Energy Level'] = {
      select: { name: statusData.energyLevel }
    }
  }

  // 压力水平
  if (statusData.stressLevel) {
    properties['Stress Level'] = {
      select: { name: statusData.stressLevel }
    }
  }

  // 起床时间
  if (statusData.wakeUpTime) {
    properties['Wake Up Time'] = {
      rich_text: [{ text: { content: statusData.wakeUpTime } }]
    }
  }

  // 睡觉时间
  if (statusData.bedTime) {
    properties['Bed Time'] = {
      rich_text: [{ text: { content: statusData.bedTime } }]
    }
  }

  // 睡眠时长
  if (statusData.sleepHours !== undefined) {
    properties['Sleep Hours'] = {
      number: parseFloat(statusData.sleepHours)
    }
  }

  // 睡眠质量
  if (statusData.sleepQuality) {
    properties['Sleep Quality'] = {
      select: { name: statusData.sleepQuality }
    }
  }

  // 体重
  if (statusData.weight !== undefined) {
    properties['Weight'] = {
      number: parseFloat(statusData.weight)
    }
  }

  // 饮水量
  if (statusData.waterIntake !== undefined) {
    properties['Water Intake'] = {
      number: parseInt(statusData.waterIntake)
    }
  }

  // 运动时长
  if (statusData.exerciseDuration !== undefined) {
    properties['Exercise Duration'] = {
      number: parseInt(statusData.exerciseDuration)
    }
  }

  // 运动类型
  if (statusData.exerciseType && statusData.exerciseType.length > 0) {
    properties['Exercise Type'] = {
      multi_select: statusData.exerciseType.map(type => ({ name: type }))
    }
  }

  // 用餐情况
  if (statusData.meals && statusData.meals.length > 0) {
    properties['Meals'] = {
      multi_select: statusData.meals.map(meal => ({ name: meal }))
    }
  }

  // 饮食备注
  if (statusData.dietNotes) {
    properties['Diet Notes'] = {
      rich_text: [{ text: { content: statusData.dietNotes } }]
    }
  }

  // 冥想
  if (statusData.meditation !== undefined) {
    properties['Meditation'] = {
      checkbox: statusData.meditation
    }
  }

  // 冥想时长
  if (statusData.meditationDuration !== undefined) {
    properties['Meditation Duration'] = {
      number: parseInt(statusData.meditationDuration)
    }
  }

  // 阅读
  if (statusData.reading !== undefined) {
    properties['Reading'] = {
      checkbox: statusData.reading
    }
  }

  // 阅读时长
  if (statusData.readingDuration !== undefined) {
    properties['Reading Duration'] = {
      number: parseInt(statusData.readingDuration)
    }
  }

  // 备注
  if (statusData.notes) {
    properties['Notes'] = {
      rich_text: [{ text: { content: statusData.notes } }]
    }
  }

  // 今日亮点
  if (statusData.highlights) {
    properties['Highlights'] = {
      rich_text: [{ text: { content: statusData.highlights } }]
    }
  }

  // 用户ID
  if (statusData.userId) {
    properties['User ID'] = {
      rich_text: [{ text: { content: statusData.userId } }]
    }
  }

  return properties
}

/**
 * 解析每日状态Notion页面
 */
function parseDailyStatusPage(page) {
  const props = page.properties

  return {
    id: page.id,
    date: props['Date']?.title?.[0]?.text?.content || '',
    fullDate: props['Full Date']?.date?.start || '',
    mood: props['Mood']?.select?.name || '',
    energyLevel: props['Energy Level']?.select?.name || '',
    stressLevel: props['Stress Level']?.select?.name || '',
    wakeUpTime: props['Wake Up Time']?.rich_text?.[0]?.text?.content || '',
    bedTime: props['Bed Time']?.rich_text?.[0]?.text?.content || '',
    sleepHours: props['Sleep Hours']?.number || 0,
    sleepQuality: props['Sleep Quality']?.select?.name || '',
    weight: props['Weight']?.number || 0,
    waterIntake: props['Water Intake']?.number || 0,
    exerciseDuration: props['Exercise Duration']?.number || 0,
    exerciseType: props['Exercise Type']?.multi_select?.map(t => t.name) || [],
    meals: props['Meals']?.multi_select?.map(m => m.name) || [],
    dietNotes: props['Diet Notes']?.rich_text?.[0]?.text?.content || '',
    meditation: props['Meditation']?.checkbox || false,
    meditationDuration: props['Meditation Duration']?.number || 0,
    reading: props['Reading']?.checkbox || false,
    readingDuration: props['Reading Duration']?.number || 0,
    notes: props['Notes']?.rich_text?.[0]?.text?.content || '',
    highlights: props['Highlights']?.rich_text?.[0]?.text?.content || '',
    userId: props['User ID']?.rich_text?.[0]?.text?.content || ''
  }
}