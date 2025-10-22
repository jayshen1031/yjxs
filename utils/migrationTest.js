/**
 * 标签迁移测试工具
 * 用于触发bookmark数据库的标签迁移
 */

/**
 * 执行标签迁移
 * @param {string} userEmail - 可选,指定用户邮箱。如果不提供,则迁移所有用户
 * @returns {Promise<Object>} 迁移结果
 */
async function migrateUserTags(userEmail = null) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'memo-notion-sync',
      data: {
        action: 'migrateTagsToBookmark',
        data: {
          userEmail: userEmail
        }
      },
      success: (res) => {
        console.log('✅ 标签迁移成功:', res.result)
        resolve(res.result)
      },
      fail: (err) => {
        console.error('❌ 标签迁移失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 显示迁移结果对话框
 * @param {Object} result - 迁移结果
 */
function showMigrationResult(result) {
  if (!result.success) {
    wx.showModal({
      title: '迁移失败',
      content: result.error || '未知错误',
      showCancel: false
    })
    return
  }

  let content = `共处理 ${result.totalUsers} 个用户\n`
  content += `成功迁移 ${result.totalMigrated} 个标签\n`
  content += `跳过 ${result.totalSkipped} 个已存在标签`

  if (result.errors && result.errors.length > 0) {
    content += `\n\n遇到 ${result.errors.length} 个错误`
  }

  wx.showModal({
    title: '标签迁移完成',
    content: content,
    showCancel: false,
    confirmText: '确定'
  })
}

/**
 * 一键迁移所有用户的标签
 */
async function migrateAllUserTags() {
  wx.showLoading({ title: '正在迁移标签...' })

  try {
    const result = await migrateUserTags(null)
    wx.hideLoading()
    showMigrationResult(result)
    return result
  } catch (error) {
    wx.hideLoading()
    wx.showToast({
      title: '迁移失败',
      icon: 'none'
    })
    throw error
  }
}

/**
 * 迁移当前用户的标签
 * @param {string} userEmail - 当前用户邮箱
 */
async function migrateCurrentUserTags(userEmail) {
  if (!userEmail) {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }

  wx.showLoading({ title: '正在迁移标签...' })

  try {
    const result = await migrateUserTags(userEmail)
    wx.hideLoading()
    showMigrationResult(result)
    return result
  } catch (error) {
    wx.hideLoading()
    wx.showToast({
      title: '迁移失败',
      icon: 'none'
    })
    throw error
  }
}

module.exports = {
  migrateUserTags,
  migrateAllUserTags,
  migrateCurrentUserTags,
  showMigrationResult
}
