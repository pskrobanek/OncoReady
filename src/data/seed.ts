// Demo data – odpovídají screenshotům z produkce (jména, rodná čísla, skóre, data).
// Kontakty jsou smyšlené. Nepoužívat skutečné údaje pacientů.
import type { Answers, DB, Monitoring, Patient, Questionnaire } from '../lib/types'
import { QUESTIONS, scaleValueForPoints } from './questionnaire'
import { seedPrograms, seedViews } from './programs'
import { seedEskill } from './eskillSeed'
import type { Band } from '../lib/scoring'
import { addDays, daysBetween, todayIso } from '../lib/format'
import { seedLabs, seedWearables } from './readinessSeed'

type Entry = { date: string; time?: string; score: number; band: Band; pinned?: Record<string, number> } | { date: string; na: true }

const SCORABLE = QUESTIONS.filter((q) => q.type !== 'control').map((q) => q.id)

/** Vygeneruje odpovědi tak, aby dávaly přesně zadané skóre a pásmo. */
function makeAnswers(score: number, band: Band, pinned: Record<string, number> = {}): Answers {
  const pts: Record<string, number> = { ...pinned }
  if (band === 'red' && !Object.values(pts).some((p) => p >= 4)) pts.symptoms = 4
  if (band === 'yellow' && !Object.values(pts).some((p) => p >= 3)) pts.pain = 3
  const cap = band === 'red' ? 3 : band === 'yellow' ? 2 : band === 'blue' ? 3 : 2
  let rest = score - Object.values(pts).reduce((a, b) => a + b, 0)
  const free = SCORABLE.filter((id) => !(id in pts))
  free.forEach((id) => (pts[id] = 0))
  while (rest > 0) {
    let progressed = false
    for (const id of free) {
      if (rest > 0 && pts[id] < cap) {
        pts[id]++
        rest--
        progressed = true
      }
    }
    if (!progressed) throw new Error(`Nelze rozložit skóre ${score} (${band})`)
  }
  const answers: Answers = {}
  for (const q of QUESTIONS) {
    if (q.type === 'scale') answers[q.id] = scaleValueForPoints(pts[q.id])
    else if (q.type === 'choice') answers[q.id] = pts[q.id] // index možnosti = body
    else answers[q.id] = band === 'blue'
  }
  return answers
}


/** Datum „dneška“ v demo datech – termíny po něm jsou plánované (nevyplněné). */
const SEED_TODAY = '2026-10-14'

const addD = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Pravidelná řada termínů od `from` do `to` po `every` dnech (výstup od nejnovějšího).
 * `pattern` se cyklicky přiřazuje termínům od nejstaršího: [skóre, pásmo] nebo 'na'.
 * Termíny po SEED_TODAY jsou vždy nevyplněné (plánované).
 */
function series(from: string, to: string, every: number, pattern: ([number, Band] | 'na')[]): Entry[] {
  const out: Entry[] = []
  let i = 0
  for (let d = from; d <= to; d = addD(d, every), i++) {
    const p = pattern[i % pattern.length]
    out.push(d > SEED_TODAY || p === 'na' ? { date: d, na: true } : { date: d, score: p[0], band: p[1] })
  }
  return out.reverse()
}

let qSeq = 0
function monitoring(
  patientId: string,
  id: string,
  programId: string,
  start: string,
  end: string,
  active: boolean,
  entries: Entry[],
): { m: Monitoring; qs: Questionnaire[] } {
  const qs = entries.map<Questionnaire>((e) => {
    qSeq++
    if ('na' in e) return { id: `q${qSeq}`, monitoringId: id, scheduledFor: e.date, filledAt: null, answers: null }
    return {
      id: `q${qSeq}`,
      monitoringId: id,
      scheduledFor: e.date,
      filledAt: `${e.date}T${e.time ?? '09:' + String(10 + (qSeq * 7) % 50)}:00`,
      answers: makeAnswers(e.score, e.band, e.pinned),
    }
  })
  return { m: { id, patientId, programId, start, end, active }, qs }
}

