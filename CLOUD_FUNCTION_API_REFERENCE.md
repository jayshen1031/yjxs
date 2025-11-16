# 云函数API参考文档

## 📚 目录

- [主记录表（Main Records）管理](#主记录表管理)
- [活动明细表（Activity Details）管理](#活动明细表管理)
- [目标管理（Goals）](#目标管理)
- [待办管理（Todos）](#待办管理)
- [关联关系管理](#关联关系管理)
- [统计分析](#统计分析)
- [删除功能](#删除功能)

---

## 主记录表管理

### 1. 创建主记录

**Action**: `createMainRecord`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  recordData: {
    title: '今日工作总结',           // 必填
    content: '今天完成了....',       // 可选
    date: '2025-01-09',            // 可选，默认今天
    recordType: '日常记录',         // 可选：日常记录/次日规划/每日总结/灵感记录
    timePeriod: '晚上',            // 可选：早晨/上午/中午/下午/晚上/规划
    mood: '😊 开心',               // 可选
    relatedTodoIds: ['TODO_ID_1'], // 可选，关联的待办ID数组
    tags: ['工作', '总结']          // 可选
  }
}
```

**返回值**:
```javascript
{
  success: true,
  recordId: 'NOTION_PAGE_ID',
  message: '主记录创建成功'
}
```

**示例**:
```javascript
const apiService = require('./utils/apiService.js')

const result = await apiService.callCloudFunction('createMainRecord', {
  userId: wx.getStorageSync('userId'),
  apiKey: wx.getStorageSync('notionApiKey'),
  recordData: {
    title: '2025-01-09 工作日志',
    content: '今天完成了云函数API的补全工作，新增了15个核心功能。',
    recordType: '日常记录',
    timePeriod: '晚上',
    mood: '💪 充满动力',
    tags: ['开发', '云函数']
  }
})

console.log(result.recordId) // 返回Notion页面ID
```

---

### 2. 更新主记录

**Action**: `updateMainRecord`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  recordId: 'RECORD_PAGE_ID',
  updates: {
    content: '更新的内容',
    mood: '😌 平静',
    relatedTodoIds: ['TODO_ID_1', 'TODO_ID_2']
  }
}
```

---

### 3. 获取主记录列表

**Action**: `getMainRecords`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  filter: 'all',              // 可选：all/日常记录/次日规划/每日总结/灵感记录
  startDate: '2025-01-01',    // 可选，开始日期
  endDate: '2025-01-31'       // 可选，结束日期
}
```

**返回值**:
```javascript
{
  success: true,
  records: [
    // Notion API返回的页面数据数组
  ]
}
```

**示例 - 获取本月所有记录**:
```javascript
const today = new Date()
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const result = await apiService.callCloudFunction('getMainRecords', {
  userId: userId,
  apiKey: apiKey,
  startDate: firstDay.toISOString().split('T')[0],
  endDate: lastDay.toISOString().split('T')[0]
})
```

---

### 4. 删除主记录

**Action**: `deleteMainRecord`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  recordId: 'RECORD_PAGE_ID'
}
```

---

## 活动明细表管理

### 1. 创建活动明细

**Action**: `createActivity`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  activityData: {
    name: '阅读《原则》',              // 必填
    description: '阅读第3章',          // 可选
    activityType: '学习',             // 可选：工作/学习/运动/休息/社交/娱乐/杂事
    duration: 30,                    // 持续时间（分钟）
    startTime: '2025-01-09T10:00',  // 可选，ISO格式
    endTime: '2025-01-09T10:30',    // 可选
    contributionType: '推进目标',     // 可选：完成待办/推进目标/学习提升/休息恢复
    valueRating: '高价值',           // 可选：高价值/中等价值/低价值
    relatedGoalId: 'GOAL_PAGE_ID',  // 可选，关联的目标
    relatedTodoId: 'TODO_PAGE_ID',  // 可选，关联的待办
    relatedMainRecordId: 'RECORD_ID', // 可选，关联的主记录
    tags: ['阅读', '个人成长']         // 可选
  }
}
```

**返回值**:
```javascript
{
  success: true,
  activityId: 'NOTION_PAGE_ID',
  message: '活动明细创建成功'
}
```

**示例 - 记录学习活动并关联到目标**:
```javascript
const result = await apiService.callCloudFunction('createActivity', {
  userId: userId,
  apiKey: apiKey,
  activityData: {
    name: '学习JavaScript闭包',
    description: '深入理解闭包的原理和应用场景',
    activityType: '学习',
    duration: 60,
    startTime: new Date().toISOString(),
    contributionType: '学习提升',
    valueRating: '高价值',
    relatedGoalId: '你的学习目标ID',
    tags: ['JavaScript', '编程']
  }
})
```

---

### 2. 更新活动明细

**Action**: `updateActivity`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  activityId: 'ACTIVITY_PAGE_ID',
  updates: {
    duration: 45,              // 更新持续时间
    valueRating: '高价值',      // 更新价值评估
    contributionType: '推进目标'
  }
}
```

---

### 3. 获取活动明细列表

**Action**: `getActivities`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  filter: {
    activityType: '学习'  // 可选，按活动类型筛选
  },
  startDate: '2025-01-01',  // 可选
  endDate: '2025-01-31'     // 可选
}
```

**示例 - 获取今天的所有活动**:
```javascript
const today = new Date().toISOString().split('T')[0]

const result = await apiService.callCloudFunction('getActivities', {
  userId: userId,
  apiKey: apiKey,
  startDate: today,
  endDate: today
})

console.log(`今日活动数：${result.activities.length}`)
```

---

### 4. 删除活动明细

**Action**: `deleteActivity`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  activityId: 'ACTIVITY_PAGE_ID'
}
```

---

## 目标管理

### 1. 创建目标

**Action**: `createGoal`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  goalData: {
    title: '2025年读完24本书',
    description: '每月阅读2本书，涵盖技术、管理、人文等领域',
    category: '年度目标',        // 人生目标/年度目标/季度目标/月度目标/周目标
    type: '学习',               // 事业/健康/财务/学习/人际/兴趣/家庭
    priority: '高'              // 高/中/低
  }
}
```

**返回值**:
```javascript
{
  success: true,
  goalId: 'NOTION_PAGE_ID',
  message: '目标创建成功'
}
```

---

### 2. 更新目标

**Action**: `updateGoal`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  goalId: 'GOAL_PAGE_ID',
  updates: {
    progress: 50,        // 进度百分比 (0-100)
    status: '进行中'      // 未开始/进行中/已完成/已暂停/已取消
  }
}
```

---

### 3. 获取目标列表

**Action**: `getGoals`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...'
}
```

**返回值**:
```javascript
{
  success: true,
  goals: [
    // Notion API返回的页面数据数组
  ]
}
```

---

### 4. 删除目标

**Action**: `deleteGoal`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  goalId: 'GOAL_PAGE_ID'
}
```

---

## 待办管理

### 1. 创建待办

**Action**: `createTodo`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  todoData: {
    title: '读完《原则》',
    todoType: '目标导向',          // 目标导向/临时待办/习惯养成/紧急处理
    priority: '重要不紧急',        // 紧急重要/重要不紧急/紧急不重要/不紧急不重要
    dueDate: '2025-01-15',       // 可选
    relatedGoalId: 'GOAL_PAGE_ID' // 可选，关联的目标ID
  }
}
```

**返回值**:
```javascript
{
  success: true,
  todoId: 'NOTION_PAGE_ID',
  message: '待办事项创建成功'
}
```

---

### 2. 更新待办

**Action**: `updateTodo`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  todoId: 'TODO_PAGE_ID',
  updates: {
    status: '已完成',        // 待办/进行中/已完成/已取消/延期
    isCompleted: true       // 布尔值
  }
}
```

