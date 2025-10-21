# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 核心工作铁律（最高优先级）

### ⚠️ 绝对禁止事项
1. **禁止使用模拟数据** - 任何情况下都不允许使用模拟、假数据或占位符数据
2. **禁止擅自修改用户方案** - 不得随意更改用户提出的技术方案和架构决策
3. **必须征求用户意见** - 任何重大变更都必须先向用户说明并征求同意

### ✅ 正确做法
- 使用真实的云数据库、API和服务
- 严格按照用户指定的技术路线执行
- 遇到问题时提供选项供用户选择，而不是擅自决定
- 保持对用户决策的尊重和执行

**重要提醒：每次加载项目记忆时都要严格遵守这些铁律**

## 项目概述
**项目名称**：语寄心声微信小程序  
**开发时间**：2025年1月  
**项目路径**：`/Users/jay/Documents/baidu/projects/yjxs`

## 核心需求
用户想要开发一个微信小程序，具备以下功能：
1. 记录日常备忘录
2. 支持语音输入和文本输入
3. 首页显示自定义箴言（从箴言库抽取）
4. 支持定时记录提醒（1小时或几小时一次）
5. 具备时间线功能
6. 具备历史记录功能
7. **✨ 新增需求：每天的最后一条记录应该是重点：规划第二天的事项**

## 技术实现

### 项目架构
- **框架**：微信小程序原生开发
- **页面结构**：5个主要页面（home, memo, timeline, history, settings）
- **数据存储**：本地存储（localStorage）
- **音频处理**：微信小程序RecorderManager + InnerAudioContext

### 核心功能实现

#### 1. 箴言系统
- 在`app.js`中内置15条正能量箴言
- 每日随机选择一条显示
- 使用日期作为种子确保同一天显示相同箴言

#### 2. 记录功能
- 文本记录：textarea组件，支持500字符
- 语音记录：长按录制，最长60秒
- 标签系统：预设标签 + 自定义标签
- 快速模板：预设常用记录模板

#### 3. 语音处理
- 录音权限检查和申请
- 录音状态实时显示
- 语音转文字（模拟实现，可接入真实API）
- 录音播放控制

#### 4. 数据管理
- 全局数据存储在`app.js`的globalData中
- 本地持久化使用wx.setStorageSync/getStorageSync
- 数据结构：
```javascript
{
  id: string,           // 唯一标识
  content: string,      // 记录内容
  type: 'text'|'voice', // 记录类型
  tags: string[],       // 标签数组
  timestamp: number,    // 时间戳
  audioPath: string     // 音频文件路径（语音记录）
}
```

#### 5. 时间线展示
- 按时间倒序排列
- 支持搜索和筛选
- 时间线节点设计
- 语音播放控制

#### 6. 历史记录
- 按日期分组
- 高级筛选功能
- 统计数据展示
- 分页加载

#### 7. 提醒系统
- 可配置提醒间隔（30分钟-8小时）
- 使用setInterval实现
- 模态框提醒
- **智能规划提醒**：晚上21点后提醒规划明日事项

#### 8. 每日规划功能 ⭐
- **记录模式选择**：日常记录 vs 明日规划
- **专用规划模板**：包含"明天要完成..."等规划导向模板
- **首页重点显示**：突出显示昨日规划作为今日重点
- **视觉差异化**：规划记录采用橙色主题
- **数据结构增强**：添加`isPlanning`和`recordMode`字段
- **时间线区分**：规划记录在时间线中特殊显示

## 界面设计特色

### 设计风格
- 现代化卡片设计
- 渐变色彩方案
- 圆角和阴影
- 流畅动画效果

