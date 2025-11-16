#!/usr/bin/env node
/**
 * 直接对比两个用户的Notion数据库结构
 * 运行方式：node utils/compareUsersDirectly.js
 */

const https = require('https')

// Notion API调用函数
function callNotionAPI(apiKey, path, method = 'GET') {
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
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// 获取数据库Schema
async function getDatabaseSchema(apiKey, databaseId) {
  const result = await callNotionAPI(apiKey, `/databases/${databaseId}`)
  if (result.object === 'error') {
    throw new Error(result.message)
  }

  const properties = {}
  for (const [name, prop] of Object.entries(result.properties)) {
    properties[name] = prop.type
  }

  return properties
}

// 对比两个Schema
function compareSchemas(dbName, schema1, schema2, user1, user2) {
  const differences = []
  const fields1 = Object.keys(schema1)
  const fields2 = Object.keys(schema2)

  // 检查用户1有但用户2没有的字段
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

  // 检查用户2有但用户1没有的字段
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
    user1: user1,
    user2: user2,
    fields1Count: fields1.length,
    fields2Count: fields2.length,
    differences: differences
  }
}

// 主函数
async function main() {
  // 用户1配置 (jayshen1031@gmail.com)
  const user1 = {
    email: 'jayshen1031@gmail.com',
    apiKey: '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',
    databases: {
      goals: '17674e5ad93781ddb3bdc52e1d75129e',
      todos: '17674e5ad93781d59fcfd8829e293ef2',
      mainRecords: '17674e5ad93781ad997bc71dfa4f6f99',
      activityDetails: '17674e5ad937816f8c73e46643038fac',
      dailyStatus: '17674e5ad9378115be94fe0eac7e4da4',
      happyThings: '17674e5ad93781d596bef9edfc12ce18',
      quotes: '17674e5ad9378118a64ac2c61dc0b1c7',
      knowledge: '17674e5ad93781a18e84f44821cf4e8d'
    }
  }

  // 用户2配置 (jessieqq1031@gmail.com)
  const user2 = {
    email: 'jessieqq1031@gmail.com',
    apiKey: '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',
    databases: {
      goals: '17574e5ad93781a8a5ddc939e69308e6',
      todos: '17574e5ad937813f88f9e96ee4c67784',
      mainRecords: '17574e5ad9378110973bec0ddd7ae652',
      activityDetails: '17574e5ad93781618ad4fa5efe4d77db',
      dailyStatus: '17574e5ad93781edb2c2d9e0cf7e9c1a',
      happyThings: '17574e5ad93781c88f56f4bc899f9b51',
      quotes: '17574e5ad9378132a85ee5f1ccb3f091',
      knowledge: '17574e5ad9378151906efd7e24ed8f4b'
    }
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

  console.log('='.repeat(80))
  console.log('🔍 开始对比数据库结构')
  console.log('='.repeat(80))
  console.log(`\n📧 用户1: ${user1.email}`)
  console.log(`📧 用户2: ${user2.email}\n`)

  const allDifferences = []

  for (const db of databaseNames) {
    const dbId1 = user1.databases[db.key]
    const dbId2 = user2.databases[db.key]

    if (!dbId1 || !dbId2) {
      console.log(`\n⚠️ ${db.name}`)
      console.log(`   用户1: ${dbId1 || '未配置'}`)
      console.log(`   用户2: ${dbId2 || '未配置'}`)
      continue
    }

    console.log(`\n📋 正在对比: ${db.name}`)

    try {
      const schema1 = await getDatabaseSchema(user1.apiKey, dbId1)
      const schema2 = await getDatabaseSchema(user2.apiKey, dbId2)

      const diff = compareSchemas(
        db.name,
        schema1,
        schema2,
        user1.email,
        user2.email
      )

      if (diff.differences.length > 0) {
        allDifferences.push(diff)
        console.log(`   ⚠️ 发现 ${diff.differences.length} 个差异`)
      } else {
        console.log(`   ✅ 结构完全一致 (${diff.fields1Count}个字段)`)
      }

      // 避免API请求过快
      await new Promise(resolve => setTimeout(resolve, 300))

    } catch (err) {
      console.error(`   ❌ 对比失败:`, err.message)
    }
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
      console.log(`   用户1字段数: ${diff.fields1Count}`)
      console.log(`   用户2字段数: ${diff.fields2Count}`)
      console.log(`   差异数量: ${diff.differences.length}\n`)

      diff.differences.forEach(d => {
        if (d.type === 'missing_in_user2') {
          console.log(`  ❌ 用户2缺少字段:`)
          console.log(`     字段名: ${d.field}`)
          console.log(`     类型: ${d.fieldType}`)
        } else if (d.type === 'missing_in_user1') {
          console.log(`  ➕ 用户1缺少字段:`)
          console.log(`     字段名: ${d.field}`)
          console.log(`     类型: ${d.fieldType}`)
        } else if (d.type === 'type_mismatch') {
          console.log(`  ⚠️ 类型不一致:`)
          console.log(`     字段名: ${d.field}`)
          console.log(`     用户1类型: ${d.type1}`)
          console.log(`     用户2类型: ${d.type2}`)
        }
        console.log()
      })
    })

    // 生成修复建议
    console.log('\n')
    console.log('='.repeat(80))
    console.log('🔧 修复建议')
    console.log('='.repeat(80))

    allDifferences.forEach(diff => {
      console.log(`\n${diff.databaseName}:`)
      diff.differences.forEach((d, idx) => {
        if (d.type === 'missing_in_user2') {
          console.log(`  ${idx + 1}. 在用户2(${diff.user2})的数据库中添加字段: "${d.field}" (${d.fieldType})`)
        } else if (d.type === 'missing_in_user1') {
          console.log(`  ${idx + 1}. 在用户1(${diff.user1})的数据库中添加字段: "${d.field}" (${d.fieldType})`)
        } else if (d.type === 'type_mismatch') {
          console.log(`  ${idx + 1}. 统一"${d.field}"字段类型 (用户1: ${d.type1}, 用户2: ${d.type2})`)
        }
      })
    })
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('✅ 对比完成')
  console.log('='.repeat(80))
}

// 运行
main().catch(err => {
  console.error('❌ 运行失败:', err)
  process.exit(1)
})