const P = (id: string, prijmeni: string, jmeno: string, rodneCislo: string, email: string, telefon = ''): Patient => ({
  id,
  prijmeni,
  jmeno,
  rodneCislo,
  datumNarozeni: '',
  telefon,
  email,
})

// Pozn.: v produkci jsou některá jména zadaná obráceně (např. Příjmení „Anna“, Jméno „Malá“) – replikováno.
const patients: Patient[] = [
  P('p1', 'Anna', 'Malá', '3', 'anna.mala@example.com', '420603277036'),
  P('p2', 'Dlouhá', 'Eva', '7', 'eva.dlouha@example.com'),
  P('p3', 'Dvořáková', 'Dáša', '1', 'dasa.dvorakova@example.com'),
  P('p4', 'Kokošková', 'Ema', '5', 'ema.kokoskova@example.com'),
  P('p5', 'Kristýna', 'Dušková', '10', 'kristyna.duskova@example.com'),
  P('p6', 'Krokerová', 'Petra', '6', 'petra.krokerova@example.com'),
  P('p7', 'Krutá', 'Daniela', '4', 'daniela.kruta@example.com'),
  P('p8', 'Nová', 'Pavla', '2', 'pavla.nova@example.com'),
  P('p9', 'Plyšová', 'Adéla', '9', 'adela.plysova@example.com'),
  P('p10', 'Šťastná', 'Lucie', '8', 'lucie.stastna@example.com'),
]

// Pořadí záznamů = pořadí odznaků v tabulce (nejnovější termín vlevo).
const mons = [
  monitoring('p1', 'm1', 'pr1', '2026-03-19', '2026-04-16', true, [
    { date: '2026-04-16', na: true },
    { date: '2026-04-12', time: '08:41', score: 20, band: 'red', pinned: { health: 1, fatigue: 2, symptoms: 4, skin: 2 } },
    { date: '2026-04-06', na: true },
    { date: '2026-03-30', score: 9, band: 'red' },
    { date: '2026-03-23', score: 22, band: 'blue' },
  ]),
  // Dlouhá Eva – dlouhodobé sledování po 14 dnech od listopadu 2025 (ukázka roků 2025 / 2026)
  monitoring('p2', 'm2', 'pr2', '2025-11-04', '2026-12-29', true,
    series('2025-11-04', '2026-12-29', 14, [
      [5, 'green'], [7, 'green'], [9, 'yellow'], [12, 'red'], [8, 'yellow'], 'na', [6, 'green'], [4, 'green'],
      [3, 'green'], [10, 'blue'], [6, 'green'], [5, 'green'], 'na', [7, 'green'], [8, 'yellow'], [4, 'green'],
    ]),
  ),
  monitoring('p3', 'm3', 'pr3', '2026-08-05', '2026-09-30', true, [
    { date: '2026-09-02', score: 23, band: 'red' },
    { date: '2026-08-26', na: true },
    { date: '2026-08-19', na: true },
    { date: '2026-08-12', na: true },
  ]),
  monitoring('p5', 'm5', 'pr1', '2026-03-25', '2026-05-10', true, [
    { date: '2026-05-03', score: 7, band: 'blue' },
    { date: '2026-04-26', score: 8, band: 'blue' },
    { date: '2026-04-19', score: 13, band: 'red' },
    { date: '2026-04-12', score: 6, band: 'green' },
    { date: '2026-04-05', score: 5, band: 'green' },
    { date: '2026-03-29', score: 4, band: 'blue' },
  ]),
  // Krokerová Petra – týdenní akutní toxicita, zhoršení v posledním měsíci
  monitoring('p6', 'm6', 'pr4', '2026-07-01', '2026-11-11', true,
    series('2026-07-01', '2026-11-11', 7, [
      [3, 'green'], [4, 'green'], [6, 'green'], [8, 'yellow'], [7, 'green'], 'na', [9, 'yellow'],
      [11, 'yellow'], [13, 'red'], [10, 'yellow'], [12, 'blue'], [15, 'red'], [9, 'yellow'], [8, 'yellow'], [14, 'red'],
    ]),
  ),
  monitoring('p7', 'm7', 'pr1', '2026-03-04', '2026-04-30', true, [
    { date: '2026-04-26', score: 14, band: 'red' },
    { date: '2026-04-19', score: 2, band: 'green' },
    { date: '2026-04-12', score: 5, band: 'red' },
    { date: '2026-04-05', score: 4, band: 'green' },
    { date: '2026-03-29', score: 4, band: 'green' },
    { date: '2026-03-22', score: 3, band: 'green' },
    { date: '2026-03-16', score: 1, band: 'green' },
    { date: '2026-03-12', na: true },
    { date: '2026-03-08', score: 5, band: 'green' },
  ]),
  monitoring('p8', 'm8', 'pr3', '2026-05-10', '2026-06-14', true, [
    { date: '2026-06-07', na: true },
    { date: '2026-05-31', score: 7, band: 'green' },
    { date: '2026-05-24', score: 14, band: 'red' },
    { date: '2026-05-17', score: 13, band: 'blue' },
    { date: '2026-05-10', na: true },
  ]),
  monitoring('p9', 'm9', 'pr4', '2026-10-01', '2026-11-12', true, [
    { date: '2026-11-12', na: true },
    { date: '2026-11-05', na: true },
    { date: '2026-10-29', na: true },
    { date: '2026-10-22', na: true },
    { date: '2026-10-15', na: true },
    { date: '2026-10-08', na: true },
  ]),
  // Šťastná Lucie – pozdní toxicita, měsíčně od září 2025
  monitoring('p10', 'm10', 'pr5', '2025-09-15', '2027-03-15', true,
    series('2025-09-15', '2027-03-15', 30, [[2, 'green'], [4, 'green'], [3, 'green'], 'na', [6, 'green'], [5, 'green'], [9, 'yellow'], [2, 'green']]),
  ),
  // Kokošková Ema – nově zahájená monitorace, jedno upozornění v posledním měsíci
  monitoring('p4', 'm4', 'pr1', '2026-08-20', '2026-12-03', true,
    series('2026-08-20', '2026-12-03', 7, [[4, 'green'], [6, 'green'], 'na', [7, 'green'], [9, 'yellow'], [5, 'green'], [16, 'red'], [8, 'blue'], [6, 'green']]),
  ),
]