---

### 3. 获取待办列表

**Action**: `getTodos`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  filter: 'pending'  // all/pending/completed
}
```

**返回值**:
```javascript
{
  success: true,
  todos: [
    // Notion API返回的页面数据数组
  ]
}
```

**示例 - 获取未完成的待办**:
```javascript
const result = await apiService.callCloudFunction('getTodos', {
  userId: userId,
  apiKey: apiKey,
  filter: 'pending'
})

console.log(`待办事项数：${result.todos.length}`)
```

---

### 4. 删除待办

**Action**: `deleteTodo`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  todoId: 'TODO_PAGE_ID'
}
```

---

## 关联关系管理

### 1. 将待办关联到目标

**Action**: `linkTodoToGoal`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  todoId: 'TODO_PAGE_ID',
  goalId: 'GOAL_PAGE_ID'
}
```

**返回值**:
```javascript
{
  success: true,
  message: '待办已关联到目标'
}
```

**示例**:
```javascript
// 将"读完《原则》"关联到"2025年读完24本书"目标
await apiService.callCloudFunction('linkTodoToGoal', {
  userId: userId,
  apiKey: apiKey,
  todoId: '待办页面ID',
  goalId: '目标页面ID'
})
```

---

### 2. 将活动关联到待办

**Action**: `linkActivityToTodo`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  activityId: 'ACTIVITY_PAGE_ID',
  todoId: 'TODO_PAGE_ID'
}
```

