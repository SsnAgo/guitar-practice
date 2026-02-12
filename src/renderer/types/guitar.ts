/** 吉他上的位置 */
export interface GuitarPosition {
  /** 弦号: 1(最细/高音E) ~ 6(最粗/低音E) */
  string: number
  /** 品位: 0(空弦) ~ 14 */
  fret: number
}

/** 简谱音符 (1-7) */
export type SolfegeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** 应用状态（用于持久化） */
export interface AppState {
  /** 序列是否折叠 */
  isSequenceCollapsed: boolean
  /** 当前序列（可选） */
  sequence?: SolfegeNumber[]
  /** 播放状态（可选） */
  playbackState?: PlaybackState
  /** 当前播放到的索引（可选） */
  currentIndex?: number
}

/** 十二平均律音名 */
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

/** 映射后的音符信息 */
export interface MappedNote {
  /** 简谱数字 (1-7)，0 表示不在当前大调音阶内 */
  solfege: SolfegeNumber | 0
  /** 吉他位置 */
  position: GuitarPosition
  /** Tone.js 可用的音高表示 (如 "C4", "D4") */
  pitch: string
  /** 音名 */
  noteName: NoteName
}

/** do 的定位模式 */
export type DoMode = 'pitch' | 'position'

/** 应用设置 */
export interface AppSettings {
  /** do 的定位模式: 'pitch' 按音高移调, 'position' 按位置指定 */
  doMode: DoMode
  /** 音高移调模式：do 对应的音名 */
  doNoteName: NoteName
  /** 位置指定模式：do 在吉他上的位置 */
  doPosition: GuitarPosition
  /** 播放速度 BPM */
  bpm: number
  /** 序列长度 */
  sequenceLength: number
  /** 从头播放前的准备等待时间（毫秒），0 表示立即播放 */
  prepareDelayMs: number
}

/** 播放状态 */
export type PlaybackState = 'idle' | 'playing' | 'paused'

/** 播放控制器状态 */
export interface PlaybackStatus {
  state: PlaybackState
  /** 当前播放到第几个音符 (0-indexed) */
  currentIndex: number
  /** 当前序列 */
  sequence: SolfegeNumber[]
}
