/**
 * 数据库结构对比工具
 * 用于对比两个用户的Notion数据库Schema差异
 */

const notionApiService = require('./notionApiService.js')
const userManager = require('./userManager.js')

/**
 * 对比两个用户的所有数据库
 */
async function compareAllDatabases(email1, email2) {
  console.log('='.repeat(80))
  console.log('🔍 开始对比数据库结构')
  console.log('='.repeat(80))

  const users = userManager.getUsers()
  const user1 = users.find(u => u.email === email1)
  const user2 = users.find(u => u.email === email2)

  if (!user1 || !user2) {
    console.error('❌ 用户不存在')
    console.log('可用用户:', users.map(u => u.email))
    return
  }

  console.log(`\n📧 用户1: ${user1.email}`)
  console.log(`📧 用户2: ${user2.email}\n`)

  const config1 = user1.notionConfig
  const config2 = user2.notionConfig

  if (!config1?.databases || !config2?.databases) {
    console.error('❌ 用户未配置数据库')
    return
  }

  const databaseNames = [
    { key: 'goals', name: '🎯 目标库 (Goals)' },
    { key: 'todos', name: '✅ 待办库 (Todos)' },
    { key: 'mainRecords', name: '📝 主记录表 (Main Records)' },
    { key: 'activityDetails', name: '⏱️ 活动明细表 (Activity Details)' },
    { key: 'dailyStatus', name: '📊 每日状态库 (Daily Status)' },
    { key: 'happyThings', name: '😊 开心库 (Happy Things)' },
    { key: 'quotes', name: '💬 箴言库 (Quotes)' },
    { key: 'knowledge', name: '📚 知识库 (Knowledge)' }
  ]

  const allDifferences = []

  for (const db of databaseNames) {
    const dbId1 = config1.databases[db.key]
    const dbId2 = config2.databases[db.key]

    if (!dbId1 || !dbId2) {
      console.log(`\n⚠️ ${db.name}`)
      console.log(`   用户1: ${dbId1 || '未配置'}`)
      console.log(`   用户2: ${dbId2 || '未配置'}`)
      continue
    }

    console.log(`\n📋 正在对比: ${db.name}`)
    console.log(`   用户1 数据库ID: ${dbId1}`)
    console.log(`   用户2 数据库ID: ${dbId2}`)

    try {
      const schema1 = await notionApiService.getDatabaseSchema(config1.apiKey, dbId1)
      const schema2 = await notionApiService.getDatabaseSchema(config2.apiKey, dbId2)

      if (!schema1.success || !schema2.success) {
        console.error(`   ❌ 获取Schema失败`)
        continue
      }

      const diff = compareDatabaseSchemas(
        db.name,
        schema1.properties,
        schema2.properties,
        user1.email,
        user2.email
      )

      if (diff.differences.length > 0) {
        allDifferences.push(diff)
      } else {
        console.log(`   ✅ 结构完全一致`)
      }

    } catch (err) {
      console.error(`   ❌ 对比失败:`, err.message)
    }

    // 避免API请求过快
    await sleep(500)
  }

  // 生成汇总报告
  console.log('\n')
  console.log('='.repeat(80))
  console.log('📊 对比结果汇总')
  console.log('='.repeat(80))

  if (allDifferences.length === 0) {
    console.log('\n✅ 所有数据库结构完全一致！')
  } else {
    console.log(`\n⚠️ 发现 ${allDifferences.length} 个数据库存在差异：\n`)

    allDifferences.forEach(diff => {
      console.log(`\n📌 ${diff.databaseName}`)
      console.log('-'.repeat(60))

      diff.differences.forEach(d => {
        if (d.type === 'missing_in_user2') {
          console.log(`  ❌ 缺少字段 (仅在${diff.user1}中存在):`)
          console.log(`     字段名: ${d.field}`)
          console.log(`     类型: ${d.fieldType}`)
        } else if (d.type === 'missing_in_user1') {
          console.log(`  ➕ 新增字段 (仅在${diff.user2}中存在):`)
          console.log(`     字段名: ${d.field}`)
          console.log(`     类型: ${d.fieldType}`)
        } else if (d.type === 'type_mismatch') {
          console.log(`  ⚠️ 类型不一致:`)
          console.log(`     字段名: ${d.field}`)
          console.log(`     ${diff.user1}: ${d.type1}`)
          console.log(`     ${diff.user2}: ${d.type2}`)
        }
      })
    })

    // 生成修复建议
    console.log('\n')
    console.log('='.repeat(80))
    console.log('🔧 修复建议')
    console.log('='.repeat(80))

    allDifferences.forEach(diff => {
      console.log(`\n${diff.databaseName}:`)
      diff.differences.forEach(d => {
        if (d.type === 'missing_in_user2') {
          console.log(`  1. 在${diff.user2}的数据库中添加字段: "${d.field}" (${d.fieldType})`)
        } else if (d.type === 'missing_in_user1') {
          console.log(`  1. 在${diff.user1}的数据库中添加字段: "${d.field}" (${d.fieldType})`)
        } else if (d.type === 'type_mismatch') {
          console.log(`  1. 统一"${d.field}"字段类型为: ${d.type2} (推荐使用${diff.user2}的类型)`)
        }
      })
    })
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('✅ 对比完成')
  console.log('='.repeat(80))
}

/**
 * 对比两个数据库Schema
 */
function compareDatabaseSchemas(dbName, schema1, schema2, user1Email, user2Email) {
  const differences = []
  const fields1 = Object.keys(schema1)
  const fields2 = Object.keys(schema2)

  // 检查字段1中存在但字段2中不存在的
  fields1.forEach(field => {
    if (!fields2.includes(field)) {
      differences.push({
        type: 'missing_in_user2',
        field: field,
        fieldType: schema1[field]
      })
    } else if (schema1[field] !== schema2[field]) {
      differences.push({
        type: 'type_mismatch',
        field: field,
        type1: schema1[field],
        type2: schema2[field]
      })
    }
  })

  // 检查字段2中存在但字段1中不存在的
  fields2.forEach(field => {
    if (!fields1.includes(field)) {
      differences.push({
        type: 'missing_in_user1',
        field: field,
        fieldType: schema2[field]
      })
    }
  })

  return {
    databaseName: dbName,
    user1: user1Email,
    user2: user2Email,
    fields1Count: fields1.length,
    fields2Count: fields2.length,
    differences: differences
  }
}

/**
 * 睡眠函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = {
  compareAllDatabases
}
