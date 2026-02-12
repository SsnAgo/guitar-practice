import { useState, useRef, useCallback, useEffect } from 'react'
import { PlaybackState, SolfegeNumber, MappedNote, AppSettings } from '../types/guitar'
import { generateSequence } from '../utils/sequenceGenerator'
import { mapByPitch, mapByPosition } from '../utils/noteMapping'
import { useAudioEngine } from './useAudioEngine'

/**
 * 音符序列播放控制 Hook
 * 使用混合调度方式：Tone.js 处理音频，setTimeout 处理循环控制
 */
export function useNoteSequence(settings: AppSettings) {
  const [sequence, setSequence] = useState<SolfegeNumber[]>([])
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  // 合并状态，减少重渲染
  const [playbackInfo, setPlaybackInfo] = useState<{
    currentIndex: number
    currentNote: MappedNote | null
  }>({ currentIndex: -1, currentNote: null })

  // 定时器引用
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 状态 refs (用于回调中访问最新值)
  const playbackStateRef = useRef<PlaybackState>('idle')
  const currentIndexRef = useRef(-1)
  const sequenceRef = useRef<SolfegeNumber[]>([])
  const settingsRef = useRef(settings)
  const mappedNotesRef = useRef<MappedNote[]>([])

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

  /** 预先计算所有音符映射，避免播放时重复计算 */
  useEffect(() => {
    const mapped = sequence.map(solfege => {
      const s = settingsRef.current
      if (s.doMode === 'pitch') {
        return mapByPitch(solfege, s.doNoteName)
      } else {
        return mapByPosition(solfege, s.doPosition)
      }
    })
    mappedNotesRef.current = mapped
  }, [sequence, settings.doMode, settings.doNoteName, settings.doPosition])

  /** 清除准备阶段定时器 */
  const clearPrepareTimer = useCallback(() => {
    if (prepareTimerRef.current) {
      clearTimeout(prepareTimerRef.current)
      prepareTimerRef.current = null
    }
  }, [])

  /** 播放序列中指定索引的音符 */
  const playNoteAtIndex = useCallback(async (index: number) => {
    const seq = sequenceRef.current
    if (index >= seq.length) {
      // 播放完毕 - 批量重置状态
      setPlaybackState('idle')
      playbackStateRef.current = 'idle'
      setPlaybackInfo({ currentIndex: -1, currentNote: null })
      currentIndexRef.current = -1
      return
    }

    const mapped = mappedNotesRef.current[index]
    if (!mapped) return

    // 批量更新状态，减少重渲染
    setPlaybackInfo({ currentIndex: index, currentNote: mapped })
    currentIndexRef.current = index

    // 播放声音
    await playNote(mapped.pitch, '4n')

    // 如果仍在播放状态，调度下一个音符
    if (playbackStateRef.current === 'playing') {
      const bpm = settingsRef.current.bpm
      const intervalMs = (60 / bpm) * 1000

      timerRef.current = setTimeout(() => {
        if (playbackStateRef.current === 'playing') {
          playNoteAtIndex(index + 1)
        }
      }, intervalMs)
    }
  }, [playNote])

  /** 生成新的随机序列 */
  const generate = useCallback(() => {
    stop()
    const newSeq = generateSequence(settings.sequenceLength)
    setSequence(newSeq)
    sequenceRef.current = newSeq
    setPlaybackInfo({ currentIndex: -1, currentNote: null })
    currentIndexRef.current = -1
  }, [settings.sequenceLength])

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
    clearPrepareTimer()

    setPlaybackState('playing')
    playbackStateRef.current = 'playing'

    playNoteAtIndex(index)
  }, [initAudio, playNoteAtIndex, clearPrepareTimer])

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
    if (nextIndex < sequenceRef.current.length) {
      playNoteAtIndex(nextIndex)
    }
  }, [initAudio, playNoteAtIndex])

  /** 停止播放 */
  const stop = useCallback(() => {
    setPlaybackState('idle')
    playbackStateRef.current = 'idle'
    setPlaybackInfo({ currentIndex: -1, currentNote: null })
    currentIndexRef.current = -1
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
    currentIndex: playbackInfo.currentIndex,
    playbackState,
    currentNote: playbackInfo.currentNote,
    generate,
    play,
    playFromIndex,
    pause,
    resume,
    stop
  }
}
