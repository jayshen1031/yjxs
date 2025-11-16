/**
 * Notion 八数据库架构初始化服务（老版本Schema - 兼容 jayshen1031）
 *
 * 主要字段差异：
 * - Main Records: Name（非Title）, Summary（非Content）, Record Date（非Date）, Type（非Record Type）
 * - Todos: Todo Name（非Title）
 * - Activity Details: Record（非Related Main Record）
 * - Goals: 保持Goal Name不变
 */

/**
 * 目标库（Goals Database）数据库结构
 */
const GoalsDatabaseSchema = {
  title: '🎯 语寄心声 - 目标库 (Goals)',
  description: '管理人生目标、年度目标、阶段目标',
  properties: {
    // === 基础信息 ===
    'Goal Name': {
      title: {},
    },
    'Description': {
      rich_text: {},
    },

    // === 目标分类 ===
    'Category': {
      select: {
        options: [
          { name: '人生目标 (Life Goal)', color: 'red' },
          { name: '年度目标 (Yearly Goal)', color: 'orange' },
          { name: '季度目标 (Quarterly Goal)', color: 'yellow' },
          { name: '月度目标 (Monthly Goal)', color: 'green' },
          { name: '周目标 (Weekly Goal)', color: 'blue' }
        ]
      }
    },
    'Type': {
      select: {
        options: [
          { name: '事业', color: 'blue' },
          { name: '健康', color: 'green' },
          { name: '财务', color: 'yellow' },
          { name: '学习', color: 'purple' },
          { name: '人际', color: 'pink' },
          { name: '兴趣', color: 'orange' },
          { name: '家庭', color: 'red' }
        ]
      }
    },

    // === 时间管理 ===
    'Start Date': {
      date: {},
    },
    'Target Date': {
      date: {},
    },
    'Actual Completion Date': {
      date: {},
    },

    // === 状态管理 ===
    'Status': {
      select: {
        options: [
          { name: '未开始', color: 'gray' },
          { name: '进行中', color: 'blue' },
          { name: '已完成', color: 'green' },
          { name: '已暂停', color: 'yellow' },
          { name: '已取消', color: 'red' }
        ]
      }
    },
    'Progress': {
      number: {
        format: 'percent'
      }
    },

    // === 优先级 ===
    'Priority': {
      select: {
        options: [
          { name: '高', color: 'red' },
          { name: '中', color: 'yellow' },
          { name: '低', color: 'gray' }
        ]
      }
    },
    'Importance': {
      select: {
        options: [
          { name: '核心', color: 'red' },
          { name: '重要', color: 'yellow' },
          { name: '辅助', color: 'gray' }
        ]
      }
    },

    // === 元数据 ===
    'User ID': {
      rich_text: {},
    },
    'Tags': {
      multi_select: {
        options: []
      }
    },
    'Notes': {
      rich_text: {},
    }
  }
}

/**
 * 待办事项库（Todos Database）数据库结构 - 使用老字段名
 */
const TodosDatabaseSchema = {
  title: '✅ 语寄心声 - 待办事项库 (Todos)',
  description: '管理目标导向待办和临时待办',
  properties: {
    // === 基础信息 ===
    'Todo Name': {  // ⚠️ 老字段名（非Title）
      title: {},
    },
    'Description': {
      rich_text: {},
    },

    // === 待办类型 ===
    'Todo Type': {
      select: {
        options: [
          { name: '目标导向 (Goal-oriented)', color: 'blue' },
          { name: '临时待办 (Ad-hoc)', color: 'gray' },
          { name: '习惯养成 (Habit)', color: 'green' },
          { name: '紧急处理 (Urgent)', color: 'red' }
        ]
      }
    },
    'Category': {
      select: {
        options: [
          { name: '工作', color: 'blue' },
          { name: '学习', color: 'purple' },
          { name: '生活', color: 'green' },
          { name: '健康', color: 'red' },
          { name: '社交', color: 'pink' },
          { name: '杂事', color: 'gray' }
        ]
      }
    },

    // === 时间管理 ===
    'Due Date': {
      date: {},
    },
    'Planned Date': {
      date: {},
    },

    // === 优先级（四象限法则）===
    'Priority': {
      select: {
        options: [
          { name: '紧急重要', color: 'red' },
          { name: '重要不紧急', color: 'yellow' },
          { name: '紧急不重要', color: 'blue' },
          { name: '不紧急不重要', color: 'gray' }
        ]
      }
    },

    // === 状态管理 ===
    'Status': {
      select: {
        options: [
          { name: '待办', color: 'gray' },
          { name: '进行中', color: 'blue' },
          { name: '已完成', color: 'green' },
          { name: '已取消', color: 'red' },
          { name: '延期', color: 'yellow' },
          { name: '已删除', color: 'default' }
        ]
      }
    },
    'Is Completed': {
      checkbox: {},
    },

    // === 元数据 ===
    'User ID': {
      rich_text: {},
    },
    'Tags': {
      multi_select: {
        options: []
      }
    }
  }
}

