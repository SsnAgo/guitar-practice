import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import GuitarNeck from './components/GuitarNeck'
import ControlPanel from './components/ControlPanel'
import SettingsPanel from './components/SettingsPanel'
import { useNoteSequence } from './hooks/useNoteSequence'
import { useAudioEngine } from './hooks/useAudioEngine'
import { AppSettings, DoMode, GuitarPosition, MappedNote, NoteName, SolfegeNumber, AppState } from './types/guitar'
import { getNoteMidi, midiToTonePitch, midiToNoteName, MAJOR_SCALE_SEMITONES, noteNameToIndex } from './utils/guitarConstants'
import { mapByPitch } from './utils/noteMapping'
import './App.css'

const DEFAULT_SETTINGS: AppSettings = {
  doMode: 'pitch',
  doNoteName: 'C',
  doPosition: { string: 5, fret: 3 },
  bpm: 90,
  sequenceLength: 7,
  prepareDelayMs: 1000,
}

// localStorage key
const STORAGE_KEY = 'guitar-practice-state'
const APP_STATE_KEY = 'guitar-practice-app-state'

// 从 localStorage 加载应用状态
function loadAppState(): Partial<AppState> {
  try {
    const stored = localStorage.getItem(APP_STATE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load app state from localStorage:', e)
  }
  return {}
}

// 保存应用状态到 localStorage
function saveAppState(state: AppState) {
  try {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save app state to localStorage:', e)
  }
}

// 从 localStorage 加载状态
function loadStoredSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e)
  }
  return DEFAULT_SETTINGS
}

