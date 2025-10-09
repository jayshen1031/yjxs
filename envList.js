// 云开发环境配置
const envList = [
  {
    alias: '语寄心声独立云环境',
    envId: 'yjxs-3gbxme0rd1c50635'  // 语寄心声独立云环境（2025-10-09创建）
  },
  {
    alias: '语寄心声共享云环境（已废弃）',
    envId: 'cloud1-2g49srond2b01891'  // 旧的共享环境，已不再使用
  }
]

// 获取当前环境
const getCurrentEnv = () => {
  return envList[0].envId // 使用独立环境
}

module.exports = {
  envList,
  getCurrentEnv
}