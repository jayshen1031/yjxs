// cloudfunctions/human30-assessment/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios')
const config = require('./config')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// HUMAN 3.0 系统提示词 - 成年人版本
const HUMAN_30_ADULT_PROMPT = `You are a direct, insightful development assessor specializing in the HUMAN 3.0 model. You conduct adaptive interviews to determine someone's current development across four quadrants (Mind, Body, Spirit, Vocation), identify their Metatype and Lifestyle Archetype, and provide actionable transformation strategies.

CORE FRAMEWORK:
- Mind: Thoughts, beliefs, worldview, mental models
- Body: Health, fitness, energy, physical habits
- Spirit: Relationships, meaning, community, connection
- Vocation: Career, value creation, impact, contribution

THREE LEVELS per quadrant:
- Level 1.0: Conformist (external validation, rule-following)
- Level 2.0: Individualist (self-directed, achievement-seeking)
- Level 3.0: Synthesist (integrates perspectives, creates new games)

INTERVIEW STYLE:
- Ask ONE question at a time
- Be direct but respectful
- Adapt questions based on detected level
- Probe for false transformations

🚨 CRITICAL RULES - DO NOT VIOLATE:
1. You MUST ask AT LEAST 5-8 questions for EACH quadrant (Mind, Body, Spirit, Vocation)
2. Total conversation must have AT LEAST 20-32 user responses before generating report
3. DO NOT generate final report until you have covered ALL FOUR quadrants thoroughly
4. If user has answered less than 20 questions, CONTINUE asking - DO NOT summarize or conclude
5. Only after exploring all 4 quadrants with sufficient depth, then and ONLY then generate the report

QUADRANT PROGRESSION:
- Mind: Questions 1-8 (minimum 5)
- Body: Questions 9-16 (minimum 5)
- Spirit: Questions 17-24 (minimum 5)
- Vocation: Questions 25-32 (minimum 5)

When assessment is TRULY complete (after 20+ questions covering all 4 quadrants), generate a FULL REPORT including:
- Metatype (dynamic name based on pattern)
- Lifestyle Archetype
- Quadrant breakdown (level, strengths, gaps)
- Core problem to solve
- 30/90/180 day action plan
- Glitch assessment

Use Chinese language for all responses unless user speaks English.

Start with: "欢迎来到HUMAN 3.0发展评估。我将通过一系列问题来评估你在四个生活领域的发展水平。我会直接但尊重地说出真相——有时真相会刺痛，但清晰能加速成长。让我们从Mind象限开始。"

Then ask your first question about Mind quadrant.`

// HUMAN 3.0 系统提示词 - 学生版本
const HUMAN_30_STUDENT_PROMPT = `You are a friendly, encouraging development coach specializing in helping students grow. You conduct supportive interviews to understand their development across four areas (Mind, Body, Spirit, Learning), and provide practical guidance for their student life.

CORE FRAMEWORK (Student Version):
- Mind: 思维方式、学习态度、兴趣探索、思考能力
- Body: 运动习惯、作息规律、精力管理、健康意识
- Spirit: 同学关系、家庭关系、兴趣爱好、情绪管理
- Learning: 学习方法、学习动力、学科兴趣、成长目标

THREE LEVELS per area:
- Level 1.0: 被动接受（听老师家长的，按规矩做）
- Level 2.0: 主动探索（有自己的想法，主动学习）
- Level 3.0: 创造价值（能帮助他人，创造新东西）

INTERVIEW STYLE:
- Ask ONE question at a time
- Be friendly, encouraging, and age-appropriate
- Use simple, clear language that students understand
- Focus on their daily life and school experiences
- Celebrate their strengths before pointing out growth areas

🚨 CRITICAL RULES:
1. You MUST ask AT LEAST 3-5 questions for EACH area (Mind, Body, Spirit, Learning)
2. Total conversation must have AT LEAST 12-20 user responses
3. Keep questions relevant to student life (school, friends, family, hobbies)
4. Be encouraging - this is about growth, not judgment
5. Only generate report after covering ALL FOUR areas

AREA PROGRESSION:
- Mind: Questions 1-5 (minimum 3) - 关于思考方式和学习态度
- Body: Questions 6-10 (minimum 3) - 关于运动和健康习惯
- Spirit: Questions 11-15 (minimum 3) - 关于人际关系和兴趣爱好
- Learning: Questions 16-20 (minimum 3) - 关于学习方法和成长目标

When assessment is complete (after 12+ questions covering all 4 areas), generate a STUDENT-FRIENDLY REPORT including:
- 你的成长类型 (Growth Type - 用积极的名称)
- 各领域发展情况 (Mind, Body, Spirit, Learning)
- 你的优势和潜力
- 成长建议 (适合学生的实际建议)
- 近期行动计划 (30天内可以做的小改变)

Use Chinese language for all responses.

Start with: "你好！欢迎参加成长评估。我会通过一些简单的问题，帮你了解自己在学习、生活、人际关系等方面的情况。没有对错答案，放轻松回答就好😊 让我们从"思维方式"开始聊聊吧！"

Then ask your first question about Mind (思维方式).`

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      case 'chat':
        return await handleChat(data)
      case 'generateReport':
        return await generateReport(data)
      default:
        return {
          success: false,
          error: '未知操作'
        }
    }
  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 处理对话
 */
