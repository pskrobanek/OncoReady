// Demo data (od 2026-11-20) – simulují běžný chod kliniky: chronická a akutní toxicita RT a stacionář.
// Všichni pacienti jsou smyšlení; rodná čísla jsou formálně platná (datum narození + dělitelnost 11), kontakty smyšlené.
// Data se generují deterministicky vůči dnešku: termíny podle frekvence šablony, vyplnění ~75 %.
// Nepoužívat skutečné údaje pacientů.
import type { Answers, DB, LabResult, Monitoring, Patient, Questionnaire, WearableDay } from '../lib/types'
import { QUESTIONS, scaleValueForPoints } from './questionnaire'
import { seedPatientViews, seedPrograms, seedViews } from './programs'
import { eskillFor } from './eskillSeed'
import type { Band } from '../lib/scoring'
import { addDays, todayIso } from '../lib/format'
import { labValues, rng, wearDay } from './readinessSeed'
import { readinessOf, worstCurrent } from '../lib/readiness'
import { planDates } from '../lib/schedule'
import { DEF_KEY } from '../lib/scoring'
import { DEFAULT_QUESTIONNAIRE_ID, libraryItem } from './questionnaireLibrary'


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



/**
 * Odpovědi na dotazník z knihovny (EORTC – zástupné otázky) tak, aby vyšlo zadané pásmo:
 * zelená = odpovědi Vůbec ne / Trochu / občas Dost, bez red flagu; žlutá = jedna odpověď „Velmi“ (bez red flagu);
 * červená = jedna odpověď red flag. Modrá u těchto dotazníků není (počítá se jako žlutá).
 */
function defAnswers(defId: string, band: Band, r: () => number): Answers {
  const def = libraryItem(defId)!
  const answers: Answers = { [DEF_KEY]: defId }
  for (const q of def.questions) {
    let v = r() < 0.5 ? 0 : r() < 0.75 ? 1 : 2
    while (v > 0 && q.answers[v].redFlag) v-- // základ nikdy není red flag
    answers[q.id] = v
  }
  const pickQ = (ok: (q: (typeof def.questions)[number]) => boolean) => {
    const pool = def.questions.filter(ok)
    return pool[Math.floor(r() * pool.length)]
  }
  if (band === 'red') {
    const q = pickQ((x) => x.answers.some((a) => a.redFlag))
    if (q) answers[q.id] = q.answers.findIndex((a) => a.redFlag)
  } else if (band === 'yellow' || band === 'blue') {
    const q = pickQ((x) => !x.answers[3].redFlag)
    if (q) answers[q.id] = 3
  }
  return answers
}

/** Platné rodné číslo (10 číslic, ženy měsíc +50, číslo dělitelné 11). */
function rodneCislo(y: number, m: number, d: number, female: boolean, seq: number) {
  const base = `${String(y % 100).padStart(2, '0')}${String(m + (female ? 50 : 0)).padStart(2, '0')}${String(d).padStart(2, '0')}`
  for (let s = seq; ; s++) {
    const n = base + String(s % 1000).padStart(3, '0')
    const c = Number(BigInt(n) % 11n)
    if (c < 10) return n + c
  }
}
const birthDate = (rc: string) => {
  const yy = Number(rc.slice(0, 2))
  const mm = Number(rc.slice(2, 4)) % 50
  return `${yy >= 54 ? 1900 + yy : 2000 + yy}-${String(mm).padStart(2, '0')}-${rc.slice(4, 6)}`
}
const ascii = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Profil pacienta = jak se mu daří (pravděpodobnost pásem dotazníku a odchylek laboratoře / wearables). */
type Profile = 'good' | 'moderate' | 'poor'
const BAND_ODDS: Record<Profile, [Band, number][]> = {
  good: [['green', 0.82], ['yellow', 0.13], ['blue', 0.03], ['red', 0.02]],
  moderate: [['green', 0.5], ['yellow', 0.33], ['blue', 0.07], ['red', 0.1]],
  poor: [['green', 0.15], ['yellow', 0.3], ['blue', 0.1], ['red', 0.45]],
}
/** Skóre podle pásma (pásmo určuje nejvyšší body jedné odpovědi, skóre je součet). */
const SCORE_RANGE: Record<Band, [number, number]> = { green: [1, 7], yellow: [8, 13], red: [12, 20], blue: [5, 11] }

