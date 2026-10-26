// Pravidla připravenosti k léčbě: laboratoř, wearables a souhrnný stav ze zdrojů, které pacient má.
// Meze a okna aktuálnosti jsou předpoklad pro prototyp – ⚠️ OVĚŘIT s klinikem.
import { statusOf } from '../components/QuestionnaireBadges'
import { addDays, agoText, daysBetween, num, signed, todayIso } from './format'
import { bandOf, totalScore, type Band } from './scoring'
import type { DB, LabParam, LabResult, Questionnaire, WearableDay } from './types'

export type Level = 'green' | 'yellow' | 'red'
/** Souhrnný stav; gray = některý zdroj chybí nebo je neaktuální. */
export type Overall = Level | 'gray'
export type SourceKey = 'questionnaire' | 'lab' | 'wearables'

export const SOURCES: { key: SourceKey; label: string }[] = [
  { key: 'questionnaire', label: 'Dotazník' },
  { key: 'lab', label: 'Laboratoř' },
  { key: 'wearables', label: 'Wearables' },
]
export const sourceMeta = (k: SourceKey) => SOURCES.find((s) => s.key === k)!

/** Stáří dat (dny), do kterého se zdroj počítá jako aktuální. Dotazník: interval monitorace, min. 7 dní. */
export const FRESH_DAYS = { questionnaireMin: 7, lab: 7, wearables: 1 }

/** Pořadí závažnosti pro souhrn: červená > šedá > žlutá > zelená. */
export const OVERALL_RANK: Record<Overall, number> = { red: 3, gray: 2, yellow: 1, green: 0 }
const FINDING_ORDER: Record<Overall, number> = { red: 0, yellow: 1, gray: 2, green: 3 }
export const worstOf = (levels: Overall[]): Overall | null =>
  levels.length ? levels.reduce((a, b) => (OVERALL_RANK[b] > OVERALL_RANK[a] ? b : a)) : null

/** Pásmo dotazníku → úroveň (modrá = vyžádal kontrolu se počítá jako žlutá). */
export const bandLevel = (b: Band): Level => (b === 'red' ? 'red' : b === 'green' ? 'green' : 'yellow')

// ---------------------------------------------------------------------------
// Meze
// ---------------------------------------------------------------------------
/** min: hodnota pod mezí je horší (neutrofily); max: hodnota na mezi a nad ní je horší (teplota). */
type Limit = { dir: 'min' | 'max'; yellow: number; red: number }
export type Metric = { label: string; short: string; unit: string; decimals: number; limit: Limit }

export const LAB_PARAMS: (Metric & { key: LabParam })[] = [
  { key: 'neu', label: 'Neutrofily', short: 'NEU', unit: '×10⁹/l', decimals: 1, limit: { dir: 'min', yellow: 2, red: 1.5 } },
  { key: 'plt', label: 'Trombocyty', short: 'PLT', unit: '×10⁹/l', decimals: 0, limit: { dir: 'min', yellow: 150, red: 100 } },
  { key: 'hb', label: 'Hemoglobin', short: 'HB', unit: 'g/l', decimals: 0, limit: { dir: 'min', yellow: 100, red: 80 } },
  { key: 'krea', label: 'Kreatinin', short: 'KREA', unit: 'µmol/l', decimals: 0, limit: { dir: 'max', yellow: 110, red: 150 } },
  { key: 'bili', label: 'Bilirubin', short: 'BILI', unit: 'µmol/l', decimals: 0, limit: { dir: 'max', yellow: 22, red: 32 } },
]

type WearKey = 'temp' | 'spo2' | 'hr'
export const WEAR_METRICS: (Metric & { key: WearKey })[] = [
  { key: 'temp', label: 'Teplota', short: 'TEP', unit: '°C', decimals: 1, limit: { dir: 'max', yellow: 37.5, red: 38 } },
  { key: 'spo2', label: 'Saturace O₂', short: 'SpO₂', unit: '%', decimals: 0, limit: { dir: 'min', yellow: 95, red: 92 } },
  { key: 'hr', label: 'Klidový tep', short: 'TF', unit: '/min', decimals: 0, limit: { dir: 'max', yellow: 100, red: 120 } },
]
/** Pokles průměru kroků za posledních 7 dní proti předchozím 14 dnům (%), od kterého je stav žlutý. */
export const STEPS_DROP_YELLOW = -40

