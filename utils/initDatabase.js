/**
 * 数据库初始化工具 - 控制台执行版
 *
 * === 使用方法 ===
 *
 * 1. 创建初始用户
 * 在微信开发者工具控制台执行：
 *
 *   const init = require('./utils/initDatabase.js')
 *   init.createUser('jayshen1031@gmail.com', 'anlen123', 'Jay Shen')
 *
 * 2. 创建Notion四数据库
 *
 *   const init = require('./utils/initDatabase.js')
 *   init.createNotionDatabases('ntn_YOUR_API_KEY', 'YOUR_PAGE_ID')
 *
 * 3. 完整初始化（一键执行）
 *
 *   const init = require('./utils/initDatabase.js')
 *   init.fullInit()
 *
 */

const apiService = require('./apiService.js')
const notionApiService = require('./notionApiService.js')

// 创建初始用户
async function createInitialUser() {
  try {
    console.log('开始创建初始用户...')

    // 用户信息
    const userData = {
      email: 'jayshen1031@gmail.com',
      password: 'anlen123',
      name: 'jayshen1031',
      displayName: 'Jay Shen'
    }

    console.log('调用云函数创建用户:', userData.email)

    // 调用云函数创建用户
    const result = await apiService.callCloudFunction('createUserWithPassword', userData)

    if (result.success) {
      console.log('✅ 用户创建成功!')
      console.log('用户ID:', result.userId)
      console.log('邮箱:', result.email)
      console.log('用户名:', result.name)

      wx.showToast({
        title: '初始用户创建成功',
        icon: 'success',
        duration: 2000
      })

      return {
        success: true,
        userId: result.userId,
        message: '用户创建成功'
      }
    } else {
      console.error('❌ 用户创建失败:', result.error)

      wx.showToast({
        title: result.error || '创建失败',
        icon: 'error',
        duration: 2000
      })

      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    console.error('创建用户异常:', error)

    wx.showToast({
      title: '创建失败',
      icon: 'error',
      duration: 2000
    })

    return {
      success: false,
      error: error.message
    }
  }
}

// 检查用户是否存在
async function checkUserExists(email) {
  try {
    console.log('检查用户是否存在:', email)

    const result = await apiService.callCloudFunction('getUserByEmail', { email })

    if (result.success) {
      console.log('✅ 用户已存在:', result.user)
      return {
        exists: true,
        user: result.user
      }
    } else {
      console.log('❌ 用户不存在')
      return {
        exists: false
      }
    }
  } catch (error) {
    console.error('检查用户异常:', error)
    return {
      exists: false,
      error: error.message
    }
  }
}

// 初始化数据库索引（可选）
async function createDatabaseIndexes() {
  try {
    console.log('数据库索引创建功能暂未实现')
    console.log('请在云开发控制台手动创建以下索引：')
    console.log('1. memo_users 集合：')
    console.log('   - email (升序，唯一索引)')
    console.log('   - lastLoginAt (降序)')
    console.log('2. memo_user_configs 集合：')
    console.log('   - userId (升序)')

    return {
      success: true,
      message: '请参考控制台输出手动创建索引'
    }
  } catch (error) {
    console.error('创建索引失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 完整的数据库初始化流程
async function initializeDatabase() {
  console.log('========================================')
  console.log('开始初始化数据库')
  console.log('========================================')

  try {
    // 步骤1: 检查用户是否已存在
    console.log('\n步骤1: 检查用户是否存在...')
    const checkResult = await checkUserExists('jayshen1031@gmail.com')

    if (checkResult.exists) {
      console.log('用户已存在，跳过创建')
      wx.showModal({
        title: '提示',
        content: '用户已存在，无需重复创建',
        showCancel: false
      })
      return {
        success: true,
        message: '用户已存在'
      }
    }

    // 步骤2: 创建初始用户
    console.log('\n步骤2: 创建初始用户...')
    const createResult = await createInitialUser()

    if (!createResult.success) {
      throw new Error(createResult.error || '创建用户失败')
    }

    // 步骤3: 提示创建索引
    console.log('\n步骤3: 数据库索引说明...')
    await createDatabaseIndexes()

    console.log('\n========================================')
    console.log('✅ 数据库初始化完成！')
    console.log('========================================')

    wx.showModal({
      title: '初始化成功',
      content: '数据库初始化完成！\n\n用户邮箱: jayshen1031@gmail.com\n密码: anlen123\n\n现在可以使用邮箱登录了。',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })

    return {
      success: true,
      message: '数据库初始化成功'
    }
  } catch (error) {
    console.error('数据库初始化失败:', error)

    wx.showModal({
      title: '初始化失败',
      content: error.message || '数据库初始化失败，请查看控制台日志',
      showCancel: false
    })

    return {
      success: false,
      error: error.message
    }
  }
}

// 导出函数
module.exports = {
  createInitialUser,
  checkUserExists,
  createDatabaseIndexes,
  initializeDatabase
}

// 如果在浏览器环境，挂载到window对象
if (typeof window !== 'undefined') {
  window.initDatabase = {
    createInitialUser,
    checkUserExists,
    createDatabaseIndexes,
    initializeDatabase
  }
}
