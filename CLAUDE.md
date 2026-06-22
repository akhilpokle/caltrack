# Nutrition Tracker — Design & Logic Handoff (for Claude Code)

> **Purpose:** Implementation handoff for a personal nutrition-tracking app. This captures the full design system and behavioral logic agreed during design. Audience: Claude Code (build agent). It's a personal-use app — units (g/mg/ml) are innate to the user and intentionally NOT shown by default.

> **MVP1 scope (current build — "Frame 331"):** A single-screen list, one row per nutrient: **label · compact bar (magnitude) · value**. State is set by **one color rule** (blue / teal / amber / red on the bar; amber/red also on the number for warnings). **Tap a number** to rotate detail (current → current/target → units → message). **Onboarding** teaches the color language, logging, and the tap gesture. Top bar = date + menu (☰); bottom = a prominent **`+ LOG FOOD`**. No animation in MVP1. Sections tagged *Post-MVP* are roadmap, not first build.

## 0. Information Architecture (IA)

The app's screen map. **Home is the hub**; everything else hangs off the top bar (date · ☰ menu) or the `+ LOG FOOD` action.

```
First launch ──▶ Onboarding (colors → logging → tap) ──▶ Home

Home (Today)
 ├─ tap DATE (top-left) ──▶ Day / History  (that day's food log + history across days)
 ├─ + LOG FOOD (bottom) ──▶ Log Food        (log a food → fans out into nutrients)
 └─ ☰ MENU (top-right) ─┬─▶ Manage Nutrients (per-nutrient kind / target / ceilings / unit)
                        ├─▶ Saved Foods      (saved foods/meals — create / edit / delete)
                        └─▶ Settings         (bedtime, units, onboarding replay, …)
```

| Screen | Reached from | Purpose |
|---|---|---|
| **Home (Today)** | root | The calm list — one row per nutrient (label · bar · value); top bar (date · ☰); `+ LOG FOOD` at bottom. §3 |
| **Day / History** | tap the **date** on Home | Shows the selected day's food log, and lets the user browse history across past days. |
| **Log Food** | `+ LOG FOOD` | Core loop — log a food, which fans out into its nutrient amounts. |
| **Manage Nutrients** | ☰ Menu | Per-nutrient config: `kind`, `healthy` flag, `target`, `softCeiling`, `hardCeiling`, `unit`. **Required for the hard-locked MVP1** — this is where the user enters every target/ceiling number. |
| **Saved Foods** | ☰ Menu | Library of reusable foods/meals — create / edit / delete. |
| **Settings** | ☰ Menu | App config — bedtime (drives §6 pace), units, replay onboarding, etc. |
| **Onboarding** | first launch (replayable from Settings) | 3 screens: color language → logging → tap-a-number. §3 |

## 1. Product intent
A daily nutrition tracker whose job is not just to *record* intake but to **drive healthy choices in the moment**. The core question the UI answers at a glance is **"what should I do right now?"** — eat more of something I'm short on, or stop something I'm over on.

## 2. Metric model
Every row is one of four kinds. Behavior differs by kind. **Good metrics aren't unbounded** — they carry a **soft ceiling** ("enough") and an optional **hard ceiling** (safety limit / UL).

| Kind | Goal direction | Examples | Going over means |
|---|---|---|---|
| **Reach** | climb to a target; *enough* is the goal | Protein, Fiber, Iron, Zinc, Omega 3, Creatine, Water, Vitamin D | past *enough* = 🟠 amber (wasteful); past the **safety limit (UL)** = 🔴 red (now harmful) |
| **Range (band)** | hit a floor *and* stay in a healthy band | Carbs | under floor = 🔵 blue; over band = 🟠 amber; over safety = 🔴 red |
| **Limit** | minimize / stay under a ceiling (no floor) | Calories, Fats, Saturated fats | nearing = 🟠 amber; over = 🔴 red |
| **Measurement** | a logged value, no goal | Weight | n/a |

