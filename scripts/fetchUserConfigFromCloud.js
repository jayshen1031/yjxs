/**
 * 从云数据库获取用户Notion配置
 */

const cloud = require('wx-server-sdk')

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function main() {
  const userEmail = 'jayshen1031@gmail.com'

  console.log('🔍 从云数据库查询用户配置：', userEmail)
  console.log('='.repeat(60))

  try {
    // 查询用户
    const result = await db.collection('memo_users')
      .where({
        email: userEmail
      })
      .get()

    if (!result.data || result.data.length === 0) {
      console.log('\n❌ 未找到用户：', userEmail)
      console.log('\n请确认：')
      console.log('   1. 邮箱地址是否正确')
      console.log('   2. 用户是否已在小程序中注册')
      return
    }

    const user = result.data[0]
    console.log('\n✅ 找到用户')
    console.log('\n用户信息：')
    console.log('   邮箱：', user.email)
    console.log('   用户名：', user.userName)

    if (!user.notionConfig || !user.notionConfig.apiKey) {
      console.log('\n❌ 该用户未配置Notion')
      console.log('\n请先在小程序中配置Notion集成')
      return
    }

    console.log('\n📋 Notion配置：')
    console.log('   API Key:', user.notionConfig.apiKey.substring(0, 20) + '...')

    if (user.notionConfig.databases) {
      console.log('\n📚 数据库配置：')
      console.log('   Goals:', user.notionConfig.databases.goals || '未配置')
      console.log('   Todos:', user.notionConfig.databases.todos || '未配置')
      console.log('   Main Records:', user.notionConfig.databases.mainRecords || '未配置')
      console.log('   Activity Details:', user.notionConfig.databases.activityDetails || '未配置')
      console.log('   Knowledge:', user.notionConfig.databases.knowledge || '未配置')

      // 导出配置
      const config = {
        apiKey: user.notionConfig.apiKey,
        goalsDatabaseId: user.notionConfig.databases.goals,
        activityDetailsDatabaseId: user.notionConfig.databases.activityDetails,
        todosDatabaseId: user.notionConfig.databases.todos,
        knowledgeDatabaseId: user.notionConfig.databases.knowledge
      }

      // 保存到文件
      const fs = require('fs')
      const path = require('path')
      const configPath = path.join(__dirname, '.upgrade-config.json')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

      console.log('\n✅ 配置已保存到:', configPath)
      console.log('\n🚀 现在可以运行升级脚本了')

      return config
    } else {
      console.log('\n⚠️  未找到数据库配置')
      return null
    }
  } catch (error) {
    console.error('\n❌ 查询失败:', error.message)
    console.error(error)
  }
}

// 如果作为模块导出
if (require.main === module) {
  main().then(() => {
    console.log('\n完成')
    process.exit(0)
  }).catch(error => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })
}

module.exports = { fetchUserConfig: main }
