import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEnabledNutrients, sumAmountsForDate, getWeight, todayDateString } from '../db'
import type { Nutrient } from '../types'
import SegmentedBar from '../components/SegmentedBar'
import { nutrientState, fillRatio, type NutrientColor } from '../lib/state'
import './Home.css'

// ── Detail mode cycle (§3) ────────────────────────────────────────────────────
type DetailMode = 'current-target' | 'units' | 'message' | 'current'
const MODES: DetailMode[] = ['current-target', 'units', 'message', 'current']

const MESSAGE: Record<NutrientColor, string> = {
  blue:    'EAT MORE',
  teal:    'ON TARGET',
  amber:   'EASE OFF',
  red:     'TOO MUCH',
  neutral: 'ON TRACK',
  none:    '—',
}

// ── Formatters ────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

function fmt(v: number): string {
  return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1)
}

function rowValue(total: number, n: Nutrient, mode: DetailMode): string {
  const ref = n.target ?? n.hardCeiling
  switch (mode) {
    case 'current-target':
      return ref != null ? `${fmt(total)}/${ref}` : fmt(total)
    case 'current':
      return fmt(total)
    case 'units':
      return `${fmt(total)}${n.unit}`
    case 'message':
      return MESSAGE[nutrientState(total, n)]
  }
}

function weightValue(kg: number | null, mode: DetailMode): string {
  if (kg == null) return '—'
  switch (mode) {
    case 'current-target': return `${kg}KG`
    case 'current':        return String(kg)
    case 'units':          return `${kg}kg`
    case 'message':        return '—'
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const today = todayDateString()
  const [nutrients, setNutrients]   = useState<Nutrient[]>([])
  const [totals, setTotals]         = useState<Record<string, number>>({})
  const [weightKg, setWeightKg]     = useState<number | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [modeIdx, setModeIdx]       = useState(0)

  const mode = MODES[modeIdx]

  useEffect(() => {
    Promise.all([getEnabledNutrients(), sumAmountsForDate(today), getWeight(today)]).then(
      ([ns, ts, w]) => {
        setNutrients(ns)
        setTotals(ts)
        setWeightKg(w?.weightKg ?? null)
      }
    )
  }, [today])

  function cycleMode() {
    setModeIdx(i => (i + 1) % MODES.length)
  }

  return (
    <div className="home">
      <header className="home-header">
        <span className="home-date mono">{formatDate(today)}</span>
        <button className="home-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">≡</button>
      </header>

      <ul className="home-list">
        <li className="home-row home-row-weight">
          <span className="home-row-label">Weight</span>
          <span className="home-row-bar" />
          <button className="home-row-value mono" onClick={cycleMode}>
            {weightValue(weightKg, mode)}
          </button>
        </li>

        {nutrients.map(n => {
          const total = totals[n.id] ?? 0
          const state = nutrientState(total, n)
          const ratio = fillRatio(total, n)
          return (
            <li key={n.id} className="home-row">
              <span className="home-row-label">{n.label}</span>
              <span className="home-row-bar">
                <SegmentedBar state={state} ratio={ratio} />
              </span>
              <button className="home-row-value mono" onClick={cycleMode}>
                {rowValue(total, n, mode)}
              </button>
            </li>
          )
        })}
      </ul>

      <footer className="home-footer">
        <button className="home-log-btn" onClick={() => navigate('/log')}>
          + Log food
        </button>
      </footer>

      {menuOpen && (
        <div className="home-menu" onClick={() => setMenuOpen(false)}>
          <button className="home-menu-item" onClick={() => navigate('/settings')}>Settings</button>
          <button className="home-menu-close" onClick={() => setMenuOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
