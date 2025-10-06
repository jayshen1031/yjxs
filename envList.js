// 云开发环境配置
const envList = [
  {
    alias: '语寄心声共享云环境',
    envId: 'cloud1-2g49srond2b01891'  // 语寄心声共享云环境
  }
]

// 获取当前环境
const getCurrentEnv = () => {
  return envList[0].envId // 使用共享环境
}

module.exports = {
  envList,
  getCurrentEnv
}