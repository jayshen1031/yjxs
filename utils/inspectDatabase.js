/**
 * 检查现有Notion数据库的Schema
 * 用于生成正确的字段映射
 */

const notionApiService = require('./notionApiService.js')

async function inspectDatabase(apiKey, databaseId, databaseName) {
  try {
    console.log(`\n========== 检查数据库: ${databaseName} ==========`)
    console.log(`数据库ID: ${databaseId}`)

    const response = await notionApiService.callApi(
      'GET',
      `https://api.notion.com/v1/databases/${databaseId}`,
      apiKey
    )

    if (!response.success) {
      console.error(`❌ 获取数据库失败:`, response.error)
      return null
    }

    const properties = response.data.properties
    console.log(`\n✅ 数据库字段列表 (${Object.keys(properties).length}个字段):\n`)

    const fieldMapping = {}

    for (const [fieldName, fieldConfig] of Object.entries(properties)) {
      const fieldType = fieldConfig.type
      fieldMapping[fieldName] = fieldType

      console.log(`📌 "${fieldName}" - ${fieldType}`)

      // 如果是select类型，显示选项
      if (fieldType === 'select' && fieldConfig.select?.options) {
        const options = fieldConfig.select.options.map(opt => opt.name).join(', ')
        console.log(`   选项: ${options}`)
      }

      // 如果是multi_select类型，显示选项
      if (fieldType === 'multi_select' && fieldConfig.multi_select?.options) {
        const options = fieldConfig.multi_select.options.map(opt => opt.name).join(', ')
        console.log(`   选项: ${options}`)
      }

      // 如果是relation类型，显示关联的数据库ID
      if (fieldType === 'relation' && fieldConfig.relation?.database_id) {
        console.log(`   关联数据库: ${fieldConfig.relation.database_id}`)
      }
    }

    console.log('\n========================================\n')

    return fieldMapping
  } catch (error) {
    console.error(`❌ 检查数据库异常:`, error.message)
    return null
  }
}

// 导出函数
module.exports = {
  inspectDatabase
}

// 如果直接运行此脚本
if (require.main === module) {
  const apiKey = process.argv[2]
  const databaseId = process.argv[3]
  const databaseName = process.argv[4] || 'Unknown Database'

  if (!apiKey || !databaseId) {
    console.error('使用方法: node inspectDatabase.js <API_KEY> <DATABASE_ID> [DATABASE_NAME]')
    process.exit(1)
  }

  inspectDatabase(apiKey, databaseId, databaseName)
}