const levelOf = (l: Limit, v: number): Level =>
  l.dir === 'min' ? (v < l.red ? 'red' : v < l.yellow ? 'yellow' : 'green') : v >= l.red ? 'red' : v >= l.yellow ? 'yellow' : 'green'

/** Text meze, kterou hodnota překročila: „≥ 1,5“ (musí být aspoň) / „< 38,0“ (musí být pod). */
const limitText = (m: Metric, level: Level) => {
  const v = num(level === 'red' ? m.limit.red : m.limit.yellow, m.decimals)
  return m.limit.dir === 'min' ? `≥ ${v}` : `< ${v}`
}
/** Popis mezí pro tabulku v detailu: „≥ 2,0 (červená < 1,5)“. */
export const rangeText = (m: Metric) =>
  m.limit.dir === 'min'
    ? `≥ ${num(m.limit.yellow, m.decimals)} (červená < ${num(m.limit.red, m.decimals)})`
    : `< ${num(m.limit.yellow, m.decimals)} (červená ≥ ${num(m.limit.red, m.decimals)})`

/** Jak daleko je hodnota za červenou mezí (pro výběr nejhoršího parametru). */
const deviation = (m: Metric, v: number) => (m.limit.dir === 'min' ? m.limit.red / Math.max(v, 0.001) : v / m.limit.red)

export type Finding = { source: SourceKey; level: Overall; text: string }
export type MetricRow = { metric: Metric; value: string; level: Level; raw: number }

const LEVEL_RANK: Record<Level, number> = { red: 2, yellow: 1, green: 0 }
const worstLevel = (ls: Level[]): Level => ls.reduce<Level>((a, b) => (LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a), 'green')

const metricRow = (m: Metric, v: number): MetricRow => ({ metric: m, value: num(v, m.decimals), level: levelOf(m.limit, v), raw: deviation(m, v) })

/** „Neutrofily 1,2 (mez ≥ 1,5)“, u wearables s jednotkou: „Teplota 38,1 °C (mez < 38,0)“. */
const rowFinding = (source: SourceKey, r: MetricRow, withUnit: boolean): Finding => ({
  source,
  level: r.level,
  text: `${r.metric.label} ${r.value}${withUnit ? ` ${r.metric.unit}` : ''} (mez ${limitText(r.metric, r.level)})`,
})

/** Seřadí řádky: nejhorší nahoře, při shodě podle vzdálenosti od červené meze. */
const bySeverity = (a: MetricRow, b: MetricRow) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.raw - a.raw

// ---------------------------------------------------------------------------
// Laboratoř
// ---------------------------------------------------------------------------
export function evalLab(lab: LabResult) {
  const rows = LAB_PARAMS.filter((p) => lab.values[p.key] !== undefined).map((p) => metricRow(p, lab.values[p.key]!))
  const level = worstLevel(rows.map((r) => r.level))
  const worst = level === 'green' ? null : [...rows].sort(bySeverity)[0]
  const findings = rows.filter((r) => r.level !== 'green').sort(bySeverity).map((r) => rowFinding('lab', r, false))
  return { rows, level, worst, findings }
}

// ---------------------------------------------------------------------------
// Wearables
// ---------------------------------------------------------------------------
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Změna průměru kroků za posledních 7 dní proti předchozím 14 dnům (%); null = málo dat. */
export function stepsChange(days: WearableDay[], date: string): number | null {
  const last = days.filter((d) => d.date > addDays(date, -7) && d.date <= date)
  const base = days.filter((d) => d.date > addDays(date, -21) && d.date <= addDays(date, -7))
  if (last.length < 4 || base.length < 7) return null
  return Math.round((avg(last.map((d) => d.steps)) / avg(base.map((d) => d.steps)) - 1) * 100)
}