---

### 3. 将活动关联到目标

**Action**: `linkActivityToGoal`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  activityId: 'ACTIVITY_PAGE_ID',
  goalId: 'GOAL_PAGE_ID'
}
```

---

### 4. 将活动关联到主记录

**Action**: `linkActivityToMainRecord`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  activityId: 'ACTIVITY_PAGE_ID',
  mainRecordId: 'RECORD_PAGE_ID'
}
```

---

## 统计分析

### 1. 获取目标统计

**Action**: `getGoalStatistics`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...'
}
```

**返回值**:
```javascript
{
  success: true,
  statistics: {
    total: 10,                      // 总目标数
    byStatus: {
      notStarted: 2,
      inProgress: 5,
      completed: 2,
      paused: 1,
      cancelled: 0
    },
    byCategory: {
      '年度目标': 3,
      '月度目标': 5,
      '周目标': 2
    },
    byPriority: {
      high: 4,
      medium: 5,
      low: 1
    },
    averageProgress: 0.35,          // 平均进度 (0-1)
    completionRate: 0.20            // 完成率 (0-1)
  }
}
```

**示例**:
```javascript
const stats = await apiService.callCloudFunction('getGoalStatistics', {
  userId: userId,
  apiKey: apiKey
})

console.log(`目标总数：${stats.statistics.total}`)
console.log(`进行中：${stats.statistics.byStatus.inProgress}`)
console.log(`平均进度：${(stats.statistics.averageProgress * 100).toFixed(0)}%`)
```

---

### 2. 获取待办统计

**Action**: `getTodoStatistics`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...'
}
```

**返回值**:
```javascript
{
  success: true,
  statistics: {
    total: 25,
    byStatus: {
      pending: 10,
      inProgress: 5,
      completed: 8,
      cancelled: 2,
      delayed: 0
    },
    byType: {
      goalOriented: 15,      // 目标导向
      adHoc: 8,              // 临时待办
      habit: 2,              // 习惯养成
      urgent: 0              // 紧急处理
    },
    byPriority: {
      urgentImportant: 3,
      importantNotUrgent: 12,
      urgentNotImportant: 5,
      notUrgentNotImportant: 5
    },
    completionRate: 0.32,    // 完成率
    overdueCount: 2          // 过期待办数
  }
}
```

---

### 3. 按目标统计时间投入

**Action**: `getTimeInvestmentByGoal`

**参数**:
```javascript
{
  userId: 'USER_ID',
  apiKey: 'ntn_...',
  goalId: 'GOAL_PAGE_ID'  // 可选，不传则统计所有活动
}
```

