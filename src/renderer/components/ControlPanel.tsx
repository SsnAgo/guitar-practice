import { PlaybackState, SolfegeNumber, MappedNote } from '../types/guitar'
import { memo, useMemo } from 'react'
import './ControlPanel.css'

/** 简谱数字对应的唱名 */
const SOLFEGE_NAMES: Record<number, string> = {
  1: 'do', 2: 're', 3: 'mi', 4: 'fa', 5: 'sol', 6: 'la', 7: 'si'
}

interface ControlPanelProps {
  sequence: SolfegeNumber[]
  currentIndex: number
  playbackState: PlaybackState
  currentNote: MappedNote | null
  bpm: number
  sequenceLength: number
  onGenerate: () => void
  onPlay: () => void
  onPlayFromIndex: (index: number) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
  onSequenceLengthChange: (length: number) => void
  prepareDelayMs: number
  onPrepareDelayChange: (ms: number) => void
  tapNoteInfo: MappedNote | null
}

/**
 * 单个序列音符组件 - 使用 memo 优化，只在自身状态变化时重渲染
 */
const SequenceNoteItem = memo(function SequenceNoteItem({
  note,
  index,
  currentIndex,
  onPlayFromIndex
}: {
  note: SolfegeNumber
  index: number
  currentIndex: number
  onPlayFromIndex: (index: number) => void
}) {
  // 预计算 className，避免内联字符串拼接
  const className = useMemo(() => {
    const classes = ['sequence-note']
    if (index === currentIndex) classes.push('active')
    if (index < currentIndex) classes.push('played')
    return classes.join(' ')
  }, [index, currentIndex])

  return (
    <span
      className={className}
      onClick={() => onPlayFromIndex(index)}
      title={`从第 ${index + 1} 个音开始播放`}
    >
      {note}
    </span>
  )
})

function ControlPanel({
  sequence,
  currentIndex,
  playbackState,
  currentNote,
  bpm,
  sequenceLength,
  onGenerate,
  onPlay,
  onPlayFromIndex,
  onPause,
  onResume,
  onStop,
  onBpmChange,
  onSequenceLengthChange,
  prepareDelayMs,
  onPrepareDelayChange,
  tapNoteInfo,
}: ControlPanelProps) {

  // 显示的音符信息：点击试音优先（刚点击时显示点击的音），否则显示当前播放
  const displayNote = tapNoteInfo || currentNote

  return (
    <div className="control-panel">
      {/* 参数设置行 */}
      <div className="control-row params-row">
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
                // 清空输入框时设置为 0
                onPrepareDelayChange(0)
              }
            }}
            className="param-input"
          />
        </div>

        <button
          className="btn btn-generate"
          onClick={onGenerate}
          disabled={playbackState === 'playing'}
        >
          随机生成
        </button>
      </div>

      {/* 序列显示 - 使用优化的 SequenceNoteItem */}
      {sequence.length > 0 && (
        <div className="sequence-display">
          <div className="sequence-label">当前序列：</div>
          <div className="sequence-notes">
            {sequence.map((note, idx) => (
              <SequenceNoteItem
                key={idx}
                note={note}
                index={idx}
                currentIndex={currentIndex}
                onPlayFromIndex={onPlayFromIndex}
              />
            ))}
          </div>
        </div>
      )}

      {/* 播放控制 */}
      <div className="control-row playback-row">
        <div className="playback-buttons">
          {playbackState === 'idle' && (
            <button
              className="btn btn-play"
              onClick={onPlay}
              disabled={sequence.length === 0}
            >
              ▶ 播放
            </button>
          )}
          {playbackState === 'playing' && (
            <button className="btn btn-pause" onClick={onPause}>
              ⏸ 暂停
            </button>
          )}
          {playbackState === 'paused' && (
            <button className="btn btn-play" onClick={onResume}>
              ▶ 继续
            </button>
          )}
          {playbackState !== 'idle' && (
            <button className="btn btn-stop" onClick={onStop}>
              ⏹ 停止
            </button>
          )}
        </div>

        {/* 当前音符信息 (播放中 或 点击试音) */}
        {displayNote && (
          <div className={`current-note-info ${tapNoteInfo ? 'tap-info' : ''}`}>
            {displayNote.solfege >= 1 && displayNote.solfege <= 7 && (
              <span className="note-solfege">{displayNote.solfege} ({SOLFEGE_NAMES[displayNote.solfege]})</span>
            )}
            <span className="note-pitch">{displayNote.noteName}</span>
            <span className="note-position">{displayNote.position.string}弦{displayNote.position.fret}品</span>
          </div>
        )}

        {/* 播放进度 */}
        {sequence.length > 0 && (
          <div className="progress-info">
            {currentIndex >= 0 ? currentIndex + 1 : 0} / {sequence.length}
          </div>
        )}
      </div>
    </div>
  )
}

// 使用自定义比较函数，只在必要时更新
const ControlPanelMemo = memo(ControlPanel, (prevProps, nextProps) => {
  return (
    prevProps.sequence === nextProps.sequence &&
    prevProps.currentIndex === nextProps.currentIndex &&
    prevProps.playbackState === nextProps.playbackState &&
    prevProps.currentNote === nextProps.currentNote &&
    prevProps.tapNoteInfo === nextProps.tapNoteInfo &&
    prevProps.bpm === nextProps.bpm &&
    prevProps.sequenceLength === nextProps.sequenceLength &&
    prevProps.prepareDelayMs === nextProps.prepareDelayMs
  )
})
export default ControlPanelMemo
