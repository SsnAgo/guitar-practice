import { useState, useRef, useCallback, useEffect } from 'react'
import { PlaybackState, SolfegeNumber, MappedNote, AppSettings } from '../types/guitar'
import { generateSequence } from '../utils/sequenceGenerator'
import { mapByPitch, mapByPosition } from '../utils/noteMapping'
import { useAudioEngine } from './useAudioEngine'

/**
 * 音符序列播放控制 Hook
 */
export function useNoteSequence(settings: AppSettings) {
  const [sequence, setSequence] = useState<SolfegeNumber[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [currentNote, setCurrentNote] = useState<MappedNote | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playbackStateRef = useRef<PlaybackState>('idle')
  const currentIndexRef = useRef(-1)
  const sequenceRef = useRef<SolfegeNumber[]>([])
  const settingsRef = useRef(settings)

  const { playNote, init: initAudio } = useAudioEngine()

  // 保持 ref 与最新值同步
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    playbackStateRef.current = playbackState
  }, [playbackState])

  useEffect(() => {
    sequenceRef.current = sequence
  }, [sequence])

  /** 根据当前设置映射简谱数字 */
  const mapNote = useCallback((solfege: SolfegeNumber): MappedNote => {
    const s = settingsRef.current
    if (s.doMode === 'pitch') {
      return mapByPitch(solfege, s.doNoteName)
    } else {
      return mapByPosition(solfege, s.doPosition)
    }
  }, [])

  /** 播放序列中指定索引的音符 */
  const playNoteAtIndex = useCallback(async (index: number) => {
    const seq = sequenceRef.current
    if (index >= seq.length) {
      // 播放完毕
      setPlaybackState('idle')
      playbackStateRef.current = 'idle'
      setCurrentIndex(-1)
      currentIndexRef.current = -1
      setCurrentNote(null)
      return
    }

    const solfege = seq[index]
    const mapped = mapNote(solfege)

    setCurrentIndex(index)
    currentIndexRef.current = index
    setCurrentNote(mapped)

    // 播放声音
    await playNote(mapped.pitch, '4n')

    // 计算下一个音符的延迟时间
    const bpm = settingsRef.current.bpm
    const intervalMs = (60 / bpm) * 1000

    timerRef.current = setTimeout(() => {
      if (playbackStateRef.current === 'playing') {
        playNoteAtIndex(index + 1)
      }
    }, intervalMs)
  }, [mapNote, playNote])

  /** 生成新的随机序列 */
  const generate = useCallback(() => {
    stop() // 先停止当前播放
    const newSeq = generateSequence(settings.sequenceLength)
    setSequence(newSeq)
    sequenceRef.current = newSeq
    setCurrentIndex(-1)
    currentIndexRef.current = -1
    setCurrentNote(null)
  }, [settings.sequenceLength])

  /** 清除准备阶段定时器 */
  const clearPrepareTimer = useCallback(() => {
    if (prepareTimerRef.current) {
      clearTimeout(prepareTimerRef.current)
      prepareTimerRef.current = null
    }
  }, [])

  /** 开始播放（从头开始，带准备延迟） */
  const play = useCallback(async () => {
    await initAudio()

    if (sequenceRef.current.length === 0) return

    // 清除旧定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    clearPrepareTimer()

    setPlaybackState('playing')
    playbackStateRef.current = 'playing'

    const delay = settingsRef.current.prepareDelayMs
    if (delay > 0) {
      // 准备阶段：等待指定时间后再播放第一个音
      prepareTimerRef.current = setTimeout(() => {
        prepareTimerRef.current = null
        if (playbackStateRef.current === 'playing') {
          playNoteAtIndex(0)
        }
      }, delay)
    } else {
      // 无准备时间，立即播放
      playNoteAtIndex(0)
    }
  }, [initAudio, playNoteAtIndex, clearPrepareTimer])

  /** 从指定位置开始播放 */
  const playFromIndex = useCallback(async (index: number) => {
    await initAudio()

    if (sequenceRef.current.length === 0) return
    if (index < 0 || index >= sequenceRef.current.length) return

    // 清除旧定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setPlaybackState('playing')
    playbackStateRef.current = 'playing'

    playNoteAtIndex(index)
  }, [initAudio, playNoteAtIndex])

  /** 暂停播放 */
  const pause = useCallback(() => {
    setPlaybackState('paused')
    playbackStateRef.current = 'paused'
    clearPrepareTimer()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [clearPrepareTimer])

  /** 继续播放 */
  const resume = useCallback(async () => {
    await initAudio()

    setPlaybackState('playing')
    playbackStateRef.current = 'playing'

    // 从下一个音符继续
    const nextIndex = currentIndexRef.current + 1
    playNoteAtIndex(nextIndex)
  }, [initAudio, playNoteAtIndex])

  /** 停止播放 */
  const stop = useCallback(() => {
    setPlaybackState('idle')
    playbackStateRef.current = 'idle'
    setCurrentIndex(-1)
    currentIndexRef.current = -1
    setCurrentNote(null)
    clearPrepareTimer()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [clearPrepareTimer])

  /** 清理 */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (prepareTimerRef.current) {
        clearTimeout(prepareTimerRef.current)
      }
    }
  }, [])

  return {
    sequence,
    currentIndex,
    playbackState,
    currentNote,
    generate,
    play,
    playFromIndex,
    pause,
    resume,
    stop
  }
}
