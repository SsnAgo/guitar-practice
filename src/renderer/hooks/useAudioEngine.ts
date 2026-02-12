import { useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'

/**
 * 音频引擎 Hook
 * 封装 Tone.js，提供吉他音色的音符播放能力
 */
export function useAudioEngine() {
  const synthRef = useRef<Tone.PluckSynth | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)
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

      // 创建混响效果，增加空间感
      reverbRef.current = new Tone.Reverb({
        decay: 3.5,      // 混响衰减时间（更长）
        preDelay: 0.01,  // 预延迟
        wet: 0.3         // 混响混合比例（稍微增加）
      }).toDestination()

      // 等待混响加载完成
      await reverbRef.current.generate()

      // 使用 PluckSynth 模拟拨弦音色，调整参数更柔和
      synthRef.current = new Tone.PluckSynth({
        attackNoise: 2,      // 增加拨弦感
        dampening: 8000,     // 提高高频衰减，让高音更明亮响亮
        resonance: 0.92,     // 稍微增加共鸣
        release: 4,          // 更长的延音（4秒）
      }).connect(reverbRef.current)

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

      // 创建混响
      reverbRef.current = new Tone.Reverb({
        decay: 3.5,
        preDelay: 0.01,
        wet: 0.3
      }).toDestination()
      await reverbRef.current.generate()

      // 创建合成器并连接到混响
      synthRef.current = new Tone.PluckSynth({
        attackNoise: 2,
        dampening: 8000,
        resonance: 0.92,
        release: 4,
      }).connect(reverbRef.current)

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
      if (reverbRef.current) {
        reverbRef.current.dispose()
        reverbRef.current = null
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
