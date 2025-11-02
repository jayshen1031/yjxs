# 数据库对比工具说明

## 工具位置

**脚本**: `/compare-final.js` (项目根目录)
**报告**: `.claude/DATABASE_COMPARISON_REPORT.md`

## 使用方法

### 运行对比

```bash
node compare-final.js
```

### 修改配置

如需对比其他用户，编辑 `compare-final.js` 中的配置：

```javascript
const user1 = {
  email: 'user1@example.com',
  apiKey: 'ntn_xxxxx',
  databases: {
    activityDetails: 'database-id-1',
    goals: 'database-id-2',
    // ... 其他7个数据库ID
  }
}

const user2 = {
  // 同上
}
```

## 输出内容

脚本会输出：
1. 每个数据库的对比状态（一致/差异）
2. 详细的字段差异列表
3. 修复建议

## 获取数据库配置

在微信开发者工具Console中执行：

```javascript
const users = wx.getStorageSync('users')
console.log(JSON.parse(users))
```

或查看：
- 用户邮箱
- notionConfig.apiKey
- notionConfig.databases (8个数据库ID)

## 报告位置

完整的对比报告已保存到：
`.claude/DATABASE_COMPARISON_REPORT.md`

包含：
- 87个字段差异的详细分析
- 根本原因分析
- 4种解决方案建议
- 待办事项清单

## 相关文档

- `.claude/INDEX.md` - Claude Skills索引
- `.claude/README.md` - Skills完整文档
- `CLAUDE.md` - 项目主记忆文件

---

**创建时间**: 2025-11-02
**用途**: 诊断和记录数据库Schema版本差异
