import { GuitarPosition } from '../types/guitar'
import {
  STRING_COUNT,
  MAX_FRET,
  FRET_MARKERS,
  DOUBLE_FRET_MARKERS,
  STANDARD_TUNING_NAMES
} from '../utils/guitarConstants'
import { useMemo, memo, useRef, useCallback } from 'react'
import './GuitarNeck.css'

interface GuitarNeckProps {
  /** 当前播放高亮的位置 */
  highlightPosition?: GuitarPosition | null
  /** 点击试音高亮的位置 */
  tapHighlight?: GuitarPosition | null
  /** 点击某个位置的回调 */
  onPositionClick?: (position: GuitarPosition) => void
  /** 是否处于选择do位置模式 */
  isSelectingDo?: boolean
  /** do 的位置 (显示 do 标记) */
  doPosition?: GuitarPosition | null
}

// SVG 尺寸和布局参数
const SVG_WIDTH = 1100
const SVG_HEIGHT = 260
const PADDING_LEFT = 60    // 左侧留出弦名空间
const PADDING_RIGHT = 60   // 右侧留出琴头空间
const PADDING_TOP = 30
const PADDING_BOTTOM = 30
const NECK_WIDTH = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT
const NECK_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM
const STRING_SPACING = NECK_HEIGHT / (STRING_COUNT - 1)

/**
 * 计算品位的 X 坐标 (品位从左到右: 1品到14品, 琴头在右侧)
 *
 * 真实吉他品位公式（十二平均律）:
 *   第 n 品到琴枕的距离 = scaleLength * (1 - 1 / 2^(n/12))
 *
 * 将 0~14 品的范围映射到指板宽度内
 */
const FRET_14_RATIO = 1 - Math.pow(2, -MAX_FRET / 12) // 14品占总弦长的比例

function getFretX(fret: number): number {
  if (fret === 0) return PADDING_LEFT
  const ratio = (1 - Math.pow(2, -fret / 12)) / FRET_14_RATIO
  return PADDING_LEFT + ratio * NECK_WIDTH
}

/** 获取品位中间位置 (用于放置标记点) */
function getFretCenterX(fret: number): number {
  if (fret === 0) return PADDING_LEFT - 15 // 空弦标记在琴枕左侧
  const left = getFretX(fret - 1)
  const right = getFretX(fret)
  return (left + right) / 2
}

/** 获取弦的 Y 坐标 (1弦最细在最上面，6弦最粗在最下面 -- 但俯视角6弦在下) */
function getStringY(stringNum: number): number {
  // stringNum: 1=最细(上), 6=最粗(下)
  return PADDING_TOP + (stringNum - 1) * STRING_SPACING
}

/**
 * 静态琴颈层 - 只渲染一次，包含品丝、弦、标记等不变元素
 */