/** Vyhodnocení jednoho dne; `all` = všechny dny pacienta (kvůli trendu kroků). */
export function evalWearDay(day: WearableDay, all: WearableDay[]) {
  const rows = WEAR_METRICS.map((m) => metricRow(m, day[m.key]))
  const findings = rows.filter((r) => r.level !== 'green').sort(bySeverity).map((r) => rowFinding('wearables', r, true))
  const change = stepsChange(all, day.date)
  const stepsLevel: Level = change !== null && change <= STEPS_DROP_YELLOW ? 'yellow' : 'green'
  if (stepsLevel === 'yellow') findings.push({ source: 'wearables', level: 'yellow', text: `Kroky ${signed(change!)} % za 7 dní (mez ${signed(STEPS_DROP_YELLOW)} %)` })
  return { rows, steps: day.steps, change, stepsLevel, level: worstLevel([...rows.map((r) => r.level), stepsLevel]), findings }
}

// ---------------------------------------------------------------------------
// Dotazník
// ---------------------------------------------------------------------------
export function questionnaireFinding(q: Questionnaire): Finding | null {
  const band = bandOf(q.answers!)
  const score = totalScore(q.answers!)
  if (band === 'green') return null
  const text = band === 'blue' ? `Vyžádal kontrolu (skóre ${score})` : `Skóre ${score} – ${band === 'red' ? 'červené' : 'žluté'} pásmo`
  return { source: 'questionnaire', level: bandLevel(band), text }
}

// ---------------------------------------------------------------------------
// Souhrn (aktuální stav)
// ---------------------------------------------------------------------------
export type SourceState = {
  source: SourceKey
  state: 'ok' | 'stale' | 'missing'
  /** Úroveň zdroje; neaktuální nebo chybějící zdroj = šedá. */
  level: Overall
  /** Datum posledních dat (i neaktuálních). */
  date: string | null
  findings: Finding[]
  questionnaire?: Questionnaire
  lab?: LabResult
  day?: WearableDay
}
export type Readiness = { overall: Overall; sources: SourceState[]; findings: Finding[] }

const BAND_RANK: Record<Band, number> = { red: 3, blue: 2, yellow: 1, green: 0 }

/**
 * Nejhorší výsledek z aktuálních zdrojů (barevná čára za sloupcem Aktuální):
 * červená > vyžádal kontrolu (modrá) > žlutá > zelená. Neaktuální zdroje se nepočítají; null = žádný zdroj není aktuální.
 */
export function worstCurrent(r: Readiness): Band | null {
  const bands = r.sources.filter((s) => s.state === 'ok').map((s): Band => (s.source === 'questionnaire' ? bandOf(s.questionnaire!.answers!) : (s.level as Level)))
  return bands.length ? bands.reduce((a, b) => (BAND_RANK[b] > BAND_RANK[a] ? b : a)) : null
}

const staleFinding = (source: SourceKey, date: string | null, today: string): Finding => ({
  source,
  level: 'gray',
  text: date ? `Neaktuální – ${agoText(date, today)}` : source === 'questionnaire' ? 'Žádný vyplněný dotazník' : 'Bez dat',
})

/**
 * Souhrn připravenosti pacienta k dnešku (pravidlo souhrnu). Počítají se jen zdroje, které pacient má:
 * dotazník (má monitoraci), laboratoř (má aspoň jeden výsledek), wearables (má aspoň jeden den dat).
 * červená = kterýkoli aktuální zdroj červený; šedá = některý zdroj je neaktuální nebo chybí vyplněný dotazník;
 * žlutá = kterýkoli zdroj žlutý (nebo dotazník modrý); zelená = všechny zdroje pacienta aktuální a zelené.
 */
