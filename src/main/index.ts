import { app, BrowserWindow } from 'electron'
import path from 'path'

// 确保 GPU 硬件加速启用，提升 SVG 渲染性能
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder')
app.commandLine.appendSwitch('disable-gpu-vsync')

// 调试：打印 GPU 加速状态
app.on('ready', () => {
  console.log('=== GPU Acceleration Status ===')
  console.log('GPU Feature Status:', app.getGPUFeatureStatus())
  console.log('=== End GPU Status ===')
})

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
    show: false,
    // 背景色避免透明度计算开销
    backgroundColor: '#ffffff'
  })

  // 窗口准备好后再显示，避免闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    // 打印渲染进程信息
    mainWindow?.webContents.on('did-finish-load', () => {
      console.log('Renderer process loaded')
    })
  })

  // 开发环境加载开发服务器，生产环境加载打包后的文件
  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.env.ELECTRON_RENDERER_URL
    mainWindow.loadURL(rendererPort!)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // macOS: 关闭窗口时隐藏而不是销毁，保持状态
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault()
      // 通知渲染进程即将关闭窗口（用于暂停播放等）
      mainWindow?.webContents.send('window-will-hide')
      mainWindow?.hide()
    }
  })

  // 窗口真正被销毁时清空引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // macOS 特性：点击 dock 图标时显示窗口（而不是创建新窗口）
    if (mainWindow === null) {
      createWindow()
    } else if (mainWindow.isMinimized()) {
      mainWindow.restore()
    } else if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
  })
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
