#!/usr/bin/env node
const https = require('https')

const user1 = {
  email: 'jayshen1031@gmail.com',
  apiKey: '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',
  databases: {
    activityDetails: '28774e5ad93781218b8ae0c69b7891c4',
    goals: '28774e5ad9378137bb2edc914308f718',
    mainRecords: '28774e5ad937812f9b02c6dc78ef2b16',
    todos: '28774e5ad9378170adf8c4f50ffbfc6b',
    dailyStatus: '28a74e5ad93781339a5fdc2138403f61',
    happyThings: '28a74e5ad9378173a957f017ae1196bc',
    quotes: '29174e5ad9378101b2defc94c24aedbc',
    knowledge: '29474e5ad93781c18400c6022a56f425'
  }
}

const user2 = {
  email: 'jessieqq1031@gmail.com',
  apiKey: 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP',
  databases: {
    activityDetails: '2981ee27-edec-8148-8eac-c40f87e281f7',
    dailyStatus: '2981ee27-edec-810c-b791-c99c990c63d5',
    goals: '2981ee27-edec-8137-9146-d51050a40727',
    happyThings: '2981ee27-edec-8190-ba00-c4b4b6275843',
    knowledge: '2981ee27-edec-81d4-94ee-d95fffdbf82a',
    mainRecords: '2981ee27-edec-819d-a2b9-dca36fee2b22',
    quotes: '2981ee27-edec-816d-8146-ef053c64bcc7',
    todos: '2981ee27-edec-8175-bf1e-e0f2ce92601a'
  }
}

function callNotionAPI(apiKey, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path: `/v1${path}`,
      method: 'GET',
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

async function main() {
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
  console.log('🔍 数据库结构对比')
  console.log('='.repeat(80))
  console.log(`用户1: ${user1.email}`)
  console.log(`用户2: ${user2.email}`)
  console.log('='.repeat(80))

  const allDifferences = []

  for (const db of databaseNames) {
    const dbId1 = user1.databases[db.key]
    const dbId2 = user2.databases[db.key]

    console.log(`\n📋 ${db.name}`)

    try {
      const schema1 = await getDatabaseSchema(user1.apiKey, dbId1)
      const schema2 = await getDatabaseSchema(user2.apiKey, dbId2)

      const fields1 = Object.keys(schema1).sort()
      const fields2 = Object.keys(schema2).sort()

      const differences = []

      // 用户1有但用户2没有
      fields1.forEach(field => {
        if (!fields2.includes(field)) {
          differences.push({ type: 'missing_in_user2', field, fieldType: schema1[field] })
        } else if (schema1[field] !== schema2[field]) {
          differences.push({
            type: 'type_mismatch',
            field,
            type1: schema1[field],
            type2: schema2[field]
          })
        }
      })

      // 用户2有但用户1没有
      fields2.forEach(field => {
        if (!fields1.includes(field)) {
          differences.push({ type: 'missing_in_user1', field, fieldType: schema2[field] })
        }
      })

      if (differences.length === 0) {
        console.log(`   ✅ 结构一致 (${fields1.length}个字段)`)
      } else {
        console.log(`   ⚠️ 发现 ${differences.length} 个差异`)
        allDifferences.push({
          databaseName: db.name,
          fields1Count: fields1.length,
          fields2Count: fields2.length,
          differences
        })
      }

      await new Promise(r => setTimeout(r, 300))

    } catch (err) {
      console.log(`   ❌ 对比失败: ${err.message}`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 详细差异报告')
  console.log('='.repeat(80))

  if (allDifferences.length === 0) {
    console.log('\n✅ 所有数据库结构完全一致！')
  } else {
    console.log(`\n⚠️ ${allDifferences.length} 个数据库存在差异\n`)

    allDifferences.forEach(diff => {
      console.log(`\n📌 ${diff.databaseName}`)
      console.log('-'.repeat(60))
      console.log(`   用户1字段数: ${diff.fields1Count}`)
      console.log(`   用户2字段数: ${diff.fields2Count}`)
      console.log(`   差异数量: ${diff.differences.length}`)

      diff.differences.forEach(d => {
        if (d.type === 'missing_in_user2') {
          console.log(`\n   ❌ 用户2缺少字段:`)
          console.log(`      字段名: ${d.field}`)
          console.log(`      类型: ${d.fieldType}`)
        } else if (d.type === 'missing_in_user1') {
          console.log(`\n   ➕ 用户1缺少字段:`)
          console.log(`      字段名: ${d.field}`)
          console.log(`      类型: ${d.fieldType}`)
        } else if (d.type === 'type_mismatch') {
          console.log(`\n   ⚠️ 类型不一致:`)
          console.log(`      字段名: ${d.field}`)
          console.log(`      用户1类型: ${d.type1}`)
          console.log(`      用户2类型: ${d.type2}`)
        }
      })
    })

    console.log('\n' + '='.repeat(80))
    console.log('🔧 修复建议')
    console.log('='.repeat(80))

    allDifferences.forEach(diff => {
      console.log(`\n${diff.databaseName}:`)
      diff.differences.forEach((d, idx) => {
        if (d.type === 'missing_in_user2') {
          console.log(`   ${idx + 1}. 在用户2的Notion中添加字段: "${d.field}" (类型: ${d.fieldType})`)
        } else if (d.type === 'missing_in_user1') {
          console.log(`   ${idx + 1}. 在用户1的Notion中添加字段: "${d.field}" (类型: ${d.fieldType})`)
        } else if (d.type === 'type_mismatch') {
          console.log(`   ${idx + 1}. 统一"${d.field}"字段类型 (用户1: ${d.type1}, 用户2: ${d.type2})`)
        }
      })
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ 对比完成')
  console.log('='.repeat(80))
}

main().catch(err => {
  console.error('❌ 执行失败:', err.message)
  process.exit(1)
})
