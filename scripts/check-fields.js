#!/usr/bin/env node
const https = require('https')

const apiKey = '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'
const mainRecordsId = '28774e5ad937812f9b02c6dc78ef2b16'

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
  console.log('检查主记录表当前字段...\n')

  const result = await callNotionAPI(apiKey, `/databases/${mainRecordsId}`)

  if (result.object === 'error') {
    console.error('错误:', result.message)
    return
  }

  const fields = Object.keys(result.properties).sort()

  console.log(`共 ${fields.length} 个字段:\n`)
  fields.forEach(field => {
    const type = result.properties[field].type
    console.log(`  ${field.includes('Title') || field.includes('Content') ? '✅' : '  '} ${field} (${type})`)
  })

  console.log('\n检查新字段是否存在:')
  const newFields = ['Title', 'Content', 'Date', 'Record Type']
  newFields.forEach(field => {
    const exists = fields.includes(field)
    console.log(`  ${exists ? '✅' : '❌'} ${field}`)
  })
}

main().catch(err => console.error('失败:', err.message))