const StaticNeckLayer = memo(function StaticNeckLayer() {
  return (
    <g className="static-neck-layer">
      {/* 指板背景 */}
      <rect
        x={PADDING_LEFT}
        y={PADDING_TOP - 8}
        width={NECK_WIDTH}
        height={NECK_HEIGHT + 16}
        rx={4}
        fill="#5D3A1A"
        opacity={0.9}
      />

      {/* 琴枕 (左侧) */}
      <rect
        x={PADDING_LEFT - 3}
        y={PADDING_TOP - 10}
        width={6}
        height={NECK_HEIGHT + 20}
        fill="#F5F0E8"
        rx={2}
      />

      {/* 品丝 (垂直线) */}
      {Array.from({ length: MAX_FRET }, (_, i) => i + 1).map(fret => (
        <line
          key={`fret-${fret}`}
          x1={getFretX(fret)}
          y1={PADDING_TOP - 8}
          x2={getFretX(fret)}
          y2={PADDING_TOP + NECK_HEIGHT + 8}
          stroke="#C0C0C0"
          strokeWidth={2}
        />
      ))}

      {/* 品位标记 (圆点) */}
      {FRET_MARKERS.filter(f => !DOUBLE_FRET_MARKERS.includes(f)).map(fret => (
        <circle
          key={`marker-${fret}`}
          cx={getFretCenterX(fret)}
          cy={PADDING_TOP + NECK_HEIGHT / 2}
          r={6}
          fill="#D4C4A0"
          opacity={0.6}
        />
      ))}

      {/* 12品双圆点 */}
      {DOUBLE_FRET_MARKERS.map(fret => (
        <g key={`dmarker-${fret}`}>
          <circle
            cx={getFretCenterX(fret)}
            cy={PADDING_TOP + NECK_HEIGHT / 2 - STRING_SPACING * 1.2}
            r={6}
            fill="#D4C4A0"
            opacity={0.6}
          />
          <circle
            cx={getFretCenterX(fret)}
            cy={PADDING_TOP + NECK_HEIGHT / 2 + STRING_SPACING * 1.2}
            r={6}
            fill="#D4C4A0"
            opacity={0.6}
          />
        </g>
      ))}

      {/* 品位编号 */}
      {[1, 3, 5, 7, 9, 12, 14].map(fret => (
        <text
          key={`fnum-${fret}`}
          x={getFretCenterX(fret)}
          y={PADDING_TOP - 16}
          textAnchor="middle"
          fontSize={11}
          fill="#999"
        >
          {fret}
        </text>
      ))}

      {/* 弦 */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i + 1).map(stringNum => {
        const y = getStringY(stringNum)
        // 弦的粗细 (1弦最细, 6弦最粗)
        const thickness = 0.8 + (stringNum - 1) * 0.4
        return (
          <line
            key={`string-${stringNum}`}
            x1={PADDING_LEFT}
            y1={y}
            x2={PADDING_LEFT + NECK_WIDTH}
            y2={y}
            stroke={stringNum <= 3 ? '#E8E0D0' : '#C8A860'}
            strokeWidth={thickness}
            opacity={0.9}
          />
        )
      })}

      {/* 弦名标签 (左侧) */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i + 1).map(stringNum => (
        <text
          key={`sname-${stringNum}`}
          x={PADDING_LEFT - 25}
          y={getStringY(stringNum) + 4}
          textAnchor="middle"
          fontSize={13}
          fill="#aaa"
          fontWeight="bold"
        >
          {stringNum}{STANDARD_TUNING_NAMES[stringNum - 1]}
        </text>
      ))}
    </g>
  )
})

/**
 * 点击区域层 - 预计算并缓存，使用事件委托
 */
function ClickAreasLayer({
  onClick,
  isSelectingDo
}: {
  onClick: (position: GuitarPosition) => void
  isSelectingDo: boolean
}) {
  // 预计算所有点击区域的位置，避免渲染时重复计算
  const clickAreas = useMemo(() => {
    const areas: Array<{ string: number; fret: number; x: number; y: number; width: number; height: number }> = []
    for (let s = 1; s <= STRING_COUNT; s++) {
      for (let f = 0; f <= MAX_FRET; f++) {
        const stringY = getStringY(s)
        const fretLeft = f === 0 ? PADDING_LEFT - 30 : getFretX(f - 1)
        const fretRight = getFretX(f)
        const fretWidth = fretRight - fretLeft

        // 方形点击区域：长80%，宽50%，居中于品格中心
        areas.push({
          string: s,
          fret: f,
          x: fretLeft + fretWidth * 0.1,        // 左侧留10%边距
          y: stringY - STRING_SPACING * 0.25,  // 上下各留25%，使矩形居中
          width: fretWidth * 0.8,              // 品格宽度的80%
          height: STRING_SPACING * 0.5         // 弦间距的50%
        })
      }
    }
    return areas
  }, [])

  // 使用事件委托处理点击，提高性能
  const handleSvgClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement
    // 检查点击的是否是交互区域（rect 或 circle）
    if ((target.tagName === 'rect' || target.tagName === 'circle') && target.hasAttribute('data-string')) {
      const stringNum = parseInt(target.getAttribute('data-string')!, 10)
      const fret = parseInt(target.getAttribute('data-fret')!, 10)
      onClick({ string: stringNum, fret })
    }
  }, [onClick])

  return (
    <g className="click-areas-layer" onClick={handleSvgClick}>
      {/* 可点击区域 (使用事件委托，data 属性用于识别) */}
      {clickAreas.map(({ string, fret, x, y, width, height }) => (
        <rect
          key={`click-${string}-${fret}`}
          x={x}
          y={y}
          width={width}
          height={height}
          fill="transparent"
          cursor={isSelectingDo ? 'crosshair' : 'pointer'}
          data-string={string}
          data-fret={fret}
        >
          <title>{string}弦{fret}品</title>
        </rect>
      ))}
    </g>
  )
}

