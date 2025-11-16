#!/usr/bin/env node
/**
 * 数据库Schema升级脚本
 * 目标：将用户1的旧Schema升级到用户2的新Schema标准
 *
 * 流程：
 * 1. 对比差异
 * 2. 添加新字段
 * 3. 迁移数据（旧字段→新字段）
 * 4. 删除旧字段（可选）
 */

const https = require('https')

// 用户配置
const user1 = {
  email: 'jayshen1031@gmail.com',
  apiKey: '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',
  databases: {
    goals: '28774e5ad9378137bb2edc914308f718',
    todos: '28774e5ad9378170adf8c4f50ffbfc6b',
    mainRecords: '28774e5ad937812f9b02c6dc78ef2b16',
    activityDetails: '28774e5ad93781218b8ae0c69b7891c4',
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
    goals: '2981ee27-edec-8137-9146-d51050a40727',
    todos: '2981ee27-edec-8175-bf1e-e0f2ce92601a',
    mainRecords: '2981ee27-edec-819d-a2b9-dca36fee2b22',
    activityDetails: '2981ee27-edec-8148-8eac-c40f87e281f7',
    dailyStatus: '2981ee27-edec-810c-b791-c99c990c63d5',
    happyThings: '2981ee27-edec-8190-ba00-c4b4b6275843',
    quotes: '2981ee27-edec-816d-8146-ef053c64bcc7',
    knowledge: '2981ee27-edec-81d4-94ee-d95fffdbf82a'
  }
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

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

async function getDatabaseSchema(apiKey, databaseId) {
  const result = await callNotionAPI(apiKey, `/databases/${databaseId}`)
  if (result.object === 'error') {
    throw new Error(result.message)
  }
  return result.properties
}

async function queryDatabasePages(apiKey, databaseId) {
  const result = await callNotionAPI(apiKey, `/databases/${databaseId}/query`, 'POST')
  if (result.object === 'error') {
    throw new Error(result.message)
  }
  return result.results
}

async function updatePageProperties(apiKey, pageId, properties) {
  const result = await callNotionAPI(apiKey, `/pages/${pageId}`, 'PATCH', { properties })
  if (result.object === 'error') {
    throw new Error(result.message)
  }
  return result
}

async function addDatabaseProperties(apiKey, databaseId, properties) {
  const result = await callNotionAPI(apiKey, `/databases/${databaseId}`, 'PATCH', { properties })
  if (result.object === 'error') {
    throw new Error(result.message)
  }
  return result
}

// 字段名映射：旧名 -> 新名
const fieldNameMappings = {
  mainRecords: {
    'Name': 'Title',           // title字段
    'Summary': 'Content',      // rich_text
    'Record Date': 'Date',     // date
    'Type': 'Record Type'      // select
  },
  todos: {
    'Todo Name': 'Title'       // title字段
  },
  activityDetails: {
    'Record': 'Related Main Record'  // relation字段
  }
}

async function upgradeDatabase(dbKey, dbName) {
  console.log('\n' + '='.repeat(80))
  console.log(`🔧 升级数据库: ${dbName}`)
  console.log('='.repeat(80))

  const dbId1 = user1.databases[dbKey]
  const dbId2 = user2.databases[dbKey]

  try {
    // 1. 获取两个数据库的Schema
    console.log('📋 获取Schema...')
    const schema1 = await getDatabaseSchema(user1.apiKey, dbId1)
    const schema2 = await getDatabaseSchema(user2.apiKey, dbId2)

    const fields1 = Object.keys(schema1)
    const fields2 = Object.keys(schema2)

    // 2. 找出缺失的字段
    const missingFields = {}
    fields2.forEach(field => {
      if (!fields1.includes(field)) {
        missingFields[field] = schema2[field]
      }
    })

    if (Object.keys(missingFields).length === 0) {
      console.log('✅ 无需添加字段')
    } else {
      console.log(`\n📝 需要添加 ${Object.keys(missingFields).length} 个字段:`)
      Object.keys(missingFields).forEach(field => {
        console.log(`   + ${field} (${missingFields[field].type})`)
      })

      // 添加缺失字段
      console.log('\n⏳ 添加字段到用户1数据库...')
      await addDatabaseProperties(user1.apiKey, dbId1, missingFields)
      console.log('✅ 字段添加完成')
    }

    // 3. 处理字段名映射（如果有）
    const mappings = fieldNameMappings[dbKey]
    if (mappings && Object.keys(mappings).length > 0) {
      console.log('\n🔄 开始数据迁移...')

      for (const [oldName, newName] of Object.entries(mappings)) {
        if (fields1.includes(oldName) && !fields1.includes(newName)) {
          console.log(`\n📦 迁移: ${oldName} → ${newName}`)

          // 获取所有记录
          const pages = await queryDatabasePages(user1.apiKey, dbId1)
          console.log(`   找到 ${pages.length} 条记录`)

          let migratedCount = 0
          for (const page of pages) {
            const oldValue = page.properties[oldName]

            if (oldValue) {
              // 构造新属性值
              const newValue = oldValue

              try {
                await updatePageProperties(user1.apiKey, page.id, {
                  [newName]: newValue
                })
                migratedCount++

                if (migratedCount % 10 === 0) {
                  console.log(`   ✓ 已迁移 ${migratedCount}/${pages.length}`)
                }
              } catch (err) {
                console.error(`   ✗ 迁移失败 (${page.id}):`, err.message)
              }
            }
          }

          console.log(`   ✅ 迁移完成: ${migratedCount}/${pages.length}`)
        }
      }
    }

    console.log('\n✅ 数据库升级完成')

  } catch (err) {
    console.error(`❌ 升级失败:`, err.message)
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('🚀 数据库Schema升级工具')
  console.log('='.repeat(80))
  console.log(`\n目标: 将 ${user1.email} 升级到 ${user2.email} 的Schema标准\n`)

  const databasesToUpgrade = [
    { key: 'mainRecords', name: '📝 主记录表 (Main Records)' },
    { key: 'todos', name: '✅ 待办库 (Todos)' },
    { key: 'goals', name: '🎯 目标库 (Goals)' },
    { key: 'activityDetails', name: '⏱️ 活动明细表 (Activity Details)' },
    { key: 'knowledge', name: '📚 知识库 (Knowledge)' },
    { key: 'dailyStatus', name: '📊 每日状态库 (Daily Status)' }
  ]

  for (const db of databasesToUpgrade) {
    await upgradeDatabase(db.key, db.name)

    // 避免API限流
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n' + '='.repeat(80))
  console.log('🎉 所有数据库升级完成！')
  console.log('='.repeat(80))

  console.log('\n⚠️ 重要提示:')
  console.log('1. 数据已迁移到新字段，旧字段仍保留')
  console.log('2. 请在Notion中手动验证数据正确性')
  console.log('3. 确认无误后，可手动删除旧字段：')
  console.log('   - 主记录表: Name, Summary, Record Date, Type')
  console.log('   - 待办库: Todo Name')
  console.log('   - 活动明细表: Record')
}

main().catch(err => {
  console.error('❌ 执行失败:', err.message)
  process.exit(1)
})
