/**
 * 临时工具 - 为现有用户设置密码
 * 在微信开发者工具控制台中运行
 */

// 为用户设置密码的函数
async function setUserPassword(email, password) {
  try {
    console.log('开始为用户设置密码:', email)
    
    // 确保云开发已初始化
    if (!wx.cloud) {
      console.error('微信云开发未初始化')
      return
    }
    
    const result = await wx.cloud.callFunction({
      name: 'memo-notion-sync',
      config: {
        env: 'yjxs-3gbxme0rd1c50635'
      },
      data: {
        action: 'setPasswordForUser',
        data: {
          email: email,
          password: password
        }
      }
    })
    
    console.log('设置密码结果:', result)
    
    if (result.result && result.result.success) {
      console.log('✅ 密码设置成功!')
      wx.showToast({
        title: '密码设置成功',
        icon: 'success'
      })
    } else {
      console.error('❌ 密码设置失败:', result.result?.error)
      wx.showToast({
        title: '密码设置失败',
        icon: 'error'
      })
    }
    
    return result.result
  } catch (error) {
    console.error('设置密码异常:', error)
    wx.showToast({
      title: '设置密码失败',
      icon: 'error'
    })
    return { success: false, error: error.message }
  }
}

// 使用方法：
// 在微信开发者工具的控制台中运行：
// setUserPassword('jayshen1031@gmail.com', 'anlen123')

console.log('密码设置工具已加载，使用方法：')
console.log('setUserPassword("jayshen1031@gmail.com", "anlen123")')

// 导出函数供全局使用
if (typeof window !== 'undefined') {
  window.setUserPassword = setUserPassword
}

module.exports = { setUserPassword }