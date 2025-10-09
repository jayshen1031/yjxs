/**
 * Notion 四数据库架构初始化服务
 *
 * 四数据库架构：
 * 1. Goals（目标库）- 人生目标、阶段目标管理
 * 2. Todos（待办事项库）- 目标导向和临时待办管理
 * 3. Main Records（主记录表）- 每日记录汇总
 * 4. Activity Details（活动明细表）- 每个活动的时间投入
 */

/**
 * 目标库（Goals Database）数据库结构
 */
const GoalsDatabaseSchema = {
  title: '🎯 语寄心声 - 目标库 (Goals)',
  description: '管理人生目标、年度目标、阶段目标',
  properties: {
    // === 基础信息 ===
    'Name': {
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

module.exports = {
  GoalsDatabaseSchema,
  TodosDatabaseSchema,
  MainRecordsDatabaseSchema,
  ActivityDetailsDatabaseSchema
}