/**
 * 主记录表（Main Records Database）数据库结构 - 使用老字段名
 */
const MainRecordsDatabaseSchema = {
  title: '📝 语寄心声 - 主记录表 (Main Records)',
  description: '每日记录汇总',
  properties: {
    // === 基础信息 ===
    'Name': {  // ⚠️ 老字段名（非Title）
      title: {},
    },
    'Summary': {  // ⚠️ 老字段名（非Content）
      rich_text: {},
    },
    'Record Date': {  // ⚠️ 老字段名（非Date）
      date: {},
    },

    // === 记录类型 ===
    'Type': {  // ⚠️ 老字段名（非Record Type）
      select: {
        options: [
          { name: '日常记录', color: 'blue' },
          { name: '次日规划', color: 'orange' }
        ]
      }
    },

    // === 时间段 ===
    'Start Time': {
      rich_text: {},
    },
    'End Time': {
      rich_text: {},
    },

    // === 规划标记 ===
    'Is Planning': {
      checkbox: {},
    },

    // === 同步状态 ===
    'Sync Status': {
      select: {
        options: [
          { name: '未同步', color: 'gray' },
          { name: '已同步', color: 'green' }
        ]
      }
    },

    // === 元数据 ===
    'User ID': {
      rich_text: {},
    },
    'Tags': {
      multi_select: {
        options: []
      }
    }
  }
}

/**
 * 活动明细表（Activity Details Database）数据库结构 - 使用老字段名
 */
const ActivityDetailsDatabaseSchema = {
  title: '⏱️ 语寄心声 - 活动明细表 (Activity Details)',
  description: '记录每个活动的详细信息',
  properties: {
    // === 基础信息 ===
    'Name': {
      title: {},
    },
    'Description': {
      rich_text: {},
    },

    // === 时间信息 ===
    'Start Time': {
      date: {},
    },
    'End Time': {
      date: {},
    },
    'Duration': {
      number: {
        format: 'number'
      }
    },

    // === 活动类型 ===
    'Activity Type': {
      select: {
        options: [
          { name: '工作', color: 'blue' },
          { name: '学习', color: 'purple' },
          { name: '运动', color: 'red' },
          { name: '休息', color: 'green' },
          { name: '社交', color: 'pink' },
          { name: '娱乐', color: 'yellow' },
          { name: '其他', color: 'gray' }
        ]
      }
    },

    // === 元数据 ===
    'User ID': {
      rich_text: {},
    },
    'Tags': {
      multi_select: {
        options: []
      }
    }
  }
}

/**
 * 每日状态库（Daily Status Database）数据库结构
 */
const DailyStatusDatabaseSchema = {
  title: '📊 语寄心声 - 每日状态库 (Daily Status)',
  description: '追踪每日健康和生活习惯',
  properties: {
    'Date': {
      title: {},
    },
    'Sleep Hours': {
      number: {
        format: 'number'
      }
    },
    'Exercise Minutes': {
      number: {
        format: 'number'
      }
    },
    'Water Intake': {
      number: {
        format: 'number'
      }
    },
    'Mood': {
      select: {
        options: [
          { name: '😄 很好', color: 'green' },
          { name: '🙂 好', color: 'blue' },
          { name: '😐 一般', color: 'yellow' },
          { name: '😔 不好', color: 'red' }
        ]
      }
    },
    'Energy Level': {
      select: {
        options: [
          { name: '高', color: 'green' },
          { name: '中', color: 'yellow' },
          { name: '低', color: 'red' }
        ]
      }
    },
    'User ID': {
      rich_text: {},
    }
  }
}

/**
 * 开心库（Happy Things Database）数据库结构
 */