/**
 * 动态高亮层 - 优化：高亮元素始终存在，只更新位置属性
 * 使用 CSS transform 实现位置变化，性能最佳
 */
const DynamicHighlightLayer = memo(function DynamicHighlightLayer({
  highlightPosition,
  tapHighlight,
  doPosition
}: {
  highlightPosition?: GuitarPosition | null
  tapHighlight?: GuitarPosition | null
  doPosition?: GuitarPosition | null
}) {
  return (
    <g className="dynamic-highlight-layer">
      {/* do 位置标记 */}
      {doPosition && (
        <g className="do-marker">
          <circle
            cx={getFretCenterX(doPosition.fret)}
            cy={getStringY(doPosition.string)}
            r={13}
            fill="none"
            stroke="#4CAF50"
            strokeWidth={2.5}
            strokeDasharray="4 2"
          />
          <text
            x={getFretCenterX(doPosition.fret)}
            y={getStringY(doPosition.string) + 4}
            textAnchor="middle"
            fontSize={10}
            fill="#4CAF50"
            fontWeight="bold"
          >
            do
          </text>
        </g>
      )}

      {/* 点击试音高亮 (蓝色) */}
      {tapHighlight && (
        <g className="tap-highlight">
          <circle
            cx={getFretCenterX(tapHighlight.fret)}
            cy={getStringY(tapHighlight.string)}
            r={16}
            fill="#2196F3"
            opacity={0.25}
          />
          <circle
            cx={getFretCenterX(tapHighlight.fret)}
            cy={getStringY(tapHighlight.string)}
            r={11}
            fill="#2196F3"
            stroke="white"
            strokeWidth={2}
            className="tap-dot"
          />
        </g>
      )}

      {/* 当前播放高亮位置 (红色) - 只渲染一个，位置动态更新 */}
      {highlightPosition && (
        <g className="play-highlight">
          <circle
            cx={getFretCenterX(highlightPosition.fret)}
            cy={getStringY(highlightPosition.string)}
            r={16}
            fill="#FF5722"
            opacity={0.25}
            className="highlight-glow"
          />
          <circle
            cx={getFretCenterX(highlightPosition.fret)}
            cy={getStringY(highlightPosition.string)}
            r={11}
            fill="#FF5722"
            stroke="white"
            strokeWidth={2}
            className="highlight-dot"
          />
        </g>
      )}
    </g>
  )
})

function GuitarNeck({
  highlightPosition,
  tapHighlight,
  onPositionClick,
  isSelectingDo = false,
  doPosition
}: GuitarNeckProps) {

  return (
    <div className="guitar-neck-container">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="guitar-neck-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 静态层：品丝、弦、标记 - 只渲染一次，不会重渲染 */}
        <StaticNeckLayer />

        {/* 点击区域层：事件委托，预计算 */}
        <ClickAreasLayer
          onClick={onPositionClick || (() => {})}
          isSelectingDo={isSelectingDo}
        />

        {/* 动态高亮层：独立 memo，只在 props 变化时更新 */}
        <DynamicHighlightLayer
          highlightPosition={highlightPosition}
          tapHighlight={tapHighlight}
          doPosition={doPosition}
        />
      </svg>
    </div>
  )
}

// 使用自定义比较函数，精确控制重渲染时机
const GuitarNeckMemo = memo(GuitarNeck, (prevProps, nextProps) => {
  // 只在真正影响视觉的 props 变化时才重渲染
  return (
    prevProps.highlightPosition?.string === nextProps.highlightPosition?.string &&
    prevProps.highlightPosition?.fret === nextProps.highlightPosition?.fret &&
    prevProps.tapHighlight?.string === nextProps.tapHighlight?.string &&
    prevProps.tapHighlight?.fret === nextProps.tapHighlight?.fret &&
    prevProps.doPosition?.string === nextProps.doPosition?.string &&
    prevProps.doPosition?.fret === nextProps.doPosition?.fret &&
    prevProps.isSelectingDo === nextProps.isSelectingDo
  )
})
export default GuitarNeckMemo
