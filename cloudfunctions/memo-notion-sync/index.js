/**
 * 语寄心声 - Notion同步云函数
 * 处理与Notion API的集成和数据同步
 */

const cloud = require('wx-server-sdk')
const axios = require('axios')
const crypto = require('crypto')

// 初始化云开发环境
cloud.init({
  env: 'cloud1-2g49srond2b01891' // 共享LanguageTech云环境
})

const db = cloud.database()

// Notion API配置
const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

// 创建axios实例
const notionApi = axios.create({
  baseURL: NOTION_API_BASE,
  timeout: 10000,
  headers: {
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  }
})

// 云函数入口
exports.main = async (event, context) => {
  const { action, data } = event
  
  try {
    switch (action) {
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
  const emailPrefix = email.split('@')[0]
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
  const [salt, hash] = hashedPassword.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

// 创建带密码的用户
async function createUserWithPassword(data) {
  const { email, password, name, displayName } = data
  
  if (!email || !email.trim()) {
    throw new Error('邮箱地址是必需的')
  }
  
  if (!password || password.length < 6) {
    throw new Error('密码至少需要6位字符')
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
  const emailPrefix = email.split('@')[0]
  const userData = {
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
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

  if (result.data.length === 0) {
    throw new Error('该邮箱尚未注册')
  }

  const user = result.data[0]
  
  // 验证密码
  if (!verifyPassword(password, user.passwordHash)) {
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