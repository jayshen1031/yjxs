/**
 * Notion 五数据库架构初始化服务
 *
 * 五数据库架构：
 * 1. Goals（目标库）- 人生目标、阶段目标管理
 * 2. Todos（待办事项库）- 目标导向和临时待办管理
 * 3. Main Records（主记录表）- 每日记录汇总
 * 4. Activity Details（活动明细表）- 每个活动的时间投入
 * 5. Daily Status（每日状态库）- 健康和生活习惯追踪
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

    // === 量化目标 ===
    'Is Quantifiable': {
      checkbox: {},
    },
    'Target Value': {
      number: {},
    },
    'Current Value': {
      number: {},
    },
    'Unit': {
      rich_text: {},
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

    // === 关联关系 ===
    'Sub Goals': {
      relation: {
        database_id: '', // 将在创建后设置
        type: 'dual_property',
        dual_property: {
          synced_property_name: 'Parent Goal'
        }
      }
    },
    'Parent Goal': {
      relation: {
        database_id: '', // 将在创建后设置
        type: 'dual_property',
        dual_property: {
          synced_property_name: 'Sub Goals'
        }
      }
    },
    'Related Todos': {
      relation: {
        database_id: '', // 指向Todos数据库
        type: 'dual_property',
        dual_property: {
          synced_property_name: 'Related Goal'
        }
      }
    },
    'Related Activities': {
      relation: {
        database_id: '', // 指向Activity Details数据库
      }
    },

    // === 统计信息 ===
    'Total Time Invested': {
      rollup: {
        relation_property_name: 'Related Activities',
        rollup_property_name: 'Duration',
        function: 'sum'
      }
    },
    'Completed Todos': {
      rollup: {
        relation_property_name: 'Related Todos',
        rollup_property_name: 'Is Completed',
        function: 'checked'
      }
    },
    'Total Todos': {
      rollup: {
        relation_property_name: 'Related Todos',
        rollup_property_name: 'Is Completed',
        function: 'count'
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
 * 待办事项库（Todos Database）数据库结构
 */
