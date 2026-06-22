import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Nutrient, FoodLogEntry, DailyWeight, AppMeta, SavedMeal, NutrientCategory, NutrientKind } from './types'

const DB_NAME = 'caltrack'
const DB_VERSION = 4

interface CalTrackDB extends DBSchema {
  nutrients: {
    key: string
    value: Nutrient
    indexes: { byOrder: number }
  }
  savedMeals: {
    key: string
    value: SavedMeal
    indexes: { byName: string }
  }
  foodLog: {
    key: string
    value: FoodLogEntry
    indexes: { byDate: string }
  }
  dailyWeight: {
    key: string
    value: DailyWeight
  }
  appMeta: {
    key: string
    value: AppMeta
  }
}

// ── Seed catalog ────────────────────────────────────────────────────────────

interface SeedItem {
  key: string
  label: string
  unit: string
  category: NutrientCategory
  kind: NutrientKind
  healthy: boolean
  target: number | null
  softCeiling: number | null
  hardCeiling: number | null
  enabled: boolean
}

// Option A: honest RDA targets with safety ceilings as real red guardrails (§11)
// Limit amber fires automatically at 80% of hardCeiling (computed in state engine, not stored)
const CATALOG: SeedItem[] = [
  // ── core tracked (enabled by default) ──────────────────────────────────────
  { key: 'calories',      label: 'Calories',       unit: 'kcal', category: 'core',       kind: 'limit',       healthy: false, target: null, softCeiling: null, hardCeiling: 2500, enabled: true  },
  { key: 'carbs',         label: 'Carbs',          unit: 'g',    category: 'core',       kind: 'range',       healthy: true,  target: 135,  softCeiling: 230,  hardCeiling: null, enabled: true  },
  { key: 'fat',           label: 'Fats',           unit: 'g',    category: 'core',       kind: 'limit',       healthy: false, target: null, softCeiling: null, hardCeiling: 50,   enabled: true  },
  { key: 'saturated_fat', label: 'Saturated fats', unit: 'g',    category: 'heart',      kind: 'limit',       healthy: false, target: null, softCeiling: null, hardCeiling: 5,    enabled: true  },
  { key: 'protein',       label: 'Protein',        unit: 'g',    category: 'core',       kind: 'reach',       healthy: true,  target: 150,  softCeiling: null, hardCeiling: null, enabled: true  },
  { key: 'iron',          label: 'Iron',           unit: 'mg',   category: 'micro',      kind: 'reach',       healthy: true,  target: 18,   softCeiling: null, hardCeiling: 45,   enabled: true  },
  { key: 'zinc',          label: 'Zinc',           unit: 'mg',   category: 'micro',      kind: 'reach',       healthy: true,  target: 11,   softCeiling: null, hardCeiling: 40,   enabled: true  },
  { key: 'fiber',         label: 'Fiber',          unit: 'g',    category: 'core',       kind: 'reach',       healthy: true,  target: 40,   softCeiling: null, hardCeiling: 70,   enabled: true  },
  { key: 'creatine',      label: 'Creatine',       unit: 'g',    category: 'supplement', kind: 'reach',       healthy: true,  target: 5,    softCeiling: null, hardCeiling: null, enabled: true  },
  { key: 'omega3',        label: 'Omega 3',        unit: 'g',    category: 'heart',      kind: 'reach',       healthy: true,  target: 1,    softCeiling: null, hardCeiling: 3,    enabled: true  },
  { key: 'water',         label: 'Water',          unit: 'ml',   category: 'core',       kind: 'reach',       healthy: true,  target: 4000, softCeiling: null, hardCeiling: null, enabled: true  },
  // ── disabled by default (available in Manage Nutrients) ────────────────────
  { key: 'vitamin_d',     label: 'Vitamin D',      unit: 'IU',   category: 'micro',      kind: 'reach',       healthy: true,  target: 600,  softCeiling: null, hardCeiling: 4000, enabled: false },
  { key: 'trans_fat',     label: 'Trans Fat',      unit: 'g',    category: 'heart',      kind: 'limit',       healthy: false, target: null, softCeiling: null, hardCeiling: 2,    enabled: false },
  { key: 'cholesterol',   label: 'Cholesterol',    unit: 'mg',   category: 'heart',      kind: 'limit',       healthy: false, target: null, softCeiling: null, hardCeiling: 300,  enabled: false },
  { key: 'added_sugar',   label: 'Added Sugar',    unit: 'g',    category: 'metabolic',  kind: 'limit',       healthy: false, target: null, softCeiling: null, hardCeiling: 25,   enabled: false },
  { key: 'sodium',        label: 'Sodium',         unit: 'mg',   category: 'metabolic',  kind: 'limit',       healthy: false, target: null, softCeiling: null, hardCeiling: 2300, enabled: false },
  { key: 'potassium',     label: 'Potassium',      unit: 'mg',   category: 'micro',      kind: 'reach',       healthy: true,  target: 3500, softCeiling: null, hardCeiling: null, enabled: false },
  { key: 'calcium',       label: 'Calcium',        unit: 'mg',   category: 'micro',      kind: 'reach',       healthy: true,  target: 1000, softCeiling: null, hardCeiling: 2500, enabled: false },
  { key: 'magnesium',     label: 'Magnesium',      unit: 'mg',   category: 'micro',      kind: 'reach',       healthy: true,  target: 400,  softCeiling: null, hardCeiling: 350,  enabled: false },
  { key: 'vitamin_b12',   label: 'Vitamin B12',    unit: 'mcg',  category: 'micro',      kind: 'reach',       healthy: true,  target: 2.4,  softCeiling: null, hardCeiling: null, enabled: false },
  { key: 'vitamin_c',     label: 'Vitamin C',      unit: 'mg',   category: 'micro',      kind: 'reach',       healthy: true,  target: 90,   softCeiling: null, hardCeiling: 2000, enabled: false },
  { key: 'folate',        label: 'Folate',         unit: 'mcg',  category: 'micro',      kind: 'reach',       healthy: true,  target: 400,  softCeiling: null, hardCeiling: 1000, enabled: false },
]

