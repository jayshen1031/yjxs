#!/usr/bin/env node
/**
 * 使用老版本Schema重新创建 jessieqq1031 的数据库
 *
 * 策略：
 * 1. 保留旧数据库作为备份
 * 2. 创建新数据库（使用老字段名）
 * 3. 输出新数据库ID供手动更新配置
 * 4. 用户确认后可手动删除旧数据库
 */

const https = require('https')
const legacySchemas = require('./utils/notionDatabaseSetup_Legacy.js')

const user2 = {
  email: 'jessieqq1031@gmail.com',
  apiKey: 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP'
}

function callNotionAPI(apiKey, path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path: `/v1${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', chunk => responseData += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData))
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

async function getExistingParentPage(apiKey, existingDbId) {
  console.log('📄 获取现有数据库的父页面...')

  const result = await callNotionAPI(apiKey, `/databases/${existingDbId}`)

  if (result.object === 'error') {
    throw new Error('获取数据库信息失败: ' + result.message)
  }

  if (result.parent && result.parent.page_id) {
    console.log('✅ 找到父页面:', result.parent.page_id)
    return result.parent.page_id
  }

  throw new Error('数据库没有父页面')
}

async function createParentPage(apiKey, parentPageId) {
  console.log('📄 创建新的父页面...')

  const pageData = {
    parent: { type: 'page_id', page_id: parentPageId },
    properties: {
      title: {
        title: [{ text: { content: '📝 语寄心声 - 数据中心（老版本Schema）' } }]
      }
    }
  }

  const result = await callNotionAPI(apiKey, '/pages', 'POST', pageData)

  if (result.object === 'error') {
    throw new Error('创建父页面失败: ' + result.message)
  }

  console.log('✅ 父页面创建成功:', result.id)
  return result.id
}

async function createDatabase(apiKey, parentPageId, schema, name) {
  console.log(`\n📊 创建数据库: ${name}`)

  const dbData = {
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ text: { content: schema.title } }],
    properties: schema.properties
  }

  const result = await callNotionAPI(apiKey, '/databases', 'POST', dbData)

  if (result.object === 'error') {
    console.error(`❌ 创建失败: ${result.message}`)
    return null
  }

  console.log(`✅ ${name} 创建成功: ${result.id}`)
  return result.id
}

async function updateRelationFields(apiKey, databaseIds) {
  console.log('\n🔗 更新关联字段...')

  // 更新 Goals 数据库的关联
  await callNotionAPI(apiKey, `/databases/${databaseIds.goals}`, 'PATCH', {
    properties: {
      'Related Todos': {
        relation: { database_id: databaseIds.todos }
      },
      'Related Activities': {
        relation: { database_id: databaseIds.activityDetails }
      }
    }
  })
  console.log('✅ Goals 关联字段更新完成')

  // 更新 Todos 数据库的关联
  await callNotionAPI(apiKey, `/databases/${databaseIds.todos}`, 'PATCH', {
    properties: {
      'Related Goal': {
        relation: { database_id: databaseIds.goals }
      },
      'Related Activities': {
        relation: { database_id: databaseIds.activityDetails }
      }
    }
  })
  console.log('✅ Todos 关联字段更新完成')

  // 更新 Main Records 数据库的关联
  await callNotionAPI(apiKey, `/databases/${databaseIds.mainRecords}`, 'PATCH', {
    properties: {
      'Activities': {
        relation: { database_id: databaseIds.activityDetails }
      }
    }
  })
  console.log('✅ Main Records 关联字段更新完成')

  // 更新 Activity Details 数据库的关联
  await callNotionAPI(apiKey, `/databases/${databaseIds.activityDetails}`, 'PATCH', {
    properties: {
      'Record': {
        relation: { database_id: databaseIds.mainRecords }
      },
      'Related Goal': {
        relation: { database_id: databaseIds.goals }
      },
      'Related Todo': {
        relation: { database_id: databaseIds.todos }
      }
    }
  })
  console.log('✅ Activity Details 关联字段更新完成')
}

async function main() {
  console.log('='.repeat(80))
  console.log('🔄 使用老版本Schema重新创建数据库')
  console.log('='.repeat(80))
  console.log(`\n用户: ${user2.email}`)
  console.log('\n策略: 保留旧数据库，创建新数据库（使用老字段名）\n')

  try {
    // 1. 从旧数据库获取父页面ID，然后创建新父页面
    const oldParentPageId = await getExistingParentPage(user2.apiKey, '2981ee27-edec-8137-9146-d51050a40727')  // goals数据库
    await new Promise(r => setTimeout(r, 500))

    const parentPageId = await createParentPage(user2.apiKey, oldParentPageId)
    await new Promise(r => setTimeout(r, 500))

    // 2. 创建8个数据库
    const databaseIds = {}

    databaseIds.goals = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getGoalsDatabase(),
      '🎯 Goals'
    )
    await new Promise(r => setTimeout(r, 500))

    databaseIds.todos = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getTodosDatabase(),
      '✅ Todos'
    )
    await new Promise(r => setTimeout(r, 500))

    databaseIds.mainRecords = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getMainRecordsDatabase(),
      '📝 Main Records'
    )
    await new Promise(r => setTimeout(r, 500))

    databaseIds.activityDetails = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getActivityDetailsDatabase(),
      '⏱️ Activity Details'
    )
    await new Promise(r => setTimeout(r, 500))

    databaseIds.dailyStatus = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getDailyStatusDatabase(),
      '📊 Daily Status'
    )
    await new Promise(r => setTimeout(r, 500))

    databaseIds.happyThings = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getHappyThingsDatabase(),
      '😊 Happy Things'
    )
    await new Promise(r => setTimeout(r, 500))

    databaseIds.quotes = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getQuotesDatabase(),
      '💬 Quotes'
    )
    await new Promise(r => setTimeout(r, 500))

    databaseIds.knowledge = await createDatabase(
      user2.apiKey,
      parentPageId,
      legacySchemas.getKnowledgeDatabase(),
      '📚 Knowledge'
    )
    await new Promise(r => setTimeout(r, 500))

    // 3. 更新关联字段
    await updateRelationFields(user2.apiKey, databaseIds)

    // 4. 输出结果
    console.log('\n' + '='.repeat(80))
    console.log('🎉 所有数据库创建完成！')
    console.log('='.repeat(80))

    console.log('\n📋 新数据库ID列表：\n')
    console.log(`goals: '${databaseIds.goals}',`)
    console.log(`todos: '${databaseIds.todos}',`)
    console.log(`mainRecords: '${databaseIds.mainRecords}',`)
    console.log(`activityDetails: '${databaseIds.activityDetails}',`)
    console.log(`dailyStatus: '${databaseIds.dailyStatus}',`)
    console.log(`happyThings: '${databaseIds.happyThings}',`)
    console.log(`quotes: '${databaseIds.quotes}',`)
    console.log(`knowledge: '${databaseIds.knowledge}'`)

    console.log('\n📝 下一步操作：')
    console.log('1. 复制上面的ID')
    console.log('2. 在微信开发者工具Console执行以下代码更新用户配置：')
    console.log('')
    console.log('```javascript')
    console.log('const users = JSON.parse(wx.getStorageSync("memo_users"))')
    console.log('const user = users.find(u => u.email === "jessieqq1031@gmail.com")')
    console.log('user.notionConfig.databases = {')
    console.log(`  goals: '${databaseIds.goals}',`)
    console.log(`  todos: '${databaseIds.todos}',`)
    console.log(`  mainRecords: '${databaseIds.mainRecords}',`)
    console.log(`  activityDetails: '${databaseIds.activityDetails}',`)
    console.log(`  dailyStatus: '${databaseIds.dailyStatus}',`)
    console.log(`  happyThings: '${databaseIds.happyThings}',`)
    console.log(`  quotes: '${databaseIds.quotes}',`)
    console.log(`  knowledge: '${databaseIds.knowledge}'`)
    console.log('}')
    console.log('wx.setStorageSync("memo_users", JSON.stringify(users))')
    console.log('console.log("配置已更新")')
    console.log('```')
    console.log('')
    console.log('3. 测试新数据库功能是否正常')
    console.log('4. 确认无误后，可在Notion中删除旧数据库')

  } catch (error) {
    console.error('\n❌ 创建失败:', error.message)
    process.exit(1)
  }
}

main()
