import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.local.attendance.recorder',
  appName: '打卡记录',
  webDir: 'apk-web',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#f4f1ea',
  },
}

export default config
