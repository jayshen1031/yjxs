# 双表架构实现进度

## ✅ 已完成的工作

### 1. 架构设计
- ✅ 完成双表数据库架构设计文档（`NOTION_DUAL_TABLE_DESIGN.md`）
- ✅ 定义主记录表字段（14个字段）
- ✅ 定义活动明细表字段（8个字段）

### 2. 用户配置结构更新
- ✅ 修改`userManager.js`中的用户配置结构
- ✅ 添加`mainDatabaseId`和`activityDatabaseId`字段
- ✅ 更新初始化状态追踪（`initializedTables`数组）

### 3. 数据库创建功能
- ✅ 实现`createMainRecordsDatabase()`创建主记录表
- ✅ 实现`createActivityDetailsDatabase()`创建活动明细表
- ✅ 实现`addRollupFieldsToMainDatabase()`添加Rollup聚合字段
- ✅ 实现`createDualDatabases()`统一创建流程

### 4. API Service核心功能
- ✅ 修改`testConnection()`支持父页面验证
- ✅ 添加双数据库自动创建流程

## 🚧 待完成的工作

### 1. 修改测试连接流程（settings.js）

**当前流程：**
```javascript
testNotionConnection() {
  // 输入API Key和Database ID
  // 测试连接
}
```

**新流程：**
```javascript
testNotionConnection() {
  // 方式1：输入API Key和父页面ID → 自动创建双数据库
  // 方式2：输入API Key和两个数据库ID → 验证已有数据库
}
```

**需要修改：**
- `pages/settings/settings.js` - 测试连接函数
- `pages/settings/settings.wxml` - 添加父页面ID输入框和创建按钮
- `utils/cloudTest.js` - 调用新的创建流程

### 2. 修改数据同步逻辑（app.js）

**当前：**
```javascript
syncToNotion(memo) {
  // 同步到单个数据库
  // 所有数据在一条记录中
}
```

**新设计：**
```javascript
syncToNotion(memo) {
  // 第1步：同步主记录到主记录表
  const mainRecord = await notionApiService.createMainRecord({
    id: memo.id,
    userId: memo.userId,
    recordDate: memo.timestamp,
    startTime: memo.startTime,
    endTime: memo.endTime,
    summary: generateSummary(memo),
    tags: memo.tags
  })

  // 第2步：同步活动明细到活动明细表
  const activities = [
    ...memo.valuableTimeEntries.map(e => ({
      activityName: e.activity,
      minutes: e.minutes,
      valueType: '有价值',
      recordId: mainRecord.id
    })),
    ...memo.neutralTimeEntries.map(e => ({
      activityName: e.activity,
      minutes: e.minutes,
      valueType: '中性',
      recordId: mainRecord.id
    })),
    ...memo.wastefulTimeEntries.map(e => ({
      activityName: e.activity,
      minutes: e.minutes,
      valueType: '低效',
      recordId: mainRecord.id
    }))
  ]

  await notionApiService.createActivities(activities)
}
```

**需要添加的函数：**
- `createMainRecord()` - 创建主记录
- `createActivity()` - 创建单个活动
- `createActivities()` - 批量创建活动
- `generateSummary()` - 生成总结文本

### 3. 更新前端配置页面

**需要修改的文件：**
- `pages/settings/settings.wxml`
- `pages/settings/settings.js`
- `pages/settings/settings.wxss`

**新增UI元素：**
```xml
<!-- 配置方式选择 -->
<radio-group>
  <radio value="auto">自动创建数据库（推荐）</radio>
  <radio value="manual">使用已有数据库</radio>
</radio-group>

<!-- 自动创建模式 -->
<view wx:if="{{ configMode === 'auto' }}">
  <input placeholder="输入Notion页面ID"/>
  <button bindtap="autoCreateDatabases">自动创建</button>
</view>

<!-- 手动配置模式 -->
<view wx:if="{{ configMode === 'manual' }}">
  <input placeholder="主记录数据库ID"/>
  <input placeholder="活动明细数据库ID"/>
  <button bindtap="testConnection">验证连接</button>
</view>
```

## 📋 实现步骤建议

### 第一阶段：完成自动创建功能
1. 修改`settings.wxml`添加配置方式选择
2. 修改`settings.js`实现自动创建流程
3. 测试自动创建双数据库功能

### 第二阶段：实现双表同步
4. 在`notionApiService.js`中添加创建主记录和活动明细的函数
5. 修改`app.js`的同步逻辑
6. 测试完整的数据同步流程

### 第三阶段：数据迁移和优化
7. 提供旧数据迁移工具
8. 优化错误处理和用户提示
9. 完善文档和使用说明

## 📝 需要用户决定的问题

### 1. 父页面ID如何获取？

**方案A：让用户手动输入**
- 优点：简单直接
- 缺点：用户需要知道如何获取页面ID

**方案B：自动在用户的工作区创建父页面**
- 优点：用户体验更好
- 缺点：需要额外的API调用

### 2. 是否需要数据迁移工具？

如果有旧用户已经使用了单数据库模式，是否需要：
- 提供一键迁移工具
- 手动迁移指南
- 同时支持新旧两种模式

### 3. Summary字段如何生成？

主记录表的Summary字段内容：

**方案A：合并三类活动的描述**
```
有价值的活动：完成项目开发、学习新技术
中性活动：吃饭、通勤
低效活动：刷手机
```

**方案B：生成统计摘要**
```
本次记录：4个活动
有价值：2个，90分钟
中性：1个，30分钟
低效：1个，15分钟
```

**方案C：AI自动生成摘要**
- 调用AI总结活动内容

## 🎯 当前建议的下一步

1. **先完成自动创建功能**，让用户能够一键创建双数据库
2. **然后实现双表同步**，确保数据能正确保存
3. **最后考虑数据迁移**，帮助老用户升级

您想先从哪一步开始？或者对以上任何问题有决定吗？
