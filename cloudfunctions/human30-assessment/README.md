# HUMAN 3.0 评估云函数

这是一个基于Azure OpenAI的HUMAN 3.0个人发展评估系统云函数。

## 功能

- ✅ 自适应对话式评估（12-32个问题）
- ✅ 四象限发展分析（Mind、Body、Spirit、Vocation）
- ✅ 生成个性化的Metatype和发展报告
- ✅ 30/90/180天行动计划
- ✅ 使用Azure OpenAI GPT模型

## 配置

### Azure OpenAI配置

文件：`config.js`

```javascript
{
  apiKey: '45288eb7fea64b628abb290a9505a709',
  endpoint: 'https://bondex.openai.azure.com/openai/deployments/global-gpt-5-chat/chat/completions?api-version=2025-01-01-preview'
}
```

### 环境变量（可选，更安全）

在微信云开发控制台中配置：

- `AZURE_OPENAI_API_KEY`: Azure OpenAI API密钥

## 部署步骤

### 方法1：通过微信开发者工具部署（推荐）

1. 打开微信开发者工具
2. 找到 `cloudfunctions/human30-assessment` 目录
3. 右键点击文件夹
4. 选择 **"上传并部署：云端安装依赖"**
5. 等待部署完成（约1-2分钟）

### 方法2：命令行部署

```bash
# 进入云函数目录
cd cloudfunctions/human30-assessment

# 安装依赖
npm install

# 使用微信开发者工具CLI上传
# （需要先配置CLI工具）
```

## 测试

### 在微信开发者工具中测试

1. 点击"云开发"标签
2. 进入"云函数"
3. 找到 `human30-assessment`
4. 点击"测试"按钮
5. 输入测试数据：

```json
{
  "action": "chat",
  "data": {
    "messages": [],
    "sessionId": "test_session_123"
  }
}
```

6. 点击"运行测试"

### 预期响应

```json
{
  "success": true,
  "data": {
    "message": "欢迎来到HUMAN 3.0发展评估...",
    "usage": {
      "total_tokens": 500
    }
  }
}
```

## API接口

### 1. 对话接口

**Action**: `chat`

**请求**:
```json
{
  "action": "chat",
  "data": {
    "messages": [
      {"role": "user", "content": "我喜欢思考哲学问题..."}
    ],
    "sessionId": "session_xxx"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "message": "AI的回复内容",
    "usage": {...}
  }
}
```

### 2. 生成报告接口

**Action**: `generateReport`

**请求**:
```json
{
  "action": "generateReport",
  "data": {
    "messages": [...], // 完整对话历史
    "sessionId": "session_xxx"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "report": "完整的评估报告内容",
    "reportId": "report_xxx"
  }
}
```

## 数据库集合

云函数会自动创建以下集合：

- `human30_sessions`: 评估会话记录
- `human30_reports`: 评估报告记录

## 错误处理

### 常见错误

1. **未配置API密钥**
   - 错误: `未配置Azure OpenAI API密钥`
   - 解决: 检查 `config.js` 或环境变量

2. **API调用超时**
   - 错误: `timeout of 60000ms exceeded`
   - 解决: 检查网络连接或增加超时时间

3. **API配额不足**
   - 错误: `429 Too Many Requests`
   - 解决: 等待配额重置或升级Azure订阅

4. **端点错误**
   - 错误: `404 Not Found`
   - 解决: 检查endpoint URL是否正确

### 降级响应

当API不可用时，云函数会返回降级响应：

```json
{
  "success": false,
  "error": "API调用失败",
  "fallback": true,
  "message": "降级消息内容"
}
```

## 成本估算

- 每次对话: 约100-300 tokens
- 完整评估: 约2000-5000 tokens
- 生成报告: 约1000-3000 tokens

**总计**: 每次完整评估约消耗 3000-8000 tokens

Azure OpenAI定价参考（以GPT-4为例）：
- Input: $0.03 / 1K tokens
- Output: $0.06 / 1K tokens

**估算成本**: 约 ¥1-3元/次评估

## 维护

### 更新配置

修改 `config.js` 后需要重新上传：

```bash
# 右键 human30-assessment
# 选择"上传并部署：云端安装依赖"
```

### 查看日志

在微信云开发控制台：
1. 进入"云函数"
2. 点击 `human30-assessment`
3. 查看"调用日志"

### 监控

建议监控指标：
- 调用次数
- 错误率
- 平均响应时间
- Token消耗量

## 安全建议

1. ✅ 使用环境变量存储API密钥（已支持）
2. ✅ 配置访问权限（仅小程序可调用）
3. ⚠️ 定期更新依赖包
4. ⚠️ 监控异常调用
5. ⚠️ 设置调用频率限制

## 开发者

- Framework: HUMAN 3.0 by Dan Koe
- Implementation: Claude Code
- Azure OpenAI: GPT-5 Chat
- Date: 2025-01-11

## 许可

本云函数基于HUMAN 3.0框架开发，仅供个人学习和使用。
