import type { NutrientColor } from '../lib/state'
import './SegmentedBar.css'

const SEGMENTS = 19

const FILL_COLOR: Record<NutrientColor, string> = {
  blue:    '#003568',
  teal:    '#004136',
  amber:   '#632E00',
  red:     '#660015',
  neutral: '#3a3a3a',
  none:    'transparent',
}

const ENDCAP_COLOR: Record<NutrientColor, string> = {
  blue:    '#00AAFF',
  teal:    '#00D3B7',
  amber:   '#FF8400',
  red:     '#FF4458',
  neutral: '#525252',
  none:    'transparent',
}

const EMPTY_COLOR = '#2E2E2E'

interface Props {
  state: NutrientColor
  ratio: number   // 0–1
}

export default function SegmentedBar({ state, ratio }: Props) {
  if (state === 'none') return null

  const filled = Math.round(ratio * SEGMENTS)

  return (
    <div className="seg-bar" aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const isEndcap = i === filled - 1 && filled > 0
        const isFilled = i < filled

        return (
          <span
            key={i}
            className={isEndcap ? 'seg seg-endcap' : 'seg'}
            style={{
              background: isEndcap
                ? ENDCAP_COLOR[state]
                : isFilled
                ? FILL_COLOR[state]
                : EMPTY_COLOR,
            }}
          />
        )
      })}
    </div>
  )
}
