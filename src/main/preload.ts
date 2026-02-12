import { contextBridge, ipcRenderer } from 'electron'

// 通过 contextBridge 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 示例：可以在这里添加需要暴露给渲染进程的 API
  platform: process.platform,
  
  // IPC 通信示例
  send: (channel: string, data: any) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  
  receive: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  }
})

// 类型定义，供渲染进程使用
export {}

declare global {
  interface Window {
    electron: {
      platform: string
      send: (channel: string, data: any) => void
      receive: (channel: string, func: (...args: any[]) => void) => void
    }
  }
}