export function readinessOf(db: DB, patientId: string, today = todayIso()): Readiness {
  const monIds = new Set(db.monitorings.filter((m) => m.patientId === patientId).map((m) => m.id))
  const filled = db.questionnaires
    .filter((q) => monIds.has(q.monitoringId) && q.answers && q.filledAt && q.filledAt.slice(0, 10) <= today)
    .sort((a, b) => b.filledAt!.localeCompare(a.filledAt!))
  const labs = db.labs.filter((l) => l.patientId === patientId && l.date <= today).sort((a, b) => b.date.localeCompare(a.date))
  const days = db.wearables.filter((d) => d.patientId === patientId && d.date <= today).sort((a, b) => a.date.localeCompare(b.date))

  const sources: SourceState[] = []

  // Dotazník
  const q = filled[0]
  if (!monIds.size) {
    /* pacient bez monitorace – dotazník není jeho zdrojem */
  } else if (!q) sources.push({ source: 'questionnaire', state: 'missing', level: 'gray', date: null, findings: [staleFinding('questionnaire', null, today)] })
  else {
    const mon = db.monitorings.find((m) => m.id === q.monitoringId)
    const every = db.programs.find((p) => p.id === mon?.programId)?.frequencyDays ?? 7
    const date = q.filledAt!.slice(0, 10)
    const fresh = daysBetween(date, today) <= Math.max(FRESH_DAYS.questionnaireMin, every)
    const f = questionnaireFinding(q)
    sources.push(
      fresh
        ? { source: 'questionnaire', state: 'ok', level: bandLevel(bandOf(q.answers!)), date, findings: f ? [f] : [], questionnaire: q }
        : { source: 'questionnaire', state: 'stale', level: 'gray', date, findings: [staleFinding('questionnaire', date, today)], questionnaire: q },
    )
  }

  // Laboratoř
  const lab = labs[0]
  if (lab) {
    const ev = evalLab(lab)
    const fresh = daysBetween(lab.date, today) <= FRESH_DAYS.lab
    sources.push(
      fresh
        ? { source: 'lab', state: 'ok', level: ev.level, date: lab.date, findings: ev.findings, lab }
        : { source: 'lab', state: 'stale', level: 'gray', date: lab.date, findings: [staleFinding('lab', lab.date, today)], lab },
    )
  }

  // Wearables
  const day = days[days.length - 1]
  if (day) {
    const ev = evalWearDay(day, days)
    const fresh = daysBetween(day.date, today) <= FRESH_DAYS.wearables
    sources.push(
      fresh
        ? { source: 'wearables', state: 'ok', level: ev.level, date: day.date, findings: ev.findings, day }
        : { source: 'wearables', state: 'stale', level: 'gray', date: day.date, findings: [staleFinding('wearables', day.date, today)], day },
    )
  }

  const overall = worstOf(sources.map((s) => s.level)) ?? 'gray'
  // Pořadí nálezů: nejdřív hodnoty mimo meze (červené, žluté), pak chybějící / neaktuální data.
  const findings = sources.flatMap((s) => s.findings).sort((a, b) => FINDING_ORDER[a.level] - FINDING_ORDER[b.level])
  return { overall, sources, findings }
}

// ---------------------------------------------------------------------------
// Časová osa: po týdnech, měsících, letech, nebo jen vyplněné (bez prázdných období)
// ---------------------------------------------------------------------------
export type TimelineMode = 'week' | 'month' | 'year' | 'filled'

/** Pondělí týdne, do kterého datum patří. */
export const weekOf = (iso: string) => {
  const day = new Date(iso.slice(0, 10) + 'T00:00:00').getDay() // 0 = neděle
  return addDays(iso.slice(0, 10), -((day + 6) % 7))
}

const MONTH_NAMES = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']

/** „Říjen 2026“ z klíče měsíce „2026-10“ nebo z data. */
export const monthName = (iso: string) => `${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`

