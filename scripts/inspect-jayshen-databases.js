#!/usr/bin/env node
const https = require('https')

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
  console.log('='.repeat(80))
  console.log('标准数据库Schema - jayshen1031@gmail.com')
  console.log('='.repeat(80))
  console.log()

  const allSchemas = {}

  for (const [name, dbId] of Object.entries(user1.databases)) {
    console.log(`📊 ${name.toUpperCase()}`)
    console.log('-'.repeat(80))

    const result = await callNotionAPI(user1.apiKey, `/databases/${dbId}`)

    if (result.object === 'error') {
      console.error(`❌ 错误: ${result.message}\n`)
      continue
    }

    const fields = Object.keys(result.properties).sort()
    allSchemas[name] = {}

    fields.forEach(field => {
      const prop = result.properties[field]
      allSchemas[name][field] = prop.type
      
      let typeDetail = prop.type
      if (prop.type === 'select' && prop.select?.options) {
        const options = prop.select.options.map(o => o.name).join(', ')
        typeDetail = `select [${options}]`
      }
      if (prop.type === 'multi_select' && prop.multi_select?.options) {
        const options = prop.multi_select.options.map(o => o.name).join(', ')
        typeDetail = `multi_select [${options}]`
      }
      if (prop.type === 'relation') {
        typeDetail = `relation -> ${prop.relation.database_id}`
      }
      if (prop.type === 'rollup') {
        typeDetail = `rollup (${prop.rollup.function})`
      }
      
      console.log(`  ${field.padEnd(35)} ${typeDetail}`)
    })

    console.log(`  共 ${fields.length} 个字段`)
    console.log()

    await new Promise(r => setTimeout(r, 300))
  }

  // 输出JSON格式
  console.log('\n' + '='.repeat(80))
  console.log('JSON格式（用于知识库）')
  console.log('='.repeat(80))
  console.log(JSON.stringify(allSchemas, null, 2))
}

main().catch(err => console.error('失败:', err.message))
