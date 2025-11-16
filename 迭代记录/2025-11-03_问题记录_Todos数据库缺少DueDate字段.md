# 问题记录：Todos数据库缺少Due Date字段

**日期**：2025-11-03
**问题类型**：Schema不一致
**严重程度**：高（功能失效）
**状态**：✅ 紧急修复完成，⏳ 根本原因待解决

---

## ❌ 问题现象

### 用户操作
在"目标待办"页面创建待办事项

### 错误信息
```
❌ Notion API错误: 400 Due Date is not a property that exists.
待办操作失败: Error: HTTP 400: Due Date is not a property that exists.
```

### 错误堆栈
```
at goals-todos.js:1578 (confirmAddTodo)
  -> notionApiService.createPageGeneric(pageData, notionConfig.apiKey)
  -> POST https://api.notion.com/v1/pages (400)
```

### 代码位置
- `pages/goals-todos/goals-todos.js:1560` (创建待办)
- `pages/goals-todos/goals-todos.js:1506` (更新待办)

---

## 🔍 根本原因

### 原因分析

**Schema不一致**：用户的Todos数据库中缺少 `Due Date` 字段

**可能原因**：
1. ❌ 使用旧版创建脚本创建的数据库（2025年1月版本）
2. ❌ 创建数据库时 `Due Date` 字段创建失败
3. ❌ 手动创建数据库时遗漏该字段
4. ❌ 字段名不一致（可能是其他名称）

### 标准Schema定义

**生产环境标准**（`utils/notionDatabaseSetup.js:228-230`）：
```javascript
'Due Date': {
  date: {},
}
```

**代码使用**（`pages/goals-todos/goals-todos.js:1560`）：
```javascript
if (todoData.dueDate) {
  pageData.properties['Due Date'] = { date: { start: todoData.dueDate } }
}
```

**结论**：代码符合标准，但用户数据库缺少该字段。

---

## 💡 解决方案

### ✅ 短期修复（已完成）

**文件**：`pages/goals-todos/goals-todos.js`

**修改内容**：临时注释掉 `Due Date` 字段设置

**位置1**（创建待办 - 第1559-1562行）：
```javascript
// 只有在确定需要设置时才添加（避免字段不存在错误）
// if (todoData.dueDate) {
//   pageData.properties['Due Date'] = { date: { start: todoData.dueDate } }
// }
```

**位置2**（更新待办 - 第1505-1508行）：
```javascript
// 只有在确定需要设置时才添加（避免字段不存在错误）
// if (todoData.dueDate) {
//   properties['Due Date'] = { date: { start: todoData.dueDate } }
// }
```

**效果**：
- ✅ 用户可以正常创建待办
- ⚠️ 无法设置截止日期（功能降级）

---

### 🔧 中期方案（推荐执行）

#### 方案1：诊断数据库Schema

**步骤**：
1. 打开小程序
2. 进入"设置"页面
3. 点击"🔍 诊断数据库"按钮
4. 查看控制台输出的Todos数据库字段列表
5. 检查是否存在 `Due Date` 字段

**诊断代码位置**：`pages/settings/settings.js:diagnoseDatabases`

#### 方案2：手动添加缺失字段

**在Notion中操作**：
1. 打开你的Todos数据库
2. 点击右上角"+"添加字段
3. 字段名：`Due Date`（必须完全一致）
4. 字段类型：Date（日期）
5. 保存

**然后在小程序中**：
1. 取消注释 `goals-todos.js` 中的两处 `Due Date` 设置
2. 测试创建待办功能

---

### 🏗️ 长期方案（根本解决）

#### 方案A：重新创建数据库（推荐）

**步骤**：
1. 备份现有数据（导出Notion页面）
2. 删除旧的8个数据库
3. 在小程序"设置"页面点击"🗄️ 自动创建数据库"
4. 使用最新的创建脚本（包含完整Schema）
5. 迁移旧数据到新数据库

**优点**：
- ✅ Schema完全一致
- ✅ 包含所有最新字段
- ✅ 关联关系正确

**缺点**：
- ⚠️ 需要数据迁移
- ⚠️ 历史数据需要手动处理

#### 方案B：使用PATCH API补全字段

**技术方案**：
```javascript
// 在设置页面添加"修复Todos数据库"按钮
await notionApiService.callApi(`/databases/${todosDatabaseId}`, {
  apiKey: apiKey,
  method: 'PATCH',
  data: {
    properties: {
      'Due Date': { date: {} },
      'Planned Date': { date: {} },
      'Start Time': { rich_text: {} },
      // ... 其他缺失字段
    }
  }
})
```

**优点**：
- ✅ 不影响现有数据
- ✅ 快速修复

**缺点**：
- ⚠️ 需要开发修复工具
- ⚠️ 只能补全缺失字段，无法修复字段类型错误

---

## 📊 影响范围

### 受影响功能
- ❌ 创建待办时设置截止日期
- ❌ 更新待办时修改截止日期
- ⚠️ 待办列表显示截止日期（可能报错）

### 不受影响功能
- ✅ 创建待办（基本信息）
- ✅ 更新待办（标题、描述、状态）
- ✅ 删除待办
- ✅ 待办与目标关联

### 其他可能缺失的字段
根据同样逻辑，以下字段也可能缺失（需诊断）：
- `Estimated Duration` (预估时长)
- `Actual Duration` (实际时长 - Rollup字段)
- `Energy Level` (精力级别)
- `Recurrence` (重复任务)

---

## 🚀 预防措施

### 建立Schema版本检测机制

**需要开发的功能**：
1. 在用户登录时自动检测数据库Schema
2. 对比标准Schema（`notionDatabaseSetup.js`）
3. 如果缺少字段，显示警告并提供修复选项

**参考**：
- `.claude/DATABASE_COMPARISON_REPORT.md` - Schema对比报告
- `scripts/compare-final.js` - Schema对比工具

### 统一创建脚本

**确保所有新用户使用统一的最新版脚本**：
- `utils/notionQuadDatabaseCreator.js` (八数据库创建脚本)
- 定期对比 `notionDatabaseSetup.js` 和创建脚本，确保一致

---

## 📚 相关文档

- **标准Schema定义**：`utils/notionDatabaseSetup.js`
- **创建脚本**：`utils/notionQuadDatabaseCreator.js`
- **诊断工具**：`pages/settings/settings.js:diagnoseDatabases`
- **已知问题**：`.claude/DATABASE_COMPARISON_REPORT.md`
- **Claude Skill**：`.claude/skills/notion-database.skill.json`

---

## ✅ 下一步行动

**立即执行**：
- [x] 临时注释 `Due Date` 字段设置
- [x] 创建问题记录文档
- [x] 通知用户可以继续使用

**用户执行**（可选）：
- [ ] 运行诊断工具查看完整Schema
- [ ] 手动添加 `Due Date` 字段到Notion
- [ ] 或选择重新创建数据库

**开发待办**（长期）：
- [ ] 开发Schema自动检测功能
- [ ] 开发Schema自动修复工具
- [ ] 添加字段存在性检查到所有API调用
- [ ] 编写Schema升级脚本

---

*问题记录创建时间：2025-11-03*
*修复状态：✅ 紧急修复完成，功能已恢复（降级模式）*