type Spec = {
  prijmeni: string
  jmeno: string
  female: boolean
  born: [number, number, number]
  program: string
  /** Kolik týdnů zpět monitorace začala. */
  startWeeksAgo: number
  profile: Profile
}

const F = true
const M = false
// Rozdělení: chronická toxicita (jen dotazník, EORTC), akutní toxicita (dotazník + laboratoř), stacionář (všechny 3 zdroje).
const SPECS: Spec[] = [
  // Chronická toxicita RT – prs (QLQ-BR45)
  { prijmeni: 'Horáková', jmeno: 'Jana', female: F, born: [1964, 7, 14], program: 'pr-ch-br', startWeeksAgo: 46, profile: 'good' },
  { prijmeni: 'Svobodová', jmeno: 'Hana', female: F, born: [1958, 3, 2], program: 'pr-ch-br', startWeeksAgo: 30, profile: 'moderate' },
  { prijmeni: 'Fialová', jmeno: 'Martina', female: F, born: [1971, 11, 23], program: 'pr-ch-br', startWeeksAgo: 18, profile: 'good' },
  // Chronická toxicita RT – hlava a krk (QLQ-H&N43)
  { prijmeni: 'Král', jmeno: 'Josef', female: M, born: [1955, 5, 9], program: 'pr-ch-hn', startWeeksAgo: 40, profile: 'poor' },
  { prijmeni: 'Kučerová', jmeno: 'Věra', female: F, born: [1962, 1, 27], program: 'pr-ch-hn', startWeeksAgo: 26, profile: 'moderate' },
  { prijmeni: 'Holub', jmeno: 'Karel', female: M, born: [1960, 9, 15], program: 'pr-ch-hn', startWeeksAgo: 14, profile: 'good' },
  // Chronická toxicita RT – prostata (QLQ-PR25)
  { prijmeni: 'Veselý', jmeno: 'Tomáš', female: M, born: [1958, 3, 22], program: 'pr-ch-pr', startWeeksAgo: 48, profile: 'good' },
  { prijmeni: 'Mareš', jmeno: 'Jaroslav', female: M, born: [1954, 12, 4], program: 'pr-ch-pr', startWeeksAgo: 34, profile: 'poor' },
  { prijmeni: 'Pospíšil', jmeno: 'František', female: M, born: [1957, 6, 30], program: 'pr-ch-pr', startWeeksAgo: 22, profile: 'good' },
  // Chronická toxicita RT – plíce (QLQ-LC29)
  { prijmeni: 'Bartoš', jmeno: 'Jiří', female: M, born: [1955, 11, 30], program: 'pr-ch-lc', startWeeksAgo: 36, profile: 'moderate' },
  { prijmeni: 'Pokorná', jmeno: 'Zdeňka', female: F, born: [1961, 4, 18], program: 'pr-ch-lc', startWeeksAgo: 24, profile: 'poor' },
  { prijmeni: 'Tichý', jmeno: 'Vladimír', female: M, born: [1959, 8, 6], program: 'pr-ch-lc', startWeeksAgo: 16, profile: 'good' },
  // Akutní toxicita RT
  { prijmeni: 'Marková', jmeno: 'Ivana', female: F, born: [1971, 11, 9], program: 'pr-ak', startWeeksAgo: 7, profile: 'moderate' },
  { prijmeni: 'Novák', jmeno: 'Jan', female: M, born: [1963, 2, 11], program: 'pr-ak', startWeeksAgo: 6, profile: 'good' },
  { prijmeni: 'Černá', jmeno: 'Lenka', female: F, born: [1975, 10, 3], program: 'pr-ak', startWeeksAgo: 5, profile: 'poor' },
  { prijmeni: 'Růžička', jmeno: 'Pavel', female: M, born: [1956, 7, 21], program: 'pr-ak', startWeeksAgo: 5, profile: 'good' },
  { prijmeni: 'Veselá', jmeno: 'Kateřina', female: F, born: [1980, 5, 16], program: 'pr-ak', startWeeksAgo: 4, profile: 'good' },
  { prijmeni: 'Šimek', jmeno: 'Milan', female: M, born: [1961, 12, 28], program: 'pr-ak', startWeeksAgo: 4, profile: 'poor' },
  { prijmeni: 'Procházková', jmeno: 'Alena', female: F, born: [1966, 3, 8], program: 'pr-ak', startWeeksAgo: 3, profile: 'good' },
  { prijmeni: 'Hájek', jmeno: 'Stanislav', female: M, born: [1959, 9, 1], program: 'pr-ak', startWeeksAgo: 3, profile: 'poor' },
  { prijmeni: 'Benešová', jmeno: 'Monika', female: F, born: [1978, 8, 25], program: 'pr-ak', startWeeksAgo: 2, profile: 'good' },
  { prijmeni: 'Kříž', jmeno: 'Václav', female: M, born: [1954, 6, 13], program: 'pr-ak', startWeeksAgo: 1, profile: 'good' },
  // Stacionář – intenzivní léčba (každý týden)
  { prijmeni: 'Krokerová', jmeno: 'Petra', female: F, born: [1966, 9, 17], program: 'pr-st-int', startWeeksAgo: 16, profile: 'poor' },
  { prijmeni: 'Dvořák', jmeno: 'Petr', female: M, born: [1962, 4, 4], program: 'pr-st-int', startWeeksAgo: 12, profile: 'poor' },
  { prijmeni: 'Sedláčková', jmeno: 'Jitka', female: F, born: [1970, 2, 19], program: 'pr-st-int', startWeeksAgo: 10, profile: 'good' },
  { prijmeni: 'Beneš', jmeno: 'Miroslav', female: M, born: [1957, 10, 10], program: 'pr-st-int', startWeeksAgo: 8, profile: 'poor' },
  { prijmeni: 'Doležalová', jmeno: 'Renata', female: F, born: [1973, 12, 1], program: 'pr-st-int', startWeeksAgo: 6, profile: 'good' },
  { prijmeni: 'Vlček', jmeno: 'Zdeněk', female: M, born: [1960, 1, 24], program: 'pr-st-int', startWeeksAgo: 3, profile: 'good' },
  // Stacionář – ostatní (každé 3 týdny)
  { prijmeni: 'Dlouhá', jmeno: 'Eva', female: F, born: [1962, 7, 2], program: 'pr-st-ost', startWeeksAgo: 36, profile: 'moderate' },
  { prijmeni: 'Šťastná', jmeno: 'Lucie', female: F, born: [1968, 2, 21], program: 'pr-st-ost', startWeeksAgo: 30, profile: 'good' },
  { prijmeni: 'Novotná', jmeno: 'Marie', female: F, born: [1955, 6, 12], program: 'pr-st-ost', startWeeksAgo: 24, profile: 'good' },
  { prijmeni: 'Bureš', jmeno: 'Ladislav', female: M, born: [1958, 11, 7], program: 'pr-st-ost', startWeeksAgo: 18, profile: 'poor' },
  { prijmeni: 'Zemanová', jmeno: 'Dagmar', female: F, born: [1964, 3, 29], program: 'pr-st-ost', startWeeksAgo: 12, profile: 'good' },
  { prijmeni: 'Kolářová', jmeno: 'Blanka', female: F, born: [1976, 9, 14], program: 'pr-st-ost', startWeeksAgo: 6, profile: 'moderate' },
]