- **Two ceilings on "good stuff":** even reach/range nutrients aren't unbounded. Each good metric can carry a **soft ceiling** (= "enough"; past it is wasteful/suboptimal → 🟠 amber) and a **hard ceiling** (the science-based **safety limit / UL**; past it is genuinely harmful → 🔴 red). Below "enough" = 🔵 blue; in the good band = 🟢 teal.
- This keeps the rule honest: **red always means harmful.** A good nutrient only earns red once it crosses a real safety limit (e.g., iron, zinc, vitamin D, water); otherwise excess caps at amber.
- **Carbs = range (band)** — reach a floor *and* stay in a healthy band; too many carbs → amber (suboptimal), and red only if a hard safety ceiling is set and crossed.
- **Most days neither ceiling fires.** Hard ceilings are a guardrail for supplement stacking (e.g., iron + multivitamin + fortified foods), not everyday nudging — so the screen stays calm.
- **Good vs bad is user-definable:** "good stuff" = reach/range (eat more / keep in range); "bad stuff" = limit (minimize). What counts as *bad* is per-user; **red** fires for bad-stuff excess, or for good-stuff past its hard safety ceiling.
- Limit metrics today: **Calories, Fats, Saturated fats** (Calories/Fats may also be **range**; confirm in §12). Default ceilings (UL / AMDR / practical) per nutrient → see §11.

## 3. Display system (MVP1)
One vertical list, one row per metric: **label (left) · compact bar (middle) · value (right)**. The screen stays calm because the bars sit muted until a state turns them loud.

- **Each row (except Weight) has a compact segmented bar** with a bright **end-cap** marking the current edge; grey remainder = the gap. The bar carries **magnitude** (how much / how close); color carries **state** (§4). This reverses the earlier text-only plan — bars are back in MVP1 because magnitude matters.
- **Number stays white except for amber/red warnings** — an amber/red number flags "too much" (bad stuff nearing/over its limit, or a healthy item over its range); blue/teal reach state lives in the bar so the number stays quiet.
- **Top bar:** date (top-left) · menu ☰ (top-right).
- **Primary action:** a prominent **`+ LOG FOOD`** at the bottom (labeled, centered) — logging is the core loop, so it's the loudest, clearest control. Food-based entry (log a food → it fans out into nutrients).
- **Tap a number to rotate detail** — a tap toggles the display mode for **all rows at once (global)**, cycling: current value → **current / target** → **with units** (g/mg/ml) → **plain-language message** ("take more" / "on target" / "ease off" / "over"). *Default = current / target* so context exists without a hidden tap; auto-surface the message on problem rows.
- **Onboarding** (first run, a few seconds): one screen teaching the **color language**, one on **logging** (`+ LOG FOOD`), one on **tap-a-number** for detail.

## 4. Color state machine (MVP1)
Color (on the **bar + end-cap**, and on the **number only for amber/red warnings**) is driven by **ONE function of metric kind + progress** — so two rows with the same value and kind can never disagree. Governing rule: **loud = "act now"; muted = nothing to do**, and **hue = direction** (blue = too little, amber/red = too much).