/** Klíč období (sloupce osy), do kterého datum patří: pondělí týdne, „2026-10“, „2026“; „Jen vyplněné“ = jediný sloupec. */
export const periodOf = (mode: TimelineMode, iso: string) =>
  mode === 'week' ? weekOf(iso) : mode === 'month' ? iso.slice(0, 7) : mode === 'year' ? iso.slice(0, 4) : 'all'

/** Období od aktuálního zpět po období data `from`, nejnovější první. */
export function periodsBack(mode: TimelineMode, from: string, to: string): string[] {
  if (mode === 'filled') return ['all']
  const out: string[] = []
  const last = periodOf(mode, from)
  if (mode === 'week') for (let w = weekOf(to); w >= last; w = addDays(w, -7)) out.push(w)
  else if (mode === 'year') for (let y = Number(to.slice(0, 4)); String(y) >= last; y--) out.push(String(y))
  else {
    let [y, m] = to.slice(0, 7).split('-').map(Number)
    for (let k = to.slice(0, 7); k >= last; k = `${y}-${String(m).padStart(2, '0')}`) {
      out.push(k)
      if (--m === 0) [y, m] = [y - 1, 12]
    }
  }
  return out
}

/** Datum, podle kterého se dotazník zařadí na osu: vyplnění, jinak termín. */
export const questionnaireDate = (q: Questionnaire) => (q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor)

/** Wearables na ose: jeden odznak za týden = nejhorší den (při shodě novější). */
export type WearWeek = { level: Level; day: WearableDay; findings: Finding[] }
export type PatientTimeline = {
  questionnaires: Map<string, Questionnaire[]>
  labs: Map<string, LabResult[]>
  wearables: Map<string, WearWeek[]>
  /** Nejstarší datum v datech pacienta (pro rozsah osy). */
  earliest: string | null
}

const push = <T,>(m: Map<string, T[]>, k: string, v: T) => (m.get(k) ?? m.set(k, []).get(k)!).push(v)

/**
 * Rozdělí data pacienta do sloupců osy; uvnitř sloupce je nejnovější vlevo.
 * `qs` = dotazníky zobrazené monitorace. Budoucí termíny se vynechají, v režimu „Jen vyplněné“ i nevyplněné (N/A).
 */
export function timelineOf(db: DB, patientId: string, qs: Questionnaire[], mode: TimelineMode, today = todayIso()): PatientTimeline {
  const questionnaires = new Map<string, Questionnaire[]>()
  const labs = new Map<string, LabResult[]>()
  const wearables = new Map<string, WearWeek[]>()
  const dates: string[] = []

  const shown = qs
    .filter((q) => {
      const st = statusOf(q)
      return st !== 'future' && !(mode === 'filled' && st === 'na')
    })
    .sort((a, b) => questionnaireDate(b).localeCompare(questionnaireDate(a)))
  for (const q of shown) {
    push(questionnaires, periodOf(mode, questionnaireDate(q)), q)
    dates.push(questionnaireDate(q))
  }
  for (const l of db.labs.filter((x) => x.patientId === patientId && x.date <= today).sort((a, b) => b.date.localeCompare(a.date))) {
    push(labs, periodOf(mode, l.date), l)
    dates.push(l.date)
  }
  const days = db.wearables.filter((x) => x.patientId === patientId && x.date <= today).sort((a, b) => a.date.localeCompare(b.date))
  const weeks = new Map<string, WearWeek>()
  for (const d of days) {
    const ev = evalWearDay(d, days)
    const w = weekOf(d.date)
    const cur = weeks.get(w)
    if (!cur || LEVEL_RANK[ev.level] >= LEVEL_RANK[cur.level]) weeks.set(w, { level: ev.level, day: d, findings: ev.findings })
    dates.push(d.date)
  }
  for (const ww of [...weeks.values()].sort((a, b) => b.day.date.localeCompare(a.day.date))) push(wearables, periodOf(mode, ww.day.date), ww)

  return { questionnaires, labs, wearables, earliest: dates.length ? dates.reduce((a, b) => (b < a ? b : a)) : null }
}