/** Podíl vyplnění / dostupnosti dat (dotazníky, odběry, dny z hodinek). */
const FILL_RATE = 0.75


/**
 * Termíny chronické toxicity: v dřívějších letech 1 dotazník za rok (roční kontrola), v letošním roce
 * podle šablony každé 4 měsíce – nejvýš 3 (jen ty do dneška + nejbližší plánovaný).
 * Počet let sledování podle `startWeeksAgo` (cca 1–4 roky zpět).
 */
function chronicDates(today: string, startWeeksAgo: number, int: (a: number, b: number) => number): string[] {
  const year = Number(today.slice(0, 4))
  const yearsBack = Math.max(1, Math.min(4, Math.round(startWeeksAgo / 12)))
  const out: string[] = []
  for (let y = year - yearsBack; y < year; y++) out.push(`${y}-${String(int(2, 11)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`)
  const anchor = addDays(`${year}-01-10`, int(0, 50))
  const thisYear = [anchor, addMonths(anchor, 4), addMonths(anchor, 8)]
  const past = thisYear.filter((d) => d <= today)
  const next = [...thisYear, addMonths(anchor, 12)].find((d) => d > today)
  return [...out, ...past, ...(next ? [next] : [])]
}
const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1 + n, Math.min(d, 28))
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** Vygeneruje celou databázi demo dat vůči dnešku. */
function generate(today: string): Omit<DB, 'programs' | 'views' | 'feedback' | 'customQuestionnaires' | 'patientViews'> {
  const programs = seedPrograms()
  const r = rng(20261120)
  const pick = <T,>(odds: [T, number][]) => {
    let x = r()
    for (const [v, p] of odds) if ((x -= p) <= 0) return v
    return odds[odds.length - 1][0]
  }
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1))
  const time = (from = 7, to = 21) => `${String(int(from, to)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`

  const patients: Patient[] = []
  const monitorings: Monitoring[] = []
  const questionnaires: Questionnaire[] = []
  const labs: LabResult[] = []
  const wearables: WearableDay[] = []
  let q = 0

  SPECS.forEach((sp, i) => {
    const id = `p${i + 1}`
    const rc = rodneCislo(sp.born[0], sp.born[1], sp.born[2], sp.female, 100 + i * 37)
    patients.push({ id, prijmeni: sp.prijmeni, jmeno: sp.jmeno, rodneCislo: rc, datumNarozeni: birthDate(rc), telefon: '', email: `${ascii(sp.jmeno)}.${ascii(sp.prijmeni)}@example.com` })

    const program = programs.find((p) => p.id === sp.program)!
    const chronic = sp.program.startsWith('pr-ch')
    // Chronická toxicita: termíny po letech (viz chronicDates), začátek = před prvním termínem
    const chronicPlan = chronic ? chronicDates(today, sp.startWeeksAgo, int) : []
    const start = chronic ? addDays(chronicPlan[0], -int(3, 20)) : addDays(today, -7 * sp.startWeeksAgo - int(0, 3))
    const end = program.ending.kind === 'duration' ? addDays(start, 7 * program.ending.amount) : addDays(start, chronic ? 365 * 6 : 365)
    const mon: Monitoring = { id: `m${i + 1}`, patientId: id, programId: program.id, start, end, active: true, nextStep: null }
    monitorings.push(mon)

    // Dotazníky: termíny podle frekvence šablony; minulé vyplněné s pravděpodobností ~75 % (v den termínu nebo do 2 dnů).
    const dates = chronic ? chronicPlan : planDates(program.schedule, program.ending, start, end)
    for (const date of dates) {
      q++
      const filled = date < today ? r() < FILL_RATE : date === today && r() < 0.4
      if (!filled) {
        questionnaires.push({ id: `q${q}`, monitoringId: mon.id, scheduledFor: date, filledAt: null, answers: null })
        continue
      }
      const band = pick(BAND_ODDS[sp.profile])
      const [lo, hi] = SCORE_RANGE[band]
      const later = addDays(date, int(0, 2)) // vyplní v den termínu nebo do 2 dnů, nejpozději dnes
      const day = later > today ? today : later
      const at = day === today ? `${today}T${time(7, 9)}:00` : `${day}T${time()}:00`
      const answers = program.questionnaireId === DEFAULT_QUESTIONNAIRE_ID ? makeAnswers(int(lo, hi), band) : defAnswers(program.questionnaireId, band, r)
      questionnaires.push({ id: `q${q}`, monitoringId: mon.id, scheduledFor: date, filledAt: at, answers })
    }

    // Laboratoř: akutní toxicita každý týden, stacionář den před každým termínem; ~75 % odběrů je k dispozici.
    if (program.sources.includes('lab')) {
      const labDates = program.id === 'pr-ak' ? dates.filter((d) => d <= today) : dates.filter((d) => d <= addDays(today, 1)).map((d) => addDays(d, -1))
      for (const d of labDates) {
        if (d > today || r() > FILL_RATE + 0.05) continue
        const odds: [string, number][] =
          sp.profile === 'poor' ? [['ok', 0.55], ['yellow', 0.25], ['red', 0.2]] : sp.profile === 'moderate' ? [['ok', 0.72], ['yellow', 0.2], ['red', 0.08]] : [['ok', 0.9], ['yellow', 0.08], ['red', 0.02]]
        labs.push({ id: `lab${labs.length + 1}`, patientId: id, date: d, values: labValues(r, pick(odds) as 'ok' | 'yellow' | 'red', program.id !== 'pr-ak') })
      }
    }

    // Wearables: stacionář, posledních 8 týdnů; hodinky se synchronizují ~75 % dní (výpadky po blocích).
    if (program.sources.includes('wearables')) {
      const from = addDays(today, -55) > start ? addDays(today, -55) : start
      let off = 0
      for (let d = from; d <= today; d = addDays(d, 1)) {
        if (off > 0) {
          off--
          continue
        }
        if (r() > 0.92) {
          off = int(1, 3) // výpadek synchronizace na 1–3 dny
          continue
        }
        wearables.push({ id: `w${wearables.length + 1}`, patientId: id, ...wearDay(r, d, sp.profile) })
      }
    }
  })

  const data = { patients, monitorings, questionnaires, labs, wearables, eskillResults: eskillFor(patients.slice(0, 12).map((p) => p.id), today) }
  assignTodayTags({ ...data, programs, views: [], feedback: [], customQuestionnaires: [], patientViews: [] }, today)
  return data
}

