# Guitar Practice

基于 Electron + React + TypeScript 的吉他简谱视奏练习桌面应用。

## 功能说明

### 指板与显示

- **吉他琴颈**：俯视角指板，6 弦在下、琴头在右，1–14 品，品位间距按十二平均律计算。
- **点击试音**：点击任意弦品位可高亮该点、播放对应音高，并在控制面板显示该音信息（音名如 C、F#，弦品位；若在当前 do 的大调音阶内则显示简谱数字与唱名）。播放中点击也会立即显示点击的音。

### 简谱序列与播放

- **随机序列**：可设定长度（至少 7），生成 1–7 的随机序列，且保证 1–7 各出现至少一次（乱序）。
- **自动播放**：按设定 BPM 逐音播放，当前音在琴颈上红色高亮，Tone.js 拨弦音播放。
- **播放控制**：暂停、继续、停止；播放结束后再次点击「播放」从头开始。
- **准备时间**：可设定「准备(秒)」，仅**从头播放**时生效，用于倒计时准备；从序列中间开始播放不等待。
- **从指定位置播放**：点击序列中任意数字，从该音符开始播放（无准备等待）。

### Do 与移调

- **按音高移调**：选择 do 的音高（C、D、E、F、F#、G、A、B 等），整体移调。
- **按位置指定**：在设置中进入「在琴颈上选择位置」后，点击指板某点设为 do，其他音按大调音阶相对位置计算。
- 非大调音阶内的音仍可点击试音并播放，只显示音名与弦品位，不显示简谱数字。

## 技术栈

- **Electron** - 桌面应用
- **React 18** - UI
- **TypeScript** - 类型
- **Vite** - 构建
- **electron-vite** - Electron + Vite 集成
- **Tone.js** - 音频合成（PluckSynth 拨弦音色）

## 项目结构

```
guitar-practice/
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── index.ts
│   │   └── preload.ts
│   └── renderer/               # React 渲染进程
│       ├── components/        # 吉他琴颈、控制面板、设置面板
│       ├── hooks/             # 音频引擎、序列播放控制
│       ├── utils/             # 吉他常量、音符映射、随机序列
│       ├── types/             # TypeScript 类型
│       ├── App.tsx
│       └── main.tsx
├── index.html
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 打包（macOS）

```bash
npm run package
```

产物在 `release/` 目录。

## 许可证

MIT