// 保存状态到 localStorage
function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e)
  }
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings())
  const [isSelectingPosition, setIsSelectingPosition] = useState(false)
  const [tapHighlight, setTapHighlight] = useState<GuitarPosition | null>(null)
  const [tapNoteInfo, setTapNoteInfo] = useState<MappedNote | null>(null)

  // 从 localStorage 恢复状态
  const savedAppState = loadAppState()
  const [isSequenceCollapsed, setIsSequenceCollapsed] = useState(savedAppState.isSequenceCollapsed ?? true)
  const [restoredSequence, setRestoredSequence] = useState<SolfegeNumber[] | undefined>(savedAppState.sequence)
  const [restoredPlaybackState, setRestoredPlaybackState] = useState(savedAppState.playbackState)
  const [restoredCurrentIndex, setRestoredCurrentIndex] = useState(savedAppState.currentIndex)

  // 序列区域高度（默认 120px，最小 80px，最大 300px）
  const [sequenceHeight, setSequenceHeight] = useState(savedAppState.sequenceHeight ?? 120)
  const MIN_SEQUENCE_HEIGHT = 80
  const MAX_SEQUENCE_HEIGHT = 300

  // 数字缩放比例
  const [scale, setScale] = useState(1)
  // 最优行数（用于均匀分布）
  const [optimalRows, setOptimalRows] = useState(1)

  // 序列容器尺寸监听
  const sequenceNotesRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // 拖拽相关
  const isDraggingRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragStartHeightRef = useRef(0)
  const sequenceHeightRef = useRef(sequenceHeight)
  useEffect(() => {
    sequenceHeightRef.current = sequenceHeight
  }, [sequenceHeight])

  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { playNote, init: initAudio, warmup: warmupAudio } = useAudioEngine()

  const {
    sequence,
    currentIndex,
    playbackState,
    currentNote,
    generate,
    play,
    playFromIndex,
    pause,
    resume,
    stop,
    setSequence,
  } = useNoteSequence(settings, restoredSequence, restoredPlaybackState, restoredCurrentIndex)

  // 应用启动时预热音频引擎和音符映射缓存
  useEffect(() => {
    // 预热音频
    warmupAudio()

    // 预热音符映射缓存：预计算 C 大调的所有音符（最常用）
    // 这样第一次生成序列时就不会卡顿
    setTimeout(() => {
      for (let i = 1; i <= 7; i++) {
        mapByPitch(i as SolfegeNumber, 'C')
      }
    }, 100) // 延迟 100ms，避免阻塞初始渲染
  }, [warmupAudio])

  // 在用户首次交互时初始化音频引擎
  // 这样等到点击"播放"按钮时，音频已经准备好了，消除延迟
  useEffect(() => {
    const handleFirstInteraction = async () => {
      await initAudio()
    }
    // 监听点击和按键事件，只触发一次
    document.addEventListener('click', handleFirstInteraction, { once: true })
    document.addEventListener('keydown', handleFirstInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [initAudio])

  // 当设置改变时自动保存到 localStorage
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // 保存应用状态（序列折叠状态、序列数据、播放状态）
  useEffect(() => {
    saveAppState({
      isSequenceCollapsed,
      sequence: sequence.length > 0 ? sequence : undefined,
      playbackState,
      currentIndex: currentIndex >= 0 ? currentIndex : undefined,
      sequenceHeight,
    })
  }, [isSequenceCollapsed, sequence, playbackState, currentIndex, sequenceHeight])

  // 监听窗口隐藏事件，在关闭窗口时保存状态
  useEffect(() => {
    const handleWindowWillHide = () => {
      // 保存当前状态到 localStorage
      saveAppState({
        isSequenceCollapsed,
        sequence: sequence.length > 0 ? sequence : undefined,
        playbackState,
        currentIndex: currentIndex >= 0 ? currentIndex : undefined,
      })
    }
    // 只在 Electron 环境中注册监听
    if (window.electron) {
      window.electron.receive('window-will-hide', handleWindowWillHide)
    }
    return () => {
      if (window.electron) {
        window.electron.removeListener('window-will-hide', handleWindowWillHide)
      }
    }
  }, [isSequenceCollapsed, sequence, playbackState, currentIndex])

  // 当折叠且没有序列时，自动生成
  useEffect(() => {
    if (!isSequenceCollapsed && sequence.length === 0) {
      generate()
    }
  }, [isSequenceCollapsed, sequence, generate])

  // 监听播放状态变化，暂停时自动折叠
  useEffect(() => {
    if (playbackState === 'paused') {
      setIsSequenceCollapsed(false)
    }
  }, [playbackState, setIsSequenceCollapsed])

  // 拖拽处理：在 mousedown 时动态绑定 document 事件，避免 useEffect 闭包陷阱
  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragStartYRef.current = e.clientY
    dragStartHeightRef.current = sequenceHeightRef.current

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return
      const deltaY = ev.clientY - dragStartYRef.current
      const newHeight = dragStartHeightRef.current - deltaY
      const clampedHeight = Math.max(MIN_SEQUENCE_HEIGHT, Math.min(MAX_SEQUENCE_HEIGHT, newHeight))
      setSequenceHeight(clampedHeight)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.classList.remove('dragging-sequence')
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.body.classList.add('dragging-sequence')
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    e.preventDefault()
  }, [])

  // .sequence-notes 是否在 DOM 中（取决于 isSequenceCollapsed 和 sequence.length）
  const sequenceVisible = !isSequenceCollapsed && sequence.length > 0

  // 使用 ResizeObserver 监听序列容器尺寸变化
  // 依赖 sequenceVisible 确保元素出现/消失时重新绑定观察器
  useEffect(() => {
    const element = sequenceNotesRef.current
    if (!element) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setContainerSize({ width, height })
      }
    })

    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [sequenceVisible])

  // 根据容器实际尺寸和序列长度计算最优数字大小
  useEffect(() => {
    if (isSequenceCollapsed || sequence.length === 0) {
      setScale(1)
      setOptimalRows(1)
      return
    }

    const { width: containerWidth } = containerSize

    // 如果容器宽度为 0（初始渲染时 ResizeObserver 还未触发），使用估算值
    // .sequence-content 的父容器通常接近窗口宽度
    // 减去左侧播放按钮（约 60px）、gap（12px）、padding（24px）
    const ESTIMATED_WIDTH = 1000
    const BUTTON_AND_GAP = 74
    const availableWidth = containerWidth > 0 ? containerWidth : ESTIMATED_WIDTH - BUTTON_AND_GAP

    // 直接使用 sequenceHeight 计算高度（减去 padding）
    // .sequence-section 有 padding: 8px 12px
    const PADDING_VERTICAL = 16 // 8px * 2
    const containerHeight = sequenceHeight - PADDING_VERTICAL

    if (availableWidth <= 0 || containerHeight <= 0) {
      setScale(1)
      setOptimalRows(1)
      return
    }

    const count = sequence.length
    const baseSize = 36 // 基准数字大小（与 CSS 中的基准值一致）
    const gapRatio = 0.25 // gap 占数字大小的比例

    // 目标：找到最优的行数和数字大小
    let maxSize = 0
    let bestScale = 1
    let bestRows = 1

    // 遍历可能的行数（1 到 count 行，最多 10 行）
    for (let rows = 1; rows <= Math.min(10, count); rows++) {
      const cols = Math.ceil(count / rows)

      // 从高度约束计算最大 size:
      //   size × (rows + (rows - 1) × r) ≤ H
      const maxSizeByHeight = containerHeight / (rows + (rows - 1) * gapRatio)

      // 从宽度约束计算最大 size:
      //   size × (cols + (cols - 1) × r) ≤ W
      const maxSizeByWidth = availableWidth / (cols + (cols - 1) * gapRatio)

      // 取两者较小值（必须同时满足宽高约束）
      const size = Math.min(maxSizeByHeight, maxSizeByWidth)

      // 如果这个配置的数字更大，就采用
      if (size > maxSize) {
        maxSize = size
        bestScale = size / baseSize
        bestRows = rows
      }
    }

    setScale(bestScale)
    setOptimalRows(bestRows)
  }, [sequence.length, isSequenceCollapsed, containerSize, sequenceHeight])

  // 将序列按行数均匀分组（用 useMemo 缓存，避免重复计算）
  const sequenceRows = useMemo(() => {
    if (optimalRows <= 1 || sequence.length === 0) return [sequence]

    const count = sequence.length
    const basePerRow = Math.floor(count / optimalRows)
    const extra = count % optimalRows

    const result: SolfegeNumber[][] = []
    let index = 0

    for (let i = 0; i < optimalRows; i++) {
      // 前 extra 行多分配 1 个
      const itemsInThisRow = i < extra ? basePerRow + 1 : basePerRow
      result.push(sequence.slice(index, index + itemsInThisRow))
      index += itemsInThisRow
    }

    return result
  }, [sequence, optimalRows])

  // 预计算每行的起始索引（用于从分组坐标映射回原序列索引）
  const rowStartIndices = useMemo(() => {
    const starts: number[] = [0]
    for (let i = 0; i < sequenceRows.length - 1; i++) {
      starts.push(starts[i] + sequenceRows[i].length)
    }
    return starts
  }, [sequenceRows])

  // 设置相关的回调
  const handleDoModeChange = useCallback((mode: DoMode) => {
    setSettings(prev => ({ ...prev, doMode: mode }))
  }, [])

  const handleDoNoteNameChange = useCallback((name: NoteName) => {
    setSettings(prev => ({ ...prev, doNoteName: name }))
  }, [])

  const handleBpmChange = useCallback((bpm: number) => {
    setSettings(prev => ({ ...prev, bpm }))
  }, [])

  const handleSequenceLengthChange = useCallback((sequenceLength: number) => {
    setSettings(prev => ({ ...prev, sequenceLength }))
  }, [])

  const handlePrepareDelayChange = useCallback((prepareDelayMs: number) => {
    setSettings(prev => ({ ...prev, prepareDelayMs }))
  }, [])

  const handleGenerateClick = useCallback(() => {
    generate()
    setIsSequenceCollapsed(false)
  }, [generate])

  const handleToggleSelectPosition = useCallback(() => {
    setIsSelectingPosition(prev => !prev)
  }, [])

  const handlePositionClick = useCallback(async (position: GuitarPosition) => {
    if (isSelectingPosition) {
      // 选择 do 位置模式
      setSettings(prev => ({ ...prev, doPosition: position }))
      setIsSelectingPosition(false)
      return
    }

    // 点击试音：高亮并播放
    await initAudio()
    const midi = getNoteMidi(position.string, position.fret)
    const pitch = midiToTonePitch(midi)
    const noteName = midiToNoteName(midi)
    playNote(pitch, '4n')

    // 根据当前 do 设置，反推简谱数字
    let doMidi: number
    if (settings.doMode === 'pitch') {
      // 以 do 的音名在第4八度（C4=60附近）来比较
      doMidi = noteNameToIndex(settings.doNoteName)
    } else {
      doMidi = getNoteMidi(settings.doPosition.string, settings.doPosition.fret) % 12
    }
    const semitoneFromDo = ((midi % 12) - doMidi + 12) % 12
    const solfegeIdx = MAJOR_SCALE_SEMITONES.indexOf(semitoneFromDo)

    const info: MappedNote = {
      solfege: (solfegeIdx >= 0 ? solfegeIdx + 1 : 0) as MappedNote['solfege'],
      position,
      pitch,
      noteName,
    }
    setTapNoteInfo(info)

    // 设置高亮，1.5 秒后自动清除
    setTapHighlight(position)
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
    }
    tapTimerRef.current = setTimeout(() => {
      setTapHighlight(null)
      setTapNoteInfo(null)
      tapTimerRef.current = null
    }, 1500)
  }, [isSelectingPosition, initAudio, playNote, settings])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Guitar Practice</h1>
        <p className="subtitle">吉他简谱视奏练习</p>
      </header>

      {/* 调式选择面板 */}
      <SettingsPanel
        doMode={settings.doMode}
        doNoteName={settings.doNoteName}
        doPosition={settings.doPosition}
        onDoModeChange={handleDoModeChange}
        onDoNoteNameChange={handleDoNoteNameChange}
        isSelectingPosition={isSelectingPosition}
        onToggleSelectPosition={handleToggleSelectPosition}
      />

      {/* 中间主体区域：琴颈 + 数字序列 */}
      <div className="main-content">
        {/* 吉他琴颈 */}
        <div className={`guitar-section ${isSelectingPosition ? 'selecting' : ''}`}>
          <GuitarNeck
            highlightPosition={currentNote?.position}
            tapHighlight={tapHighlight}
            onPositionClick={handlePositionClick}
            isSelectingDo={isSelectingPosition}
            doPosition={settings.doMode === 'position' ? settings.doPosition : null}
          />
        </div>

        {/* 数字序列显示 + 播放控制 */}
        {!isSequenceCollapsed && sequence.length > 0 ? (
          <div
            className="sequence-section"
            style={{
              '--sequence-height': `${sequenceHeight}px`,
              '--sequence-scale': scale,
            } as React.CSSProperties}
          >
            {/* 拖拽调整高度的分隔条 */}
            <div className="sequence-resizer" onMouseDown={handleResizerMouseDown} title="拖拽调整高度" />

            {/* 折叠提示 - 悬浮显示 */}
            <div className="collapse-hint" onClick={() => setIsSequenceCollapsed(true)} title="收起数字序列">
              <span className="collapse-icon">▼</span>
              <span className="collapse-hint-text">收起序列</span>
            </div>

            <div className="sequence-content">
              {/* 播放控制 - 在左侧 */}
              <div className="playback-controls-left">
                {playbackState === 'idle' && (
                  <button className="btn btn-play-large" onClick={play}>
                    ▶
                  </button>
                )}
                {playbackState === 'playing' && (
                  <div className="vertical-buttons">
                    <button className="btn btn-pause" onClick={pause}>⏸</button>
                    <button className="btn btn-stop" onClick={stop}>⏹</button>
                  </div>
                )}
                {playbackState === 'paused' && (
                  <div className="vertical-buttons">
                    <button className="btn btn-play" onClick={resume}>▶</button>
                    <button className="btn btn-stop" onClick={stop}>⏹</button>
                  </div>
                )}
              </div>

              {/* 数字序列 */}
              <div className="sequence-notes" ref={sequenceNotesRef}>
                {sequenceRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="sequence-row">
                    {row.map((note, colIdx) => {
                      const idx = rowStartIndices[rowIdx] + colIdx
                      return (
                        <span
                          key={idx}
                          className={`sequence-note ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'played' : ''}`}
                          onClick={() => playFromIndex(idx)}
                          title={`从第 ${idx + 1} 个音开始播放`}
                        >
                          {note}
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 底部控制台 */}
      <div className="console-section">
        {/* 展开提示 */}
        {isSequenceCollapsed && sequence.length > 0 && (
          <div className="expand-hint" onClick={() => setIsSequenceCollapsed(false)} title="展开数字序列">
            <span className="expand-icon">▲</span>
            <span className="expand-hint-text">展开序列</span>
          </div>
        )}
        <ControlPanel
          sequence={sequence}
          bpm={settings.bpm}
          sequenceLength={settings.sequenceLength}
          onGenerate={handleGenerateClick}
          onBpmChange={handleBpmChange}
          onSequenceLengthChange={handleSequenceLengthChange}
          prepareDelayMs={settings.prepareDelayMs}
          onPrepareDelayChange={handlePrepareDelayChange}
        />
      </div>
    </div>
  )
}

export default App
