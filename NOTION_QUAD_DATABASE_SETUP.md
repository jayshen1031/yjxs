# Notion 四数据库架构设置指南

## 📊 四数据库架构概述

语寄心声采用完整的 Notion 四数据库架构，实现目标导向的时间管理系统：

```
🎯 Goals (目标库)
    ↓ 关联
✅ Todos (待办库)
    ↓ 关联
📝 Main Records (主记录表)
    ↓ 关联
⏱️ Activity Details (活动明细表)
```

### 数据库关联关系

- **Goals → Todos**: 一个目标可以有多个待办事项
- **Todos → Main Records**: 一个待办可以关联多个每日记录
- **所有表 → Activity Details**: 活动明细记录时间投入

---

## 🚀 快速开始

### 前提条件

1. ✅ 已在Notion中创建一个父页面
2. ✅ 已获取 Notion Integration Token
3. ✅ 已在小程序中登录账号

### 步骤1: 准备Notion信息

1. 创建 Notion Integration
   - 访问: https://www.notion.so/my-integrations
   - 创建新的 Integration
   - 复制 Internal Integration Token (格式: `ntn_...`)

2. 创建父页面
   - 在Notion中创建一个新页面（例如："语寄心声数据"）
   - 复制页面ID（URL中的一串字符）
   - 将Integration添加到该页面的连接中

### 步骤2: 在小程序中配置

1. 登录小程序账号：`jayshen1031@gmail.com`

2. 进入"设置" → "Notion配置"

3. 填写以下信息：
   - **API Key**: `ntn_YOUR_NOTION_API_KEY_HERE`（从Notion获取你的API Key）
   - **页面ID**: `YOUR_NOTION_PAGE_ID_HERE`（从Notion页面URL获取）

4. 点击"测试连接"

5. 点击"创建四数据库架构"按钮

6. 等待创建完成（约10-15秒）

### 步骤3: 验证创建结果

在Notion父页面中应该看到4个新创建的数据库：

- 🎯 Goals - 目标库
- ✅ Todos - 待办库
- 📝 Main Records - 主记录表
- ⏱️ Activity Details - 活动明细表

---

## 📋 数据库字段说明

### 1. 🎯 Goals (目标库)

| 字段 | 类型 | 说明 |
|------|------|------|
| Name | Title | 目标名称 |
| Description | Rich Text | 目标描述 |
| Category | Select | 人生目标/年度目标/季度目标/月度目标/周目标 |
| Type | Select | 事业/健康/财务/学习/人际/兴趣/家庭 |
| Start Date | Date | 开始日期 |
| Target Date | Date | 目标完成日期 |
| Status | Select | 未开始/进行中/已完成 |
| Progress | Number (%) | 完成进度 |
| Priority | Select | 高/中/低 |
| User ID | Rich Text | 用户标识 |
| Tags | Multi-select | 标签 |

### 2. ✅ Todos (待办库)

| 字段 | 类型 | 说明 |
|------|------|------|
| Title | Title | 待办标题 |
| Description | Rich Text | 待办描述 |
| Todo Type | Select | 目标导向/临时待办/习惯养成 |
| Due Date | Date | 截止日期 |
| Priority | Select | 紧急重要/重要不紧急/紧急不重要/不紧急不重要 |
| Status | Select | 待办/进行中/已完成 |
| Is Completed | Checkbox | 是否完成 |
| **Related Goal** | **Relation** | **关联的目标** |
| User ID | Rich Text | 用户标识 |
| Tags | Multi-select | 标签 |

### 3. 📝 Main Records (主记录表)

| 字段 | 类型 | 说明 |
|------|------|------|
| Title | Title | 记录标题 |
| Content | Rich Text | 记录内容 |
| Date | Date | 记录日期 |
| Record Type | Select | 日常记录/明日规划 |
| Time Period | Select | 早晨/上午/下午/晚上 |
| **Related Todos** | **Relation** | **关联的待办** |
| User ID | Rich Text | 用户标识 |
| Tags | Multi-select | 标签 |

### 4. ⏱️ Activity Details (活动明细表)

| 字段 | 类型 | 说明 |
|------|------|------|
| Name | Title | 活动名称 |
| Description | Rich Text | 活动描述 |
| Start Time | Date | 开始时间 |
| End Time | Date | 结束时间 |
| Duration | Number | 持续时间（分钟） |
| Activity Type | Select | 工作/学习/运动/休息 |
| **Related Goal** | **Relation** | **关联的目标** |
| **Related Todo** | **Relation** | **关联的待办** |
| **Related Main Record** | **Relation** | **关联的主记录** |
| User ID | Rich Text | 用户标识 |
| Tags | Multi-select | 标签 |

---

## 💡 使用场景示例

### 场景1: 创建长期目标并分解任务

```
1. 在小程序"目标管理"创建目标
   - 目标: "2025年读完24本书"
   - 类别: 年度目标
   - 类型: 学习

2. 创建相关待办事项
   - 待办: "读完《原则》"
   - 类型: 目标导向
   - 关联目标: "2025年读完24本书"

3. 日常记录时关联待办
   - 记录: "今天阅读《原则》第3章"
   - 关联待办: "读完《原则》"

4. 系统自动统计
   - 目标进度自动更新
   - 时间投入自动汇总
```

### 场景2: 临时待办事项

```
1. 创建临时待办
   - 待办: "去超市买菜"
   - 类型: 临时待办
   - 不关联目标

2. 完成后标记
   - 状态: 已完成
```

### 场景3: 每日规划

```
1. 晚上规划明天
   - 类型: 明日规划
   - 列出明天要完成的待办

2. 关联待办事项
   - 选择明天要处理的待办
```

---

## 🔧 云函数API说明

### 创建四数据库

```javascript
const apiService = require('./utils/apiService.js')

await apiService.callCloudFunction('createQuadDatabases', {
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  parentPageId: 'PAGE_ID'
})
```

### 创建目标

```javascript
await apiService.callCloudFunction('createGoal', {
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  goalData: {
    title: '目标标题',
    description: '目标描述',
    category: '月度目标',
    type: '学习',
    priority: '高'
  }
})
```

### 创建待办

```javascript
await apiService.callCloudFunction('createTodo', {
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  todoData: {
    title: '待办标题',
    todoType: '目标导向',
    priority: '紧急重要',
    dueDate: '2025-01-10',
    relatedGoalId: 'GOAL_PAGE_ID' // 可选
  }
})
```

---

## ⚠️ 注意事项

### 关于自关联字段

由于Notion API限制，以下字段需要在Notion界面手动创建：

**Goals 数据库**:
- Parent Goal (父目标) - Relation to Goals
- Sub Goals (子目标) - Relation to Goals

**Todos 数据库**:
- Blocking Todos (阻塞的待办) - Relation to Todos
- Blocked By (被阻塞) - Relation to Todos

### 创建步骤

1. 打开对应的数据库
2. 点击右上角 "+ New" 添加属性
3. 选择 "Relation"
4. 关联到自身数据库
5. 设置双向关联

---

## 📖 下一步

1. ✅ 完成四数据库创建
2. 🔄 在小程序中使用目标管理功能
3. 🔄 在小程序中使用待办管理功能
4. 🔄 开始记录并关联到待办和目标
5. 📊 在Notion中查看数据关联和统计

---

**创建日期**: 2025-01-09
**最后更新**: 2025-01-09
**项目**: 语寄心声微信小程序
