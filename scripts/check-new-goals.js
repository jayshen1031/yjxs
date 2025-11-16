#!/usr/bin/env node
const https = require('https')

const user2 = {
  apiKey: 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP',
  goalsDbId: '29f1ee27-edec-8111-b139-fc461aa60845'  // 新创建的数据库
}

function callNotionAPI(apiKey, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path: `/v1${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28'
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

async function main() {
  console.log('检查新创建的Goals数据库字段...\n')

  const result = await callNotionAPI(user2.apiKey, `/databases/${user2.goalsDbId}`)

  if (result.object === 'error') {
    console.error('错误:', result.message)
    return
  }

  const fields = Object.keys(result.properties).sort()

  console.log(`共 ${fields.length} 个字段:\n`)
  fields.forEach(field => {
    const type = result.properties[field].type
    console.log(`  ${field} (${type})`)
  })

  console.log('\n检查代码中使用的字段:')
  const codeFields = ['Goal Name', 'Description', 'Category', 'Priority', 'Status', 'Progress', 'Start Date', 'Estimated Hours', 'Total Time Investment', 'User ID', 'Target Date', 'Tags']
  codeFields.forEach(field => {
    const exists = fields.includes(field)
    console.log(`  ${exists ? '✅' : '❌'} ${field}`)
  })
}

main().catch(err => console.error('失败:', err.message))
