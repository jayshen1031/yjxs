# Notion双数据库自动创建功能测试指南

## 📝 功能说明

该功能可以自动在Notion中创建双数据库架构：
1. **主记录表** (Main Records) - 存储每日记录的摘要信息
2. **活动明细表** (Activity Details) - 存储每个活动的详细时间投入

两个数据库通过Relation字段关联，并在主记录表中使用Rollup字段自动汇总时间数据。

## 🎯 测试前准备

### 1. 获取Notion API Key

1. 访问 [Notion Integrations](https://www.notion.so/my-integrations)
2. 点击 "New integration"
3. 填写基本信息：
   - Name: `语寄心声小程序` 或自定义名称
   - Logo: 可选
   - Associated workspace: 选择你的工作区
4. 点击 "Submit" 创建集成
5. 复制 "Internal Integration Token"（以 `secret_` 开头）
   - ⚠️ 保密此Token，不要分享给他人

### 2. 创建Notion父页面

1. 在Notion工作区中创建一个新页面（可以命名为"语寄心声数据"）
2. 分享该页面给你的集成：
   - 点击页面右上角 "Share"
   - 搜索你创建的集成名称
   - 点击 "Invite" 授权访问
3. 从浏览器URL中复制页面ID：
   - URL格式: `https://notion.so/xxxxx-yyyyy-zzzzz`
   - 页面ID: `xxxxx-yyyyy-zzzzz` (32位字符)
   - 或完整ID格式: `xxxxxxxx-yyyy-zzzz-wwww-tttttttttttt`

## 🚀 测试步骤

### 步骤1: 打开设置页面

1. 在微信开发者工具中运行小程序
2. 导航到 "设置" 页面（底部Tab栏）

### 步骤2: 进入配置界面

**如果是首次配置：**
- 直接看到配置模式选择界面

**如果已经配置过：**
- 点击 "⚙️ 重新配置" 按钮
- 系统会重置配置状态
- 显示配置模式选择界面

### 步骤3: 选择自动创建模式

1. 在 "Notion集成" 卡片中
2. 确认选择了 "🚀 自动创建数据库（推荐）" 模式
3. 如果显示手动模式，点击切换到自动模式

### 步骤4: 输入配置信息

1. **Notion API Key输入框**
   - 粘贴之前复制的API Token
   - 格式: `secret_xxxxxxxxxxxxxxxxxxxxxxxx`

2. **父页面ID输入框**
   - 粘贴之前复制的页面ID
   - 格式: `xxxxxxxx-yyyy-zzzz-wwww-tttttttttttt`
   - 或简短格式: `xxxxx-yyyyy-zzzzz`

### 步骤5: 点击创建按钮

1. 确认两个输入框都已填写
2. 点击 "🚀 自动创建双数据库" 按钮
3. 按钮状态会变为 "创建中..."

### 步骤6: 查看创建结果

**成功情况：**
- 弹出成功提示框，显示：
  - ✅ 双数据库创建成功！
  - 📋 主记录表ID: xxxxxxxx...
  - 📝 活动明细表ID: xxxxxxxx...
  - 🎉 数据库字段已自动初始化
- 页面状态自动更新为 "已配置"
- 显示 "数据库初始化: ✅ 已完成"

**失败情况：**
- 显示错误提示，可能的原因：
  - API Key无效
  - 页面ID错误
  - 未授权集成访问该页面
  - 网络连接问题

## ✅ 验证创建结果

### 在Notion中检查

1. 返回Notion，刷新父页面
2. 应该看到两个新创建的数据库：

#### 主记录表 (Main Records)
包含以下字段：
- Name (标题)
- User ID (文本)
- Record Date (日期)
- Start Time (文本)
- End Time (文本)
- Summary (文本)
- Tags (多选)
- Sync Status (选择)
- Activities (关联字段 - 关联到活动明细表)
- Total Valuable Minutes (汇总)
- Total Neutral Minutes (汇总)
- Total Wasteful Minutes (汇总)
- Total Minutes (汇总)
- Activity Count (汇总)

#### 活动明细表 (Activity Details)
包含以下字段：
- Activity Name (标题)
- Minutes (数字)
- Value Type (选择: 有价值/中性/低效)
- Record (关联字段 - 关联到主记录表)
- User ID (文本)
- Record Date (日期)
- Description (文本)
- Sync Status (选择)

### 在小程序中检查

1. 设置页面显示：
   - 同步状态: 已启用
   - 数据库初始化: ✅ 已完成
   - 初始化字段: 2个 (main, activity)

2. 可以尝试：
   - 创建一条新记录
   - 点击 "🔄 立即同步" 测试数据同步

## 🔍 调试信息

如果遇到问题，打开微信开发者工具控制台查看日志：

**正常流程日志：**
```javascript
开始自动创建双数据库架构...
创建主记录数据库...
创建活动明细数据库...
添加Rollup聚合字段到主数据库...
双数据库创建成功: { mainDatabaseId, activityDatabaseId, tables: ['main', 'activity'] }
```

**错误日志示例：**
```javascript
Notion API错误: HTTP 401: Unauthorized
// 原因: API Key无效

Notion API错误: HTTP 404: Not Found
// 原因: 页面ID不存在或未授权访问

自动创建数据库失败: 网络请求失败
// 原因: 网络连接问题
```

## 📋 常见问题

### Q1: 创建按钮是灰色的，无法点击？
**A:** 确保已填写API Key和父页面ID两个输入框

### Q2: 显示 "无法访问指定页面" 错误？
**A:** 需要在Notion页面中将集成添加为协作者（Share → Invite集成）

### Q3: 创建成功后如何重新配置？
**A:** 点击 "⚙️ 重新配置" 按钮，可以配置新的数据库

### Q4: 如何获取页面ID？
**A:**
- 方式1: 从浏览器URL复制（在 `.so/` 和 `?` 之间的部分）
- 方式2: 页面右上角 "..." → "Copy link" → 从链接提取ID

### Q5: 是否支持已有数据库？
**A:** 支持！切换到 "⚙️ 使用已有数据库" 模式，手动输入数据库ID

## 🎉 下一步

创建成功后，你可以：

1. **测试记录同步**
   - 在"记录"页面创建一条新记录
   - 填写活动和时间投入
   - 保存后会自动同步到Notion

2. **查看Notion数据**
   - 在Notion中查看同步的记录
   - 验证Rollup汇总是否正确计算

3. **使用手动同步**
   - 在设置页面点击 "🔄 立即同步"
   - 批量同步本地未同步的记录

---

*测试日期: 2025年1月*
*功能版本: v1.0 双数据库架构*
