# Claude Skills for 语寄心声项目

## 📁 目录结构

```
.claude/
├── README.md           # 本文件
├── skills.json         # 主配置文件
└── skills/
    ├── notion-database.skill.json      # Notion数据库管理技能
    ├── wechat-miniprogram.skill.json   # 微信小程序开发技能
    └── project-memory.skill.json       # 项目记忆技能
```

## 🎯 技能说明

### 1. Notion数据库管理技能
**文件**: `skills/notion-database.skill.json`

**功能**:
- ✅ 自动创建八数据库架构
- ✅ 诊断schema不一致问题
- ✅ 修复字段名、类型、关联关系错误
- ✅ 管理关联字段和Rollup字段

**关键文件**:
- `utils/notionDatabaseSetup.js` - 生产环境schema（标准）
- `utils/notionQuadDatabaseCreator.js` - 自动创建脚本
- `utils/notionApiService.js` - Notion API服务

**最佳实践**:
- 始终以 `notionDatabaseSetup.js` 为准
- 关联字段需要等目标数据库创建后再添加（PATCH）
- Rollup字段依赖关联字段，必须最后添加

---

### 2. 微信小程序开发技能
**文件**: `skills/wechat-miniprogram.skill.json`

**功能**:
- ✅ 页面开发规范（4文件结构）
- ✅ 数据绑定和状态管理
- ✅ 云函数开发
- ✅ Notion API集成（前端直接调用）

**核心模式**:
- **用户管理**: `utils/userManager.js` - 本地存储
- **API调用**: `utils/apiService.js` - 云函数封装
- **Notion调用**: `utils/notionApiService.js` - Notion API

**页面开发检查清单**:
- [ ] 创建 `.js` / `.wxml` / `.wxss` / `.json` 四个文件
- [ ] 在 `app.json` 的 `pages` 数组中注册
- [ ] 使用 `setData` 更新视图
- [ ] 添加错误处理和用户反馈

---

### 3. 项目记忆技能
**文件**: `skills/project-memory.skill.json`

**功能**:
- ✅ 追踪项目历史和重要决策
- ✅ 记录已知问题和解决方案
- ✅ 维护文档标准
- ✅ 参考检查清单

**核心原则**:
- 🚨 禁止使用模拟数据
- 🚨 禁止擅自修改用户方案
- ✅ 重大变更必须征求用户意见
- ✅ 保持文档更新

**重要更新记录**:
- 2025-10-26: Notion八数据库Schema一致性修复
- 2025-10-19: 箴言系统重构
- 2025-10-12: 六数据库配置界面
- 2025-10-09: 用户标签系统优化

---

## 🚀 快速参考

### 常见任务

#### 添加数据库字段
```
1. 在 utils/notionDatabaseSetup.js 中添加字段定义
2. 在 utils/notionQuadDatabaseCreator.js 中同步更新
3. 测试自动创建流程
4. 更新 CLAUDE.md
```

#### 修复Schema不一致
```
1. 运行诊断: pages/settings/settings.js:diagnoseDatabases
2. 对比两个文件，以 notionDatabaseSetup.js 为准
3. 修复 notionQuadDatabaseCreator.js
4. 验证修复
```

#### 添加新页面
```
1. 创建 pages/页面名/页面名.{js,wxml,wxss,json}
2. 在 app.json 的 pages 数组注册
3. 实现业务逻辑
4. 测试功能
```

---

## 📚 项目架构

### 八数据库架构
```
🎯 Goals（目标库）
    ↓ 关联
✅ Todos（待办库）
    ↓ 关联
📝 Main Records（主记录表）
    ↓ 关联
⏱️ Activity Details（活动明细表）

📊 Daily Status（每日状态库）
😊 Happy Things（开心库）
💬 Quotes（箴言库）
📚 Knowledge（知识库）
```

### 数据流
```
用户输入（小程序）
    ↓
前端直接调用 Notion API
    ↓
Notion数据库（云端存储）
    ↓
本地缓存（快速访问）
```

---

## 🔧 工具页面

| 页面 | 功能 | 路径 |
|------|------|------|
| 自动创建数据库 | 一键创建八数据库 | `pages/settings/settings.js:autoCreateDatabases` |
| 诊断数据库 | 检查schema结构 | `pages/settings/settings.js:diagnoseDatabases` |
| 修复活动关联 | 修复关联关系 | `pages/fix-relations/fix-relations.js` |
| 修复主记录表 | 添加缺失字段 | `pages/fix-main-records/fix-main-records.js` |

---

## 📝 已知问题和解决方案

### 问题1: Notion API字段名不一致
**现象**: "Name is not a property that exists"
**原因**: 不同数据库使用不同的标题字段名
**解决**: 参考 `notionDatabaseSetup.js`，使用正确字段名

### 问题2: 云函数无法访问Notion API
**现象**: ECONNREFUSED 208.103.161.1:443
**原因**: 微信云函数网络限制
**解决**: 前端直接调用Notion API

### 问题3: 关联字段和Rollup字段缺失
**现象**: 创建的数据库缺少某些字段
**原因**: 创建时依赖的目标数据库还不存在
**解决**: 使用PATCH方法在创建后添加

### 问题4: 字段类型错误
**现象**: 保存数据时类型验证失败
**原因**: 使用了错误的字段类型（如date vs rich_text）
**解决**: 时间格式HH:MM使用rich_text类型

---

## 🎓 学习资源

### 关键文档
- `CLAUDE.md` - 项目主记忆文件
- `NOTION_QUAD_DATABASE_SETUP.md` - 四数据库架构说明
- `AUTO_CREATE_TEST_GUIDE.md` - 自动创建测试指南
- `CLOUD_FUNCTION_API_REFERENCE.md` - 云函数API参考

### 代码示例
- 页面开发: `pages/memo/memo.js`
- Notion集成: `utils/notionApiService.js`
- 数据库创建: `utils/notionQuadDatabaseCreator.js`

---

## 📞 获取帮助

遇到问题时:
1. 检查错误日志（控制台）
2. 参考本文档的"已知问题"部分
3. 查看 `CLAUDE.md` 中的项目记忆
4. 运行诊断工具检查数据库状态

---

*最后更新: 2025-10-26*
*维护者: Claude Code*
