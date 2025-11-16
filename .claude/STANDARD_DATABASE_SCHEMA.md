# 标准数据库Schema - jayshen1031@gmail.com

**最后更新**: 2025-11-02
**数据来源**: 实际运行中的数据库，经过验证可用
**用途**: 所有新数据库创建必须遵循此标准

---

## 1. Goals（目标库）- 16个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Goal Name | title | 目标名称（主字段）|
| Description | rich_text | 目标描述 |
| Category | select | 类别：人生目标/年度目标/季度目标/月度目标/周目标 |
| Priority | select | 优先级：高/中/低 |
| Status | select | 状态：未开始/进行中/已完成/已暂停/已取消 |
| Progress | number | 进度（0-100）|
| Start Date | date | 开始日期 |
| Target Date | date | 目标日期 |
| **Estimated Hours** | **number** | **预计投入时间（小时）**⭐ |
| **Total Time Investment** | **rollup (sum)** | **实际总投入时间汇总**⭐ |
| Total Time Invested | rollup (sum) | 时间投入统计（旧字段，兼容）|
| Total Todos | rollup (count) | 关联待办数量统计 |
| Related Todos | relation | 关联到Todos数据库 |
| Related Activities | relation | 关联到Activity Details数据库 |
| Tags | multi_select | 标签 |
| User ID | rich_text | 用户邮箱 |

**重要字段**:
- `Estimated Hours` (number) - 代码中必需
- `Total Time Investment` (rollup) - 代码中必需

---

## 2. Todos（待办库）- 13个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| **Todo Name** | **title** | **待办名称（主字段）**⚠️ 不是Title |
| Description | rich_text | 待办描述 |
| Todo Type | select | 类型：目标导向/临时待办/习惯养成/紧急处理/次日规划 |
| Priority | select | 优先级：紧急重要/重要不紧急/紧急不重要/不紧急不重要 |
| Status | select | 状态：待办/进行中/已完成/已取消/已删除 |
| Scope | select | 范围：今日/近期 |
| Record Date | date | 记录日期 |
| Estimated Minutes | number | 预计时间（分钟）|
| Actual Time | rollup (sum) | 实际时间统计 |
| Related Goal | relation | 关联到Goals数据库 |
| Related Activities | relation | 关联到Activity Details数据库 |
| Tags | multi_select | 标签 |
| User ID | rich_text | 用户邮箱 |

**关键字段**:
- `Todo Name` (title) - 主字段，不是`Title`

---

## 3. Main Records（主记录表）- 12个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| **Name** | **title** | **记录标题（主字段）**⚠️ 不是Title |
| **Summary** | **rich_text** | **记录内容**⚠️ 不是Content |
| **Record Date** | **date** | **记录日期**⚠️ 不是Date |
| **Type** | **select** | **记录类型**⚠️ 不是Record Type |
| Start Time | rich_text | 开始时间 |
| End Time | rich_text | 结束时间 |
| Is Planning | checkbox | 是否为规划记录 |
| Sync Status | select | 同步状态：synced/pending/failed |
| Activities | relation | 关联到Activity Details数据库 |
| Total Minutes | rollup (sum) | 总时长统计 |
| Tags | multi_select | 标签 |
| User ID | rich_text | 用户邮箱 |

**关键字段**:
- `Name` (title) - 主字段，不是`Title`
- `Summary` (rich_text) - 内容字段，不是`Content`
- `Record Date` (date) - 日期字段，不是`Date`
- `Type` (select) - 类型字段，不是`Record Type`

---

## 4. Activity Details（活动明细表）- 13个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Name | title | 活动名称（主字段）|
| Description | rich_text | 活动描述 |
| Activity Type | select | 活动类型：直接推进/间接支持/学习准备/无关 |
| Value Type | select | 价值类型：有价值/中性/低效 |
| Duration | number | 时长（分钟）|
| Start Time | rich_text | 开始时间 |
| End Time | rich_text | 结束时间 |
| Record Date | date | 记录日期 |
| **Record** | **relation** | **关联到Main Records数据库**⚠️ 不是Related Main Record |
| Related Goal | relation | 关联到Goals数据库 |
| Related Todo | relation | 关联到Todos数据库 |
| Tags | multi_select | 标签 |
| User ID | rich_text | 用户邮箱 |

