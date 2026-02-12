import { useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'

/**
 * 音频引擎 Hook
 * 封装 Tone.js，提供吉他音色的音符播放能力
 */
export function useAudioEngine() {
  const synthRef = useRef<Tone.PluckSynth | null>(null)
  const isInitializedRef = useRef(false)

  /** 初始化 Tone.js 和合成器 */
  const init = useCallback(async () => {
    if (isInitializedRef.current) return

    // 需要用户交互后才能启动 AudioContext
    await Tone.start()

    // 使用 PluckSynth 模拟拨弦音色
    synthRef.current = new Tone.PluckSynth({
      attackNoise: 1.2,
      dampening: 4000,
      resonance: 0.95,
      release: 1.2,
    }).toDestination()

    isInitializedRef.current = true
  }, [])

  /**
   * 播放一个音符
   * @param pitch Tone.js 音高字符串，如 "C4", "D#3"
   * @param duration 持续时间，默认 "8n" (八分音符)
   */
  const playNote = useCallback(async (pitch: string, duration: string = '8n') => {
    if (!isInitializedRef.current) {
      await init()
    }

    if (synthRef.current) {
      synthRef.current.triggerAttackRelease(pitch, duration)
    }
  }, [init])

  /** 清理资源 */
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
      isInitializedRef.current = false
    }
  }, [])

  return {
    init,
    playNote,
    isInitialized: isInitializedRef.current
  }
}
