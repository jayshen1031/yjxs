# Notion数据库字段配置指南

## 🎯 概述

本文档说明如何在Notion中配置语寄心声小程序的数据库字段结构。

## 📊 数据库字段结构

### ✅ 必需字段（自动创建）

系统会在首次连接时自动创建以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `Name` | Title | 记录ID（全局唯一） |
| `User ID` | Rich Text | 用户标识 |
| `Record Date` | Date | 记录日期 |
| `Start Time` | Rich Text | 开始时间（如：09:00） |
| `End Time` | Rich Text | 结束时间（如：10:00） |
| `Type` | Select | 记录类型：normal/planning |
| `Is Planning` | Checkbox | 是否为明日规划记录 |
| `Tags` | Multi-select | 标签（工作、学习、生活等） |
| `Goal ID` | Rich Text | 关联目标ID |
| `Sync Status` | Select | 同步状态：synced/pending/failed |

### 📈 价值分类字段

#### 🌟 有价值的活动

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `Valuable Content` | Rich Text | 有价值活动的描述 |
| `Valuable Activities` | Rich Text | 活动列表：编程(60分钟), 学习(30分钟) |
| `Valuable Minutes` | Number | 有价值活动总时长（分钟） |

#### 😐 中性活动

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `Neutral Content` | Rich Text | 中性活动的描述 |
| `Neutral Activities` | Rich Text | 活动列表：吃饭(30分钟), 通勤(20分钟) |
| `Neutral Minutes` | Number | 中性活动总时长（分钟） |

#### 🗑️ 低效活动

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `Wasteful Content` | Rich Text | 低效活动的描述 |
| `Wasteful Activities` | Rich Text | 活动列表：刷手机(15分钟) |
| `Wasteful Minutes` | Number | 低效活动总时长（分钟） |

#### ⏱️ 总计

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `Total Minutes` | Number | 所有活动总时长（分钟） |

## 🔧 配置步骤

### 方式一：自动创建（推荐）

1. 在小程序设置页面输入 Notion API Key
2. 输入主数据库 ID
3. 点击"测试连接"
4. 系统自动创建所有必需字段

### 方式二：手动创建

如果自动创建失败，请按以下步骤手动创建：

#### 第一步：创建数据库

1. 在 Notion 中创建新数据库
2. 将数据库命名为"语寄心声记录"

#### 第二步：添加字段

按照上面的字段列表，依次添加所有字段：

1. 点击数据库表头的 `+` 按钮
2. 选择对应的字段类型
3. 输入字段名称（必须完全一致）
4. 对于 Select 类型，添加对应的选项

#### 第三步：配置 Select 字段选项

**Type 字段选项：**
- normal（蓝色）
- planning（橙色）

**Sync Status 字段选项：**
- synced（绿色）
- pending（黄色）
- failed（红色）

**Tags 字段选项：**
- 重要（红色）
- 紧急（橙色）
- 完成（绿色）
- 待办（黄色）
- 想法（紫色）
- 总结（蓝色）
- 灵感（粉色）
- 反思（灰色）

#### 第四步：获取数据库 ID

1. 打开数据库页面
2. 复制浏览器地址栏中的 URL
3. 提取 URL 中的数据库 ID：
   ```
   https://notion.so/your-workspace/[DATABASE_ID]?v=...
                                   ^^^^^^^^^^^^^^^^
   这部分就是数据库ID
   ```

#### 第五步：在小程序中配置

1. 打开小程序设置页面
2. 输入 Notion API Key
3. 输入数据库 ID
4. 点击"测试连接"验证

## 📋 数据示例

### 日常记录示例

```
Name: memo_1704614400000
User ID: user_123
Record Date: 2025-01-07
Start Time: 09:00
End Time: 10:00
Type: normal
Is Planning: false

Valuable Content: 完成了项目的核心功能开发
Valuable Activities: 编程(45分钟), 代码审查(15分钟)
Valuable Minutes: 60

Neutral Content: 吃早餐、通勤
Neutral Activities: 吃饭(20分钟), 通勤(15分钟)
Neutral Minutes: 35

Wasteful Content: 刷手机看视频
Wasteful Activities: 刷手机(5分钟)
Wasteful Minutes: 5

Total Minutes: 100

Tags: 工作, 学习
Sync Status: synced
```

### 明日规划示例

```
Name: memo_1704700800000
User ID: user_123
Record Date: 2025-01-08
Type: planning
Is Planning: true

Valuable Content:
明天要完成：
1. 完成用户认证模块
2. 优化数据库查询性能
3. 编写单元测试

Tags: 计划, 工作
Sync Status: synced
```

## 🎯 字段设计说明

### 为什么用 Rich Text 存储活动列表？

虽然 Notion 支持 Relation 关系型字段，但考虑到：

1. **简化架构**：避免创建多个关联数据库
2. **减少 API 调用**：单次请求即可获取完整数据
3. **便于查看**：在数据库视图中直接显示活动详情
4. **兼容性强**：字符串格式易于导出和迁移

### 活动列表格式

```
活动名称1(时长), 活动名称2(时长), ...
示例: 编程(60分钟), 学习(30分钟), 运动(15分钟)
```

### 时间统计字段

- 每个分类有独立的分钟数统计
- `Total Minutes` 是所有分类的总和
- 可以在 Notion 中创建公式字段进行二次计算

## 🔍 Notion 视图建议

### 按日期查看

创建时间线视图：
1. 点击视图选项
2. 选择"Timeline"
3. 按 `Record Date` 排序

### 按价值分类

创建筛选器：
1. 筛选 `Valuable Minutes > 0`
2. 按 `Valuable Minutes` 降序排列
3. 查看高价值活动

### 统计分析

创建公式字段：
```
// 有价值时间占比
prop("Valuable Minutes") / prop("Total Minutes") * 100

// 低效时间占比
prop("Wasteful Minutes") / prop("Total Minutes") * 100
```

## ⚠️ 注意事项

1. **字段名称必须完全一致**：包括大小写和空格
2. **API 权限**：确保 Notion API Token 有数据库读写权限
3. **数据类型**：Number 字段只能存储数字，不能有文本
4. **日期格式**：系统自动使用 ISO 8601 格式
5. **同步频率**：建议手动触发同步，避免频繁 API 调用

## 🚀 扩展功能

### 未来可能添加的字段

- `Audio URL`: 语音记录的音频文件链接
- `Location`: 记录地点
- `Weather`: 天气情况
- `Mood`: 心情评分
- `Energy Level`: 精力水平

### 数据分析

可以在 Notion 中使用：
- 数据透视表
- 图表视图
- 公式计算
- 关联其他数据库（如目标管理）

---

**配置完成后，您就可以在 Notion 中查看和管理所有记录了！** 🎉
