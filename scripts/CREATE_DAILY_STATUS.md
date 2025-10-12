# 创建每日状态库 (Daily Status)

> 用于在已有四数据库的基础上，单独添加每日状态库

## 📦 准备工作

首次运行前，需要安装依赖：

```bash
cd /Users/jay/Documents/baidu/projects/yjxs
npm install
```

## 🚀 快速开始

### 方法1：交互式创建（推荐）⭐

```bash
cd /Users/jay/Documents/baidu/projects/yjxs
node scripts/createDailyStatusDatabase_interactive.js
```

或使用npm脚本：
```bash
npm run create-daily-status
```

### 方法2：命令行参数

```bash
node scripts/createDailyStatusDatabase.js <API_KEY> <PARENT_PAGE_ID>
```

**示例**：
```bash
node scripts/createDailyStatusDatabase.js secret_xxxxxxxxxxxxx 12345678-1234-1234-1234-123456789abc
```

## 📋 需要准备

1. **Notion API Key** - 与创建其他4个数据库时使用的相同
2. **父页面ID** - 与其他4个数据库在**同一个页面**下

⚠️ **重要**：必须使用相同的父页面ID，这样所有数据库都在一起！

## ✅ 创建成功后

脚本会输出类似：

```
✅ 每日状态库创建成功！
=====================================
数据库ID: 56789012-5678-5678-5678-56789012abcd
=====================================
```

## 📝 下一步操作

1. **复制数据库ID**
2. **在小程序中打开Notion配置页面**
3. **找到"每日状态库ID"字段**
4. **粘贴ID并保存**

## 📊 每日状态库包含字段

### 基础信息
- 📅 Date（日期）
- 📆 Full Date（完整日期）

### 心情和状态
- 😊 Mood（心情）- 12种选项
- ⚡ Energy Level（精力水平）- 5级
- 😰 Stress Level（压力水平）- 5级

### 睡眠数据
- 🌅 Wake Up Time（起床时间）
- 🌙 Bed Time（睡觉时间）
- 😴 Sleep Hours（睡眠时长）
- 💤 Sleep Quality（睡眠质量）

### 身体数据
- ⚖️ Weight（体重）
- 💧 Water Intake（饮水量，毫升）

### 运动数据
- 🏃 Exercise Duration（运动时长，分钟）
- 🏋️ Exercise Type（运动类型，多选）
  - 跑步、骑行、游泳、力量训练、瑜伽、散步等

### 饮食数据
- 🍽️ Meals（用餐情况，多选）
  - 早餐、午餐、晚餐、加餐
- 📝 Diet Notes（饮食备注）

### 习惯追踪
- 🧘 Meditation（是否冥想）
- ⏱️ Meditation Duration（冥想时长）
- 📖 Reading（是否阅读）
- ⏱️ Reading Duration（阅读时长）

### 备注
- 📝 Notes（备注）
- ✨ Highlights（今日亮点）
- 👤 User ID（用户ID）

## ❓ 常见问题

### Q: 为什么要单独创建这个数据库？
A: 如果你已经创建了目标库、待办库、主记录表、活动明细表这4个数据库，现在只需要添加每日状态库。

### Q: 必须和其他数据库在同一页面吗？
A: 建议在同一页面，方便管理。但技术上可以在不同页面。

### Q: 创建失败怎么办？
A: 检查：
1. API Key是否正确
2. Integration是否已连接到父页面
3. 父页面ID是否正确（与其他4个数据库相同）

### Q: 如何验证创建成功？
A: 打开Notion父页面，应该能看到名为"📊 Daily Status - 每日状态库"的数据库。

## 🔗 相关文档

- [完整五数据库创建](./README.md)
- [数据库Schema定义](../utils/notionDatabaseSetup.js)
- [云函数API文档](../cloudfunctions/memo-notion-sync/index.js)
