import { SolfegeNumber } from '../types/guitar'
import { memo, useState, useEffect } from 'react'
import './ControlPanel.css'

interface ControlPanelProps {
  sequence: SolfegeNumber[]
  bpm: number
  sequenceLength: number
  onGenerate: () => void
  onBpmChange: (bpm: number) => void
  onSequenceLengthChange: (length: number) => void
  prepareDelayMs: number
  onPrepareDelayChange: (ms: number) => void
}

function ControlPanel({
  sequence,
  bpm,
  sequenceLength,
  onGenerate,
  onBpmChange,
  onSequenceLengthChange,
  prepareDelayMs,
  onPrepareDelayChange,
}: ControlPanelProps) {

  // 本地状态用于处理输入框的编辑过程
  const [sequenceLengthInput, setSequenceLengthInput] = useState(sequenceLength.toString())
  const [prepareDelayInput, setPrepareDelayInput] = useState(
    (Math.round(prepareDelayMs / 100) / 10).toFixed(1)
  )

  // 当外部值变化时，同步更新本地输入值
  useEffect(() => {
    setSequenceLengthInput(sequenceLength.toString())
  }, [sequenceLength])

  useEffect(() => {
    // 保留一位小数格式显示
    setPrepareDelayInput((Math.round(prepareDelayMs / 100) / 10).toFixed(1))
  }, [prepareDelayMs])

  return (
    <div className="control-panel console-panel">
      {/* 参数设置 */}
      <div className="console-params">
        <div className="param-group">
          <label>序列长度</label>
          <input
            type="number"
            min={7}
            max={50}
            value={sequenceLengthInput}
            onChange={e => {
              const val = e.target.value
              // 允许空字符串（用户正在删除/输入）
              setSequenceLengthInput(val)
            }}
            onBlur={() => {
              // 失焦时验证并限制范围，然后更新实际值
              const num = parseInt(sequenceLengthInput)
              if (isNaN(num) || num < 7) {
                onSequenceLengthChange(7)
                setSequenceLengthInput('7')
              } else if (num > 50) {
                onSequenceLengthChange(50)
                setSequenceLengthInput('50')
              } else {
                onSequenceLengthChange(num)
              }
            }}
            className="param-input"
          />
        </div>

        <div className="param-group">
          <label>速度 (BPM)</label>
          <div className="bpm-control">
            <input
              type="range"
              min={40}
              max={200}
              value={bpm}
              onChange={e => onBpmChange(parseInt(e.target.value))}
              className="bpm-slider"
            />
            <span className="bpm-value">{bpm}</span>
          </div>
        </div>

        <div className="param-group">
          <label>准备(秒)</label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={prepareDelayInput}
            onChange={e => {
              const val = e.target.value
              // 允许空字符串（用户正在删除/输入）
              // 允许小数输入
              setPrepareDelayInput(val)
            }}
            onKeyDown={e => {
              // 允许输入小数点
              if (e.key === '.') {
                // 如果已经有一个小数点，阻止再次输入
                if (prepareDelayInput.includes('.')) {
                  e.preventDefault()
                }
              }
            }}
            onBlur={() => {
              // 失焦时验证并限制范围，然后更新实际值
              const inputVal = prepareDelayInput.trim()

              // 如果为空或无效，设为 0
              if (inputVal === '' || isNaN(parseFloat(inputVal))) {
                onPrepareDelayChange(0)
                setPrepareDelayInput('0.0')
                return
              }

              const num = parseFloat(inputVal)

              // 限制范围
              if (num < 0) {
                onPrepareDelayChange(0)
                setPrepareDelayInput('0.0')
              } else if (num > 10) {
                onPrepareDelayChange(10000)
                setPrepareDelayInput('10.0')
              } else {
                // 保留一位小数，四舍五入
                const rounded = Math.round(num * 10) / 10
                onPrepareDelayChange(Math.round(rounded * 1000))
                setPrepareDelayInput(rounded.toFixed(1))
              }
            }}
            className="param-input"
          />
        </div>

        <button
          className="btn btn-generate"
          onClick={onGenerate}
        >
          随机生成
        </button>
      </div>
    </div>
  )
}

// 使用自定义比较函数，只在必要时更新
const ControlPanelMemo = memo(ControlPanel, (prevProps, nextProps) => {
  return (
    prevProps.sequence === nextProps.sequence &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.sequenceLength === nextProps.sequenceLength &&
    prevProps.prepareDelayMs === nextProps.prepareDelayMs
  )
})
export default ControlPanelMemo