// ── Connection ──────────────────────────────────────────────────────────────

let _dbPromise: Promise<IDBPDatabase<CalTrackDB>> | null = null

function getDB(): Promise<IDBPDatabase<CalTrackDB>> {
  if (_dbPromise) return _dbPromise

  _dbPromise = openDB<CalTrackDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const nutrients = db.createObjectStore('nutrients', { keyPath: 'id' })
        nutrients.createIndex('byOrder', 'order')

        const foodLog = db.createObjectStore('foodLog', { keyPath: 'id' })
        foodLog.createIndex('byDate', 'date')

        db.createObjectStore('dailyWeight', { keyPath: 'date' })
        db.createObjectStore('appMeta')
      }
      if (oldVersion < 2) {
        const savedMeals = db.createObjectStore('savedMeals', { keyPath: 'id' })
        savedMeals.createIndex('byName', 'name')
      }
      if (oldVersion < 3) {
        // Clear nutrients so they re-seed with new fields on next open
        db.deleteObjectStore('nutrients')
        const nutrients = db.createObjectStore('nutrients', { keyPath: 'id' })
        nutrients.createIndex('byOrder', 'order')
      }
      if (oldVersion < 4) {
        // Clear food log — old entries reference stale nutrient IDs from pre-v3
        tx.objectStore('foodLog').clear()
        tx.objectStore('dailyWeight').clear()
      }
    },
  }).then(async db => {
    if ((await db.count('nutrients')) === 0) {
      const tx = db.transaction('nutrients', 'readwrite')
      CATALOG.forEach((item, i) => {
        tx.store.put({
          id: crypto.randomUUID(),
          key: item.key,
          label: item.label,
          unit: item.unit,
          category: item.category,
          kind: item.kind,
          healthy: item.healthy,
          target: item.target,
          softCeiling: item.softCeiling,
          hardCeiling: item.hardCeiling,
          order: i,
          enabled: item.enabled,
          isSeed: true,
        })
      })
      await tx.done
    }

    if (!(await db.get('appMeta', 'meta'))) {
      await db.put('appMeta', { schemaVersion: DB_VERSION, deviceId: crypto.randomUUID() }, 'meta')
    }

    // Mock data — one entry per color state to verify the §4 color engine
    if ((await db.count('foodLog')) === 0) {
      const nutrients = await db.getAllFromIndex('nutrients', 'byOrder')
      const byKey = Object.fromEntries(nutrients.map(n => [n.key, n.id]))
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(new Date())
      const now = new Date().toISOString()

      // Target color per nutrient:
      // neutral  — fat        20 / 50    (40% of limit, below 80% amber threshold)
      // amber    — calories 2200 / 2500  (88% of limit ≥ 80%)
      // red      — sat_fat     7 / 5     (over hard ceiling)
      // blue     — protein   120 / 150   (under target)
      // blue     — carbs     100 / 135   (under target)
      // blue     — fiber      20 / 40    (under target)
      // blue     — zinc        6 / 11    (under target)
      // blue     — water    3000 / 4000  (under target)
      // teal     — iron       18 / 18    (exactly at target)
      // teal     — creatine    5 / 5     (exactly at target)
      // teal     — omega3      1 / 1     (exactly at target)
      const mockEntry: FoodLogEntry = {
        id: crypto.randomUUID(),
        date: today,
        name: 'Mock day',
        source: 'manual',
        servings: 1,
        amounts: {
          [byKey['calories']]:      2200,
          [byKey['carbs']]:          100,
          [byKey['fat']]:             20,
          [byKey['saturated_fat']]:    7,
          [byKey['protein']]:         120,
          [byKey['iron']]:             18,
          [byKey['zinc']]:              6,
          [byKey['fiber']]:            20,
          [byKey['creatine']]:          5,
          [byKey['omega3']]:            1,
          [byKey['water']]:          3000,
        },
        createdAt: now,
        updatedAt: now,
      }
      const logTx = db.transaction('foodLog', 'readwrite')
      logTx.store.put(mockEntry)
      await logTx.done

      // Mock weight
      await db.put('dailyWeight', { date: today, weightKg: 90, updatedAt: now })
    }

    return db
  })

  return _dbPromise
}