const TodosDatabaseSchema = {
  title: '✅ 语寄心声 - 待办事项库 (Todos)',
  description: '管理目标导向待办和临时待办',
  properties: {
    // === 基础信息 ===
    'Title': {
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
    'Start Time': {
      rich_text: {},
    },
    'Estimated Duration': {
      number: {
        format: 'number'
      }
    },
    'Actual Duration': {
      rollup: {
        relation_property_name: 'Related Activities',
        rollup_property_name: 'Duration',
        function: 'sum'
      }
    },

    // === 优先级（四象限法则） ===
    'Priority': {
      select: {
        options: [
          { name: '紧急重要', color: 'red' },
          { name: '重要不紧急', color: 'orange' },
          { name: '紧急不重要', color: 'yellow' },
          { name: '不紧急不重要', color: 'gray' }
        ]
      }
    },
    'Energy Level': {
      select: {
        options: [
          { name: '高精力', color: 'red' },
          { name: '中精力', color: 'yellow' },
          { name: '低精力', color: 'gray' }
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
          { name: '延期', color: 'yellow' }
        ]
      }
    },
    'Is Completed': {
      checkbox: {},
    },
    'Completion Progress': {
      number: {
        format: 'percent'
      }
    },

    // === 关联关系 ===
    'Related Goal': {
      relation: {
        database_id: '', // 指向Goals数据库
        type: 'dual_property',
        dual_property: {
          synced_property_name: 'Related Todos'
        }
      }
    },
    'Related Activities': {
      relation: {
        database_id: '', // 指向Activity Details数据库
      }
    },
    'Related Main Records': {
      relation: {
        database_id: '', // 指向Main Records数据库
      }
    },
    'Blocking Todos': {
      relation: {
        database_id: '', // 自关联
        type: 'dual_property',
        dual_property: {
          synced_property_name: 'Blocked By'
        }
      }
    },
    'Blocked By': {
      relation: {
        database_id: '', // 自关联
        type: 'dual_property',
        dual_property: {
          synced_property_name: 'Blocking Todos'
        }
      }
    },

    // === 重复任务 ===
    'Recurrence': {
      select: {
        options: [
          { name: '无', color: 'gray' },
          { name: '每日', color: 'blue' },
          { name: '每周', color: 'green' },
          { name: '每月', color: 'yellow' },
          { name: '自定义', color: 'purple' }
        ]
      }
    },
    'Reminder': {
      checkbox: {},
    },
    'Reminder Time': {
      date: {},
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
    'Difficulty': {
      select: {
        options: [
          { name: '简单', color: 'green' },
          { name: '中等', color: 'yellow' },
          { name: '困难', color: 'red' }
        ]
      }
    }
  }
}

/**
 * 主记录表（Main Records Database）数据库结构
 */
const MainRecordsDatabaseSchema = {
  title: '📝 语寄心声 - 主记录表 (Main Records)',
  description: '每日记录汇总',
  properties: {
    // === 基础信息 ===
    'Title': {
      title: {},
    },
    'Content': {
      rich_text: {},
    },
    'Date': {
      date: {},
    },

    // === 记录类型 ===
    'Record Type': {
      select: {
        options: [
          { name: '日常记录', color: 'blue' },
          { name: '明日规划', color: 'orange' },
          { name: '每日总结', color: 'purple' },
          { name: '灵感记录', color: 'yellow' }
        ]
      }
    },

    // === 时间段 ===
    'Time Period': {
      select: {
        options: [
          { name: '早晨', color: 'orange' },
          { name: '上午', color: 'yellow' },
          { name: '中午', color: 'red' },
          { name: '下午', color: 'blue' },
          { name: '晚上', color: 'purple' },
          { name: '规划', color: 'green' }
        ]
      }
    },
    'Start Time': {
      rich_text: {},  // 开始时间，格式：HH:MM
    },
    'End Time': {
      rich_text: {},  // 结束时间，格式：HH:MM
    },

    // === 价值分类 ===
    'Valuable Activities': {
      rich_text: {},
    },
    'Neutral Activities': {
      rich_text: {},
    },
    'Wasteful Activities': {
      rich_text: {},
    },
    'Value Score': {
      number: {
        format: 'number'
      }
    },

    // === 关联关系 ===
    'Related Activities': {
      relation: {
        database_id: '', // 指向Activity Details数据库
      }
    },
    'Related Todos': {
      relation: {
        database_id: '', // 指向Todos数据库
      }
    },

    // === 统计信息 ===
    'Total Time': {
      rollup: {
        relation_property_name: 'Related Activities',
        rollup_property_name: 'Duration',
        function: 'sum'
      }
    },
    'Activity Count': {
      rollup: {
        relation_property_name: 'Related Activities',
        rollup_property_name: 'Name',
        function: 'count'
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
    'Mood': {
      select: {
        options: [
          { name: '😊 开心', color: 'green' },
          { name: '😌 平静', color: 'blue' },
          { name: '😕 迷茫', color: 'gray' },
          { name: '😔 沮丧', color: 'red' },
          { name: '💪 充满动力', color: 'orange' }
        ]
      }
    }
  }
}

/**
 * 活动明细表（Activity Details Database）数据库结构
 */
const ActivityDetailsDatabaseSchema = {
  title: '⏱️ 语寄心声 - 活动明细表 (Activity Details)',
  description: '记录每个活动的时间投入',
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
      rich_text: {},  // 开始时间，格式：HH:MM（继承主记录）
    },
    'End Time': {
      rich_text: {},  // 结束时间，格式：HH:MM（继承主记录）
    },
    'Duration': {
      number: {
        format: 'number'
      }
    },

    // === 活动分类 ===
    'Activity Type': {
      select: {
        options: [
          { name: '工作', color: 'blue' },
          { name: '学习', color: 'purple' },
          { name: '运动', color: 'red' },
          { name: '休息', color: 'green' },
          { name: '社交', color: 'pink' },
          { name: '娱乐', color: 'yellow' },
          { name: '杂事', color: 'gray' }
        ]
      }
    },

    // === 贡献类型 ===
    'Contribution Type': {
      select: {
        options: [
          { name: '完成待办 (Complete Todo)', color: 'green' },
          { name: '推进目标 (Advance Goal)', color: 'blue' },
          { name: '学习提升 (Learning)', color: 'purple' },
          { name: '休息恢复 (Rest)', color: 'yellow' }
        ]
      }
    },

    // === 价值评估 ===
    'Value Rating': {
      select: {
        options: [
          { name: '高价值', color: 'green' },
          { name: '中等价值', color: 'yellow' },
          { name: '低价值', color: 'red' }
        ]
      }
    },

    // === 关联关系 ===
    'Related Goal': {
      relation: {
        database_id: '', // 指向Goals数据库
      }
    },
    'Related Todo': {
      relation: {
        database_id: '', // 指向Todos数据库
      }
    },
    'Related Main Record': {
      relation: {
        database_id: '', // 指向Main Records数据库
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
 * 每日状态库（Daily Status Database）数据库结构
 * 独立追踪健康和生活习惯，不与其他数据库关联
 */
const DailyStatusDatabaseSchema = {
  title: '📊 语寄心声 - 每日状态库 (Daily Status)',
  description: '追踪每日健康状态、生活习惯和身体数据',
  properties: {
    // === 基础信息 ===
    'Date': {
      title: {},  // 日期作为标题，格式：2025-01-08
    },
    'Full Date': {
      date: {},  // 完整日期字段
    },

    // === 心情和能量 ===
    'Mood': {
      select: {
        options: [
          { name: '😊 开心', color: 'green' },
          { name: '💪 充满动力', color: 'blue' },
          { name: '😌 平静', color: 'default' },
          { name: '😕 迷茫', color: 'gray' },
          { name: '😔 沮丧', color: 'brown' },
          { name: '😰 焦虑', color: 'orange' },
          { name: '😴 疲惫', color: 'yellow' },
          { name: '😤 压力大', color: 'red' },
          { name: '😞 失落', color: 'purple' },
          { name: '🤔 困惑', color: 'pink' },
          { name: '😐 无聊', color: 'gray' },
          { name: '🥰 感恩', color: 'green' }
        ]
      }
    },
    'Energy Level': {
      select: {
        options: [
          { name: '🔋 充沛', color: 'green' },
          { name: '⚡ 良好', color: 'blue' },
          { name: '🔌 一般', color: 'yellow' },
          { name: '🪫 疲惫', color: 'orange' },
          { name: '💤 耗尽', color: 'red' }
        ]
      }
    },
    'Stress Level': {
      select: {
        options: [
          { name: '😌 无压力', color: 'green' },
          { name: '🙂 轻微', color: 'blue' },
          { name: '😐 中等', color: 'yellow' },
          { name: '😰 较高', color: 'orange' },
          { name: '😫 非常高', color: 'red' }
        ]
      }
    },

    // === 睡眠数据 ===
    'Wake Up Time': {
      rich_text: {},  // 格式：07:00
    },
    'Bed Time': {
      rich_text: {},  // 格式：23:00
    },
    'Sleep Hours': {
      number: {
        format: 'number'
      }
    },
    'Sleep Quality': {
      select: {
        options: [
          { name: '😴 很好', color: 'green' },
          { name: '🙂 良好', color: 'blue' },
          { name: '😐 一般', color: 'yellow' },
          { name: '😕 较差', color: 'orange' },
          { name: '😣 很差', color: 'red' }
        ]
      }
    },

    // === 身体数据 ===
    'Weight': {
      number: {
        format: 'number'
      }
    },
    'Water Intake': {
      number: {
        format: 'number'  // 单位：毫升
      }
    },

    // === 运动数据 ===
    'Exercise Duration': {
      number: {
        format: 'number'  // 单位：分钟
      }
    },
    'Exercise Type': {
      multi_select: {
        options: [
          { name: '🏃 跑步', color: 'blue' },
          { name: '🚴 骑行', color: 'green' },
          { name: '🏊 游泳', color: 'purple' },
          { name: '🏋️ 力量训练', color: 'red' },
          { name: '🧘 瑜伽', color: 'pink' },
          { name: '🚶 散步', color: 'default' },
          { name: '⚽ 球类运动', color: 'orange' },
          { name: '🕺 舞蹈', color: 'yellow' },
          { name: '🧗 攀岩', color: 'brown' },
          { name: '🤸 其他', color: 'gray' }
        ]
      }
    },

    // === 饮食数据 ===
    'Meals': {
      multi_select: {
        options: [
          { name: '🌅 早餐', color: 'yellow' },
          { name: '☀️ 午餐', color: 'orange' },
          { name: '🌙 晚餐', color: 'purple' },
          { name: '🍎 加餐', color: 'green' }
        ]
      }
    },
    'Diet Notes': {
      rich_text: {},  // 饮食备注
    },

    // === 其他习惯 ===
    'Meditation': {
      checkbox: {},  // 是否冥想
    },
    'Meditation Duration': {
      number: {
        format: 'number'  // 冥想时长（分钟）
      }
    },
    'Reading': {
      checkbox: {},  // 是否阅读
    },
    'Reading Duration': {
      number: {
        format: 'number'  // 阅读时长（分钟）
      }
    },

    // === 备注 ===
    'Notes': {
      rich_text: {},
    },
    'Highlights': {
      rich_text: {},  // 今日亮点
    },

    // === 元数据 ===
    'User ID': {
      rich_text: {},
    },
    'Created Time': {
      created_time: {},
    },
    'Last Edited Time': {
      last_edited_time: {},
    }
  }
}

/**
 * 开心库（Happy Things Database）数据库结构
 * 管理和推荐开心的事情
 */
const HappyThingsDatabaseSchema = {
  title: '😊 语寄心声 - 开心库 (Happy Things)',
  description: '管理和推荐开心的事情，让每一天更美好',
  properties: {
    // === 基础信息 ===
    'Title': {
      title: {},
    },
    'Content': {
      rich_text: {},
    },

    // === 分类和属性 ===
    'Category': {
      select: {
        options: [
          { name: '运动', color: 'red' },
          { name: '美食', color: 'orange' },
          { name: '社交', color: 'yellow' },
          { name: '娱乐', color: 'green' },
          { name: '学习', color: 'blue' },
          { name: '创造', color: 'purple' },
          { name: '自然', color: 'pink' },
          { name: '放松', color: 'brown' },
          { name: '生活', color: 'gray' }
        ]
      }
    },
    'Emoji': {
      rich_text: {},
    },
    'Energy Level': {
      select: {
        options: [
          { name: '轻松', color: 'green' },
          { name: '适中', color: 'yellow' },
          { name: '需精力', color: 'red' }
        ]
      }
    },

    // === 时间和难度 ===
    'Duration': {
      number: {
        format: 'number'
      }
    },
    'Difficulty': {
      select: {
        options: [
          { name: '简单', color: 'green' },
          { name: '中等', color: 'yellow' },
          { name: '困难', color: 'red' }
        ]
      }
    },
    'Cost': {
      select: {
        options: [
          { name: '免费', color: 'green' },
          { name: '低成本', color: 'blue' },
          { name: '中成本', color: 'yellow' },
          { name: '高成本', color: 'red' }
        ]
      }
    },

    // === 状态和统计 ===
    'Is Active': {
      checkbox: {},
    },
    'Usage Count': {
      number: {
        format: 'number'
      }
    },
    'Last Used': {
      date: {},
    },

    // === 用户和标签 ===
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
 * 箴言库（Quotes Database）数据库结构
 */
const QuotesDatabaseSchema = {
  title: '💬 语寄心声 - 箴言库 (Quotes)',
  description: '管理每日箴言、励志语录、人生格言',
  properties: {
    // === 基础信息 ===
    'Quote': {
      title: {},  // 箴言内容（主要字段）
    },
    'Author': {
      rich_text: {},  // 作者/来源（可选）
    },
    'Source': {
      rich_text: {},  // 出处（书籍、电影、演讲等）
    },

    // === 分类标签 ===
    'Category': {
      select: {
        options: [
          { name: '励志', color: 'red' },
          { name: '人生', color: 'orange' },
          { name: '成长', color: 'yellow' },
          { name: '时间', color: 'green' },
          { name: '坚持', color: 'blue' },
          { name: '记录', color: 'purple' },
          { name: '感悟', color: 'pink' },
          { name: '习惯', color: 'brown' },
          { name: '梦想', color: 'gray' }
        ]
      }
    },

    'Tags': {
      multi_select: {
        options: [
          { name: '正能量', color: 'red' },
          { name: '深度思考', color: 'blue' },
          { name: '轻松', color: 'green' },
          { name: '哲理', color: 'purple' },
          { name: '实用', color: 'yellow' },
          { name: '情感', color: 'pink' }
        ]
      }
    },

    // === 使用状态 ===
    'Status': {
      select: {
        options: [
          { name: '启用', color: 'green' },
          { name: '禁用', color: 'gray' },
          { name: '收藏', color: 'red' }
        ]
      }
    },

    'Is System Default': {
      checkbox: {}  // 是否为系统默认箴言
    },

    // === 统计信息 ===
    'Display Count': {
      number: {
        format: 'number'
      }
    },

    'Last Displayed Date': {
      date: {}
    },

    'Created Date': {
      date: {}
    },

    // === 用户信息 ===
    'User ID': {
      rich_text: {},
    },

    // === 备注 ===
    'Notes': {
      rich_text: {},
    }
  }
}

/**
 * 知识库（Knowledge Database）数据库结构
 */
const KnowledgeDatabaseSchema = {
  title: '📚 语寄心声 - 知识库 (Knowledge)',
  description: '知识管理和学习笔记库',
  properties: {
    // === 基础信息 ===
    'Title': {
      title: {},
    },
    'Content': {
      rich_text: {},
    },
    'Preview': {
      rich_text: {},
    },
    'Markdown Content': {
      rich_text: {},
    },

    // === 分类和组织 ===
    'Category': {
      select: {
        options: [
          { name: '技术', color: 'blue' },
          { name: '产品', color: 'purple' },
          { name: '管理', color: 'orange' },
          { name: '生活', color: 'green' },
          { name: '学习', color: 'yellow' },
          { name: '思考', color: 'pink' },
          { name: '其他', color: 'gray' }
        ]
      }
    },
    'Tags': {
      multi_select: {
        options: []
      }
    },
    'Source': {
      select: {
        options: [
          { name: '书籍', color: 'blue' },
          { name: '文章', color: 'purple' },
          { name: '视频', color: 'red' },
          { name: '课程', color: 'orange' },
          { name: '经验', color: 'green' },
          { name: '对话', color: 'pink' },
          { name: '其他', color: 'gray' }
        ]
      }
    },

    // === 重要程度和状态 ===
    'Importance': {
      select: {
        options: [
          { name: '高', color: 'red' },
          { name: '中', color: 'yellow' },
          { name: '低', color: 'gray' }
        ]
      }
    },
    'Status': {
      select: {
        options: [
          { name: '草稿', color: 'gray' },
          { name: '已发布', color: 'green' },
          { name: '已归档', color: 'blue' }
        ]
      }
    },

    // === 链接和附件 ===
    'URL': {
      url: {},
    },
    'Source Title': {
      rich_text: {},
    },
    'Source Author': {
      rich_text: {},
    },

    // === 关联关系 ===
    'Related Goals': {
      relation: {
        database_id: '', // 将在创建时填充
        type: 'dual_property',
        dual_property: {}
      }
    },

    // === 元数据 ===
    'Created Date': {
      created_time: {},
    },
    'Last Edited': {
      last_edited_time: {},
    },
    'User ID': {
      rich_text: {},
    },

    // === 阅读和使用统计 ===
    'Read Count': {
      number: {
        format: 'number'
      }
    },
    'Last Read': {
      date: {},
    },

    // === 标记 ===
    'Is Favorite': {
      checkbox: {},
    },
    'Is Public': {
      checkbox: {},
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

  // 获取目标库Schema
  getGoalsDatabaseSchema: function() {
    return GoalsDatabaseSchema.properties
  },

  // 获取待办库Schema
  getTodosDatabaseSchema: function() {
    return TodosDatabaseSchema.properties
  },

  // 获取主记录表Schema
  getMainRecordsDatabaseSchema: function() {
    return MainRecordsDatabaseSchema.properties
  },

  // 获取活动明细表Schema
  getActivityDetailsDatabaseSchema: function() {
    return ActivityDetailsDatabaseSchema.properties
  },

  // 获取每日状态库Schema
  getDailyStatusDatabaseSchema: function() {
    return DailyStatusDatabaseSchema.properties
  },

  // 获取开心库Schema
  getHappyThingsDatabaseSchema: function() {
    return HappyThingsDatabaseSchema.properties
  },

  // 获取箴言库Schema
  getQuotesDatabaseSchema: function() {
    return QuotesDatabaseSchema.properties
  },

  // 获取知识库Schema
  getKnowledgeDatabaseSchema: function() {
    return KnowledgeDatabaseSchema.properties
  },

  // 获取完整的数据库定义（包含标题和描述）
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
