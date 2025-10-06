// 真实语音识别实现 - 百度API版本
// 使用前需要在百度AI开放平台申请API密钥
// 免费额度：每天50000次调用

const cloud = require('wx-server-sdk')
const fs = require('fs')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 百度语音识别配置
const BAIDU_CONFIG = {
  API_KEY: process.env.BAIDU_API_KEY || 'your_api_key',
  SECRET_KEY: process.env.BAIDU_SECRET_KEY || 'your_secret_key',
  TOKEN_URL: 'https://aip.baidubce.com/oauth/2.0/token',
  ASR_URL: 'https://vop.baidu.com/server_api'
}

// 获取访问令牌
async function getAccessToken() {
  try {
    const response = await axios.post(BAIDU_CONFIG.TOKEN_URL, null, {
      params: {
        grant_type: 'client_credentials',
        client_id: BAIDU_CONFIG.API_KEY,
        client_secret: BAIDU_CONFIG.SECRET_KEY
      }
    })
    
    return response.data.access_token
  } catch (error) {
    console.error('获取百度访问令牌失败:', error)
    throw new Error('获取访问令牌失败')
  }
}

// 语音识别
async function recognizeSpeech(audioBuffer) {
  try {
    const accessToken = await getAccessToken()
    
    // 将音频转换为base64
    const audioBase64 = audioBuffer.toString('base64')
    
    const requestData = {
      format: 'mp3',
      rate: 16000,
      channel: 1,
      cuid: 'speech_recognition_app',
      token: accessToken,
      speech: audioBase64,
      len: audioBuffer.length
    }

    const response = await axios.post(BAIDU_CONFIG.ASR_URL, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.data.err_no === 0 && response.data.result) {
      return {
        success: true,
        text: response.data.result[0],
        source: 'baidu'
      }
    } else {
      return {
        success: false,
        error: response.data.err_msg || '识别失败'
      }
    }

  } catch (error) {
    console.error('百度语音识别异常:', error)
    return {
      success: false,
      error: '识别服务异常: ' + error.message
    }
  }
}

// 云函数主入口（真实版本）
exports.main = async (event, context) => {
  const { fileID } = event

  try {
    console.log('开始真实语音识别:', fileID)

    // 检查是否配置了百度API密钥
    if (!BAIDU_CONFIG.API_KEY || BAIDU_CONFIG.API_KEY === 'your_api_key') {
      console.log('未配置百度API，使用模拟结果')
      return {
        success: true,
        text: '这是模拟的语音识别结果，请在云函数中配置百度API密钥以使用真实识别',
        source: 'mock'
      }
    }

    // 下载音频文件
    const downloadResult = await cloud.downloadFile({
      fileID: fileID
    })

    // 调用百度语音识别
    const recognizeResult = await recognizeSpeech(downloadResult.fileContent)

    return recognizeResult

  } catch (error) {
    console.error('语音识别云函数异常:', error)
    return {
      success: false,
      error: '语音识别异常: ' + error.message
    }
  }
}

module.exports = {
  recognizeSpeech,
  getAccessToken
}