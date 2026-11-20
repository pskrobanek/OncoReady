// Výpočty pro stránku Statistiky – vše z dat v aplikaci (demo data jsou smyšlená).
import { QUESTIONS } from '../data/questionnaire'
import { libraryItem } from '../data/questionnaireLibrary'
import { addDays, daysBetween, todayIso } from './format'
import { evalLab, LAB_PARAMS, readinessOf, worstCurrent } from './readiness'
import { answerPoints, bandOf, defOf, isRedFlag, totalScore, type Band } from './scoring'
import type { DB, LabParam, Monitoring, Questionnaire } from './types'

/** Kohorty = skupiny šablon (stejné jako pohledy Dashboardu v demu). */
export type Cohort = 'acute' | 'chronic' | 'stac'
export const COHORTS: { key: Cohort; label: string; color: string }[] = [
  { key: 'acute', label: 'Akutní toxicita RT', color: '#2a78d6' },
  { key: 'chronic', label: 'Chronická toxicita RT', color: '#eb6834' },
  { key: 'stac', label: 'Stacionář', color: '#1baf7a' },
]
export const cohortOf = (programId: string | null): Cohort | null =>
  !programId ? null : programId.startsWith('pr-ch') ? 'chronic' : programId === 'pr-ak' ? 'acute' : programId.startsWith('pr-st') ? 'stac' : null

const filled = (q: Questionnaire) => !!q.answers && !!q.filledAt
const monOf = (db: DB, q: Questionnaire) => db.monitorings.find((m) => m.id === q.monitoringId)
const quantile = (xs: number[], p: number) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = (s.length - 1) * p
  const lo = Math.floor(i)
  return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)
}
const round1 = (x: number) => Math.round(x * 10) / 10
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

// ---------------------------------------------------------------------------
// Dlaždice
// ---------------------------------------------------------------------------
export function overview(db: DB, today = todayIso()) {
  const active = db.monitorings.filter((m) => m.active && m.start <= today && m.end >= today)
  const patients = new Set(active.map((m) => m.patientId))
  const since = addDays(today, -30)
  const due = db.questionnaires.filter((q) => q.scheduledFor >= since && q.scheduledFor <= today)
  const done = due.filter(filled)
  const sev = [...patients].map((id) => worstCurrent(readinessOf(db, id, today)))
  const red = sev.filter((s) => s === 'red').length
  const g3 = db.questionnaires.filter((q) => filled(q) && q.filledAt!.slice(0, 10) >= since && hasG3(q.answers!)).length
  return { activePatients: patients.size, fillRate: pct(done.length, due.length), due: due.length, red, redShare: pct(red, patients.size), g3 }
}

/** G3+ = aspoň jedna odpověď s nejvyšší závažností (OncoReady ≥ 3 b ze 4, EORTC „Velmi“ = 3 b) nebo red flag. ⚠️ OVĚŘIT mapování na stupně CTCAE. */
export function hasG3(answers: NonNullable<Questionnaire['answers']>) {
  const def = defOf(answers)
  if (def) return def.questions.some((q) => answers[q.id] !== undefined && ((answerPoints(q.id, answers[q.id], answers) ?? 0) >= 3 || isRedFlag(q.id, answers)))
  return QUESTIONS.some((q) => (answerPoints(q.id, answers[q.id]) ?? 0) >= 3)
}

// ---------------------------------------------------------------------------
// Akutní toxicita: průměrný průběh podle týdne léčby
// ---------------------------------------------------------------------------
export type WeekRow = { week: number; label: string; n: number; mean: number; p25: number; p75: number; band: [number, number]; green: number; yellow: number; red: number; blue: number }
export function acuteCourse(db: DB): WeekRow[] {
  const mons = db.monitorings.filter((m) => cohortOf(m.programId) === 'acute')
  const byWeek = new Map<number, Questionnaire[]>()
  for (const m of mons)
    for (const q of db.questionnaires.filter((x) => x.monitoringId === m.id && filled(x))) {
      const w = Math.floor(daysBetween(m.start, q.scheduledFor) / 7) // dotazník po 1. týdnu léčby = 1. týden
      if (w < 1 || w > 8) continue
      byWeek.set(w, [...(byWeek.get(w) ?? []), q])
    }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, qs]) => {
      const scores = qs.map((q) => totalScore(q.answers!))
      const bands = qs.map((q) => bandOf(q.answers!))
      const share = (b: Band) => pct(bands.filter((x) => x === b).length, bands.length)
      const p25 = round1(quantile(scores, 0.25))
      const p75 = round1(quantile(scores, 0.75))
      return {
        week,
        label: `${week}. týden`,
        n: qs.length,
        mean: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
        p25,
        p75,
        band: [p25, p75],
        green: share('green'),
        yellow: share('yellow'),
        red: share('red'),
        blue: share('blue'),
      }
    })
}

/** Nejčastější závažné příznaky v akutní toxicitě: podíl vyplněných dotazníků s odpovědí za ≥ 3 body. */
export function acuteTopSymptoms(db: DB) {
  const mons = new Set(db.monitorings.filter((m) => cohortOf(m.programId) === 'acute').map((m) => m.id))
  const qs = db.questionnaires.filter((q) => mons.has(q.monitoringId) && filled(q) && !defOf(q.answers!))
  return QUESTIONS.filter((q) => q.type !== 'control')
    .map((q) => {
      const hits = qs.filter((x) => (answerPoints(q.id, x.answers![q.id]) ?? 0) >= 3).length
      return { id: q.id, label: SHORT[q.id] ?? q.id, share: pct(hits, qs.length), hits, n: qs.length }
    })
    .sort((a, b) => b.share - a.share)
}
const SHORT: Record<string, string> = {
  health: 'Celkový stav',
  fatigue: 'Únava',
  symptoms: 'Nevolnost, průjem, teplota',
  skin: 'Kůže v ozařované oblasti',
  pain: 'Bolest',
  appetite: 'Nechutenství',
  nausea: 'Nevolnost',
  diarrhea: 'Průjem',
  swallowing: 'Polykání',
  mood: 'Psychická pohoda',
}

