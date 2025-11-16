#!/usr/bin/env node
const https = require('https')

const user2 = {
  email: 'jessieqq1031@gmail.com',
  apiKey: 'ntn_s829056151668jUFeqSLjkw3fX4z20g5go76jLecPiY0XP'
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
  console.log('检查用户配置数据...\n')
  
  // 从微信存储获取用户数据
  console.log('📋 请在微信开发者工具Console执行以下命令：')
  console.log('const users = JSON.parse(wx.getStorageSync("memo_users"))')
  console.log('const user = users.find(u => u.email === "jessieqq1031@gmail.com")')
  console.log('console.log("notionConfig:", JSON.stringify(user.notionConfig, null, 2))')
  console.log('\n然后把输出的notionConfig粘贴给我\n')
}

main().catch(err => console.error('失败:', err.message))
