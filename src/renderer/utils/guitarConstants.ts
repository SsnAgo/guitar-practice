import { NoteName } from '../types/guitar'

/** 吉他弦数 */
export const STRING_COUNT = 6

/** 最大品位数 */
export const MAX_FRET = 14

/** 吉他标准调弦 - 每根弦的空弦音高 (MIDI音高编号)
 * 1弦(最细) E4=64, 2弦 B3=59, 3弦 G3=55, 4弦 D3=50, 5弦 A2=45, 6弦 E2=40
 */
export const STANDARD_TUNING_MIDI: number[] = [64, 59, 55, 50, 45, 40]

/** 吉他标准调弦 - 空弦音名 */
export const STANDARD_TUNING_NAMES: NoteName[] = ['E', 'B', 'G', 'D', 'A', 'E']

/** 所有音名（十二平均律，从C开始） */
export const ALL_NOTE_NAMES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
]

/** 大调音阶中 1-7 相对于 do 的半音数 */
export const MAJOR_SCALE_SEMITONES: number[] = [0, 2, 4, 5, 7, 9, 11]

/** 品位标记位置（通常有圆点的品位） */
export const FRET_MARKERS: number[] = [3, 5, 7, 9, 12]

/** 双圆点标记位置 */
export const DOUBLE_FRET_MARKERS: number[] = [12]

/**
 * 根据音名获取其在十二平均律中的索引 (C=0, C#=1, ..., B=11)
 */
export function noteNameToIndex(name: NoteName): number {
  return ALL_NOTE_NAMES.indexOf(name)
}

/**
 * 根据索引获取音名 (0=C, 1=C#, ..., 11=B)
 */
export function indexToNoteName(index: number): NoteName {
  return ALL_NOTE_NAMES[((index % 12) + 12) % 12]
}

/**
 * 根据 MIDI 编号获取 Tone.js 可用的音高字符串 (如 "C4", "D#3")
 */
export function midiToTonePitch(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return `${ALL_NOTE_NAMES[noteIndex]}${octave}`
}

/**
 * 根据 MIDI 编号获取音名
 */
export function midiToNoteName(midi: number): NoteName {
  return ALL_NOTE_NAMES[((midi % 12) + 12) % 12]
}

/**
 * 获取某根弦某品位的 MIDI 编号
 * @param stringNum 弦号 1-6
 * @param fret 品位 0-14
 */
export function getNoteMidi(stringNum: number, fret: number): number {
  return STANDARD_TUNING_MIDI[stringNum - 1] + fret
}
