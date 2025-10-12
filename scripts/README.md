# Notion数据库创建脚本使用说明

## 📋 功能说明

这个脚本用于一键创建语寄心声小程序所需的**五个Notion数据库**：

1. 🎯 **目标库 (Goals)** - 管理人生目标、阶段目标
2. ✅ **待办库 (Todos)** - 目标导向和临时待办管理
3. 📝 **主记录表 (Main Records)** - 每日记录汇总
4. ⏱️ **活动明细表 (Activity Details)** - 时间投入追踪
5. 📊 **每日状态库 (Daily Status)** - 健康和生活习惯追踪

## 🚀 使用方法

### 方法1：交互式创建（推荐）

```bash
cd /Users/jay/Documents/baidu/projects/yjxs
node scripts/createNotionDatabases_interactive.js
```

然后按照提示输入：
- Notion API Key
- 父页面ID (Page ID)

### 方法2：命令行参数

```bash
node scripts/createNotionDatabases.js <API_KEY> <PARENT_PAGE_ID>
```

**示例**：
```bash
node scripts/createNotionDatabases.js secret_xxxxxxxxxxxxx 12345678-1234-1234-1234-123456789abc
```

## 📝 准备工作

### 1. 获取Notion API Key

1. 访问 https://www.notion.so/my-integrations
2. 点击 "+ New integration"
3. 填写名称，选择工作空间
4. 复制生成的 API Key（格式：`secret_xxxxx`）

### 2. 获取父页面ID

1. 在Notion中创建一个新页面（或使用已有页面）
2. 打开该页面，复制URL中的ID
3. URL格式：`https://notion.so/xxxxx-xxxxx-xxxxx?...`
4. ID就是 `xxxxx-xxxxx-xxxxx` 这部分

### 3. 授权Integration访问页面

1. 打开Notion页面
2. 点击右上角 "..." → "Connections"
3. 选择刚才创建的Integration
4. 点击 "Confirm"

## ✅ 创建成功后

脚本会输出类似以下的数据库ID：

```json
{
  "goals": "12345678-1234-1234-1234-123456789abc",
  "todos": "23456789-2345-2345-2345-23456789abcd",
  "mainRecords": "34567890-3456-3456-3456-34567890abcd",
  "activityDetails": "45678901-4567-4567-4567-45678901abcd",
  "dailyStatus": "56789012-5678-5678-5678-56789012abcd"
}
```

**下一步操作**：
1. 复制这些数据库ID
2. 在小程序中打开 Notion 配置页面
3. 粘贴对应的数据库ID
4. 保存配置

## ⚠️ 注意事项

### 手动设置自关联字段

由于Notion API限制，以下字段需要在Notion界面手动创建：

**目标库 (Goals)**：
1. 打开目标库
2. 添加 Relation 属性 "Sub Goals"，关联到自身
3. 添加 Relation 属性 "Parent Goal"，关联到自身

**待办库 (Todos)**：
1. 打开待办库
2. 添加 Relation 属性 "Blocking Todos"，关联到自身
3. 添加 Relation 属性 "Blocked By"，关联到自身

### 权限问题

如果创建失败，检查：
1. API Key 是否正确
2. Integration 是否已连接到父页面
3. 父页面ID 是否正确

## 🔧 故障排查

### 错误：database with id xxx does not exist

**原因**：父页面ID错误或Integration未授权

**解决**：
1. 检查页面ID是否正确
2. 确认Integration已连接到该页面

### 错误：Unauthorized

**原因**：API Key无效或已过期

**解决**：
1. 重新生成API Key
2. 检查API Key格式（应以`secret_`开头）

### 错误：创建超时

**原因**：网络问题或Notion服务响应慢

**解决**：
1. 检查网络连接
2. 稍后重试
3. 如部分数据库已创建，可手动创建剩余的

## 📚 相关文档

- [Notion API文档](https://developers.notion.com/)
- [项目架构说明](../NOTION_QUAD_DATABASE_SETUP.md)
- [数据库Schema定义](../utils/notionDatabaseSetup.js)
