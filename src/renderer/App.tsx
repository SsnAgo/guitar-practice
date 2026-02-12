import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import GuitarNeck from './components/GuitarNeck'
import ControlPanel from './components/ControlPanel'
import SettingsPanel from './components/SettingsPanel'
import { useNoteSequence } from './hooks/useNoteSequence'
import { useAudioEngine } from './hooks/useAudioEngine'
import { AppSettings, DoMode, GuitarPosition, MappedNote, NoteName, SolfegeNumber } from './types/guitar'
import { getNoteMidi, midiToTonePitch, midiToNoteName, MAJOR_SCALE_SEMITONES, noteNameToIndex } from './utils/guitarConstants'
import { mapByPitch } from './utils/noteMapping'
import './App.css'

const DEFAULT_SETTINGS: AppSettings = {
  doMode: 'pitch',
  doNoteName: 'C',
  doPosition: { string: 5, fret: 3 },
  bpm: 90,
  sequenceLength: 10,
  prepareDelayMs: 2000,
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isSelectingPosition, setIsSelectingPosition] = useState(false)
  const [tapHighlight, setTapHighlight] = useState<GuitarPosition | null>(null)
  const [tapNoteInfo, setTapNoteInfo] = useState<MappedNote | null>(null)
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
  } = useNoteSequence(settings)

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

      <div className="app-body">
        {/* 设置面板 */}
        <SettingsPanel
          doMode={settings.doMode}
          doNoteName={settings.doNoteName}
          doPosition={settings.doPosition}
          onDoModeChange={handleDoModeChange}
          onDoNoteNameChange={handleDoNoteNameChange}
          isSelectingPosition={isSelectingPosition}
          onToggleSelectPosition={handleToggleSelectPosition}
        />

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

        {/* 控制面板 */}
        <ControlPanel
          sequence={sequence}
          currentIndex={currentIndex}
          playbackState={playbackState}
          currentNote={currentNote}
          bpm={settings.bpm}
          sequenceLength={settings.sequenceLength}
          onGenerate={generate}
          onPlay={play}
          onPlayFromIndex={playFromIndex}
          onPause={pause}
          onResume={resume}
          onStop={stop}
          onBpmChange={handleBpmChange}
          onSequenceLengthChange={handleSequenceLengthChange}
          prepareDelayMs={settings.prepareDelayMs}
          onPrepareDelayChange={handlePrepareDelayChange}
          tapNoteInfo={tapNoteInfo}
        />
      </div>
    </div>
  )
}

export default App