### 色彩搭配
- **主色：靛蓝渐变** (#6366f1 → #8b5cf6) - 用于日常记录
- **规划色：橙色渐变** (#f59e0b → #d97706) - 用于明日规划
- **辅色：暖橙色** (#ef4444 → #f97316) - 用于语音记录
- **背景：浅灰蓝** (#f8fafc)
- **文字：深灰色** (#1f2937)

### 交互体验
- 防抖搜索
- 状态反馈
- 优雅的空状态
- 响应式布局

## 文件结构
```
memo-miniprogram/
├── app.js              # 应用入口，全局数据管理
├── app.json            # 应用配置，页面注册
├── app.wxss            # 全局样式
├── pages/
│   ├── home/           # 首页：箴言、统计、快速操作
│   ├── memo/           # 记录页：文字/语音输入
│   ├── timeline/       # 时间线：记录列表展示
│   └── history/        # 历史：高级筛选和管理
├── utils/
│   └── util.js         # 工具函数库
├── sitemap.json        # 站点地图
├── project.config.json # 项目配置
└── README.md           # 项目文档
```

## 开发要点

### 已解决的技术难点
1. **语音录制权限处理**：权限检查、申请、错误处理
2. **音频播放状态管理**：多个音频互斥播放
3. **时间格式化**：相对时间、绝对时间转换
4. **数据筛选和搜索**：多条件组合筛选
5. **响应式设计**：适配不同屏幕尺寸

### 性能优化
1. 图片资源懒加载（预留）
2. 列表虚拟滚动（预留）
3. 防抖节流优化
4. 本地存储容量管理

## 扩展建议

### 近期可增加功能
1. 真实语音识别API集成
2. 图片记录功能
3. 数据导出功能
4. 主题切换

### 长期发展方向
1. 云端数据同步
2. 多设备同步
3. AI智能分析
4. 社交分享功能

## Notion四数据库架构设计 ⭐ (2025-01-08)

### 架构概述
从原有的双数据库（主记录表 + 活动明细表）扩展为**四数据库架构**：
1. **主记录表（Main Records）** - 每日记录汇总
2. **活动明细表（Activity Details）** - 每个活动的时间投入
3. **目标库（Goals）** - 人生目标、阶段目标管理 ⭐ 新增
4. **待办事项库（Todos）** - 目标导向和临时待办管理 ⭐ 新增

### 1. 目标库（Goals Database）

#### 核心字段
- **Name**（标题）：目标名称
- **Description**（富文本）：目标详细描述
- **Category**（选择）：目标层级
  - 人生目标（Life Goal）
  - 年度目标（Yearly Goal）
  - 季度目标（Quarterly Goal）
  - 月度目标（Monthly Goal）
  - 周目标（Weekly Goal）
- **Type**（选择）：目标类型（事业/健康/财务/学习/人际/兴趣/家庭）
- **Start Date**（日期）、**Target Date**（日期）、**Actual Completion Date**（日期）
- **Status**（选择）：未开始/进行中/已完成/已暂停/已取消
- **Progress**（数字0-100）：完成百分比
- **Is Quantifiable**（复选框）、**Target Value**（数字）、**Current Value**（数字）、**Unit**（文本）
- **Priority**（选择）：高/中/低
- **Importance**（选择）：核心/重要/辅助

#### 关联和统计
- **Sub Goals**（关联）：子目标（自关联实现层级）
- **Parent Goal**（关联）：父目标
- **Related Todos**（关联）：关联的待办事项
- **Related Activities**（关联）：关联的活动明细
- **Total Time Invested**（汇总）：总投入时间
- **Completed Todos**（汇总）、**Total Todos**（汇总）
- **Todo Completion Rate**（公式）：待办完成率
- **User ID**（文本）、**Tags**（多选）、**Notes**（富文本）

### 2. 待办事项库（Todos Database）

#### 核心字段
- **Title**（标题）：待办事项名称
- **Description**（富文本）：详细描述
- **Todo Type**（选择）：⭐ 核心字段
  - 目标导向（Goal-oriented）- 与长期目标相关
  - 临时待办（Ad-hoc）- 日常琐事、临时任务
  - 习惯养成（Habit）- 重复性习惯培养
  - 紧急处理（Urgent）- 突发紧急事项
- **Category**（选择）：工作/学习/生活/健康/社交/杂事
- **Due Date**（日期）、**Planned Date**（日期）、**Start Time**（文本）
- **Estimated Duration**（数字）、**Actual Duration**（汇总）
- **Priority**（选择）：紧急重要/重要不紧急/紧急不重要/不紧急不重要
- **Energy Level**（选择）：高/中/低精力
- **Status**（选择）：待办/进行中/已完成/已取消/延期
- **Is Completed**（复选框）、**Completion Progress**（数字0-100）

#### 关联关系
- **Related Goal**（关联）：⚠️ 可选，只有目标导向类型建议关联
- **Related Activities**（关联）、**Related Main Records**（关联）
- **Blocking Todos**（关联）、**Blocked By**（关联）
- **Recurrence**（选择）：无/每日/每周/每月/自定义
- **Reminder**（复选框）、**Reminder Time**（日期）
- **User ID**（文本）、**Tags**（多选）、**Difficulty**（选择）

### 3. 活动明细表（现有 + 新增字段）

#### 新增字段 ⭐
- **Related Goal**（关联）：关联的目标
- **Related Todo**（关联）：关联的待办事项
- **Contribution Type**（选择）：贡献类型
  - 完成待办（Complete Todo）
  - 推进目标（Advance Goal）
  - 学习提升（Learning）
  - 休息恢复（Rest）

### 数据库关联关系图
```
Goals (目标库) ─┬─ 一对多 ──> Todos (待办库)
               └─ 一对多 ──> Activities (活动明细)
                                  ↑
                                  │ 一对多
                           Main Records (主记录)
```

### 使用场景

#### 场景1：长期目标追踪
- 创建目标："2025年读完24本书"
- 创建待办："读完《原则》"（关联目标）
- 记录活动："阅读《原则》30分钟"（关联待办和目标）
- 系统自动统计：总投入时间、待办完成率

#### 场景2：临时待办
- 创建待办："去超市买菜"（Todo Type: Ad-hoc，不关联目标）
- 记录活动："购物 20分钟"（可选关联待办）

#### 场景3：习惯养成
- 创建待办："每天做20个俯卧撑"（Todo Type: Habit，Recurrence: Daily）
- 可选关联长期健身目标
- 记录活动自动追踪习惯完成情况

## 维护要点
1. 定期清理本地存储
2. 音频文件管理
3. 权限状态检查
4. 性能监控

## 问题记录

### 微信小程序云环境配置
- 问题可能是微信小程序会优先使用project.config.json中配置的默认云环境，而不是代码中指定的环境。
- 在project.config.json中需要正确配置cloudEnvId和cloudbaseRoot

### 云环境和AppID匹配问题
- 当前项目遇到的云环境和AppID不匹配问题处理经验：
  - 检查当前项目的实际AppID（在project.config.json或微信开发者工具中）
  - 如果AppID不一致，需要修改project.config.json中的appid
  - 或者请求将当前项目的AppID添加到云环境共享授权中
  - 确保使用有云环境授权的正确AppID重新编译测试

---

## 最新更新记录

### 2025-01-09: Notion四数据库架构完整实现 ⭐

**核心成果**: 实现完整的Notion四数据库架构自动化创建和管理

#### 架构设计

四数据库关联关系：
```
🎯 Goals (目标库)
    ↓ 关联
✅ Todos (待办库)
    ↓ 关联
📝 Main Records (主记录表)
    ↓ 关联
⏱️ Activity Details (活动明细表)
```

#### 已完成功能

**1. 云函数集成** ✅
- 文件：`cloudfunctions/memo-notion-sync/index.js`
- 新增Action:
  - `createQuadDatabases` - 创建四数据库架构
  - `createGoal` - 创建目标
  - `updateGoal` - 更新目标
  - `getGoals` - 获取目标列表
  - `createTodo` - 创建待办
  - `updateTodo` - 更新待办
  - `getTodos` - 获取待办列表

**2. 数据库结构定义** ✅
- 目标库：15个字段（Category, Type, Status, Progress, Priority等）
- 待办库：11个字段（Todo Type, Priority, Related Goal等）
- 主记录表：9个字段（Record Type, Time Period, Related Todos等）
- 活动明细表：10个字段（Activity Type, Duration, 三向关联等）

**3. 自动化创建流程** ✅
- 用户配置Notion后一键创建四数据库
- 自动建立数据库间的关联关系
- 自动保存数据库ID到用户配置
- 支持后台自动化执行

**4. 工具和文档** ✅
- `utils/notionQuadDatabaseCreator.js` - 独立创建工具
- `utils/notionDatabaseSetup.js` - 完整Schema定义
- `NOTION_QUAD_DATABASE_SETUP.md` - 详细使用文档

#### 数据库字段详情

**Goals（目标库）核心字段**:
- Name, Description, Category (人生/年度/季度/月度/周)
- Type (事业/健康/财务/学习/人际/兴趣/家庭)
- Status (未开始/进行中/已完成)
- Progress (百分比), Priority (高/中/低)

**Todos（待办库）核心字段**:
- Title, Description, Todo Type (目标导向/临时待办/习惯养成)
- Priority (四象限法则: 紧急重要/重要不紧急/紧急不重要/不紧急不重要)
- Status (待办/进行中/已完成)
- Related Goal (关联目标库)

**Main Records（主记录表）核心字段**:
- Title, Content, Date
- Record Type (日常记录/明日规划)
- Time Period (早晨/上午/下午/晚上)
- Related Todos (关联待办库)

**Activity Details（活动明细表）核心字段**:
- Name, Description, Start Time, End Time, Duration
- Activity Type (工作/学习/运动/休息)
- Related Goal, Related Todo, Related Main Record (三向关联)

#### 下一步计划

- [ ] 更新前端目标管理页面，支持创建/编辑/查看目标
- [ ] 更新前端待办管理页面，支持创建/编辑/完成待办
- [ ] 完善每日记录功能，支持关联待办和目标
- [ ] 实现数据统计和可视化展示
- [ ] 添加Rollup字段实现自动统计（需Notion界面配置）

#### 技术亮点

1. **完整的数据关联**: 四个数据库形成完整的数据流
2. **灵活的待办类型**: 支持目标导向和临时待办
3. **四象限时间管理**: 优先级采用经典四象限法则
4. **自动化创建**: 用户配置Notion后一键创建全部架构
5. **标准化流程**: 每个新用户注册时自动执行

---

### 2025-10-09: 用户标签系统与Notion API调用优化 ⭐

**核心成果**: 实现用户标签管理系统，修复Notion同步问题

#### 1. 用户标签管理系统 ✅

**实现内容**：
- 文件：`utils/tagManager.js` - 标签管理工具类
- 存储方式：按用户邮箱组织标签（本地 + 云端双存储）
- 默认标签：['工作', '生活', '学习', '心情', '想法', '计划', '总结', '感悟']
- 自定义标签：用户可添加/删除自定义标签

**核心功能**：
```javascript
// 获取用户标签（默认 + 自定义，去重）
tagManager.getUserTags(userEmail)

// 添加标签（本地 + 云端同步）
tagManager.addTag(userEmail, tag)

// 从云端加载标签
tagManager.loadFromCloud(userEmail)

// 同步标签到云端
tagManager.syncToCloud(userEmail, tags)
```

**云函数集成**：
- 新增 `getUserTags` action - 根据邮箱获取用户标签
- 新增 `syncUserTags` action - 同步标签到云端数据库
- 数据库集合：`memo_users`

**前端集成**：
- `pages/memo/memo.js` - 在记录时间投入时使用标签
- 标签选择提供视觉反馈（Toast提示）
- 页面加载时自动从云端同步标签

#### 2. 用户查询方式优化 ✅

**问题根源**：
- 之前使用 `userId` (格式：`user_xxx`) 通过 `doc(userId)` 查询
- `userId` 格式与数据库 `_id` 字段不匹配
- 导致错误："document with _id xxx does not exist"

**解决方案**：
- 改用 `email` 字段查询：`where({ email: userEmail })`
- 保持向后兼容：如果没有 email 参数，仍使用 userId

**修改文件**：
- `utils/apiService.js` - 所有方法添加 `userEmail` 参数
- `pages/memo/memo.js` - 所有API调用传递 `currentUser.email`
- `cloudfunctions/memo-notion-sync/index.js` - 四个核心函数改用email查询
  - createMainRecord
  - createActivity
  - getMainRecords
  - getActivities

#### 3. Notion API调用架构重构 ⭐⭐⭐

**问题发现**：
- ✅ 前端可以直接访问 Notion API（创建数据库成功）
- ❌ 云函数无法访问 Notion API（保存记录失败 ECONNREFUSED 208.103.161.1:443）
- 原因：微信云函数访问外网有限制

**解决方案**：
**改用前端直接调用 Notion API**，绕过云函数网络限制

**技术架构变更**：
```
旧架构：
前端 → 云函数 → Notion API ❌ (云函数无法访问外网)

新架构：
前端 → Notion API ✅ (前端可以直接访问)
```

**修改内容**：
- `pages/memo/memo.js`:
  - 引入 `notionApiService`
  - `saveToNotion()`: 改用 `notionApiService.createPageGeneric()` 创建主记录
  - `createActivityDetails()`: 改用前端直接调用创建活动记录
  - 移除云函数调用（apiService.createMainRecord/createActivity）
  - 在properties中直接添加关联关系（Related Goal, Related Main Record）

**优势**：
- ✅ 绕过云函数网络限制，成功保存到Notion
- ✅ 减少云函数调用，降低成本
- ✅ 响应更快（无中间层）
- ✅ 与创建数据库的调用方式保持一致

#### 4. 网络诊断工具 ✅

**实现内容**：
- 云函数：`diagnoseNetwork` action
- 前端工具：`utils/cloudTest.js` - `diagnoseNetwork()` 方法

**诊断功能**：
1. DNS解析测试 - 检查是否能解析 `api.notion.com`
2. HTTP连接测试 - 检查是否能连接到Notion API
3. Axios配置显示 - 查看当前网络配置

**使用方法**：
```javascript
const cloudTest = require('./utils/cloudTest.js')
await cloudTest.diagnoseNetwork(apiKey)
```

#### 5. 数据库集合名称修复 ✅

**问题**：
- 错误集合名：`users` → 正确集合名：`memo_users`
- 导致错误："database collection not exists"

**解决**：
- 使用 sed 批量替换所有 `db.collection('users')` 为 `db.collection('memo_users')`
- 更新所有云函数中的集合引用

#### 技术亮点

1. **标签系统架构**：本地存储 + 云端同步 + 默认标签合并
2. **邮箱作为唯一标识**：更符合业务逻辑，避免ID匹配问题
3. **前端直接调用API**：绕过云函数限制，提升稳定性和性能
4. **完整的诊断工具**：便于排查网络和配置问题
5. **向后兼容设计**：支持 userId 和 email 双查询方式

#### 代码提交记录

- `4d8abf0` feat: 实现用户标签管理系统
- `1e2b459` fix: 修复云函数数据库集合名称错误
- `3a2a5b4` fix: 修正云函数集合名称为memo_users
- `065b1dc` fix: 改用email查询用户而非userId
- `258d377` debug: 添加详细的Notion API错误日志
- `e4a2632` fix: 添加网络诊断功能解决Notion API连接问题
- `17c14cc` feat: 添加网络诊断工具到cloudTest.js
- `553d517` fix: 改用前端直接调用Notion API绕过云函数网络限制

#### 下一步计划

- [ ] 实现记录编辑功能（目前新建可用）
- [ ] 优化标签管理界面
- [ ] 添加标签使用统计
- [ ] 实现批量标签操作

---

### 2025-10-12: 六数据库配置界面实现 ⭐

**核心成果**: 实现Notion六数据库架构的手动配置功能

#### 问题背景

用户反馈：每日状态记录无法保存，提示"请先配置Notion每日状态库"

**根本原因**：
- 用户已手动创建了6个Notion数据库（Goals、Todos、Main Records、Activity Details、Daily Status、Happy Things）
- 但系统只保存了单个`databaseId`，没有保存各个数据库的独立ID
- daily-status.js检查`currentUser.notionConfig?.databases?.dailyStatus`时找不到配置

#### 解决方案

**1. 扩展notionConfig数据结构** ✅
```javascript
notionConfig: {
  apiKey: '',
  databaseId: '',      // 兼容旧版单数据库
  databases: {         // 新增六数据库架构
    goals: '',
    todos: '',
    mainRecords: '',
    activityDetails: '',
    dailyStatus: '',
    happyThings: ''    // 开心库
  }
}
```

**2. 更新配置页面** ✅
- 文件：`pages/notion-config/notion-config.js`、`notion-config.wxml`、`notion-config.wxss`
- 新增"六数据库配置"折叠区域
- 为每个数据库提供独立的ID输入框
- 添加切换显示/隐藏高级配置功能

**3. UI设计** ✅
- 🎯 目标库 (Goals)
- ✅ 待办库 (Todos)
- 📝 主记录表 (Main Records)
- ⏱️ 活动明细表 (Activity Details)
- 📊 每日状态库 (Daily Status)
- 😊 开心库 (Happy Things)

**4. 数据兼容** ✅
- 向后兼容：保留原有的单数据库配置和happyThingsDatabaseId
- 自动合并：加载配置时自动合并默认值和用户配置
- 云端同步：所有配置自动同步到云数据库

#### 修改文件

1. **pages/notion-config/notion-config.js**
   - 添加`showAdvanced`状态
   - 添加`databases`对象到默认配置
   - 实现`toggleAdvanced`方法
   - 新增6个数据库ID输入处理方法
   - 更新`loadUserConfig`方法支持databases合并

2. **pages/notion-config/notion-config.wxml**
   - 添加"六数据库配置"折叠区域
   - 6个数据库ID输入框
   - 每日状态库和开心库标记为必填

3. **pages/notion-config/notion-config.wxss**
   - 添加`.toggle-icon`样式
   - 添加`.advanced-config`容器样式
   - 添加`.database-input-group`和`.db-label`样式

4. **utils/userManager.js**
   - 更新`createUser`方法中的notionConfig初始化
   - 添加`databases`对象到默认配置，包含happyThings

5. **pages/happy-manager/happy-manager.js**
   - 更新所有使用happyThingsDatabaseId的地方
   - 优先使用`databases.happyThings`，向后兼容`happyThingsDatabaseId`

#### 使用指南

**用户操作步骤**：
1. 进入"设置" → "Notion集成配置"
2. 输入API Key
3. 展开"🎯 六数据库配置（推荐）"
4. 输入各个数据库的ID（从Notion数据库URL中复制）：
   - 🎯 目标库 (Goals)
   - ✅ 待办库 (Todos)
   - 📝 主记录表 (Main Records)
   - ⏱️ 活动明细表 (Activity Details)
   - 📊 每日状态库 (Daily Status) - 使用每日状态功能必填
   - 😊 开心库 (Happy Things) - 使用开心事管理功能必填
5. 保存配置

**获取数据库ID方法**：
1. 在Notion中打开对应数据库
2. 点击右上角"共享"按钮
3. 添加创建的集成
4. 复制数据库URL
5. 从URL中提取32位ID

例如URL: `https://www.notion.so/28774e5ad9378137bb2edc914308f718`
数据库ID就是：`28774e5ad9378137bb2edc914308f718`

#### 技术亮点

1. **渐进式配置**：支持简单模式（单数据库）和完整模式（六数据库）
2. **折叠式UI**：通过`showAdvanced`控制高级配置显示
3. **数据向后兼容**：不影响已有用户的配置，支持旧字段名
4. **自动合并配置**：加载时智能合并默认值和用户配置
5. **清晰的必填提示**：标记必需数据库为必填项
6. **统一数据访问**：happy-manager优先使用新字段，自动降级到旧字段

#### 下一步计划

- [x] 解决每日状态保存问题
- [x] 添加开心库配置支持
- [ ] 添加数据库连接测试功能
- [ ] 实现自动创建六数据库功能（调用createQuadDatabases）
- [ ] 添加数据库配置状态检查和提示

---

### 2025-10-12: 待办状态手动管理功能 ⭐

**核心成果**: 实现时间投入关联待办时的手动状态选择和持久化

#### 问题背景

用户在记录时间投入并关联待办事项时，需要能够直接标记待办状态：
1. 保存记录按钮无响应（关联待办后无法保存）
2. 无法手动设置待办状态（进行中/已完成）
3. 状态需要持久化到Notion并在待办管理页面同步显示

#### 解决方案

**1. 修复保存功能** ✅
- **问题根源**: `createActivityDetails` 使用全局 `selectedTodoId` 而非条目级别的 `todoId`
- **解决方法**: 改用 `entry.todoId`，支持每个时间条目独立关联待办

**2. 修复目标加载** ✅
- **问题根源**: `loadAvailableGoals` 使用本地 `app.getGoals()` 返回空数组
- **解决方法**: 改用 `notionApiService.queryGoals()` 从Notion API获取
- **字段修正**: 目标标题字段从 `Name` 修正为 `Goal Name`

**3. 添加状态手动选择UI** ✅
- 在三种活动类型（有价值/中性/低效）的输入区域添加状态选择器
- 提供两个选项：▶️ 进行中 / ✅ 已完成
- 默认选中"进行中"
- 视觉设计：金黄色背景容器 + 紫色高亮选中状态

**4. 实现状态持久化** ✅
- 时间条目数据结构添加 `todoStatus` 字段
- 保存记录时收集所有待办的用户选择状态
- 使用 `notionApiService.updatePageProperties` 直接更新Notion
- 不再使用智能判断，完全按用户选择执行

#### 修改文件

**1. pages/memo/memo.wxml** (UI层)
- **删除重复区域**：移除底部的"待办事项关联"卡片（原行796-909）
- **添加状态选择器**：在三个活动类型的待办关联后添加状态选择UI
  - 有价值活动：行201-222
  - 中性活动：行401-422
  - 低效活动：行601-622

**2. pages/memo/memo.js** (逻辑层)
- **数据字段**（行92-94）：
  ```javascript
  currentActivityTodoStatus: '进行中',
  currentNeutralActivityTodoStatus: '进行中',
  currentWastefulActivityTodoStatus: '进行中'
  ```

- **状态选择方法**（行2829-2843）：
  ```javascript
  selectTodoStatus: function(e) {
    const status = e.currentTarget.dataset.status
    const type = e.currentTarget.dataset.type
    // 根据活动类型更新对应的状态字段
  }
  ```

- **待办选择重置**（行2811-2826）：
  ```javascript
  onActivityTodoChange: function(e) {
    // 选择新待办时，重置状态为默认"进行中"
  }
  ```

- **添加时间条目**（行1144-1297）：
  ```javascript
  addTimeEntry: function(e) {
    // 获取todoStatus
    // 保存到entry.todoStatus
    // 清空表单时重置状态为"进行中"
  }
  ```

- **更新Notion待办**（行2548-2594）：
  ```javascript
  // 收集所有待办的用户选择状态
  const todoUpdates = new Map() // todoId -> {minutes, todoTitle, todoStatus}

  // 直接更新为用户选择的状态
  await notionApiService.updatePageProperties(
    notionConfig.apiKey,
    todoId,
    { 'Status': { select: { name: update.todoStatus } } }
  )
  ```

- **修复目标加载**（行2751-2789）：
  ```javascript
  loadAvailableGoals: async function() {
    // 改用Notion API查询
    const result = await notionApiService.queryGoals(apiKey, goalsDatabaseId, {
      status: '进行中'
    })
  }
  ```

**3. pages/memo/memo.wxss** (样式层)
- **状态选择器样式**（行1489-1538）：
  ```css
  .todo-status-selector {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-left: 4rpx solid #f59e0b;
  }

  .status-option.selected {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    box-shadow: 0 4rpx 12rpx rgba(99, 102, 241, 0.3);
  }
  ```

**4. utils/notionApiService.js**
- **添加目标查询方法**（行2586-2674）：
  ```javascript
  async queryGoals(apiKey, goalsDatabaseId, options = {}) {
    // 查询Status="进行中"的目标
    // 字段修正：使用'Goal Name'而非'Name'
    // 按Priority和Start Date排序
  }
  ```

#### 技术亮点

1. **条目级别关联**：每个时间投入可独立关联待办和选择状态
2. **用户主导状态**：完全由用户手动选择状态，不使用智能判断
3. **数据持久化**：状态保存在时间条目中，并同步到Notion数据库
4. **向后兼容**：todoStatus默认值为"进行中"，保证旧数据兼容
5. **视觉反馈**：清晰的UI设计，选中状态高亮显示
6. **三类活动统一**：有价值/中性/低效活动均支持状态选择

#### 工作流程

```
1. 用户输入活动名称和时间
   ↓
2. 选择关联的待办事项（可选）
   ↓
3. 显示状态选择器（▶️ 进行中 / ✅ 已完成）
   ↓
4. 用户选择目标状态
   ↓
5. 点击"添加时间投入"保存到条目列表
   ↓
6. 点击"保存记录"
   ↓
7. 创建主记录到Notion
   ↓
8. 创建活动明细到Notion
   ↓
9. 更新待办状态到Notion（使用用户选择的状态）
   ↓
10. 待办管理页面自动同步显示新状态
```

#### 数据结构

**时间条目对象**：
```javascript
{
  activity: '活动名称',
  minutes: 20,
  tags: ['工作', '学习'],
  goalId: 'goal_id',
  goalTitle: '目标标题',
  todoId: 'todo_id',
  todoTitle: '待办标题',
  todoStatus: '进行中' // ⭐ 新增字段
}
```

**待办更新Map**：
```javascript
Map {
  'todo_id_1' => {
    minutes: 40,
    todoTitle: '完成报告',
    todoStatus: '已完成' // 用户选择的状态
  },
  'todo_id_2' => {
    minutes: 20,
    todoTitle: '代码review',
    todoStatus: '进行中'
  }
}
```

#### 用户反馈

- ✅ 界面简洁：删除了重复的待办关联区域
- ✅ 保存正常：修复了关联待办后无法保存的问题
- ✅ 状态可控：用户可以直接标记待办为"进行中"或"已完成"
- ✅ 数据同步：Notion数据库和待办管理页面状态一致

#### 相关文档

- 用户提问记录：`/迭代记录/2025-10-12_用户提问记录.md`

---

### 2025-10-19: 箴言系统完整重构与Notion集成优化 ⭐

**核心成果**: 实现箴言管理页面重新设计，修复Notion数据加载问题，优化用户体验

#### 1. 箴言管理页面重新设计 ✅

**用户需求**：
- 不需要"最近添加"、"全部箴言"、"我的收藏"的复杂分类
- 只需要简单区分：系统箴言 vs 我的箴言
- 页面布局要更紧凑美观

**UI重构**：

**Tab结构简化**：
```
旧设计（3个Tab）:
- 🕐 最近添加
- 📚 全部箴言
- ❤️ 我的收藏

新设计（2个Tab）:
- ⭐ 系统箴言
- ✏️ 我的箴言
```

**统计卡片优化**：
```
旧设计（4个卡片）:
📚 总箴言 | ❤️ 收藏 | ✏️ 自定义 | ☁️ 云端

新设计（3个卡片，更紧凑）:
⭐ 系统箴言 | ✏️ 我的箴言 | 📊 分类
```

**修改文件**：
- `pages/quote-manager/quote-manager.wxml`:
  - 修改Tab导航为2个（system/my）
  - 简化统计卡片为3个
  - 系统箴言只显示⚡使用按钮
  - 我的箴言显示✏️编辑、🗑️删除、⚡使用按钮

- `pages/quote-manager/quote-manager.js`:
  - 更新数据字段：`systemQuotes`、`myQuotes`
  - 修改`updateStatistics`方法：按source字段分类
  - 简化`filterQuotes`方法：基于当前Tab筛选
  - 更新`switchTab`方法：切换时清空搜索和筛选

- `pages/quote-manager/quote-manager.wxss`:
  - 统计卡片padding优化（24rpx→20rpx）
  - 卡片间距优化（20rpx→16rpx）

#### 2. Notion箴言加载问题修复 ✅

**问题1：Notion API查询格式错误**

❌ 错误代码：
```javascript
const filter = {
  and: [{
    property: 'Status',
    select: { equals: '启用' }
  }]
}
```

✅ 正确代码：
```javascript
const queryBody = {
  filter: {
    property: 'Status',
    select: { equals: '启用' }
  }
}
```

**问题2：数据结构解析错误**

Notion API返回：
```javascript
{
  object: "list",
  results: [...], // 实际数据在这里
  next_cursor: null,
  has_more: false
}
```

❌ 错误：`result.data.map(...)` → TypeError
✅ 修复：`result.data.results.map(...)`

**问题3：字段名不一致**

WXML显示：`{{item.content}}`
Notion返回：只有`quote`字段

✅ 解决方案：同时提供`content`和`quote`字段
```javascript
{
  content: getTitleValue(props.Quote), // 主字段
  quote: getTitleValue(props.Quote),   // 兼容字段
  source: getRichTextValue(props.Source) || '未知来源',
  category: getSelectValue(props.Category) || '励志',
  tags: getMultiSelectValue(props.Tags) || []
}
```

**修改文件**：
- `utils/quoteService.js`:
  - 修复查询body格式（第52-60行）
  - 修复数据解析路径（第70行）
  - 统一DEFAULT_QUOTES格式，添加content字段

#### 3. 首页箴言显示修复 ✅

**问题：显示"[object Object]"**

**根本原因**：
- `app.js`的`refreshQuote`方法将箴言对象直接赋值给content字段
- `content: quotes[randomIndex]` → quotes[randomIndex]是对象，不是字符串

**修复方案**：
```javascript
// app.js - refreshQuote方法
const selectedQuote = quotes[randomIndex]

// 如果已经是完整的箴言对象，直接使用
if (typeof selectedQuote === 'object' && (selectedQuote.content || selectedQuote.quote)) {
  this.globalData.currentQuote = selectedQuote
  return selectedQuote
}

// 如果是字符串，包装成对象
const newQuote = {
  content: selectedQuote,
  quote: selectedQuote,
  category: '默认'
}
```

**修改文件**：
- `app.js`:
  - `refreshQuote`方法（第539-569行）
  - `getQuoteByMood`方法（第595-616行）

#### 4. 箴言加载时序问题修复 ✅

**问题**：
```javascript
// app.js onLaunch
this.loadWisdomQuotes()  // 异步，需要时间
this.setDailyQuote()     // 立即执行，此时wisdomQuotes为空
```

**修复**：
```javascript
this.loadWisdomQuotes().then(() => {
  this.setDailyQuote()
})
```

#### 5. 本地存储清理 ✅

**用户反馈**：Notion只有1条数据，但"我的箴言"显示很多测试数据

**问题原因**：`loadLocalQuotes`方法合并了本地存储的测试数据

**解决方案**：
```javascript
// 禁用本地存储加载，完全依赖Notion
loadLocalQuotes: function() {
  console.log('📝 跳过本地箴言加载，仅使用Notion数据')
}
```

**修改逻辑**：
- 删除操作：只在Notion中设置Status='禁用'
- 编辑操作：只更新Notion，不操作本地存储
- 添加操作：通过`app.addUserQuote`保存到Notion

#### 6. 待办删除功能修复 ✅

**问题**：待办页面删除按钮失效

**根本原因**：调用云函数而非直接调用Notion API

**修复前**：
```javascript
const result = await apiService.deleteTodo(
  currentUser.email,
  notionConfig.apiKey,
  todoId
)
```

**修复后**：
```javascript
await notionApiService.updatePageProperties(
  notionConfig.apiKey,
  todoId,
  {
    'Status': {
      select: { name: '已删除' }
    }
  }
)
```

**修改文件**：
- `pages/goals-todos/goals-todos.js` (第1584-1595行)

#### 技术亮点

1. **完全Notion化**：箴言和待办完全依赖Notion数据库，不使用本地存储
2. **双字段兼容**：`content`+`quote`双字段确保兼容性
3. **异步时序控制**：使用Promise.then确保数据加载完成后再使用
4. **软删除模式**：通过Status字段实现软删除，保留历史数据
5. **直接API调用**：绕过云函数限制，直接调用Notion API

#### 用户体验改进

- ✅ 页面更简洁：从3个Tab减少到2个
- ✅ 布局更紧凑：统计卡片从4个减少到3个
- ✅ 数据更准确：完全基于Notion，无本地缓存干扰
- ✅ 删除功能正常：待办删除恢复工作
- ✅ 显示内容正确：不再显示[object Object]

#### 相关文件清单

**核心修改**：
- `pages/quote-manager/quote-manager.wxml` (314行)
- `pages/quote-manager/quote-manager.js` (700+行)
- `pages/quote-manager/quote-manager.wxss` (627行)
- `utils/quoteService.js` (修复查询和数据解析)
- `app.js` (修复refreshQuote和时序)
- `pages/goals-todos/goals-todos.js` (修复删除功能)

#### 数据库配置

**七数据库架构**（已更新术语）：
1. 🎯 目标库 (Goals)
2. ✅ 待办库 (Todos)
3. 📝 主记录表 (Main Records)
4. ⏱️ 活动明细表 (Activity Details)
5. 📊 每日状态库 (Daily Status)
6. 😊 开心库 (Happy Things)
7. 💬 箴言库 (Quotes) ⭐ 本次重点

#### 下一步计划

- [ ] 优化箴言分类筛选逻辑
- [ ] 添加箴言使用统计可视化
- [ ] 实现箴言导入导出功能
- [ ] 优化箴言搜索体验

---
*开发完成日期：2025年1月*
*最新更新：2025-10-19 (箴言系统完整重构与Notion集成优化)*