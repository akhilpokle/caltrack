import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedMeals, addSavedMeal, updateSavedMeal, deleteSavedMeal, getEnabledNutrients } from '../db'
import type { SavedMeal, Nutrient } from '../types'
import './Meals.css'

interface MealForm {
  name: string
  servingLabel: string
  amounts: Record<string, string> // nutrientId -> raw input string
}

function emptyForm(nutrients: Nutrient[]): MealForm {
  return {
    name: '',
    servingLabel: '',
    amounts: Object.fromEntries(nutrients.map(n => [n.id, ''])),
  }
}

export default function Meals() {
  const navigate = useNavigate()
  const [meals, setMeals] = useState<SavedMeal[]>([])
  const [nutrients, setNutrients] = useState<Nutrient[]>([])
  const [editing, setEditing] = useState<SavedMeal | null>(null)
  const [form, setForm] = useState<MealForm | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function load() {
    const [ms, ns] = await Promise.all([getSavedMeals(), getEnabledNutrients()])
    setMeals(ms)
    setNutrients(ns)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(emptyForm(nutrients))
  }

  function openEdit(meal: SavedMeal) {
    setEditing(meal)
    setForm({
      name: meal.name,
      servingLabel: meal.servingLabel ?? '',
      amounts: Object.fromEntries(
        nutrients.map(n => [n.id, meal.amounts[n.id] != null ? String(meal.amounts[n.id]) : ''])
      ),
    })
  }

  function closeForm() {
    setForm(null)
    setEditing(null)
    setConfirmDelete(false)
  }

  async function handleSave() {
    if (!form || !form.name.trim()) return
    const amounts: Record<string, number> = {}
    for (const [id, raw] of Object.entries(form.amounts)) {
      const v = parseFloat(raw)
      if (!isNaN(v) && v > 0) amounts[id] = v
    }
    if (editing) {
      await updateSavedMeal(editing.id, { name: form.name.trim(), servingLabel: form.servingLabel.trim() || undefined, amounts })
    } else {
      await addSavedMeal({ name: form.name.trim(), servingLabel: form.servingLabel.trim() || undefined, amounts })
    }
    await load()
    closeForm()
  }

  async function handleDelete() {
    if (!editing) return
    await deleteSavedMeal(editing.id)
    await load()
    closeForm()
  }

  if (form !== null) {
    return (
      <div className="meals-page">
        <header className="meals-header">
          <button className="meals-back" onClick={closeForm}>←</button>
          <span>{editing ? 'Edit Meal' : 'New Meal'}</span>
          <button className="meals-save-btn" onClick={handleSave}>Save</button>
        </header>

        <div className="meals-form">
          <div className="meals-field">
            <label className="meals-label">Name</label>
            <input
              className="meals-input"
              type="text"
              placeholder="e.g. Overnight Oats"
              value={form.name}
              onChange={e => setForm(f => f && ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="meals-field">
            <label className="meals-label">Serving label (optional)</label>
            <input
              className="meals-input"
              type="text"
              placeholder="e.g. 1 bowl"
              value={form.servingLabel}
              onChange={e => setForm(f => f && ({ ...f, servingLabel: e.target.value }))}
            />
          </div>

          <p className="meals-section-label">Amounts per 1 serving</p>
          {nutrients.map(n => (
            <div key={n.id} className="meals-field meals-field-row">
              <label className="meals-label">{n.label.toUpperCase()} ({n.unit})</label>
              <input
                className="meals-input meals-input-sm"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={form.amounts[n.id] ?? ''}
                onChange={e => setForm(f => f && ({ ...f, amounts: { ...f.amounts, [n.id]: e.target.value } }))}
              />
            </div>
          ))}

          {editing && !confirmDelete && (
            <button className="meals-delete-btn" onClick={() => setConfirmDelete(true)}>
              Delete meal
            </button>
          )}
          {confirmDelete && (
            <div className="meals-confirm">
              <span>Delete "{editing?.name}"?</span>
              <button className="meals-delete-btn" onClick={handleDelete}>Confirm delete</button>
              <button className="meals-cancel-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="meals-page">
      <header className="meals-header">
        <button className="meals-back" onClick={() => navigate('/')}>←</button>
        <span>Meals</span>
        <button className="meals-save-btn" onClick={openNew}>+ New</button>
      </header>

      {meals.length === 0 ? (
        <p className="meals-empty">No saved meals yet. Tap + New to create one.</p>
      ) : (
        <ul className="meals-list">
          {meals.map(m => (
            <li key={m.id} className="meals-row" onClick={() => openEdit(m)}>
              <span className="meals-row-name">{m.name.toUpperCase()}</span>
              {m.servingLabel && <span className="meals-row-serving">{m.servingLabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
