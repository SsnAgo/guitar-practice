import { app, BrowserWindow } from 'electron'
import path from 'path'

// 注意：保持硬件加速启用以获得最佳渲染性能
// 如遇到 GPU 兼容性问题，可取消注释下面一行
// app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'Guitar Practice',
    show: false
  })

  // 窗口准备好后再显示，避免闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 开发环境加载开发服务器，生产环境加载打包后的文件
  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.env.ELECTRON_RENDERER_URL
    mainWindow.loadURL(rendererPort!)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // macOS 特性：点击 dock 图标时重新创建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
