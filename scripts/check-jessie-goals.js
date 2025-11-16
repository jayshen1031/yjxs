#!/usr/bin/env node
const https = require('https')

const user2 = {
  email: 'jessieqq1031@gmail.com',
  apiKey: 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP',
  goalsDbId: '2981ee27-edec-8137-9146-d51050a40727'
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

async function main() {
  console.log('检查用户2（jessieqq1031）的目标库...\n')

  // 1. 获取Schema
  const schema = await callNotionAPI(user2.apiKey, `/databases/${user2.goalsDbId}`)

  if (schema.object === 'error') {
    console.error('❌ Schema错误:', schema.message)
    return
  }

  console.log('📋 目标库字段列表:\n')
  const fields = Object.keys(schema.properties).sort()
  fields.forEach(field => {
    const type = schema.properties[field].type
    console.log(`  ${field} (${type})`)
  })

  console.log('\n🔍 检查关键字段:')
  const keyFields = ['Goal Name', 'Name', 'Title', 'Status', 'Priority']
  keyFields.forEach(field => {
    const exists = fields.includes(field)
    console.log(`  ${exists ? '✅' : '❌'} ${field}`)
  })

  // 2. 查询目标记录（不过滤，查看所有目标）
  console.log('\n📊 查询所有目标记录...\n')
  const queryResult = await callNotionAPI(user2.apiKey, `/databases/${user2.goalsDbId}/query`, 'POST', {})

  if (queryResult.object === 'error') {
    console.error('❌ 查询错误:', queryResult.message)
    return
  }

  console.log(`找到 ${queryResult.results.length} 个目标\n`)

  if (queryResult.results.length > 0) {
    const first = queryResult.results[0]
    console.log('第一个目标的字段:')
    Object.keys(first.properties).forEach(field => {
      const prop = first.properties[field]
      let value = ''

      if (prop.type === 'title' && prop.title[0]) {
        value = prop.title[0].text.content
      } else if (prop.type === 'select' && prop.select) {
        value = prop.select.name
      }

      if (value) {
        console.log(`  ${field}: ${value}`)
      }
    })
  }
}

main().catch(err => console.error('失败:', err.message))
