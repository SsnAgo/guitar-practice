import { useState, useCallback, useRef, useEffect } from 'react'
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

  // 序列缩放
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

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
    })
  }, [isSequenceCollapsed, sequence, playbackState, currentIndex])

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

  // 自动缩放数字序列以适应容器
  useEffect(() => {
    // 如果序列收起，重置缩放
    if (isSequenceCollapsed) {
      setScale(1)
      return
    }

    const container = containerRef.current
    const content = contentRef.current

    if (!container || !content || sequence.length === 0) return

    const updateScale = () => {
      const containerRect = container.getBoundingClientRect()

      // 总是重新计算原始尺寸，确保准确
      const currentTransform = content.style.transform
      content.style.transform = 'none'
      const contentRect = content.getBoundingClientRect()
      content.style.transform = currentTransform

      const originalWidth = contentRect.width
      const originalHeight = contentRect.height

      if (originalWidth === 0 || originalHeight === 0) return

      // 只根据宽度计算缩放，让高度自然适应
      const newScale = Math.min(containerRect.width / originalWidth, 1)

      setScale(Math.max(newScale, 0.5)) // 最小缩放到 0.5
    }

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateScale)
    })

    resizeObserver.observe(container)

    // 延迟一点执行，确保 DOM 完全渲染
    const timer = setTimeout(updateScale, 100)

    return () => {
      resizeObserver.disconnect()
      clearTimeout(timer)
    }
  }, [sequence.length, isSequenceCollapsed])

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
          <div className="sequence-section">
            {/* 折叠提示 - 悬浮显示 */}
            <div className="collapse-hint" onClick={() => setIsSequenceCollapsed(true)} title="收起数字序列">
              <span className="collapse-icon">▼</span>
              <span className="collapse-hint-text">收起</span>
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
              <div className="sequence-notes-container" ref={containerRef}>
                <div
                  className="sequence-notes"
                  ref={contentRef}
                  style={{ transform: `scale(${scale})` }}
                >
                  {sequence.map((note, idx) => (
                    <span
                      key={idx}
                      className={`sequence-note ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'played' : ''}`}
                      onClick={() => playFromIndex(idx)}
                      title={`从第 ${idx + 1} 个音开始播放`}
                    >
                      {note}
                    </span>
                  ))}
                </div>
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
