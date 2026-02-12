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
    if (isInitializedRef.current) {
      // 已经初始化，确保连接到输出
      return
    }

    try {
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
    } catch (error) {
      console.error('Audio engine initialization failed:', error)
    }
  }, [])

  /**
   * 尝试预热音频引擎
   * 在应用启动时调用，如果浏览器允许则提前初始化
   */
  const warmup = useCallback(async () => {
    if (isInitializedRef.current) {
      return
    }

    try {
      // 尝试启动 AudioContext
      await Tone.start()

      // 创建合成器并连接到输出
      synthRef.current = new Tone.PluckSynth({
        attackNoise: 1.2,
        dampening: 4000,
        resonance: 0.95,
        release: 1.2,
      }).toDestination()

      isInitializedRef.current = true
    } catch {
      // 预热失败（浏览器需要用户交互）是正常的，忽略错误
      // 首次用户交互时会重新初始化
    }
  }, [])

  /**
   * 播放一个音符
   * @param pitch Tone.js 音高字符串，如 "C4", "D#3"
   * @param duration 持续时间，默认 "8n" (八分音符)
   */
  const playNote = useCallback(async (pitch: string, duration: string = '8n') => {
    // 确保已初始化
    if (!isInitializedRef.current) {
      await init()
    }

    // 确保合成器存在
    if (!synthRef.current) {
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
    warmup,
    playNote,
    isInitialized: isInitializedRef.current
  }
}
