export type NutrientCategory = 'core' | 'heart' | 'metabolic' | 'micro' | 'supplement'
export type NutrientKind = 'reach' | 'range' | 'limit' | 'measurement'

export interface Nutrient {
  id: string                    // crypto.randomUUID() — stable forever, never reused
  key: string                   // stable slug ('calories'); custom nutrients use their id
  label: string                 // "Protein" (shown uppercase in UI)
  unit: string                  // "g" | "kcal" | "mg" | "ml" | "mcg" | "IU"
  category: NutrientCategory
  kind: NutrientKind
  healthy: boolean              // true = reach/range (blue→teal); false = limit (neutral→amber→red)
  target: number | null         // floor to reach (reach/range); null for limit/measurement
  softCeiling: number | null    // "enough" → amber (reach/range: explicit; limit: auto 80% of hard)
  hardCeiling: number | null    // safety UL → red (reach/range); the ceiling (limit)
  order: number                 // display order
  enabled: boolean              // false = hidden from tracking
  isSeed: boolean               // true for the predefined catalog
}

export interface FoodLogEntry {
  id: string
  date: string                     // YYYY-MM-DD in Asia/Singapore local time
  name: string
  source: 'manual' | 'saved_meal'
  servings: number
  amounts: Record<string, number>  // nutrientId -> amount (per logged entry, already × servings)
  createdAt: string
  updatedAt: string
}

export interface SavedMeal {
  id: string
  name: string
  servingLabel?: string               // e.g. "1 bowl", "1 scoop"
  amounts: Record<string, number>     // nutrientId -> amount per 1 serving
  createdAt: string
  updatedAt: string
}

export interface DailyWeight {
  date: string        // YYYY-MM-DD (the store key)
  weightKg: number
  updatedAt: string
}

export interface AppMeta {
  schemaVersion: number
  deviceId: string
}
