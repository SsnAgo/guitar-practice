// Electron API 类型定义
declare global {
  interface Window {
    electron?: {
      platform: string
      send: (channel: string, data: any) => void
      receive: (channel: string, func: (...args: any[]) => void) => void
      removeListener: (channel: string, func: (...args: any[]) => void) => void
    }
  }
}

export {}
