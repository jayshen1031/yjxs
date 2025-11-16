/**
 * Azure OpenAI 配置
 *
 * 建议：在云函数环境变量中配置 AZURE_OPENAI_API_KEY
 * 如果未配置环境变量，将使用下面的默认值
 */

module.exports = {
  // Azure OpenAI API Key
  apiKey: process.env.AZURE_OPENAI_API_KEY || '45288eb7fea64b628abb290a9505a709',

  // Azure OpenAI 端点
  endpoint: 'https://bondex.openai.azure.com/openai/deployments/global-gpt-5-chat/chat/completions?api-version=2025-01-01-preview',

  // 模型配置
  temperature: 0.7,
  maxTokensChat: 3000,      // 对话时的最大token（增大以支持更详细的问答）
  maxTokensReport: 8000,    // 生成报告时的最大token（足够生成完整详细报告）

  // 超时配置
  chatTimeout: 120000,      // 对话超时：120秒（2分钟）
  reportTimeout: 180000     // 报告超时：180秒（3分钟）
}
