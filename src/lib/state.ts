import type { Nutrient } from '../types'

export type NutrientColor = 'blue' | 'teal' | 'amber' | 'red' | 'neutral' | 'none'

/**
 * Computes the display color for a nutrient row based on §4 color state machine.
 *
 * Healthy (reach/range):
 *   current < target        → blue  (eat/drink more)
 *   target ≤ current < soft → teal  (goal reached)
 *   soft ≤ current < hard   → amber (too much of a good thing)
 *   current ≥ hard          → red   (harmful)
 *   no ceilings, over target → teal (stays teal)
 *
 * Limit (unhealthy):
 *   current < 80% of hard   → neutral (comfortably under)
 *   80% ≤ current < hard    → amber  (be mindful, within 20%)
 *   current ≥ hard          → red    (over the limit)
 *
 * Measurement (Weight): → none (no bar)
 */
export function nutrientState(current: number, n: Nutrient): NutrientColor {
  if (n.kind === 'measurement') return 'none'

  if (n.kind === 'limit') {
    if (n.hardCeiling == null) return 'neutral'
    if (current >= n.hardCeiling) return 'red'
    if (current >= n.hardCeiling * 0.8) return 'amber'
    return 'neutral'
  }

  // reach / range (healthy)
  const target = n.target
  if (target == null) return 'neutral'

  if (current < target) return 'blue'

  // at or over target — check ceilings
  if (n.softCeiling != null && current >= n.softCeiling) {
    if (n.hardCeiling != null && current >= n.hardCeiling) return 'red'
    return 'amber'
  }
  if (n.hardCeiling != null && current >= n.hardCeiling) return 'red'

  return 'teal'
}

/**
 * Returns 0–1 fill ratio for the segmented bar.
 *
 * For reach/range: progress toward target (capped at 1).
 * For limit: progress toward hardCeiling (capped at 1).
 * For measurement / no reference: 0.
 */
export function fillRatio(current: number, n: Nutrient): number {
  if (n.kind === 'measurement') return 0

  const ref = n.kind === 'limit' ? n.hardCeiling : n.target
  if (ref == null || ref <= 0) return 0
  return Math.min(current / ref, 1)
}
