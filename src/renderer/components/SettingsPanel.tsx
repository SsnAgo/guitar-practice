import { DoMode, GuitarPosition, NoteName } from '../types/guitar'
import { ALL_NOTE_NAMES } from '../utils/guitarConstants'
import { getPositionInfo } from '../utils/noteMapping'
import './SettingsPanel.css'

interface SettingsPanelProps {
  doMode: DoMode
  doNoteName: NoteName
  doPosition: GuitarPosition
  onDoModeChange: (mode: DoMode) => void
  onDoNoteNameChange: (name: NoteName) => void
  /** 是否处于选择位置模式 */
  isSelectingPosition: boolean
  onToggleSelectPosition: () => void
}

export default function SettingsPanel({
  doMode,
  doNoteName,
  doPosition,
  onDoModeChange,
  onDoNoteNameChange,
  isSelectingPosition,
  onToggleSelectPosition,
}: SettingsPanelProps) {

  const posInfo = getPositionInfo(doPosition)

  return (
    <div className="settings-panel">
      <div className="settings-title">Do (1) 设置</div>

      <div className="mode-switch">
        <button
          className={`mode-btn ${doMode === 'pitch' ? 'active' : ''}`}
          onClick={() => onDoModeChange('pitch')}
        >
          按音高移调
        </button>
        <button
          className={`mode-btn ${doMode === 'position' ? 'active' : ''}`}
          onClick={() => onDoModeChange('position')}
        >
          按位置指定
        </button>
      </div>

      {doMode === 'pitch' && (
        <div className="pitch-selector">
          <span className="selector-label">Do =</span>
          <div className="note-buttons">
            {ALL_NOTE_NAMES.map(name => (
              <button
                key={name}
                className={`note-btn ${name === doNoteName ? 'active' : ''}`}
                onClick={() => onDoNoteNameChange(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {doMode === 'position' && (
        <div className="position-selector">
          <div className="position-info">
            <span className="selector-label">Do 位置：</span>
            <span className="position-value">
              {doPosition.string}弦{doPosition.fret}品 ({posInfo.noteName})
            </span>
          </div>
          <button
            className={`btn-select-pos ${isSelectingPosition ? 'selecting' : ''}`}
            onClick={onToggleSelectPosition}
          >
            {isSelectingPosition ? '点击琴颈选择...' : '在琴颈上选择位置'}
          </button>
        </div>
      )}
    </div>
  )
}