const HappyThingsDatabaseSchema = {
  title: '😊 语寄心声 - 开心库 (Happy Things)',
  description: '记录生活中的美好瞬间',
  properties: {
    'Title': {
      title: {},
    },
    'Description': {
      rich_text: {},
    },
    'Date': {
      date: {},
    },
    'Category': {
      select: {
        options: [
          { name: '成就', color: 'green' },
          { name: '惊喜', color: 'yellow' },
          { name: '感动', color: 'red' },
          { name: '有趣', color: 'blue' },
          { name: '其他', color: 'gray' }
        ]
      }
    },
    'Happiness Level': {
      select: {
        options: [
          { name: '⭐️', color: 'gray' },
          { name: '⭐️⭐️', color: 'blue' },
          { name: '⭐️⭐️⭐️', color: 'green' },
          { name: '⭐️⭐️⭐️⭐️', color: 'yellow' },
          { name: '⭐️⭐️⭐️⭐️⭐️', color: 'red' }
        ]
      }
    },
    'User ID': {
      rich_text: {},
    },
    'Tags': {
      multi_select: {
        options: []
      }
    }
  }
}

/**
 * 箴言库（Quotes Database）数据库结构
 */
const QuotesDatabaseSchema = {
  title: '💬 语寄心声 - 箴言库 (Quotes)',
  description: '收集激励人心的箴言',
  properties: {
    'Quote': {
      title: {},
    },
    'Source': {
      rich_text: {},
    },
    'Category': {
      select: {
        options: [
          { name: '励志', color: 'red' },
          { name: '智慧', color: 'blue' },
          { name: '爱情', color: 'pink' },
          { name: '人生', color: 'purple' },
          { name: '其他', color: 'gray' }
        ]
      }
    },
    'Status': {
      select: {
        options: [
          { name: '启用', color: 'green' },
          { name: '禁用', color: 'gray' }
        ]
      }
    },
    'User ID': {
      rich_text: {},
    },
    'Tags': {
      multi_select: {
        options: []
      }
    }
  }
}

/**
 * 知识库（Knowledge Database）数据库结构
 */
const KnowledgeDatabaseSchema = {
  title: '📚 语寄心声 - 知识库 (Knowledge)',
  description: '知识管理和学习笔记',
  properties: {
    'Title': {
      title: {},
    },
    'Content': {
      rich_text: {},
    },
    'Category': {
      select: {
        options: [
          { name: '技术', color: 'blue' },
          { name: '管理', color: 'purple' },
          { name: '生活', color: 'green' },
          { name: '其他', color: 'gray' }
        ]
      }
    },
    'Status': {
      select: {
        options: [
          { name: '草稿', color: 'gray' },
          { name: '已发布', color: 'green' }
        ]
      }
    },
    'User ID': {
      rich_text: {},
    },
    'Tags': {
      multi_select: {
        options: []
      }
    },
    'Created Date': {
      created_time: {},
    },
    'Last Edited': {
      last_edited_time: {},
    }
  }
}

/**
 * 导出方法：获取各数据库的Schema
 */
module.exports = {
  // 直接导出Schema对象
  GoalsDatabaseSchema,
  TodosDatabaseSchema,
  MainRecordsDatabaseSchema,
  ActivityDetailsDatabaseSchema,
  DailyStatusDatabaseSchema,
  HappyThingsDatabaseSchema,
  QuotesDatabaseSchema,
  KnowledgeDatabaseSchema,

  // 获取各数据库Schema
  getGoalsDatabaseSchema: function() {
    return GoalsDatabaseSchema.properties
  },
  getTodosDatabaseSchema: function() {
    return TodosDatabaseSchema.properties
  },
  getMainRecordsDatabaseSchema: function() {
    return MainRecordsDatabaseSchema.properties
  },
  getActivityDetailsDatabaseSchema: function() {
    return ActivityDetailsDatabaseSchema.properties
  },
  getDailyStatusDatabaseSchema: function() {
    return DailyStatusDatabaseSchema.properties
  },
  getHappyThingsDatabaseSchema: function() {
    return HappyThingsDatabaseSchema.properties
  },
  getQuotesDatabaseSchema: function() {
    return QuotesDatabaseSchema.properties
  },
  getKnowledgeDatabaseSchema: function() {
    return KnowledgeDatabaseSchema.properties
  },

  // 获取完整的数据库定义
  getGoalsDatabase: function() {
    return GoalsDatabaseSchema
  },
  getTodosDatabase: function() {
    return TodosDatabaseSchema
  },
  getMainRecordsDatabase: function() {
    return MainRecordsDatabaseSchema
  },
  getActivityDetailsDatabase: function() {
    return ActivityDetailsDatabaseSchema
  },
  getDailyStatusDatabase: function() {
    return DailyStatusDatabaseSchema
  },
  getHappyThingsDatabase: function() {
    return HappyThingsDatabaseSchema
  },
  getQuotesDatabase: function() {
    return QuotesDatabaseSchema
  },
  getKnowledgeDatabase: function() {
    return KnowledgeDatabaseSchema
  }
}
