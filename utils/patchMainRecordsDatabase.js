/**
 * 为现有的 Main Records 数据库添加缺失字段
 * 使用方法：在小程序中调用此工具函数
 */

const notionApiService = require('./notionApiService.js')

/**
 * 为 Main Records 数据库添加 Start Time 和 End Time 字段
 * @param {string} apiKey - Notion API Key
 * @param {string} databaseId - Main Records 数据库ID
 */
async function patchMainRecordsDatabase(apiKey, databaseId) {
  try {
    console.log('开始为 Main Records 数据库添加缺失字段...')
    console.log('数据库ID:', databaseId)

    // 使用 PATCH 方法更新数据库schema
    const result = await notionApiService.callApi(`/databases/${databaseId}`, {
      apiKey: apiKey,
      method: 'PATCH',
      data: {
        properties: {
          'Start Time': {
            rich_text: {}
          },
          'End Time': {
            rich_text: {}
          }
        }
      }
    })

    if (result.success) {
      console.log('✅ 成功添加 Start Time 和 End Time 字段')
      return {
        success: true,
        message: '字段添加成功'
      }
    } else {
      console.error('❌ 添加字段失败:', result.error)
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    console.error('❌ 添加字段异常:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

module.exports = {
  patchMainRecordsDatabase
}
