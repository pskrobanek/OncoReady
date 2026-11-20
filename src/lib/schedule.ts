// Frekvence a konec monitorace v šabloně: výpočet termínů dotazníků a čitelné popisy.
import { addDays } from './format'
import type { ScheduleEnd, ScheduleUnit, Schedule } from './types'

export const UNITS: ScheduleUnit[] = ['day', 'week', 'month', 'year']
export const MAX_COUNT = 999

/** Názvy jednotek: [1, 2–4, 5+] – „1 den, 2 dny, 5 dní“. */
const UNIT_FORMS: Record<ScheduleUnit, [string, string, string]> = {
  day: ['den', 'dny', 'dní'],
  week: ['týden', 'týdny', 'týdnů'],
  month: ['měsíc', 'měsíce', 'měsíců'],
  year: ['rok', 'roky', 'let'],
}
/** Česká množná čísla: 1 → [0], 2–4 → [1], jinak [2]. */
export const plural = (n: number, forms: [string, string, string]) => (n === 1 ? forms[0] : n >= 2 && n <= 4 ? forms[1] : forms[2])
export const unitWord = (n: number, unit: ScheduleUnit) => plural(n, UNIT_FORMS[unit])
/** Název jednotky ve výběru (bez čísla). */
export const UNIT_LABEL: Record<ScheduleUnit, string> = { day: 'Den', week: 'Týden', month: 'Měsíc', year: 'Rok' }

/** Dny v týdnu (1 = pondělí … 7 = neděle). */
export const WEEKDAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle']
const WEEKDAYS_IN = ['v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu', 'v neděli']
export const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const MONTHS_IN = ['v lednu', 'v únoru', 'v březnu', 'v dubnu', 'v květnu', 'v červnu', 'v červenci', 'v srpnu', 'v září', 'v říjnu', 'v listopadu', 'v prosinci']

export const DEFAULT_SCHEDULE = (): Schedule => ({ kind: 'regular', unit: 'week', every: 1, weekday: 1, monthDay: 1, month: 1, steps: [] })
export const DEFAULT_END = (): ScheduleEnd => ({ kind: 'never', count: 10, amount: 3, unit: 'month' })

const pad = (n: number) => String(n).padStart(2, '0')
const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number]
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
/** Datum v daném roce a měsíci (1–12); den se zkrátí na poslední den měsíce (31. → 30. / 28.). */
const ymd = (y: number, m: number, d: number) => {
  const yy = y + Math.floor((m - 1) / 12)
  const mm = ((m - 1) % 12 + 12) % 12 + 1
  return `${yy}-${pad(mm)}-${pad(Math.min(d, daysInMonth(yy, mm)))}`
}
const weekdayOf = (iso: string) => ((new Date(iso + 'T00:00:00').getDay() + 6) % 7) + 1 // 1 = pondělí

/** Posun data o n jednotek (měsíce a roky se zkracují na konec měsíce). */
export function addUnits(iso: string, n: number, unit: ScheduleUnit): string {
  if (unit === 'day') return addDays(iso, n)
  if (unit === 'week') return addDays(iso, 7 * n)
  const [y, m, d] = parts(iso)
  return unit === 'month' ? ymd(y, m + n, d) : ymd(y + n, m, d)
}

/**
 * Termíny dotazníků od začátku monitorace `start`.
 * - Jednorázově: jeden dotazník v den začátku.
 * - Pravidelně: první termín po začátku, pak vždy po zvoleném intervalu
 *   (týden = ve zvolený den v týdnu, měsíc = ve zvolený den v měsíci, rok = ve zvoleném měsíci, den v měsíci jako začátek).
 * - Vlastní: každý řádek = termín za N jednotek od začátku monitorace (seřazeno).
 * Konec: nikdy (do `until`, nejvýš `limit` termínů), počtem dotazníků, nebo dobou od začátku.
 */
