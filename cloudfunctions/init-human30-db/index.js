// cloudfunctions/init-human30-db/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 初始化HUMAN 3.0数据库集合
 */
exports.main = async (event, context) => {
  const results = []

  try {
    // 1. 创建评估会话集合
    try {
      await db.createCollection('human30_sessions')
      results.push({ collection: 'human30_sessions', status: 'created' })
    } catch (e) {
      if (e.errCode === -1) {
        results.push({ collection: 'human30_sessions', status: 'already_exists' })
      } else {
        results.push({ collection: 'human30_sessions', status: 'error', error: e.message })
      }
    }

    // 2. 创建评估报告集合
    try {
      await db.createCollection('human30_reports')
      results.push({ collection: 'human30_reports', status: 'created' })
    } catch (e) {
      if (e.errCode === -1) {
        results.push({ collection: 'human30_reports', status: 'already_exists' })
      } else {
        results.push({ collection: 'human30_reports', status: 'error', error: e.message })
      }
    }

    // 3. 创建评估结果汇总集合（用于首页显示）
    try {
      await db.createCollection('human30_assessments')
      results.push({ collection: 'human30_assessments', status: 'created' })
    } catch (e) {
      if (e.errCode === -1) {
        results.push({ collection: 'human30_assessments', status: 'already_exists' })
      } else {
        results.push({ collection: 'human30_assessments', status: 'error', error: e.message })
      }
    }

    return {
      success: true,
      message: '数据库初始化完成',
      results: results
    }
  } catch (error) {
    console.error('初始化失败:', error)
    return {
      success: false,
      error: error.message,
      results: results
    }
  }
}
