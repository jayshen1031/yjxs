# Claude Skills 快速开始

## 🚀 5分钟上手

### 第一步：理解项目
```
项目名称: 语寄心声 (YJXS)
类型: 微信小程序
核心功能: 语音记录 + 时间管理 + Notion同步
架构: 八数据库架构
```

### 第二步：查看关键文件
```bash
# 项目记忆（必读）
cat CLAUDE.md

# 生产环境Schema标准（修改数据库前必看）
cat utils/notionDatabaseSetup.js

# 自动创建脚本
cat utils/notionQuadDatabaseCreator.js
```

### 第三步：常见任务速查

#### 任务1：修复Schema不一致
```javascript
// 1. 对比文件
diff utils/notionDatabaseSetup.js utils/notionQuadDatabaseCreator.js

// 2. 以 notionDatabaseSetup.js 为准
// 3. 修改 notionQuadDatabaseCreator.js
// 4. 测试自动创建
```

#### 任务2：添加新字段
```javascript
// 1. 在 notionDatabaseSetup.js 添加
'New Field': {
  rich_text: {}
}

// 2. 在 notionQuadDatabaseCreator.js 同步
'New Field': { rich_text: {} }

// 3. 更新CLAUDE.md记录变更
```

#### 任务3：添加新页面
```bash
# 1. 创建页面文件
mkdir pages/new-page
touch pages/new-page/new-page.{js,wxml,wxss,json}

# 2. 在 app.json 注册
# "pages": [
#   "pages/new-page/new-page"
# ]

# 3. 实现功能
```

---

## 🎯 核心铁律（务必遵守）

### ⛔ 绝对禁止
- ❌ 使用模拟/假数据
- ❌ 擅自修改用户指定的技术方案
- ❌ 不征求意见就做重大变更

### ✅ 必须执行
- ✅ 使用真实Notion数据库和API
- ✅ 以 `notionDatabaseSetup.js` 为schema标准
- ✅ 重大变更前说明并征求用户意见
- ✅ 更新 `CLAUDE.md` 记录变更

---

## 📋 开发检查清单

### 修改数据库Schema前
- [ ] 检查 `notionDatabaseSetup.js` 生产schema
- [ ] 确认字段名、类型、选项值完全一致
- [ ] 注意关联字段和Rollup字段的添加时机
- [ ] 测试自动创建流程

### 调用Notion API前
- [ ] 确认使用正确的字段名
- [ ] 检查数据类型匹配
- [ ] 添加详细的错误日志
- [ ] 提供用户友好的错误提示

### 添加新页面前
- [ ] 创建4个必需文件（.js/.wxml/.wxss/.json）
- [ ] 在 app.json 注册页面路径
- [ ] 实现必需的生命周期函数（onLoad等）
- [ ] 添加错误处理和加载状态

---

## 🔍 诊断工具

### 检查数据库结构
```
入口: 设置页面 → "🔍 诊断数据库" 按钮
功能: 查看所有数据库的字段列表
输出: 控制台 + 弹窗
```

### 修复活动关联
```
入口: pages/fix-relations/fix-relations.js
功能: 批量修复活动明细的关联关系
场景: 数据迁移、关联丢失
```

### 修复主记录表
```
入口: 设置页面 → "🔧 修复主记录表" 按钮
功能: 为旧数据库添加Start Time和End Time字段
场景: 使用旧版创建脚本创建的数据库
```

---

## 🆘 遇到问题？

### 错误: "XXX is not a property that exists"
**原因**: 字段名不匹配
**解决**:
1. 查看 `notionDatabaseSetup.js` 找到正确字段名
2. 修改代码使用正确字段名
3. 如果是数据库缺少该字段，使用PATCH添加

### 错误: "validation_error"
**原因**: 字段类型或值不符合schema
**解决**:
1. 检查字段类型（rich_text vs date vs select）
2. 检查select选项值是否存在于schema中
3. 查看完整错误信息确定具体问题

### 错误: ECONNREFUSED (云函数)
**原因**: 云函数无法访问外网
**解决**:
- 前端直接调用Notion API
- 使用 `notionApiService.js` 而非云函数

---

## 📚 学习路径

### 第1天：熟悉架构
- [ ] 阅读 `CLAUDE.md`
- [ ] 了解八数据库架构
- [ ] 查看主要页面代码

### 第2天：理解数据流
- [ ] 研究 `notionApiService.js`
- [ ] 查看 `userManager.js`
- [ ] 理解前端→Notion的调用链

### 第3天：实践开发
- [ ] 修复一个小bug
- [ ] 添加一个简单字段
- [ ] 创建一个测试页面

---

## 🎓 高级技巧

### 批量更新数据库字段
```javascript
// 使用PATCH方法批量添加字段
await notionApiService.callApi(`/databases/${databaseId}`, {
  apiKey: apiKey,
  method: 'PATCH',
  data: {
    properties: {
      'Field1': { rich_text: {} },
      'Field2': { number: {} },
      'Field3': { select: { options: [...] } }
    }
  }
})
```

### 添加关联字段（双向）
```javascript
// 必须在两个数据库都创建后
'Related Database': {
  relation: {
    database_id: targetDatabaseId,
    dual_property: {
      name: 'Related Back'  // 对方数据库中的字段名
    }
  }
}
```

### 添加Rollup字段
```javascript
// 必须在关联字段创建后
'Total Amount': {
  rollup: {
    relation_property_name: 'Related Items',  // 本数据库的关联字段
    rollup_property_name: 'Amount',           // 对方数据库的字段
    function: 'sum'                           // sum/count/average等
  }
}
```

---

*快速开始指南 - 助您5分钟上手项目开发*
*如有疑问，请查阅完整文档: `.claude/README.md`*
