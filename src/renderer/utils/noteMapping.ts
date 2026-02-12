import { GuitarPosition, MappedNote, NoteName, SolfegeNumber } from '../types/guitar'
import {
  MAJOR_SCALE_SEMITONES,
  STANDARD_TUNING_MIDI,
  MAX_FRET,
  noteNameToIndex,
  midiToTonePitch,
  midiToNoteName,
  getNoteMidi
} from './guitarConstants'

/**
 * C大调标准指法映射（常用把位）
 * 简谱 -> {string, fret}
 */
const C_MAJOR_STANDARD_POSITIONS: Record<number, GuitarPosition> = {
  1: { string: 5, fret: 3 },  // C - 五弦3品
  2: { string: 4, fret: 0 },  // D - 四弦空弦
  3: { string: 4, fret: 2 },  // E - 四弦2品
  4: { string: 4, fret: 3 },  // F - 四弦3品
  5: { string: 3, fret: 0 },  // G - 三弦空弦
  6: { string: 3, fret: 2 },  // A - 三弦2品
  7: { string: 2, fret: 0 },  // B - 二弦空弦
}

/**
 * 全局缓存：预计算所有可能的音符映射
 * 缓存结构：cache[solfege][doMode][doValue] = MappedNote
 */
const NOTE_CACHE = new Map<string, MappedNote>()

/**
 * 生成缓存键
 */
function getCacheKey(solfege: SolfegeNumber, doMode: string, doValue: string): string {
  return `${solfege}-${doMode}-${doValue}`
}

/**
 * 预计算并缓存某个设置下的所有音符映射
 */
function precomputeMappings(
  solfege: SolfegeNumber,
  doMode: 'pitch' | 'position',
  doNoteName?: NoteName,
  doPosition?: GuitarPosition
): MappedNote {
  const doValue = doMode === 'pitch' ? doNoteName! : `${doPosition?.string}-${doPosition?.fret}`
  const cacheKey = getCacheKey(solfege, doMode, doValue)

  // 检查缓存
  if (NOTE_CACHE.has(cacheKey)) {
    return NOTE_CACHE.get(cacheKey)!
  }

  // 计算并缓存
  let result: MappedNote
  if (doMode === 'pitch') {
    result = mapByPitchImpl(solfege, doNoteName!)
  } else {
    result = mapByPositionImpl(solfege, doPosition!)
  }

  NOTE_CACHE.set(cacheKey, result)
  return result
}

/**
 * 根据音高（音名）移调模式，映射简谱数字到吉他位置
 *
 * @param solfege 简谱数字 1-7
 * @param doNoteName do 对应的音名 (如 'C', 'D', 'G' 等)
 * @returns MappedNote
 */
export function mapByPitch(solfege: SolfegeNumber, doNoteName: NoteName): MappedNote {
  // 使用缓存
  return precomputeMappings(solfege, 'pitch', doNoteName)
}

/**
 * 根据位置指定模式，映射简谱数字到吉他位置
 *
 * @param solfege 简谱数字 1-7
 * @param doPosition do(1) 在吉他上的位置
 * @returns MappedNote
 */
export function mapByPosition(solfege: SolfegeNumber, doPosition: GuitarPosition): MappedNote {
  // 使用缓存
  return precomputeMappings(solfege, 'position', undefined, doPosition)
}

/**
 * 根据音高（音名）移调模式，映射简谱数字到吉他位置（内部实现，无缓存）
 */
function mapByPitchImpl(solfege: SolfegeNumber, doNoteName: NoteName): MappedNote {
  // 如果是C大调，直接用标准指法
  if (doNoteName === 'C') {
    const pos = C_MAJOR_STANDARD_POSITIONS[solfege]
    const midi = getNoteMidi(pos.string, pos.fret)
    return {
      solfege,
      position: pos,
      pitch: midiToTonePitch(midi),
      noteName: midiToNoteName(midi)
    }
  }

  // 其他调：计算C大调到目标调的移调半音差
  const transposeSemitones = noteNameToIndex(doNoteName) - noteNameToIndex('C')

  // 在C大调标准位置基础上移调
  const cPos = C_MAJOR_STANDARD_POSITIONS[solfege]
  const cMidi = getNoteMidi(cPos.string, cPos.fret)
  const targetMidi = cMidi + transposeSemitones

  // 寻找最优的吉他位置 (尽量靠近原有把位)
  const position = findBestPosition(targetMidi, cPos)

  return {
    solfege,
    position,
    pitch: midiToTonePitch(targetMidi),
    noteName: midiToNoteName(targetMidi)
  }
}

/**
 * 根据位置指定模式，映射简谱数字到吉他位置（内部实现，无缓存）
 */
function mapByPositionImpl(solfege: SolfegeNumber, doPosition: GuitarPosition): MappedNote {
  const doMidi = getNoteMidi(doPosition.string, doPosition.fret)
  const semitoneOffset = MAJOR_SCALE_SEMITONES[solfege - 1]
  const targetMidi = doMidi + semitoneOffset

  // 从 do 的位置出发寻找最佳位置
  const position = findBestPositionFromDo(targetMidi, doPosition)

  return {
    solfege,
    position,
    pitch: midiToTonePitch(targetMidi),
    noteName: midiToNoteName(targetMidi)
  }
}

/**
 * 寻找最优吉他位置 (靠近参考位置)
 * 优化：提前计算目标品位范围，减少循环
 */
function findBestPosition(targetMidi: number, referencePos: GuitarPosition): GuitarPosition {
  let bestPos: GuitarPosition = { string: 1, fret: 0 }
  let bestDistance = Infinity

  for (let s = 1; s <= 6; s++) {
    const openMidi = STANDARD_TUNING_MIDI[s - 1]
    const fret = targetMidi - openMidi
    if (fret >= 0 && fret <= MAX_FRET) {
      // 距离参考位置越近越好
      const distance = Math.abs(fret - referencePos.fret) + Math.abs(s - referencePos.string) * 2
      if (distance < bestDistance) {
        bestDistance = distance
        bestPos = { string: s, fret }
      }
    }
  }

  return bestPos
}

/**
 * 从 do 的位置出发寻找最佳位置
 * 优先在相邻弦和相近品位上找
 */
function findBestPositionFromDo(targetMidi: number, doPosition: GuitarPosition): GuitarPosition {
  let bestPos: GuitarPosition = { string: 1, fret: 0 }
  let bestScore = Infinity

  for (let s = 1; s <= 6; s++) {
    const openMidi = STANDARD_TUNING_MIDI[s - 1]
    const fret = targetMidi - openMidi
    if (fret >= 0 && fret <= MAX_FRET) {
      // 优先选择品位差小、弦距离近的位置
      const fretDiff = Math.abs(fret - doPosition.fret)
      const stringDiff = Math.abs(s - doPosition.string)
      const score = fretDiff * 1.5 + stringDiff * 2
      if (score < bestScore) {
        bestScore = score
        bestPos = { string: s, fret }
      }
    }
  }

  return bestPos
}

/**
 * 获取指定位置的音名和音高信息
 */
export function getPositionInfo(position: GuitarPosition): { noteName: NoteName; pitch: string } {
  const midi = getNoteMidi(position.string, position.fret)
  return {
    noteName: midiToNoteName(midi),
    pitch: midiToTonePitch(midi)
  }
}
