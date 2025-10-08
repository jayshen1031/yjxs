# Notion双表架构设计方案

## 🎯 设计目标

基于活动明细表的标准化数据库架构，实现：
1. **数据规范化**：主记录和活动明细分离
2. **按用户初始化**：每个用户独立配置，自动创建两个数据库
3. **强大统计**：支持按活动名称、价值类型、时间维度的多维度分析

## 📊 数据库设计

### 表1️⃣：主记录表（Main Records）

**用途**：存储每次记录的基本信息

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `Name` | Title | ✅ | 记录ID（如：memo_1704614400000） |
| `User ID` | Rich Text | ✅ | 用户标识 |
| `Record Date` | Date | ✅ | 记录日期 |
| `Start Time` | Rich Text | ⚪ | 开始时间（如：09:00） |
| `End Time` | Rich Text | ⚪ | 结束时间（如：10:00） |
| `Summary` | Rich Text | ⚪ | 总结描述 |
| `Tags` | Multi-select | ⚪ | 标签（工作、学习、生活等） |
| `Activities` | Relation | ⚪ | 关联的活动明细（反向链接） |
| `Total Minutes` | Rollup | ⚪ | 总时长（自动汇总Activities的Minutes） |
| `Valuable Minutes` | Rollup | ⚪ | 有价值时长（汇总Value Type=有价值的Minutes） |
| `Neutral Minutes` | Rollup | ⚪ | 中性时长（汇总Value Type=中性的Minutes） |
| `Wasteful Minutes` | Rollup | ⚪ | 低效时长（汇总Value Type=低效的Minutes） |
| `Sync Status` | Select | ⚪ | 同步状态（synced/pending/failed） |
| `Created Time` | Created time | ⚪ | 创建时间（自动） |

**总计：14个字段**

### 表2️⃣：活动明细表（Activity Details）

**用途**：存储每个具体活动的详细信息

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `Activity Name` | Title | ✅ | 活动名称（如：编程、学习、刷手机） |
| `Minutes` | Number | ✅ | 投入时长（分钟） |
| `Value Type` | Select | ✅ | 价值类型（有价值/中性/低效） |
| `Record` | Relation | ✅ | 关联的主记录 |
| `User ID` | Rich Text | ✅ | 用户标识（便于多用户过滤） |
| `Record Date` | Date | ✅ | 记录日期（从主记录同步） |
| `Description` | Rich Text | ⚪ | 活动描述 |
| `Created Time` | Created time | ⚪ | 创建时间（自动） |

**总计：8个字段**

## 🔧 自动初始化流程

### 用户首次配置流程

```
用户输入 Notion API Key
    ↓
点击"自动创建数据库"按钮
    ↓
系统自动执行：
    1. 在用户的Notion工作区创建父页面
    2. 在父页面下创建"主记录表"
    3. 在父页面下创建"活动明细表"
    4. 配置两表之间的Relation关联
    5. 配置主记录表的Rollup聚合
    6. 保存两个数据库ID到用户配置
    ↓
初始化完成，显示：
    ✅ 主记录数据库：database_id_1
    ✅ 活动明细数据库：database_id_2
```

### 数据库创建参数

#### 主记录表创建参数

```json
{
  "parent": {
    "type": "page_id",
    "page_id": "USER_WORKSPACE_PAGE_ID"
  },
  "title": [
    {
      "text": {
        "content": "语寄心声 - 主记录"
      }
    }
  ],
  "properties": {
    "Name": {
      "title": {}
    },
    "User ID": {
      "rich_text": {}
    },
    "Record Date": {
      "date": {}
    },
    "Start Time": {
      "rich_text": {}
    },
    "End Time": {
      "rich_text": {}
    },
    "Summary": {
      "rich_text": {}
    },
    "Tags": {
      "multi_select": {
        "options": [
          { "name": "工作", "color": "blue" },
          { "name": "学习", "color": "purple" },
          { "name": "生活", "color": "green" },
          { "name": "重要", "color": "red" },
          { "name": "紧急", "color": "orange" }
        ]
      }
    },
    "Sync Status": {
      "select": {
        "options": [
          { "name": "synced", "color": "green" },
          { "name": "pending", "color": "yellow" },
          { "name": "failed", "color": "red" }
        ]
      }
    }
  }
}
```

#### 活动明细表创建参数

```json
{
  "parent": {
    "type": "page_id",
    "page_id": "USER_WORKSPACE_PAGE_ID"
  },
  "title": [
    {
      "text": {
        "content": "语寄心声 - 活动明细"
      }
    }
  ],
  "properties": {
    "Activity Name": {
      "title": {}
    },
    "Minutes": {
      "number": {
        "format": "number"
      }
    },
    "Value Type": {
      "select": {
        "options": [
          { "name": "有价值", "color": "green" },
          { "name": "中性", "color": "gray" },
          { "name": "低效", "color": "red" }
        ]
      }
    },
    "Record": {
      "relation": {
        "database_id": "MAIN_RECORDS_DATABASE_ID",
        "type": "dual_property",
        "dual_property": {
          "synced_property_name": "Activities"
        }
      }
    },
    "User ID": {
      "rich_text": {}
    },
    "Record Date": {
      "date": {}
    },
    "Description": {
      "rich_text": {}
    }
  }
}
```