| Color | Meaning (user's words) | Applies to | Number |
|---|---|---|---|
| (no bar) / white | measurement, or "bad" stuff comfortably low | Weight; a limit metric well under its ceiling | white |
| 🔵 **blue** | eat more of good stuff | reach / range below its target (floor) | white |
| 🟢 **teal** | goal reached | reach met, or range inside the healthy band | white |
| 🟠 **amber** | nearing too much of bad stuff, **or** more of a good thing than you need | limit nearing its ceiling; reach/range past its **soft ceiling** ("enough") | 🟠 amber |
| 🔴 **red** | genuinely too much — harmful | "bad" (limit) metric over its ceiling, **or** any good metric past its **hard ceiling (safety / UL)** | 🔴 red |

- **Blue = eat more of good stuff; teal = goal reached.** A **pure reach** metric goes blue → teal and stops (going over a pure reach target is fine — stays teal).
- **Two ceilings on good stuff (reach + range):** 🔵 blue (under target) → 🟢 teal (enough / in band) → 🟠 amber (past the **soft ceiling** = more than you need) → 🔴 red (past the **hard ceiling** = safety limit / UL, now harmful). Most good metrics stop at amber; red only appears at a real safety limit. Example: **Carbs** — too few = blue, in-range = teal, too many = amber (red only if a hard cap is set).
- **"Bad stuff" (limit)** = minimize: white/neutral while low → 🟠 amber as it nears the ceiling → 🔴 red when over. Red is exclusively "too much of bad stuff."
- **Good vs bad is user-definable** — each person marks what's "bad for them," which is what unlocks **red** for that metric.
- **The single rule (non-negotiable):** color = pure function of **kind** (reach / range / limit / measurement) + **good/bad** + **progress vs. floor/ceiling**. Identical kind+progress always matches.
- **Number color is reserved for amber/red** to keep colored-text load low; blue/teal ride on the bar.
- **Reference check:** Saturated fats 7/6 is over (and is "bad") → **red**, not amber.
- **Under-target never goes amber/red** — being behind on a good thing is always **blue** (urgency near bedtime can intensify the blue; §6), so amber/red stay unambiguously "too much."
- Palette hex values (white / blue / teal / amber / red) TBD in §12.

## 5. Bar rendering & limit overflow (MVP1)
Each row (except Weight) renders a compact **segmented bar + bright end-cap** (fill = progress, end-cap = current edge, grey = gap). Bar = magnitude; color = state (§4). Limit rows must distinguish *at* the ceiling from *over* it:

- **Fixed limit line** at a consistent position (~80–85% of row width) on every limit row, so breach always happens in the same spot.
- **Solid fill** up to the line (neutral while under).
- **Cross the line → red + the reserved overflow zone fills with diagonal hatch.**
- **Binary:** hatch is on/off, identical look for any overage (the *number* carries magnitude).
- Keep the **label off the texture** — confine hatch to the bar's overflow zone.
- **Faint limit-line tick visible even when under**, so the user can read headroom before breaching.
- Reserve hatch exclusively for over-limit — never decorative, never on reach rows.
- **Reach/range rows** are hue-driven (blue = eat more, teal = enough / in band). Crossing the **soft ceiling** turns the bar **amber**; crossing a **hard safety ceiling** turns it **red** (rare). The red **hatch/overflow** texture stays reserved for **"bad" limit** breaches — good-stuff red is solid, not hatched.

```
Under limit: [#### neutral ####|        ]   <- faint tick at limit line
                              limit (empty reserved zone)
Over limit:  [###### red ######|////hatch fill////]
                              limit (overflow zone filled)
```

## 6. Pace & escalation logic (the heart of the coaching)
Reach goals escalate based on **time remaining vs. goal remaining**, anchored to a **user-configured bedtime**. Slow-to-consume nutrients warn earlier.

> **Color note (reconcile with §4):** this engine decides *urgency/timing* for an **unreached** reach/range row. amber/red mean **"too much"** only, so an under-target row running out of time escalates as **intensified blue**, never amber/red. The `AMBER`/`RED` tiers in the pseudocode below are *urgency levels* (heads-up → critical), rendered in the **blue** family — not the limit colors.

### Core rule — "when must I start?"

```
remaining     = goal - current
timeToFinish  = remaining / comfortableRate[nutrient]   // per-nutrient "slowness"
mustStartBy   = bedtime - timeToFinish
if now < mustStartBy - buffer                 -> quiet (on pace)
if now in [mustStartBy - buffer, mustStartBy) -> AMBER (start soon)
if now >= mustStartBy                         -> RED (act now or miss it)
```
- `comfortableRate` is the realistic consumption rate per nutrient. Larger `timeToFinish` (slow nutrients like protein) pushes `mustStartBy` earlier — so **slow goals escalate earlier automatically**, no special-casing.
- Two tiers: **amber heads-up → red critical.**
- `buffer` = configurable lead time for the amber heads-up.

### Worked examples (bedtime 22:00)
| Nutrient | Remaining | Rate | timeToFinish | mustStartBy | At 21:00 |
|---|---|---|---|---|---|
| Protein | 66 g | ~33 g/hr | ~2 hr | 20:00 | 🔴 RED (1 hr past) |
| Water | 1000 ml | fast (~15 min) | ~0.25 hr | 21:45 | quiet |

Same ~50% progress, opposite urgency — because slowness is baked in.

### Emergent behavior to implement
- After ~18:00, **auto-sort behind-pace rows to the top** so the screen becomes a prioritized "eat this next" list.
- Morning: nearly everything reads on-pace → quiet. Loudness naturally ramps toward bedtime.

## 7. Weight forecast vs. actual (TDEE model) — *Post-MVP*
Closes the loop between daily calorie logging and the weight outcome. The diet is seeded from a standard TDEE calculator (Mifflin-St Jeor / Katch-McArdle / etc.); the app then forecasts the weight curve and **self-corrects against real data**.

### Energy-balance model

```
dailyBalance     = caloriesConsumed - TDEE        // + surplus / - deficit
predictedKgDelta = sum(dailyBalance) / 7700        // ~7700 kcal per kg body fat
forecastWeight   = startWeight + predictedKgDelta
```

### Inputs (already in the app)
- **Calories** logged per day (limit metric).
- **Weight** logged per day (measurement metric).
- **TDEE seed** + goal rate (e.g., -0.5 kg/wk ≈ -550 kcal/day target).

### Smooth the actual before comparing
Raw daily weight swings ±1–2 kg (water, glycogen, sodium, gut, hormones) ≫ real fat change (~0.07 kg/day at a 500 kcal deficit). **Compare the forecast to a trend line, never to raw weigh-ins.**

```
trend_today = trend_yesterday + alpha * (weight_today - trend_yesterday)   // EWMA, alpha ~0.1
```
Plot raw weigh-ins as scattered dots; the **trend** is what should track the forecast.

### Adaptive TDEE — the key feature
The calculator value is only a seed. After ~14–21 days of consistent logging, back-calculate real maintenance from what actually happened:

```
actualTDEE = avgIntake - (trendKgDelta * 7700 / days)
```
- Replace the seed with `actualTDEE`; the forecast self-heals.
- Recompute periodically — TDEE drifts down with lost mass + metabolic adaptation.

### Caveats to encode
- **Week 1** drop is glycogen + water, not fat — actual dips below forecast then flattens; don't alarm.
- **Whoosh / water retention** can flatten actual for 1–2 weeks then drop — trust weeks, not days.
- **Divergence usually = logging drift** (untracked oils/drinks/portions) before metabolism. Frame as "recalibrate," never "failed."

### UI integration
- Weight row shows expected-today marker + trend + delta, e.g. *"expected 89.6 · trend 89.9 · +0.3 above pace."*
- Forecast-vs-actual mini chart: forecast line + trend line + raw dots.
- **Reuse the color grammar:** trend tracking forecast = quiet/teal; drifting = amber; sustained wrong-direction = red.
- **Recalibration nudge** when |actualTDEE − seedTDEE| exceeds a threshold: *"Real maintenance looks ~150 kcal higher — adjust calorie target?"* → resets the Calories goal that drives the rest of the app.

## 8. Per-nutrient timing windows
Beyond pace, several nutrients have **time-of-day windows** (earliest / ideal / latest / suppress-after). This makes coaching smarter than a flat bedtime deadline.

| Nutrient | Ideal window | Take with / avoid | Suppress nudge after | Notes |
|---|---|---|---|---|
| Weight | First thing AM, post-toilet, pre-food | — | — | Consistency baseline |
| Water | Spread all day; taper 1–2 hr pre-bed | avoid caffeine/alcohol near bed | ~1–2 hr before bed | More water late = nocturia; actively suppress |
| Calories | Front-loaded; avoid large meals near bed | — | — | — |
| Carbs | Spread; concentrate around workouts | — | — | — |
| Fats | Spread across meals | pair with D + omega-3 | — | Drives fat-soluble absorption |
| Saturated fats | (limit — minimize) | — | — | No timing |
| Protein | Every 3–4 hr, 20–40g/meal; ~40g casein 30 min pre-sleep | — | bedtime | The one goal whose red can run to bedtime |
| Iron | Morning, empty stomach (~1 hr pre-food) | WITH vitamin C; AVOID coffee/tea/milk/calcium | early afternoon | If missed AM, suggest "take tomorrow" rather than 9pm red |
| Zinc | With a meal — dinner ideal | AVOID iron/calcium (separate 2–3 hr) | — | Dinner separates from AM iron |
| Omega 3 | With a fat-containing meal | take with dietary fat | — | Split AM/PM reduces reflux |
| Creatine | Anytime (consistency > timing); slight edge post-workout | can pair with carbs | — | Daily saturation is what matters |
| Fiber | Spread across meals + plenty of water | separate from iron/zinc (binds minerals) | — | All-at-once = gas/bloat |
| Vitamin D | Morning, with fatty meal | take with fat | midday | Late dosing may suppress melatonin/sleep |

## 9. Interaction rules (must enforce)
- **Iron ↔ Zinc ↔ Calcium compete** — space **2–3 hr apart**. Natural split: **iron AM (empty stomach), zinc at dinner.**
- **Fiber binds minerals** — keep iron/zinc doses away from high-fiber meals.
- **Fat-soluble (Vitamin D, Omega 3)** — take with a meal containing fat.
- **Vitamin C** boosts non-heme iron absorption — pair with iron.

## 10. Suggested daily schedule (default coaching template)
| Time | Prompt |
|---|---|
| Wake | Weigh in · Iron + vitamin C (empty stomach) |
| Breakfast | Vitamin D + Omega-3 (with fat) · fiber · protein |
| Midday / workout | Carbs around training · creatine · protein |
| Dinner | Zinc · protein · fiber |
| ~1 hr pre-bed | Optional casein protein · STOP large fluids |

## 11. Config / params to expose
- **Bedtime** (drives the pace deadline) + optional eating-window start (wake/first log).
- **Per-nutrient `comfortableRate`** (slow→fast) with sensible defaults, user-tunable.
- **Per-nutrient timing window** (earliest / ideal / latest / suppress-after).
- **Amber `buffer`** lead time.
- **Goals** per nutrient + each nutrient's **kind** (reach / range / limit / measurement) and a **good/bad flag** (user-definable) — drives where amber/red apply (red only for "bad" in excess).
- **TDEE seed** (calculator method + value), **start weight + date**, and **goal rate** (kg/wk → daily kcal target).
- **EWMA smoothing factor** (`alpha`, default ~0.1) for the weight trend.
- **Adaptive-TDEE recalibration window** (days) + **divergence threshold** (kcal) that triggers the recalibration nudge.
- **Per-nutrient ceilings** — a **soft ceiling** ("enough") and an optional **hard ceiling** (safety limit), both user-overridable and stored in the **same unit as the goal**.

### Default ceilings (starting values — all user-overridable)
| Nutrient | Soft ceiling ("enough") | Hard ceiling (safety / UL) | Basis |
|---|---|---|---|
| Iron | ~RDA (8 mg M / 18 mg premenopausal F) | **45 mg/day** | UL — GI distress / overload |
| Zinc | RDA (8–11 mg) | **40 mg/day** | UL — copper deficiency, immune |
| Vitamin D | RDA (600–800 IU) | **4,000 IU (100 µg)/day** | UL — hypercalcemia |
| Omega 3 (EPA+DHA) | ~250–500 mg | **3 g/day** (>5 g no benefit + bleeding risk) | FDA "generally safe" |
| Carbs | 45–65% of calories | (personal; none by default) | AMDR |
| Fats | 20–35% of calories (sat fat <10%) | (personal) | AMDR |
| Protein | 10–35% of cal (~1.6–2.2 g/kg athletes) | (no UL; clinical only, e.g. kidney) | AMDR / practical |
| Fiber | goal (~14 g per 1,000 kcal) | **~70 g/day** (GI distress; ramp gradually) | Practical |
| Water | goal (e.g. 4,000 ml) | avoid sustained **>~1 L/hr** / extreme totals (hyponatremia) | Practical / safety |
| Creatine | 3–5 g/day (loading 20 g short-term) | (well tolerated; none) | Practical |

> Sources: Iron UL 45 mg & Zinc UL 40 mg (IOM DRI); Vitamin D UL 4,000 IU (IOM); Omega-3 ~3 g/day FDA-safe; AMDR carbs 45–65% / fat 20–35% / protein 10–35% of energy; fiber AI ~14 g/1,000 kcal; water hyponatremia & high-fiber GI distress are practical limits. Hard ceilings rarely fire in normal eating — they guard supplement stacking.

## 12. Open decisions / TODO for build
- [ ] Pin the **teal on-track threshold** (fixed % e.g. ≥75–80%, vs. pace-based). Recommend fixed % for predictability.
- [ ] Confirm `comfortableRate` defaults per nutrient.
- [ ] Confirm amber `buffer` size.
- [ ] Define the **limit-nearing amber threshold** (e.g., ≥85–90% of the ceiling).
- [ ] Decide whether evening auto-sort is on by default and its start time.
- [ ] Confirm Weight gets a trend indicator (▲▼ vs. yesterday).
- [ ] Define what "With metrics" view shows exactly (units g/mg/ml confirmed).
- [ ] Pick the **EWMA `alpha`** (trend smoothing strength) — default ~0.1.
- [ ] Set the **adaptive-TDEE recalibration window** (e.g., 14 vs 21 days) and the **kcal divergence threshold** for the nudge.
- [ ] Confirm the **kcal-per-kg constant** (7700 kcal/kg fat vs a blended value).
- [ ] **MVP1 palette hex values** for white / blue / teal / amber / red (check contrast on near-black — red/amber segments must read as clearly as teal).
- [x] **blue = reaching (under target), teal = reached.** Open: the exact teal floor (pace-based vs fixed %).
- [x] **Tap-to-rotate = global** — one tap toggles all rows. Open: exact mode order + default (recommend *current / target*).
- [ ] **Soft + hard ceilings per nutrient:** confirm the §11 defaults (and units), and which good metrics get a **hard safety ceiling** (red) vs amber-only.
- [ ] **Range (band) metrics:** confirm the set (Carbs confirmed; Calories/Fats candidates) and each one's healthy band.
- [ ] **Good/bad classification:** let users mark what's "bad for them" — this unlocks **red** for that metric (red = bad stuff in excess only).
- [ ] **Limit thresholds (bad stuff):** nearing → amber (e.g. ≥85–90% of ceiling); over → red (at 100%).
- [x] **Direction-vs-urgency = intensified blue:** an under-target row low on time stays **blue** (escalated), never amber/red, so amber/red mean "too much" only.
- [ ] **At-ceiling vs over-ceiling cue** on the bar (ceiling tick / overflow nub) so "maxed" ≠ "over" at a glance.
- [ ] **Kind-aware message copy:** "eat more" (good, under target) / "goal reached" (reached or in range) / "ease off — too much" (range over healthy ceiling, or bad nearing limit) / "too much" (bad over limit).
- [ ] Lock the **single color rule** so identical kind+progress always matches.
- [ ] *Post-MVP backlog:* animation, weight/TDEE forecast (§7), expert-vs-guided modes + general-use productization (logging depth, defaults, accessibility, safety/tone).

## 13. System summary (one line)
**MVP1:** a calm list — label · **compact bar (magnitude)** · value — with one color rule: 🔵 blue (eat more of good stuff) · 🟢 teal (goal reached) · 🟠 amber (nearing too much of bad stuff, or too much of a healthy-in-range item) · 🔴 red (too much of bad stuff, **or** a good thing past its hard safety limit); good/bad is user-definable, good metrics get a soft "enough" ceiling (amber) + optional safety ceiling (red), and numbers stay white except amber/red. **Tap a number** (global) to rotate current → current/target → units → plain-language message; **onboarding** teaches the colors, logging, and the tap. Top bar = date · menu; bottom = **`+ LOG FOOD`** (the core loop). **Post-MVP:** animation, the weight/TDEE forecast (§7), and expert-vs-guided modes for general-use rollout.

---

### Research sources (nutrient timing & safety limits)
- Iron timing: medlineplus.gov/ency/article/007478.htm · eatingwell.com/best-time-to-take-iron-supplement-8637263 · pubmed.ncbi.nlm.nih.gov/37357807/
- Iron UL (45 mg): ncbi.nlm.nih.gov/books/NBK222309/
- Zinc: boltpharmacy.co.uk/guide/when-is-the-best-time-to-take-zinc · ods.od.nih.gov/factsheets/Zinc-HealthProfessional/
- Iron/Zinc/Calcium interaction: superpower.com/guides/supplements-not-to-take-together · vinmec.com/eng/blog/note-do-not-take-zinc-and-iron-at-the-same-time-en
- Vitamin D: verywellhealth.com/best-time-of-day-to-take-vitamin-d-11945037 · coopercomplete.com/blog/should-you-take-vitamin-d-in-the-morning-or-at-night/ · UL 4,000 IU: ncbi.nlm.nih.gov/books/NBK56058/
- Omega 3: medicalnewstoday.com/articles/when-to-take-fish-oil · omegaquant.com/can-you-take-fish-oil-on-an-empty-stomach/ · safe dose: webmd.com/vitamins/ai/ingredientmono-993/fish-oil · healthline.com/nutrition/how-much-omega-3
- Creatine: pmc.ncbi.nlm.nih.gov/articles/PMC8401986/ · frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.893714/full
- Protein/casein: pubmed.ncbi.nlm.nih.gov/32698256/ · sciencedirect.com/science/article/pii/S0022316622106322
- Fiber: today.com/health/diet-fitness/best-time-of-day-to-eat-fiber-rcna266072 · too much: goodrx.com/well-being/gut-health/too-much-fiber-symptoms
- Water/nocturia: sleepfoundation.org/nutrition/drinking-water-before-bed · health.clevelandclinic.org/stop-full-bladder-killing-sleep · intoxication: my.clevelandclinic.org/health/diseases/water-intoxication
- AMDR macros: mdanderson.org/cancerwise/macronutrients-101 · ncbi.nlm.nih.gov/books/NBK610333/
