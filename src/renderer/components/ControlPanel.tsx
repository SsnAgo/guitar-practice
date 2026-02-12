import { SolfegeNumber } from '../types/guitar'
import { memo } from 'react'
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
            value={sequenceLength}
            onChange={e => onSequenceLengthChange(Math.max(7, Math.min(50, parseInt(e.target.value) || 8)))}
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
            step={0.5}
            value={prepareDelayMs / 1000}
            onChange={e => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val)) {
                onPrepareDelayChange(Math.max(0, Math.min(10000, Math.round(val * 1000))))
              } else {
                onPrepareDelayChange(0)
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