/** Posune všechna data o `days` dní (datum i datum s časem). */
function shiftDates(db: DB, days: number): DB {
  if (days === 0) return db
  const sh = (iso: string) => addDays(iso.slice(0, 10), days) + iso.slice(10)
  return {
    ...db,
    monitorings: db.monitorings.map((m) => ({ ...m, start: sh(m.start), end: sh(m.end) })),
    questionnaires: db.questionnaires.map((q) => ({ ...q, scheduledFor: sh(q.scheduledFor), filledAt: q.filledAt && sh(q.filledAt) })),
    eskillResults: db.eskillResults.map((r) => ({ ...r, takenAt: sh(r.takenAt) })),
    labs: db.labs.map((l) => ({ ...l, date: sh(l.date) })),
    wearables: db.wearables.map((w) => ({ ...w, date: sh(w.date) })),
  }
}

/**
 * Demo data jsou vztažená k SEED_TODAY a při vytvoření se posunou tak, aby SEED_TODAY = skutečný dnešek.
 * Laboratoř, wearables i dotazníky jsou tak v demu vždy aktuální.
 */
export const seedDB = (): DB =>
  shiftDates(
    {
      patients: structuredClone(patients),
      monitorings: mons.map((x) => ({ ...x.m })),
      questionnaires: structuredClone(mons.flatMap((x) => x.qs)),
      programs: seedPrograms(),
      views: seedViews(),
      eskillResults: seedEskill(),
      labs: seedLabs(SEED_TODAY),
      wearables: seedWearables(SEED_TODAY),
    },
    daysBetween(SEED_TODAY, todayIso()),
  )
