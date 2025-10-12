/**
 * 更新Notion六数据库配置脚本
 * 直接修改本地storage数据
 */

// 六个数据库ID
const databaseIds = {
  goals: '28774e5ad9378137bb2edc914308f718',           // 目标库
  todos: '28774e5ad9378170adf8c4f50ffbfc6b',           // 待办库
  mainRecords: '28774e5ad937812f9b02c6dc78ef2b16',    // 主记录
  activityDetails: '28774e5ad93781218b8ae0c69b7891c4', // 活动明细
  dailyStatus: '28a74e5ad93781339a5fdc2138403f61',    // 每日状态库
  happyThings: '28a74e5ad9378173a957f017ae1196bc'     // 开心库
}

// 获取当前用户
const userManager = require('./utils/userManager.js')
const currentUser = userManager.getCurrentUser()

if (!currentUser) {
  console.error('❌ 没有找到当前用户，请先登录')
  process.exit(1)
}

console.log('📋 当前用户:', currentUser.email)
console.log('📊 原有配置:', JSON.stringify(currentUser.notionConfig, null, 2))

// 更新配置
const updatedConfig = {
  ...currentUser.notionConfig,
  databases: {
    goals: databaseIds.goals,
    todos: databaseIds.todos,
    mainRecords: databaseIds.mainRecords,
    activityDetails: databaseIds.activityDetails,
    dailyStatus: databaseIds.dailyStatus,
    happyThings: databaseIds.happyThings
  },
  // 兼容字段（向后兼容）
  mainDatabaseId: databaseIds.mainRecords,
  activityDatabaseId: databaseIds.activityDetails,
  databaseId: databaseIds.mainRecords,
  dailyStatusDatabaseId: databaseIds.dailyStatus,
  happyThingsDatabaseId: databaseIds.happyThings,
  goalsDatabaseId: databaseIds.goals,
  todosDatabaseId: databaseIds.todos
}

// 保存配置
const success = userManager.configureNotion(currentUser.id, updatedConfig)

if (success) {
  console.log('✅ Notion配置更新成功！')
  console.log('📊 新配置:', JSON.stringify(updatedConfig, null, 2))

  // 同步到云端
  console.log('☁️ 正在同步到云端...')
  const apiService = require('./utils/apiService.js')
  apiService.updateUserByEmail(currentUser.email, { notionConfig: updatedConfig })
    .then(result => {
      if (result.success) {
        console.log('✅ 云端同步成功！')
      } else {
        console.error('❌ 云端同步失败:', result.error)
      }
    })
    .catch(error => {
      console.error('❌ 云端同步出错:', error)
    })
} else {
  console.error('❌ 配置更新失败')
}

console.log('\n📋 更新的数据库ID列表:')
console.log('🎯 目标库:', databaseIds.goals)
console.log('✅ 待办库:', databaseIds.todos)
console.log('📝 主记录:', databaseIds.mainRecords)
console.log('⏱️ 活动明细:', databaseIds.activityDetails)
console.log('📊 每日状态库:', databaseIds.dailyStatus)
console.log('😊 开心库:', databaseIds.happyThings)