export function planDates(s: Schedule, end: ScheduleEnd, start: string, until: string | null, limit = 500): string[] {
  if (s.kind === 'once') return [start]
  if (s.kind === 'custom') {
    return [...new Set(s.steps.filter((x) => x.count >= 1).map((x) => addUnits(start, x.count, x.unit)))].sort().filter((d) => !until || d <= until)
  }
  const stopAt = end.kind === 'duration' ? addUnits(start, end.amount, end.unit) : null
  const maxCount = end.kind === 'count' ? end.count : limit
  const n = Math.max(1, s.every)
  const out: string[] = []
  const [y, m] = parts(start)
  // k-tý termín (od 1)
  const nth = (k: number): string => {
    switch (s.unit) {
      case 'day':
        return addDays(start, n * k)
      case 'week': {
        const first = addDays(start, ((s.weekday - weekdayOf(start) + 7) % 7) || 7) // nejbližší zvolený den po začátku
        return addDays(first, 7 * n * (k - 1))
      }
      case 'month': {
        const firstThis = ymd(y, m, s.monthDay)
        const off = firstThis > start ? 0 : 1
        return ymd(y, m + off + n * (k - 1), s.monthDay)
      }
      case 'year': {
        const d = parts(start)[2]
        const firstThis = ymd(y, s.month, d)
        const off = firstThis > start ? 0 : 1
        return ymd(y + off + n * (k - 1), s.month, d)
      }
    }
  }
  for (let k = 1; out.length < maxCount; k++) {
    const d = nth(k)
    if ((stopAt && d > stopAt) || (until && d > until)) break
    out.push(d)
  }
  return out
}

/**
 * Přibližný interval v dnech – používá se tam, kde stačí jedno číslo
 * (stáří dotazníku na Dashboardu, plán monitorace bez šablony).
 */
export function approxDays(s: Schedule): number {
  if (s.kind === 'once') return 7
  if (s.kind === 'custom') {
    const dates = planDates(s, DEFAULT_END(), '2026-01-01', null)
    const gaps = dates.map((d, i) => (i === 0 ? 0 : (Date.parse(d) - Date.parse(dates[i - 1])) / 86400000)).filter((g) => g > 0)
    return Math.max(1, Math.round(gaps.length ? Math.min(...gaps) : 7))
  }
  const per = { day: 1, week: 7, month: 30, year: 365 }[s.unit]
  return Math.max(1, s.every) * per
}

/** Krátký popis frekvence pro seznam šablon, např. „Každé 2 týdny ve středu“. */
export function scheduleLabel(s: Schedule): string {
  if (s.kind === 'once') return 'Jednorázově'
  if (s.kind === 'custom') {
    const c = s.steps.length
    return `Vlastní (${c} ${plural(c, ['termín', 'termíny', 'termínů'])})`
  }
  const n = Math.max(1, s.every)
  const each =
    n === 1
      ? { day: 'Každý den', week: 'Každý týden', month: 'Každý měsíc', year: 'Každý rok' }[s.unit]
      : `${n >= 2 && n <= 4 ? 'Každé' : 'Každých'} ${n} ${unitWord(n, s.unit)}`
  if (s.unit === 'week') return `${each} ${WEEKDAYS_IN[s.weekday - 1]}`
  if (s.unit === 'month') return `${each}, ${s.monthDay}. den`
  if (s.unit === 'year') return `${each} ${MONTHS_IN[s.month - 1]}`
  return each
}

/** Popis konce monitorace, např. „po 10 dotaznících“, „po 3 měsících“. */
export function endLabel(s: Schedule, e: ScheduleEnd): string | null {
  if (s.kind !== 'regular' || e.kind === 'never') return null
  if (e.kind === 'count') return `celkem ${e.count} ${plural(e.count, ['dotazník', 'dotazníky', 'dotazníků'])}`
  return `po dobu ${e.amount} ${unitWord(e.amount, e.unit)}`
}

/** Šablona uložená před zavedením frekvence (jen počet dní) → Pravidelně každých N dní, konec Nikdy. */
export const scheduleFromDays = (days: number): Schedule => ({ ...DEFAULT_SCHEDULE(), kind: 'regular', unit: 'day', every: Math.max(1, days) })
