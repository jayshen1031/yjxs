/**
 * Notion字段诊断工具
 * 直接查询数据库，打印所有字段
 */

const notionApiService = require('./notionApiService.js')

async function diagnoseDatabaseFields(apiKey, databaseId, databaseName) {
  console.log(`\n========================================`)
  console.log(`🔍 诊断数据库: ${databaseName}`)
  console.log(`数据库ID: ${databaseId}`)
  console.log(`========================================\n`)

  try {
    const result = await notionApiService.callApi(`/databases/${databaseId}`, {
      apiKey: apiKey,
      method: 'GET'
    })

    if (!result.success) {
      console.error('❌ 查询失败:', result.error)
      return
    }

    const properties = result.data.properties
    const propertyNames = Object.keys(properties)

    console.log(`📊 总共 ${propertyNames.length} 个字段:\n`)

    propertyNames.forEach((name, index) => {
      const prop = properties[name]
      const type = prop.type

      let extraInfo = ''
      if (type === 'relation') {
        extraInfo = ` → ${prop.relation.database_id}`
        if (prop.relation.dual_property) {
          extraInfo += ` (dual: "${prop.relation.dual_property.name}")`
        }
      } else if (type === 'rollup') {
        extraInfo = ` (from: "${prop.rollup.relation_property_name}", calc: ${prop.rollup.function})`
      }

      console.log(`${index + 1}. "${name}" - ${type}${extraInfo}`)
    })

    // 重点检查是否有"Related Activities"
    console.log(`\n🔍 关键字段检查:`)
    if ('Related Activities' in properties) {
      console.log(`✅ 找到"Related Activities"字段`)
      console.log(`   类型: ${properties['Related Activities'].type}`)
      if (properties['Related Activities'].relation) {
        console.log(`   关联到: ${properties['Related Activities'].relation.database_id}`)
      }
    } else {
      console.log(`❌ 未找到"Related Activities"字段`)

      // 搜索类似名称
      const relatedFields = propertyNames.filter(name =>
        name.toLowerCase().includes('activity') ||
        name.toLowerCase().includes('related')
      )
      if (relatedFields.length > 0) {
        console.log(`\n💡 但找到类似字段:`)
        relatedFields.forEach(name => {
          console.log(`   - "${name}" (${properties[name].type})`)
        })
      }
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error.message)
  }
}

async function diagnoseAllDatabases(apiKey, databases) {
  console.log('\n' + '='.repeat(60))
  console.log('🏥 Notion数据库字段诊断工具')
  console.log('='.repeat(60))

  for (const [name, id] of Object.entries(databases)) {
    await diagnoseDatabaseFields(apiKey, id, name)
    console.log('\n' + '-'.repeat(60))
  }

  console.log('\n✅ 诊断完成！')
}

module.exports = {
  diagnoseDatabaseFields,
  diagnoseAllDatabases
}