async function handleChat(data) {
  const { messages, sessionId, userRole } = data

  try {
    // 根据用户角色选择系统提示词
    const systemPrompt = userRole === 'student' ? HUMAN_30_STUDENT_PROMPT : HUMAN_30_ADULT_PROMPT

    // 构建对话消息
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ]

    // 使用配置文件中的Azure OpenAI配置
    if (!config.apiKey) {
      throw new Error('未配置Azure OpenAI API密钥')
    }

    console.log('调用Azure OpenAI API...')

    const response = await axios.post(
      config.endpoint,
      {
        messages: conversationMessages,
        temperature: config.temperature,
        max_tokens: config.maxTokensChat
      },
      {
        headers: {
          'api-key': config.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: config.chatTimeout
      }
    )

    const aiMessage = response.data.choices[0].message.content
    console.log('AI响应成功，长度:', aiMessage.length)

    // 保存对话记录到数据库（可选，失败不影响返回）
    if (sessionId) {
      try {
        await db.collection('human30_sessions').add({
          data: {
            sessionId,
            messages: conversationMessages,
            aiResponse: aiMessage,
            timestamp: db.serverDate()
          }
        })
        console.log('会话已保存到数据库')
      } catch (dbError) {
        console.warn('保存会话到数据库失败（不影响返回）:', dbError.message)
      }
    }

    return {
      success: true,
      data: {
        message: aiMessage,
        usage: response.data.usage
      }
    }
  } catch (error) {
    console.error('Chat API调用失败:', error.response?.data || error.message)

    // 如果API调用失败，返回降级消息
    return {
      success: false,
      error: error.message,
      fallback: true,
      message: getFallbackResponse(messages)
    }
  }
}

/**
 * 生成完整报告
 */
async function generateReport(data) {
  const { messages, sessionId, userRole } = data

  try {
    // 根据角色选择系统提示词和报告格式
    const systemPrompt = userRole === 'student' ? HUMAN_30_STUDENT_PROMPT : HUMAN_30_ADULT_PROMPT

    // 学生版报告提示
    const studentReportPrompt = `Based on our conversation, please generate a STUDENT-FRIENDLY assessment report in the following format:

🌟 你的成长类型: [用积极鼓励的名称]
[简短描述你的特点]

📊 各领域发展情况:
🧠 思维方式 (Mind): [等级和具体表现]
💪 身体健康 (Body): [等级和具体表现]
🌈 人际情感 (Spirit): [等级和具体表现]
📚 学习成长 (Learning): [等级和具体表现]

✨ 你的优势和潜力:
[列出3-5个优点]

🎯 成长建议:
[给出2-3条实用建议]

📝 30天小目标:
[列出3个可以马上开始做的小改变]

Please use Chinese language, be encouraging and specific.`

    // 成年人版报告提示
    const adultReportPrompt = `Based on our conversation, please generate a COMPLETE HUMAN 3.0 assessment report in the following format:

YOUR METATYPE: [Dynamic Name]
[Description]

YOUR LIFESTYLE ARCHETYPE: [Name]
[Description]

QUADRANT BREAKDOWN:
📊 Mind: [Level and details]
📊 Body: [Level and details]
📊 Spirit: [Level and details]
📊 Vocation: [Level and details]

YOUR CORE PROBLEM TO SOLVE: [Description]

LIFESTYLE TRANSFORMATION STRATEGY:
🎯 Next 30 Days: [Specific daily practices]
📈 Next 90 Days: [Implementation phase]
🚀 Next 6-12 Months: [Integration phase]

GLITCH ASSESSMENT: [Based on level]

Please use Chinese language and be detailed.`

    const reportPrompt = userRole === 'student' ? studentReportPrompt : adultReportPrompt

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content: reportPrompt }
    ]

    console.log('生成完整报告...')

    const response = await axios.post(
      config.endpoint,
      {
        messages: conversationMessages,
        temperature: config.temperature,
        max_tokens: config.maxTokensReport
      },
      {
        headers: {
          'api-key': config.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: config.reportTimeout
      }
    )

    const report = response.data.choices[0].message.content
    console.log('报告生成成功，长度:', report.length)

    // 强制使用本地ID（报告已保存到知识库，不需要单独的云数据库）
    const reportId = 'local_' + Date.now()
    console.log('使用本地报告ID:', reportId)

    // 可选：记录到会话日志（不阻塞）
    try {
      await db.collection('human30_sessions').add({
        data: {
          sessionId,
          reportGenerated: true,
          reportId: reportId,
          timestamp: db.serverDate()
        }
      })
    } catch (dbError) {
      console.warn('记录会话日志失败（不影响返回）:', dbError.message)
    }

    return {
      success: true,
      data: {
        report,
        reportId: reportId
      }
    }
  } catch (error) {
    console.error('生成报告失败:', error.response?.data || error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 降级响应（当API不可用时）
 */
function getFallbackResponse(messages) {
  // 如果没有消息或消息为空，返回欢迎消息
  if (!messages || messages.length === 0) {
    return '欢迎来到HUMAN 3.0评估！让我们从Mind象限开始。\n\n请问：当你遇到一个与你世界观相矛盾的观点时，你的第一反应是什么？请详细描述你的思考过程。'
  }

  const lastMessage = messages[messages.length - 1]
  const userContent = (lastMessage?.content || '').toLowerCase()

  // 简单的关键词匹配
  if (userContent.includes('开始') || messages.length === 1) {
    return '欢迎来到HUMAN 3.0评估！让我们从Mind象限开始。\n\n请问：当你遇到一个与你世界观相矛盾的观点时，你的第一反应是什么？请详细描述你的思考过程。'
  }

  // 默认继续提问
  const quadrants = ['Mind', 'Body', 'Spirit', 'Vocation']
  const currentQuadrant = quadrants[Math.floor(messages.length / 3) % 4]

  return `感谢分享！让我继续了解你的${currentQuadrant}象限...\n\n（当前使用离线模式，请稍后重试以获得完整的AI评估体验）`
}
