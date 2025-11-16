#!/usr/bin/env node
const https = require('https')

const configs = [
  { name: '旧Goals数据库', id: '2981ee27-edec-8137-9146-d51050a40727' },
  { name: '新Goals数据库', id: '29f1ee27-edec-8111-b139-fc461aa60845' }
]

const apiKey = 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP'

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
  console.log('检查两个Goals数据库的记录...\n')

  for (const config of configs) {
    console.log(`📊 ${config.name}`)
    console.log('-'.repeat(60))
    
    const result = await callNotionAPI(apiKey, `/databases/${config.id}/query`, 'POST', {})
    
    if (result.object === 'error') {
      console.log(`❌ 错误: ${result.message}\n`)
      continue
    }
    
    const count = result.results?.length || 0
    console.log(`记录数: ${count}`)
    
    if (count > 0) {
      result.results.forEach((page, idx) => {
        const title = page.properties['Goal Name']?.title?.[0]?.text?.content || '无标题'
        console.log(`  ${idx + 1}. ${title}`)
      })
    }
    
    console.log()
    await new Promise(r => setTimeout(r, 300))
  }
}

main().catch(err => console.error('失败:', err.message))
