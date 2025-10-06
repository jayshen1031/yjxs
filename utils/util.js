/**
 * 工具函数库
 */

// 格式化时间
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

// 格式化数字（补零）
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 节流函数
const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 深度克隆
const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

// 格式化文件大小
const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 相对时间格式化
const formatRelativeTime = date => {
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (seconds < 60) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 30) {
    return `${days}天前`
  } else if (months < 12) {
    return `${months}个月前`
  } else {
    return `${years}年前`
  }
}

// 验证工具
const validate = {
  // 是否为空
  isEmpty: value => {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0)
  },
  
  // 验证手机号
  isPhone: phone => {
    const reg = /^1[3-9]\d{9}$/
    return reg.test(phone)
  },
  
  // 验证邮箱
  isEmail: email => {
    const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return reg.test(email)
  },
  
  // 验证身份证
  isIdCard: idCard => {
    const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
    return reg.test(idCard)
  }
}

// 本地存储工具
const storage = {
  // 设置存储
  set: (key, value) => {
    try {
      const data = typeof value === 'object' ? JSON.stringify(value) : value
      wx.setStorageSync(key, data)
      return true
    } catch (e) {
      console.error('存储失败:', e)
      return false
    }
  },
  
  // 获取存储
  get: (key, defaultValue = null) => {
    try {
      const value = wx.getStorageSync(key)
      if (value === '') return defaultValue
      
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch (e) {
      console.error('获取存储失败:', e)
      return defaultValue
    }
  },
  
  // 删除存储
  remove: key => {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (e) {
      console.error('删除存储失败:', e)
      return false
    }
  },
  
  // 清空存储
  clear: () => {
    try {
      wx.clearStorageSync()
      return true
    } catch (e) {
      console.error('清空存储失败:', e)
      return false
    }
  }
}

// 提示工具
const toast = {
  // 成功提示
  success: (title, duration = 2000) => {
    wx.showToast({
      title,
      icon: 'success',
      duration
    })
  },
  
  // 失败提示
  error: (title, duration = 2000) => {
    wx.showToast({
      title,
      icon: 'error',
      duration
    })
  },
  
  // 加载提示
  loading: (title = '加载中...') => {
    wx.showLoading({ title })
  },
  
  // 隐藏所有提示
  hide: () => {
    wx.hideToast()
    wx.hideLoading()
  }
}

// 权限检查工具
const permission = {
  // 检查录音权限
  checkRecord: () => {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: res => {
          if (res.authSetting['scope.record']) {
            resolve(true)
          } else {
            wx.authorize({
              scope: 'scope.record',
              success: () => resolve(true),
              fail: () => reject(false)
            })
          }
        },
        fail: () => reject(false)
      })
    })
  },
  
  // 检查摄像头权限
  checkCamera: () => {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: res => {
          if (res.authSetting['scope.camera']) {
            resolve(true)
          } else {
            wx.authorize({
              scope: 'scope.camera',
              success: () => resolve(true),
              fail: () => reject(false)
            })
          }
        },
        fail: () => reject(false)
      })
    })
  }
}

module.exports = {
  formatTime,
  formatNumber,
  generateId,
  debounce,
  throttle,
  deepClone,
  formatFileSize,
  formatRelativeTime,
  validate,
  storage,
  toast,
  permission
}