// ---------------------------------------------------------------------------
// Chronická toxicita: G3+ podle modulu EORTC a roku
// ---------------------------------------------------------------------------
export const EORTC_MODULES: { programId: string; questionnaireId: string; label: string }[] = [
  { programId: 'pr-ch-pr', questionnaireId: 'lib-eortc-pr25', label: 'Prostata · QLQ-PR25' },
  { programId: 'pr-ch-br', questionnaireId: 'lib-eortc-br45', label: 'Prs · QLQ-BR45' },
  { programId: 'pr-ch-hn', questionnaireId: 'lib-eortc-hn43', label: 'Hlava a krk · QLQ-H&N43' },
  { programId: 'pr-ch-lc', questionnaireId: 'lib-eortc-lc29', label: 'Plíce · QLQ-LC29' },
]
/** Rok po radioterapii (od začátku monitorace chronické toxicity): 1, 2, …, 5 (= 5. a další). */
const yearAfter = (db: DB, q: Questionnaire) => {
  const m = monOf(db, q)
  return m ? Math.min(5, Math.max(1, Math.floor(daysBetween(m.start, q.scheduledFor) / 365) + 1)) : 1
}
export const YEAR_LABEL = (y: number) => (y >= 5 ? '5.+ rok' : `${y}. rok`)
export function chronicG3(db: DB, questionnaireId: string) {
  const def = libraryItem(questionnaireId)!
  const qs = db.questionnaires.filter((q) => filled(q) && q.answers!.__def === questionnaireId)
  const yearsN = [...new Set(qs.map((q) => yearAfter(db, q)))].sort((a, b) => a - b)
  const years = yearsN.map(YEAR_LABEL)
  const byYear = yearsN.map((yn) => {
    const y = YEAR_LABEL(yn)
    const list = qs.filter((q) => yearAfter(db, q) === yn)
    const patients = new Set(list.map((q) => monOf(db, q)?.patientId))
    return { year: y, n: list.length, patients: patients.size, g3: pct(list.filter((q) => hasG3(q.answers!)).length, list.length), flags: list.filter((q) => def.questions.some((x) => isRedFlag(x.id, q.answers!))).length }
  })
  // Otázky modulu (bez obecných otázek C30) × rok: podíl odpovědí „Velmi“ / red flag
  const items = def.questions.filter((x) => !x.id.startsWith('c-'))
  const heat = items.map((item) => ({
    id: item.id,
    label: item.text,
    cells: yearsN.map((yn) => {
      const y = YEAR_LABEL(yn)
      const list = qs.filter((q) => yearAfter(db, q) === yn && q.answers![item.id] !== undefined)
      const hits = list.filter((q) => (answerPoints(item.id, q.answers![item.id], q.answers!) ?? 0) >= 3 || isRedFlag(item.id, q.answers!)).length
      return { year: y, share: pct(hits, list.length), hits, n: list.length }
    }),
  }))
  return { years, byYear, heat }
}

// ---------------------------------------------------------------------------
// Vyplňování dotazníků po měsících
// ---------------------------------------------------------------------------
export function complianceByMonth(db: DB, months = 12, today = todayIso()) {
  const keys: string[] = []
  const d = new Date(today + 'T00:00:00')
  for (let i = months - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`)
  }
  const mons = new Map<string, Monitoring>(db.monitorings.map((m) => [m.id, m]))
  return keys.map((k) => {
    const row: Record<string, number | string | null> = { month: k, label: MONTH_SHORT[Number(k.slice(5)) - 1] + (k.endsWith('-01') ? ` ${k.slice(0, 4)}` : '') }
    for (const c of COHORTS) {
      const due = db.questionnaires.filter((q) => q.scheduledFor.startsWith(k) && q.scheduledFor <= today && cohortOf(mons.get(q.monitoringId)?.programId ?? null) === c.key)
      row[c.key] = due.length ? pct(due.filter(filled).length, due.length) : null
      row[`${c.key}_n`] = due.length
    }
    return row
  })
}
const MONTH_SHORT = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro']

// ---------------------------------------------------------------------------
// Laboratoř ve stacionáři: podíl odběrů mimo mez podle parametru
// ---------------------------------------------------------------------------
export function stacLab(db: DB) {
  const patients = new Set(db.monitorings.filter((m) => cohortOf(m.programId) === 'stac').map((m) => m.patientId))
  const labs = db.labs.filter((l) => patients.has(l.patientId))
  return LAB_PARAMS.map((p) => {
    const rows = labs.map((l) => evalLab(l).rows.find((r) => r.metric.short === p.short)).filter(Boolean)
    const yellow = rows.filter((r) => r!.level === 'yellow').length
    const red = rows.filter((r) => r!.level === 'red').length
    return { key: p.key as LabParam, label: p.label, yellow: pct(yellow, rows.length), red: pct(red, rows.length), n: rows.length }
  })
}