**关键字段**:
- `Record` (relation) - 关联主记录，不是`Related Main Record`

---

## 5. Daily Status（每日状态库）- 24个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Date | title | 日期标题（主字段）|
| Full Date | date | 完整日期 |
| Sleep Hours | number | 睡眠时长 |
| Sleep Quality | select | 睡眠质量 |
| Wake Up Time | rich_text | 起床时间 |
| Bed Time | rich_text | 就寝时间 |
| Exercise Duration | number | 运动时长 |
| Exercise Type | multi_select | 运动类型 |
| Meditation | checkbox | 是否冥想 |
| Meditation Duration | number | 冥想时长 |
| Reading | checkbox | 是否阅读 |
| Reading Duration | number | 阅读时长 |
| Water Intake | number | 饮水量 |
| Weight | number | 体重 |
| Meals | multi_select | 用餐情况 |
| Diet Notes | rich_text | 饮食备注 |
| Mood | multi_select | 心情 |
| Energy Level | select | 精力水平 |
| Stress Level | select | 压力水平 |
| Highlights | rich_text | 今日亮点 |
| Notes | rich_text | 备注 |
| Created Time | created_time | 创建时间 |
| Last Edited Time | last_edited_time | 最后编辑时间 |
| User ID | rich_text | 用户邮箱 |

---

## 6. Happy Things（开心库）- 14个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Title | title | 标题（主字段）|
| Content | rich_text | 内容 |
| Category | select | 类别 |
| Difficulty | select | 难度：简单/中等/困难 |
| Duration | number | 时长（分钟）|
| Cost | select | 成本：免费/低成本/中成本/高成本 |
| Energy Level | select | 精力需求 |
| Emoji | rich_text | 表情符号 |
| Is Active | checkbox | 是否激活 |
| Usage Count | number | 使用次数 |
| Last Used | date | 最后使用日期 |
| Notes | rich_text | 备注 |
| Tags | multi_select | 标签 |
| User ID | rich_text | 用户邮箱 |

---

## 7. Quotes（箴言库）- 12个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Quote | title | 箴言内容（主字段）|
| Source | rich_text | 来源 |
| Author | rich_text | 作者 |
| Category | select | 类别 |
| Status | select | 状态：启用/禁用/收藏 |
| Is System Default | checkbox | 是否系统默认 |
| Display Count | number | 显示次数 |
| Last Displayed Date | date | 最后显示日期 |
| Created Date | date | 创建日期 |
| Notes | rich_text | 备注 |
| Tags | multi_select | 标签 |
| User ID | rich_text | 用户邮箱 |

---

## 8. Knowledge（知识库）- 6个字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| Title | title | 标题（主字段）|
| Content | rich_text | 内容 |
| Markdown Content | rich_text | Markdown格式内容 |
| Category | select | 类别：技术等 |
| Status | select | 状态：草稿/已发布/归档 |
| Created Date | created_time | 创建时间 |

---

## 关键差异总结

### 主字段名差异
- Goals: `Goal Name` ✅
- Todos: `Todo Name` ❌ 不是Title
- Main Records: `Name` ❌ 不是Title
- Activity Details: `Name` ✅
- Daily Status: `Date` ✅
- Happy Things: `Title` ✅
- Quotes: `Quote` ✅
- Knowledge: `Title` ✅

### 重要字段差异
- Main Records: `Summary` (不是Content), `Record Date` (不是Date), `Type` (不是Record Type)
- Activity Details: `Record` (不是Related Main Record)
- Goals: 必须包含 `Estimated Hours` 和 `Total Time Investment`

---

## 使用规则

1. **创建新数据库时**: 必须完全按照此Schema创建，字段名必须一字不差
2. **代码中引用字段**: 使用此文档中的字段名，不要猜测
3. **疑问时**: 查阅此文档，不要假设字段名
4. **修改Schema时**: 同步更新此文档

**验证方法**: 使用 `inspect-jayshen-databases.js` 脚本检查实际数据库
