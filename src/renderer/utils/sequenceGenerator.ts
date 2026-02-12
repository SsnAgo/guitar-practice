import { SolfegeNumber } from '../types/guitar'

const ALL_SOLFEGE: SolfegeNumber[] = [1, 2, 3, 4, 5, 6, 7]

/**
 * Fisher-Yates 洗牌
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 生成随机的简谱数字序列
 * - 长度至少为 7
 * - 在乱序的前提下，保证序列完整包含 1-7 每个数字至少一次
 *
 * @param length 序列长度（若小于 7 会按 7 处理）
 * @returns 1-7 的随机数字数组
 */
export function generateSequence(length: number): SolfegeNumber[] {
  const safeLength = Math.max(7, length)

  // 先乱序得到 1-7 各出现一次
  const base = shuffle(ALL_SOLFEGE)

  if (safeLength === 7) {
    return base
  }

  // 超出 7 的部分用随机 1-7 填充
  const extra: SolfegeNumber[] = []
  for (let i = 0; i < safeLength - 7; i++) {
    extra.push((Math.floor(Math.random() * 7) + 1) as SolfegeNumber)
  }

  return [...base, ...extra]
}
