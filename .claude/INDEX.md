# Claude Skills 索引

## 📂 文件导航

### 核心配置
- **skills.json** - 主配置文件，定义所有技能
- **README.md** - 完整文档，详细说明
- **QUICK_START.md** - 快速开始指南（5分钟上手）
- **INDEX.md** - 本文件，快速导航
- **DATABASE_COMPARISON_REPORT.md** - 🆕 数据库结构对比报告（2025-11-02）

### 技能定义
- **skills/notion-database.skill.json** - Notion数据库管理
- **skills/wechat-miniprogram.skill.json** - 微信小程序开发
- **skills/project-memory.skill.json** - 项目记忆和历史

---

## 🎯 按场景查找

### 我想要...

#### 快速上手项目
→ 阅读: `QUICK_START.md`
→ 然后查看: `../CLAUDE.md`

#### 修改数据库结构
→ 参考: `skills/notion-database.skill.json`
→ 标准文件: `../utils/notionDatabaseSetup.js`
→ 修改文件: `../utils/notionQuadDatabaseCreator.js`

#### 开发新页面
→ 参考: `skills/wechat-miniprogram.skill.json`
→ 示例: `../pages/memo/memo.js`

#### 理解项目历史
→ 阅读: `skills/project-memory.skill.json`
→ 主记忆: `../CLAUDE.md`

#### 解决常见问题
→ 查看: `README.md` → "已知问题和解决方案"
→ 或: `QUICK_START.md` → "遇到问题？"

---

## 🔧 按功能查找

### 数据库管理
| 功能 | 文件 | 说明 |
|------|------|------|
| Schema标准 | `../utils/notionDatabaseSetup.js` | 生产环境标准 |
| 自动创建 | `../utils/notionQuadDatabaseCreator.js` | 创建脚本 |
| API调用 | `../utils/notionApiService.js` | Notion API |
| 诊断工具 | `../pages/settings/settings.js:diagnoseDatabases` | 检查结构 |
| 修复关联 | `../pages/fix-relations/fix-relations.js` | 修复工具 |

### 小程序开发
| 功能 | 文件 | 说明 |
|------|------|------|
| 页面开发 | `skills/wechat-miniprogram.skill.json` | 规范 |
| 用户管理 | `../utils/userManager.js` | 本地存储 |
| API封装 | `../utils/apiService.js` | 云函数调用 |
| 配置文件 | `../app.json` | 全局配置 |

### 项目记忆
| 功能 | 文件 | 说明 |
|------|------|------|
| 主记忆 | `../CLAUDE.md` | 完整历史 |
| 更新日志 | `skills/project-memory.skill.json` | 重要更新 |
| 铁律 | `QUICK_START.md` | 核心原则 |

---

## 📖 推荐阅读顺序

### 新手入门（第1周）
1. `QUICK_START.md` - 了解基础概念
2. `../CLAUDE.md` - 理解项目历史
3. `skills/wechat-miniprogram.skill.json` - 学习开发规范
4. 实践：运行诊断工具，查看数据库结构

### 进阶开发（第2周）
1. `skills/notion-database.skill.json` - 深入数据库管理
2. `../utils/notionDatabaseSetup.js` - 研究Schema设计
3. `../utils/notionQuadDatabaseCreator.js` - 理解创建流程
4. 实践：添加一个新字段

### 高级应用（第3周）
1. `skills/project-memory.skill.json` - 学习项目记忆管理
2. `README.md` - 完整文档深度阅读
3. 研究关联字段和Rollup字段的实现
4. 实践：创建一个完整的新功能

---

## 🎓 技能等级

### Level 1: 初学者
- [ ] 阅读 `QUICK_START.md`
- [ ] 理解八数据库架构
- [ ] 能运行诊断工具
- [ ] 能修改简单字段

### Level 2: 熟练者
- [ ] 能独立添加数据库字段
- [ ] 能创建新页面
- [ ] 理解关联关系
- [ ] 能修复常见问题

### Level 3: 专家
- [ ] 能设计复杂的数据库结构
- [ ] 能优化Notion API调用
- [ ] 能处理复杂的数据关联
- [ ] 能维护项目文档

---

## 🔗 快速链接

### 常用命令
```bash
# 查看技能配置
cat .claude/skills.json

# 快速开始
cat .claude/QUICK_START.md

# 完整文档
cat .claude/README.md

# 项目记忆
cat CLAUDE.md
```

### 常用页面
```
设置页面: pages/settings/settings.js
记录页面: pages/memo/memo.js
目标待办: pages/goals-todos/goals-todos.js
历史记录: pages/history/history.js
```

### 工具函数
```
Notion API: utils/notionApiService.js
用户管理: utils/userManager.js
API服务: utils/apiService.js
数据库创建: utils/notionQuadDatabaseCreator.js
```

---

## 💡 小贴士

1. **遇到字段名问题**：先看 `notionDatabaseSetup.js`
2. **添加新功能**：参考现有页面的实现
3. **修复bug**：运行诊断工具找出问题
4. **学习架构**：从数据流向追踪代码
5. **提问前**：检查 `README.md` 的"已知问题"部分

---

*索引文档 - 帮您快速找到所需信息*
*最后更新: 2025-10-26*
