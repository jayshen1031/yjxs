/**
 * 获取用户Notion配置
 * 从本地存储中读取指定用户的配置
 */

const userEmail = 'jayshen1031@gmail.com'

// 模拟微信小程序的存储获取
function getStorageSync(key) {
  try {
    const fs = require('fs')
    const path = require('path')

    // 尝试从可能的存储位置读取
    const possiblePaths = [
      path.join(__dirname, '../.user-config.json'),
      path.join(__dirname, '../user-config.json'),
      path.join(process.env.HOME, '.yjxs/user-config.json')
    ]

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        return data[key]
      }
    }

    return null
  } catch (error) {
    console.error('读取配置失败:', error.message)
    return null
  }
}

function main() {
  console.log('🔍 查找用户配置：', userEmail)
  console.log('='.repeat(60))

  // 读取用户列表
  const users = getStorageSync('memo_users')

  if (!users || users.length === 0) {
    console.log('\n❌ 未找到用户配置')
    console.log('\n💡 建议：')
    console.log('   1. 打开微信小程序')
    console.log('   2. 进入"设置" → "Notion集成配置"')
    console.log('   3. 手动复制以下信息：')
    console.log('      - Notion API Key')
    console.log('      - Goals数据库ID')
    console.log('      - Activity Details数据库ID')
    console.log('      - Todos数据库ID')
    console.log('      - Knowledge数据库ID')
    console.log('\n然后直接提供给我，格式如下：')
    console.log('```')
    console.log('API Key: secret_xxxx')
    console.log('Goals: xxxxx')
    console.log('Activity Details: xxxxx')
    console.log('Todos: xxxxx')
    console.log('Knowledge: xxxxx')
    console.log('```')
    return
  }

  // 查找目标用户
  const user = users.find(u => u.email === userEmail)

  if (!user) {
    console.log('\n❌ 未找到用户：', userEmail)
    console.log('\n已有用户：')
    users.forEach(u => {
      console.log('   -', u.email)
    })
    return
  }

  console.log('\n✅ 找到用户配置')
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
    console.log('   Activity Details:', user.notionConfig.databases.activityDetails || '未配置')
    console.log('   Knowledge:', user.notionConfig.databases.knowledge || '未配置')

    // 导出配置用于升级脚本
    const config = {
      apiKey: user.notionConfig.apiKey,
      goalsDatabaseId: user.notionConfig.databases.goals,
      activityDetailsDatabaseId: user.notionConfig.databases.activityDetails,
      todosDatabaseId: user.notionConfig.databases.todos,
      knowledgeDatabaseId: user.notionConfig.databases.knowledge
    }

    // 保存到临时文件
    const fs = require('fs')
    const path = require('path')
    const configPath = path.join(__dirname, '../.upgrade-config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log('\n✅ 配置已保存到:', configPath)
    console.log('\n📝 可以直接运行升级脚本，或手动使用以下配置：')
    console.log('\n' + JSON.stringify(config, null, 2))
  } else {
    console.log('\n⚠️  未找到数据库配置')
    console.log('\n请在小程序"设置" → "Notion集成配置"中配置数据库')
  }
}

main()
