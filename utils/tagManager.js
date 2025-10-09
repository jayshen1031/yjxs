/**
 * 标签管理工具
 * 支持按用户邮箱管理标签，本地+云端同步
 */

const apiService = require('./apiService.js')

class TagManager {
  constructor() {
    this.storageKey = 'user_tags' // 本地存储key
    this.defaultTags = ['工作', '生活', '学习', '心情', '想法', '计划', '总结', '感悟']
  }

  /**
   * 获取用户的所有标签
   * @param {string} userEmail 用户邮箱
   * @returns {Array<string>} 标签数组
   */
  getUserTags(userEmail) {
    if (!userEmail) {
      return [...this.defaultTags]
    }

    try {
      const allUserTags = wx.getStorageSync(this.storageKey) || {}
      const userTags = allUserTags[userEmail] || []

      // 合并默认标签和用户自定义标签，去重
      const allTags = [...new Set([...this.defaultTags, ...userTags])]

      console.log(`加载用户标签 [${userEmail}]:`, allTags)
      return allTags
    } catch (error) {
      console.error('加载用户标签失败:', error)
      return [...this.defaultTags]
    }
  }

  /**
   * 添加新标签
   * @param {string} userEmail 用户邮箱
   * @param {string} tag 新标签
   * @returns {boolean} 是否成功
   */
  addTag(userEmail, tag) {
    if (!userEmail || !tag || !tag.trim()) {
      return false
    }

    const trimmedTag = tag.trim()

    try {
      const allUserTags = wx.getStorageSync(this.storageKey) || {}
      const userTags = allUserTags[userEmail] || []

      // 检查是否已存在（包括默认标签）
      const allTags = [...this.defaultTags, ...userTags]
      if (allTags.includes(trimmedTag)) {
        console.log('标签已存在:', trimmedTag)
        return false
      }

      // 添加新标签
      userTags.push(trimmedTag)
      allUserTags[userEmail] = userTags

      wx.setStorageSync(this.storageKey, allUserTags)
      console.log(`添加标签成功 [${userEmail}]:`, trimmedTag)

      // 异步同步到云端
      this.syncToCloud(userEmail, userTags)

      return true
    } catch (error) {
      console.error('添加标签失败:', error)
      return false
    }
  }

  /**
   * 批量添加标签
   * @param {string} userEmail 用户邮箱
   * @param {Array<string>} tags 标签数组
   */
  addTags(userEmail, tags) {
    if (!userEmail || !Array.isArray(tags)) {
      return
    }

    tags.forEach(tag => {
      this.addTag(userEmail, tag)
    })
  }

  /**
   * 删除标签
   * @param {string} userEmail 用户邮箱
   * @param {string} tag 要删除的标签
   * @returns {boolean} 是否成功
   */
  removeTag(userEmail, tag) {
    if (!userEmail || !tag) {
      return false
    }

    try {
      const allUserTags = wx.getStorageSync(this.storageKey) || {}
      const userTags = allUserTags[userEmail] || []

      const index = userTags.indexOf(tag)
      if (index === -1) {
        return false
      }

      userTags.splice(index, 1)
      allUserTags[userEmail] = userTags

      wx.setStorageSync(this.storageKey, allUserTags)
      console.log(`删除标签成功 [${userEmail}]:`, tag)

      // 异步同步到云端
      this.syncToCloud(userEmail, userTags)

      return true
    } catch (error) {
      console.error('删除标签失败:', error)
      return false
    }
  }

  /**
   * 从云端加载标签
   * @param {string} userEmail 用户邮箱
   */
  async loadFromCloud(userEmail) {
    if (!userEmail) {
      return
    }

    try {
      console.log(`从云端加载标签 [${userEmail}]...`)

      // 调用云函数获取用户的标签
      const result = await apiService.callCloudFunction('getUserTags', { email: userEmail })

      if (result.success && result.tags) {
        // 保存到本地
        const allUserTags = wx.getStorageSync(this.storageKey) || {}
        allUserTags[userEmail] = result.tags
        wx.setStorageSync(this.storageKey, allUserTags)

        console.log(`云端标签加载成功 [${userEmail}]:`, result.tags)
        return result.tags
      } else {
        console.log('云端暂无标签数据')
        return []
      }
    } catch (error) {
      console.error('从云端加载标签失败:', error)
      return []
    }
  }

  /**
   * 同步标签到云端
   * @param {string} userEmail 用户邮箱
   * @param {Array<string>} tags 标签数组
   */
  async syncToCloud(userEmail, tags) {
    if (!userEmail) {
      return
    }

    try {
      console.log(`同步标签到云端 [${userEmail}]:`, tags)

      const result = await apiService.callCloudFunction('syncUserTags', {
        email: userEmail,
        tags: tags
      })

      if (result.success) {
        console.log('标签同步成功')
      } else {
        console.warn('标签同步失败:', result.error)
      }
    } catch (error) {
      console.error('同步标签到云端失败:', error)
      // 不影响本地使用，静默失败
    }
  }

  /**
   * 清空用户标签（保留默认标签）
   * @param {string} userEmail 用户邮箱
   */
  clearUserTags(userEmail) {
    if (!userEmail) {
      return
    }

    try {
      const allUserTags = wx.getStorageSync(this.storageKey) || {}
      delete allUserTags[userEmail]
      wx.setStorageSync(this.storageKey, allUserTags)

      console.log(`清空用户标签 [${userEmail}]`)

      // 同步到云端
      this.syncToCloud(userEmail, [])
    } catch (error) {
      console.error('清空用户标签失败:', error)
    }
  }
}

// 创建单例
const tagManager = new TagManager()

module.exports = tagManager