**返回值**:
```javascript
{
  success: true,
  timeInvestment: {
    totalMinutes: 360,          // 总分钟数
    totalHours: 6,              // 总小时数
    activityCount: 12,          // 活动数量
    byType: {
      '学习': 240,
      '工作': 90,
      '运动': 30
    }
  }
}
```

**示例 - 统计某个目标的时间投入**:
```javascript
const result = await apiService.callCloudFunction('getTimeInvestmentByGoal', {
  userId: userId,
  apiKey: apiKey,
  goalId: '读书目标ID'
})

console.log(`总投入时间：${result.timeInvestment.totalHours}小时`)
console.log(`活动次数：${result.timeInvestment.activityCount}次`)
```

---

## 完整使用示例

### 场景：创建一个完整的目标追踪流程

```javascript
const apiService = require('./utils/apiService.js')

async function createGoalTrackingWorkflow() {
  const userId = wx.getStorageSync('userId')
  const apiKey = wx.getStorageSync('notionApiKey')

  try {
    // 1. 创建目标
    const goalResult = await apiService.callCloudFunction('createGoal', {
      userId,
      apiKey,
      goalData: {
        title: '2025年读完24本书',
        description: '系统性提升知识储备',
        category: '年度目标',
        type: '学习',
        priority: '高'
      }
    })

    const goalId = goalResult.goalId
    console.log('✅ 目标创建成功:', goalId)

    // 2. 创建待办事项并关联到目标
    const todoResult = await apiService.callCloudFunction('createTodo', {
      userId,
      apiKey,
      todoData: {
        title: '读完《原则》',
        todoType: '目标导向',
        priority: '重要不紧急',
        dueDate: '2025-01-31',
        relatedGoalId: goalId
      }
    })

    const todoId = todoResult.todoId
    console.log('✅ 待办创建成功:', todoId)

    // 3. 记录每日阅读活动
    const activityResult = await apiService.callCloudFunction('createActivity', {
      userId,
      apiKey,
      activityData: {
        name: '阅读《原则》第3章',
        activityType: '学习',
        duration: 30,
        contributionType: '推进目标',
        valueRating: '高价值',
        relatedGoalId: goalId,
        relatedTodoId: todoId
      }
    })

    console.log('✅ 活动记录成功:', activityResult.activityId)

    // 4. 更新目标进度
    await apiService.callCloudFunction('updateGoal', {
      userId,
      apiKey,
      goalId,
      updates: {
        progress: 10,  // 完成10%
        status: '进行中'
      }
    })

    console.log('✅ 目标进度已更新')

    // 5. 查看统计
    const stats = await apiService.callCloudFunction('getTimeInvestmentByGoal', {
      userId,
      apiKey,
      goalId
    })

    console.log(`📊 目标时间投入：${stats.timeInvestment.totalHours}小时`)

    wx.showToast({
      title: '目标追踪流程创建成功',
      icon: 'success'
    })

  } catch (error) {
    console.error('❌ 创建失败:', error)
    wx.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    })
  }
}
```

---

## 注意事项

1. **用户认证**
   - 所有API调用都需要 `userId` 和 `apiKey`
   - 建议从本地存储获取：`wx.getStorageSync('userId')` 和 `wx.getStorageSync('notionApiKey')`

2. **错误处理**
   - 所有API调用都应使用 `try-catch` 包裹
   - 检查返回的 `success` 字段判断是否成功

3. **Notion API限制**
   - Notion API有频率限制（每秒3次请求）
   - 批量操作时建议添加延迟

4. **数据格式**
   - 日期格式：`YYYY-MM-DD` (如: `2025-01-09`)
   - 时间格式：ISO 8601 (如: `2025-01-09T10:30:00`)
   - 进度：0-100的整数

5. **关联关系**
   - 创建待办时可以直接关联目标：`relatedGoalId`
   - 也可以后续使用 `linkTodoToGoal` 建立关联
   - 活动可以同时关联目标、待办、主记录

---

**文档版本**: v1.0
**更新日期**: 2025-01-09
**项目**: 语寄心声微信小程序
