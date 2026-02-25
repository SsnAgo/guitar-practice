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

  // 在保证 1-7 各出现一次的基础上继续生成
  // 约束：相邻两个数字不能相同
  const sequence: SolfegeNumber[] = [...base]

  while (sequence.length < safeLength) {
    const prev = sequence[sequence.length - 1]

    // 随机挑选一个 1-7，直到与前一个不同
    let next: SolfegeNumber
    do {
      next = (Math.floor(Math.random() * 7) + 1) as SolfegeNumber
    } while (next === prev)

    sequence.push(next)
  }

  return sequence
}