// ── Nutrients ─────────────────────────────────────────────────────────────────

export async function getNutrients(): Promise<Nutrient[]> {
  const db = await getDB()
  return db.getAllFromIndex('nutrients', 'byOrder')
}

export async function getEnabledNutrients(): Promise<Nutrient[]> {
  return (await getNutrients()).filter(n => n.enabled)
}

export async function addNutrient(
  data: Pick<Nutrient, 'label' | 'unit' | 'category' | 'kind' | 'healthy'> &
    Partial<Pick<Nutrient, 'target' | 'softCeiling' | 'hardCeiling' | 'enabled'>>
): Promise<Nutrient> {
  const db = await getDB()
  const all = await db.getAll('nutrients')
  const id = crypto.randomUUID()
  const nutrient: Nutrient = {
    id, key: id,
    label: data.label, unit: data.unit, category: data.category,
    kind: data.kind, healthy: data.healthy,
    target: data.target ?? null,
    softCeiling: data.softCeiling ?? null,
    hardCeiling: data.hardCeiling ?? null,
    order: all.length,
    enabled: data.enabled ?? true,
    isSeed: false,
  }
  await db.put('nutrients', nutrient)
  return nutrient
}

export async function updateNutrient(id: string, updates: Partial<Omit<Nutrient, 'id'>>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('nutrients', id)
  if (!existing) return
  await db.put('nutrients', { ...existing, ...updates })
}

export async function deleteNutrient(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('nutrients', id)
}

// ── Saved meals ───────────────────────────────────────────────────────────────

export async function getSavedMeals(): Promise<SavedMeal[]> {
  const db = await getDB()
  const meals = await db.getAll('savedMeals')
  return meals.sort((a, b) => a.name.localeCompare(b.name))
}

export async function addSavedMeal(
  data: Omit<SavedMeal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SavedMeal> {
  const db = await getDB()
  const now = new Date().toISOString()
  const meal: SavedMeal = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  await db.put('savedMeals', meal)
  return meal
}

export async function updateSavedMeal(id: string, updates: Partial<Omit<SavedMeal, 'id' | 'createdAt'>>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('savedMeals', id)
  if (!existing) return
  await db.put('savedMeals', { ...existing, ...updates, updatedAt: new Date().toISOString() })
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('savedMeals', id)
}

// ── Food log ───────────────────────────────────────────────────────────────────

export async function getLogForDate(date: string): Promise<FoodLogEntry[]> {
  const db = await getDB()
  const entries = await db.getAllFromIndex('foodLog', 'byDate', date)
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function addLogEntry(
  entry: Omit<FoodLogEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FoodLogEntry> {
  const db = await getDB()
  const now = new Date().toISOString()
  const full: FoodLogEntry = { ...entry, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  await db.put('foodLog', full)
  return full
}

export async function deleteLogEntry(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('foodLog', id)
}

// ── Weight ──────────────────────────────────────────────────────────────────────

export async function getWeight(date: string): Promise<DailyWeight | undefined> {
  const db = await getDB()
  return db.get('dailyWeight', date)
}

export async function setWeight(date: string, weightKg: number): Promise<void> {
  const db = await getDB()
  await db.put('dailyWeight', { date, weightKg, updatedAt: new Date().toISOString() })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function todayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(new Date())
}

export async function sumAmountsForDate(date: string): Promise<Record<string, number>> {
  const entries = await getLogForDate(date)
  const totals: Record<string, number> = {}
  for (const entry of entries) {
    for (const [nutrientId, amount] of Object.entries(entry.amounts)) {
      totals[nutrientId] = (totals[nutrientId] ?? 0) + amount
    }
  }
  return totals
}
