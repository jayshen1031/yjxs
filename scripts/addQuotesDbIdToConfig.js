/**
 * 临时脚本：手动添加箴言库ID到用户配置
 *
 * 使用方法：
 * 1. 在微信开发者工具的控制台运行此脚本
 * 2. 将箴言库数据库ID替换为您实际的ID
 */

// 在微信开发者工具控制台运行以下代码：

const userManager = require('./utils/userManager.js')
const currentUser = userManager.getCurrentUser()

if (currentUser) {
  console.log('当前用户:', currentUser.email)
  console.log('当前配置:', currentUser.notionConfig)

  // 添加箴言库ID（替换为您的实际ID）
  const quotesDbId = '请替换为您的箴言库数据库ID'

  if (!currentUser.notionConfig.databases) {
    currentUser.notionConfig.databases = {}
  }

  currentUser.notionConfig.databases.quotes = quotesDbId

  // 保存到本地
  const users = userManager.getUsers()
  const userIndex = users.findIndex(u => u.id === currentUser.id)
  if (userIndex !== -1) {
    users[userIndex] = currentUser
    wx.setStorageSync('users', users)
    userManager.switchUser(currentUser.id)
    console.log('✅ 箴言库ID已添加到本地配置')
    console.log('新配置:', currentUser.notionConfig)
  }

  // 同步到云端
  const apiService = require('./utils/apiService.js')
  apiService.updateUserByEmail(currentUser.email, {
    notionConfig: currentUser.notionConfig
  }).then(result => {
    if (result.success) {
      console.log('✅ 已同步到云端')
    } else {
      console.error('❌ 云端同步失败:', result.error)
    }
  })
} else {
  console.error('❌ 未找到当前用户')
}
