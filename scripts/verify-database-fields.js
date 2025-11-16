#!/usr/bin/env node

/**
 * 验证数据库字段工具
 * 用于检查Notion数据库中是否存在指定字段
 */

const https = require('https')

// 用户配置
const config = {
  apiKey: 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP',
  databases: {
    mainRecords: '29f1ee27-edec-813d-b37c-d442f6037995', // 替换为实际ID
    todos: '', // 替换为实际ID
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

async function checkDatabaseFields(databaseId, databaseName) {
  console.log(`\n========== 检查 ${databaseName} ==========`)
  console.log(`数据库ID: ${databaseId}`)

  const result = await callNotionAPI(config.apiKey, `/databases/${databaseId}`)

  if (result.object === 'error') {
    console.error(`❌ 错误: ${result.message}`)
    return
  }

  console.log(`\n字段列表:`)
  const properties = result.properties || {}
  const fieldNames = Object.keys(properties)

  fieldNames.forEach((fieldName, index) => {
    const field = properties[fieldName]
    console.log(`  ${index + 1}. ${fieldName} (${field.type})`)

    // 特别标注关系字段和rollup字段
    if (field.type === 'relation') {
      console.log(`     → 关联到: ${field.relation.database_id}`)
    } else if (field.type === 'rollup') {
      console.log(`     → 汇总: ${field.rollup.relation_property_name}.${field.rollup.rollup_property_name} (${field.rollup.function})`)
    }
  })

  console.log(`\n总共 ${fieldNames.length} 个字段`)

  // 重点检查
  const criticalFields = [
    'Related Activities',
    'Total Time',
    'Activity Count',
    'Actual Time'
  ]

  console.log(`\n关键字段检查:`)
  criticalFields.forEach(fieldName => {
    if (fieldName in properties) {
      console.log(`  ✅ ${fieldName} - 存在 (${properties[fieldName].type})`)
    } else {
      console.log(`  ❌ ${fieldName} - 不存在`)
    }
  })
}

async function main() {
  console.log('🔍 Notion数据库字段验证工具')
  console.log('=' .repeat(60))

  if (config.databases.mainRecords) {
    await checkDatabaseFields(config.databases.mainRecords, '主记录表 (Main Records)')
  }

  if (config.databases.todos) {
    await checkDatabaseFields(config.databases.todos, '待办库 (Todos)')
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ 检查完成')
}

main().catch(err => {
  console.error('\n❌ 执行失败:', err.message)
  process.exit(1)
})