/**
 * Dnešní příznaky podle aktuálního stavu pacienta (barva pruhu u jména):
 * - chronická toxicita: Zavolat červeným (a modrým = vyžádal kontrolu) a 2 žlutým (zeleným ne);
 * - akutní toxicita: K lékaři červeným, modrým a 2 žlutým;
 * - stacionář: K lékaři červeným, modrým a 1 žlutému, K aplikaci 2 zeleným.
 */
function assignTodayTags(db: DB, today: string) {
  let minute = 7 * 60 + 35
  const at = () => {
    minute += 9
    return `${today}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00`
  }
  const used: Record<string, number> = {}
  const take = (key: string, max: number) => (used[key] = (used[key] ?? 0) + 1) <= max
  for (const mon of db.monitorings) {
    const program = db.programs.find((p) => p.id === mon.programId)!
    const band = worstCurrent(readinessOf(db, mon.patientId, today))
    // Vyžádal kontrolu (modrá) = stejně naléhavé jako červená
    const sev = band === 'blue' ? 'red' : band
    const set = (actionId: string) => {
      const a = program.actions.find((x) => x.id === actionId)!
      mon.nextStep = { actionId, label: a.label, at: at() }
    }
    const group = program.id.startsWith('pr-ch') ? 'ch' : program.id === 'pr-ak' ? 'ak' : 'st'
    if (group === 'ch' && (sev === 'red' || (sev === 'yellow' && take('ch-y', 2)))) set('a-telefon')
    if (group === 'ak' && (sev === 'red' || (sev === 'yellow' && take('ak-y', 2)))) set('a-lekar')
    if (group === 'st') {
      if (sev === 'red' || (sev === 'yellow' && take('st-y', 1))) set('a-lekar')
      else if (sev === 'green' && take('st-g', 2)) set('a-aplikace')
    }
  }
}

export const seedDB = (): DB => ({
  ...generate(todayIso()),
  programs: seedPrograms(),
  views: seedViews(),
  patientViews: seedPatientViews(),
  feedback: [],
  customQuestionnaires: [],
})
