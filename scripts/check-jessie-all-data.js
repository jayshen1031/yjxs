#!/usr/bin/env node
const https = require('https')

const user2 = {
  email: 'jessieqq1031@gmail.com',
  apiKey: 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP',
  databases: {
    activityDetails: '2981ee27-edec-8148-8eac-c40f87e281f7',
    goals: '2981ee27-edec-8137-9146-d51050a40727',
    mainRecords: '2981ee27-edec-819d-a2b9-dca36fee2b22',
    todos: '2981ee27-edec-8175-bf1e-e0f2ce92601a',
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
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

async function main() {
  console.log('检查 jessieqq1031 各数据库数据量...\n')
  
  for (const [name, dbId] of Object.entries(user2.databases)) {
    const result = await callNotionAPI(user2.apiKey, `/databases/${dbId}/query`, 'POST', {})
    const count = result.results ? result.results.length : 0
    const icon = count > 0 ? '⚠️' : '✅'
    console.log(`${icon} ${name.padEnd(20)} : ${count} 条记录`)
  }
  
  console.log('\n提示：⚠️ 表示有数据需要备份，✅ 表示为空可以直接删除')
}

main().catch(err => console.error('失败:', err.message))
