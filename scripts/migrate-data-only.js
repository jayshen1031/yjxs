#!/usr/bin/env node
/**
 * 数据迁移脚本（仅迁移数据，不添加字段）
 *
 * 前提：字段已通过upgrade-schema.js添加完成
 * 功能：将旧字段的数据复制到新字段
 */

const https = require('https')

const user1 = {
  email: 'jayshen1031@gmail.com',
  apiKey: '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',
  databases: {
    todos: '28774e5ad9378170adf8c4f50ffbfc6b',
    mainRecords: '28774e5ad937812f9b02c6dc78ef2b16',
    activityDetails: '28774e5ad93781218b8ae0c69b7891c4'
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
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

async function queryDatabasePages(apiKey, databaseId) {
  const result = await callNotionAPI(apiKey, `/databases/${databaseId}/query`, 'POST')
  if (result.object === 'error') throw new Error(result.message)
  return result.results
}

async function updatePageProperties(apiKey, pageId, properties) {
  const result = await callNotionAPI(apiKey, `/pages/${pageId}`, 'PATCH', { properties })
  if (result.object === 'error') throw new Error(result.message)
  return result
}

async function migrateMainRecords() {
  console.log('\n' + '='.repeat(80))
  console.log('📝 主记录表 - 数据迁移')
  console.log('='.repeat(80))

  const migrations = [
    { from: 'Name', to: 'Title' },
    { from: 'Summary', to: 'Content' },
    { from: 'Record Date', to: 'Date' },
    { from: 'Type', to: 'Record Type' }
  ]

  try {
    const pages = await queryDatabasePages(user1.apiKey, user1.databases.mainRecords)
    console.log(`\n找到 ${pages.length} 条记录\n`)

    for (const migration of migrations) {
      console.log(`🔄 迁移: ${migration.from} → ${migration.to}`)

      let count = 0
      for (const page of pages) {
        const oldValue = page.properties[migration.from]
        if (oldValue) {
          try {
            await updatePageProperties(user1.apiKey, page.id, {
              [migration.to]: oldValue
            })
            count++

            if (count % 5 === 0) {
              console.log(`   ✓ ${count}/${pages.length}`)
              await new Promise(r => setTimeout(r, 300)) // 限速
            }
          } catch (err) {
            console.error(`   ✗ 失败:`, err.message)
          }
        }
      }

      console.log(`   ✅ 完成: ${count}/${pages.length}\n`)
      await new Promise(r => setTimeout(r, 1000))
    }

  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
  }
}

async function migrateTodos() {
  console.log('\n' + '='.repeat(80))
  console.log('✅ 待办库 - 数据迁移')
  console.log('='.repeat(80))

  try {
    const pages = await queryDatabasePages(user1.apiKey, user1.databases.todos)
    console.log(`\n找到 ${pages.length} 条记录`)
    console.log(`🔄 迁移: Todo Name → Title\n`)

    let count = 0
    for (const page of pages) {
      const oldValue = page.properties['Todo Name']
      if (oldValue) {
        try {
          await updatePageProperties(user1.apiKey, page.id, {
            'Title': oldValue
          })
          count++

          if (count % 5 === 0) {
            console.log(`   ✓ ${count}/${pages.length}`)
            await new Promise(r => setTimeout(r, 300))
          }
        } catch (err) {
          console.error(`   ✗ 失败:`, err.message)
        }
      }
    }

    console.log(`   ✅ 完成: ${count}/${pages.length}`)

  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
  }
}

async function migrateActivityDetails() {
  console.log('\n' + '='.repeat(80))
  console.log('⏱️ 活动明细表 - 数据迁移')
  console.log('='.repeat(80))

  try {
    const pages = await queryDatabasePages(user1.apiKey, user1.databases.activityDetails)
    console.log(`\n找到 ${pages.length} 条记录`)
    console.log(`🔄 迁移: Record → Related Main Record\n`)

    let count = 0
    for (const page of pages) {
      const oldValue = page.properties['Record']
      if (oldValue) {
        try {
          await updatePageProperties(user1.apiKey, page.id, {
            'Related Main Record': oldValue
          })
          count++

          if (count % 5 === 0) {
            console.log(`   ✓ ${count}/${pages.length}`)
            await new Promise(r => setTimeout(r, 300))
          }
        } catch (err) {
          console.error(`   ✗ 失败:`, err.message)
        }
      }
    }

    console.log(`   ✅ 完成: ${count}/${pages.length}`)

  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('🔄 数据迁移工具（旧字段 → 新字段）')
  console.log('='.repeat(80))
  console.log(`\n用户: ${user1.email}`)
  console.log('\n⚠️ 请确认字段已通过upgrade-schema.js添加完成\n')

  await migrateMainRecords()
  await migrateTodos()
  await migrateActivityDetails()

  console.log('\n' + '='.repeat(80))
  console.log('🎉 数据迁移完成！')
  console.log('='.repeat(80))

  console.log('\n📋 下一步:')
  console.log('1. 在Notion中验证新字段是否有数据')
  console.log('2. 验证关联关系是否正常')
  console.log('3. 确认无误后，可删除旧字段:')
  console.log('   - 主记录表: Name, Summary, Record Date, Type')
  console.log('   - 待办库: Todo Name')
  console.log('   - 活动明细表: Record')
}

main().catch(err => {
  console.error('❌ 执行失败:', err.message)
  process.exit(1)
})