#### 主记录表添加Rollup字段

在活动明细表创建后，需要在主记录表添加Rollup字段：

```json
{
  "Total Minutes": {
    "rollup": {
      "relation_property_name": "Activities",
      "rollup_property_name": "Minutes",
      "function": "sum"
    }
  },
  "Valuable Minutes": {
    "rollup": {
      "relation_property_name": "Activities",
      "rollup_property_name": "Minutes",
      "function": "sum"
    }
  }
}
```

注：Valuable Minutes需要配合过滤条件，Notion API可能需要在界面手动配置。

## 📝 用户配置结构

```javascript
{
  id: 'user_xxx',
  email: 'user@example.com',
  notionConfig: {
    enabled: true,
    apiKey: 'secret_xxx',

    // 双数据库ID
    mainDatabaseId: 'database_id_1',        // 主记录表
    activityDatabaseId: 'database_id_2',    // 活动明细表

    // 初始化状态
    initialized: true,
    initializedAt: 1704614400000,
    initializedTables: ['main', 'activity'],

    // 同步配置
    syncEnabled: true,
    autoSync: true
  }
}
```

## 🔄 数据同步流程

### 保存记录时的同步流程

```
用户保存记录
    ↓
app.saveMemo(memo)
    ↓
本地存储
    ↓
tryAutoSyncToNotion(memo)
    ↓
第一步：同步到主记录表
    - 创建主记录页面
    - 保存基本信息（Name, User ID, Date等）
    - 获取 notionPageId
    ↓
第二步：同步到活动明细表
    - 遍历 valuableTimeEntries
    - 遍历 neutralTimeEntries
    - 遍历 wastefulTimeEntries
    - 每个活动创建一条记录，关联到主记录
    ↓
更新本地memo的同步状态
```

### 同步代码示例

```javascript
// 1. 同步主记录
const mainRecord = await notionApiService.createMainRecord(apiKey, mainDatabaseId, {
  id: memo.id,
  userId: memo.userId,
  recordDate: memo.timestamp,
  startTime: memo.startTime,
  endTime: memo.endTime,
  summary: generateSummary(memo),
  tags: memo.tags
})

// 2. 同步活动明细
const activities = []

// 有价值的活动
for (const entry of memo.valuableTimeEntries) {
  activities.push({
    activityName: entry.activity,
    minutes: entry.minutes,
    valueType: '有价值',
    recordId: mainRecord.id,
    userId: memo.userId,
    recordDate: memo.timestamp
  })
}

// 中性活动
for (const entry of memo.neutralTimeEntries) {
  activities.push({
    activityName: entry.activity,
    minutes: entry.minutes,
    valueType: '中性',
    recordId: mainRecord.id,
    userId: memo.userId,
    recordDate: memo.timestamp
  })
}

// 低效活动
for (const entry of memo.wastefulTimeEntries) {
  activities.push({
    activityName: entry.activity,
    minutes: entry.minutes,
    valueType: '低效',
    recordId: mainRecord.id,
    userId: memo.userId,
    recordDate: memo.timestamp
  })
}

// 批量创建活动明细
await notionApiService.createActivities(apiKey, activityDatabaseId, activities)
```

## 📈 数据分析示例

### 在Notion中可以做的分析

1. **按活动名称统计**
   - 创建活动明细表的分组视图
   - 按 Activity Name 分组
   - 显示每个活动的总时长（Sum of Minutes）

2. **按价值类型统计**
   - 按 Value Type 分组
   - 对比有价值/中性/低效的时长分布

3. **按日期统计**
   - 按 Record Date 分组
   - 查看每天的时间投入趋势

4. **主记录视图**
   - 显示每条记录的 Total Minutes（Rollup自动计算）
   - 显示关联的活动数量
   - 点击可查看详细的活动列表

## 🎯 优势总结

1. **数据规范化** ✅
   - 每个活动独立记录
   - 避免数据冗余

2. **强大统计** ✅
   - 按活动名称、价值类型、时间维度多维分析
   - Notion原生Rollup自动聚合

3. **标准化流程** ✅
   - 每个用户自动创建独立的两个数据库
   - 配置简单，一键完成

4. **可扩展性** ✅
   - 后续可添加活动分类、难度等字段
   - 可建立活动主数据库进行标准化

## ⚠️ 注意事项

1. **Notion API权限**：
   - 需要有创建数据库的权限
   - 需要有修改数据库结构的权限

2. **Rollup配置**：
   - 带条件的Rollup（如只统计有价值活动）可能需要手动配置
   - 可以提供配置指导文档

3. **数据迁移**：
   - 旧用户需要数据迁移方案
   - 提供一键迁移工具

---

**这个架构将提供专业级的时间管理和数据分析能力！** 🚀
