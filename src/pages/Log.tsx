import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedMeals, addLogEntry, todayDateString } from '../db'
import type { SavedMeal } from '../types'
import './Log.css'

export default function Log() {
  const navigate = useNavigate()
  const [meals, setMeals] = useState<SavedMeal[]>([])
  const [selected, setSelected] = useState<SavedMeal | null>(null)
  const [servings, setServings] = useState('1')

  useEffect(() => { getSavedMeals().then(setMeals) }, [])

  function selectMeal(meal: SavedMeal) {
    setSelected(meal)
    setServings('1')
  }

  async function confirmLog() {
    if (!selected) return
    const s = parseFloat(servings)
    const mult = isNaN(s) || s <= 0 ? 1 : s
    const amounts: Record<string, number> = {}
    for (const [id, val] of Object.entries(selected.amounts)) {
      amounts[id] = val * mult
    }
    await addLogEntry({
      date: todayDateString(),
      name: selected.name,
      source: 'saved_meal',
      servings: mult,
      amounts,
    })
    navigate('/')
  }

  if (selected) {
    return (
      <div className="log-page">
        <header className="log-header">
          <button className="log-back" onClick={() => setSelected(null)}>←</button>
          <span>{selected.name.toUpperCase()}</span>
          <div />
        </header>

        <div className="log-confirm">
          <label className="log-label">Servings</label>
          <input
            className="log-servings-input"
            type="number"
            min="0.1"
            step="0.1"
            value={servings}
            onChange={e => setServings(e.target.value)}
          />
          {selected.servingLabel && (
            <p className="log-serving-label">1 serving = {selected.servingLabel}</p>
          )}
          <button className="log-confirm-btn" onClick={confirmLog}>
            Log to today
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="log-page">
      <header className="log-header">
        <button className="log-back" onClick={() => navigate('/')}>←</button>
        <span>Log Food</span>
        <div />
      </header>

      {meals.length === 0 ? (
        <div className="log-empty">
          <p>No saved meals yet.</p>
          <button className="log-link" onClick={() => navigate('/meals')}>
            Create a meal →
          </button>
        </div>
      ) : (
        <>
          <ul className="log-list">
            {meals.map(m => (
              <li key={m.id} className="log-row" onClick={() => selectMeal(m)}>
                <span>{m.name.toUpperCase()}</span>
                {m.servingLabel && <span className="log-row-serving">{m.servingLabel}</span>}
              </li>
            ))}
          </ul>
          <button className="log-link" onClick={() => navigate('/meals')}>
            Manage meals →
          </button>
        </>
      )}
    </div>
  )
}
