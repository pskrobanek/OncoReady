import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { seedDB } from '../data/seed'
import { DEFAULT_ACTIONS } from '../data/programs'
import { DEFAULT_QUESTIONNAIRE_ID } from '../data/questionnaireLibrary'
import { DEFAULT_END, planDates, scheduleFromDays } from './schedule'
import type { Answers, DB, DashboardView, ESkillResult, Feedback, Monitoring, MonitoringProgram, Patient, Questionnaire, QuestionnaireDef } from './types'
import { todayIso } from './format'

// Jednoduché úložiště v prohlížeči (localStorage). Žádný backend – jde o UI prototyp.
const KEY = 'oncoready-mvp-db-v7' // při změně struktury dat zvýšit verzi (v7 = nová demo data 2026-11-20)

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {
    /* prázdné nebo nedostupné úložiště → demo data */
  }
  return seedDB()
}

/** Zrušená tlačítka „Další postup“ (dřívější výchozí). */
const REMOVED_ACTION_IDS = ['a-sestra', 'a-lekar']
const REMOVED_ACTION_LABELS = ['ke kontrole sestrou', 'ke kontrole lékařem']
const isRemovedAction = (a: { id: string; label: string }) => REMOVED_ACTION_IDS.includes(a.id) || REMOVED_ACTION_LABELS.includes(a.label.trim().toLowerCase())

/** Doplní kolekce přidané v novějších verzích, aby uložená data zůstala zachována. */
function migrate(db: Partial<DB>): DB {
  const seed = seedDB()
  return {
    ...seed,
    ...db,
    eskillResults: db.eskillResults ?? seed.eskillResults,
    labs: db.labs ?? seed.labs,
    wearables: db.wearables ?? seed.wearables,
    feedback: db.feedback ?? [],
    customQuestionnaires: db.customQuestionnaires ?? [],
    // Pohledy uložené před filtrem Příznak
    views: (db.views ?? seed.views).map((v) => ({ ...v, filters: { ...v.filters, tags: v.filters.tags ?? [] } })),
    // Šablony uložené před zavedením tlačítek „Další postup“ dostanou výchozí tlačítka.
    // Zrušená tlačítka (Ke kontrole sestrou / lékařem) se odeberou; zůstane-li šablona bez tlačítek, dostane výchozí (Čekárna / K aplikaci).
    programs: (db.programs ?? seed.programs).map((p) => {
      const kept = (p.actions ?? []).filter((a) => !isRemovedAction(a))
      return {
        ...p,
        actions: kept.length ? kept : DEFAULT_ACTIONS(),
        // Šablony z doby před volbou frekvence: Pravidelně každých N dní, konec Nikdy
        schedule: p.schedule ?? scheduleFromDays(p.frequencyDays ?? 7),
        sources: p.sources ?? ['questionnaire', 'lab', 'wearables'],
        questionnaireId: p.questionnaireId ?? DEFAULT_QUESTIONNAIRE_ID,
        ending: p.ending ?? DEFAULT_END(),
      }
    }),
    // Značky ze zrušených tlačítek se u pacientů smažou.
    monitorings: (db.monitorings ?? seed.monitorings).map((m) => (m.nextStep && isRemovedAction({ id: m.nextStep.actionId, label: m.nextStep.label }) ? { ...m, nextStep: null } : m)),
  } as DB
}

const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function useDBState() {
  const [db, setDb] = useState<DB>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch {
      /* ignorovat */
    }
  }, [db])

  // Synchronizace mezi okny – test e-Skill běží v novém okně a ukládá do stejného úložiště.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          setDb(migrate(JSON.parse(e.newValue)))
        } catch {
          /* ignorovat */
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return useMemo(
    () => ({
      db,
      resetDemo: () => setDb(seedDB()),

      createPatient: (data: Omit<Patient, 'id'>) => {
        const p = { ...data, id: uid('p') }
        setDb((s) => ({ ...s, patients: [...s.patients, p] }))
        return p
      },
      updatePatient: (p: Patient) => setDb((s) => ({ ...s, patients: s.patients.map((x) => (x.id === p.id ? p : x)) })),
      deletePatient: (id: string) =>
        setDb((s) => {
          const monIds = new Set(s.monitorings.filter((m) => m.patientId === id).map((m) => m.id))
          return {
            ...s,
            patients: s.patients.filter((x) => x.id !== id),
            monitorings: s.monitorings.filter((m) => m.patientId !== id),
            questionnaires: s.questionnaires.filter((q) => !monIds.has(q.monitoringId)),
            eskillResults: s.eskillResults.filter((r) => r.patientId !== id),
            labs: s.labs.filter((l) => l.patientId !== id),
            wearables: s.wearables.filter((w) => w.patientId !== id),
          }
        }),

      /** Nová monitorace pacienta – naplánuje dotazníky podle frekvence a konce ze šablony (bez šablony každých 7 dní). */
      createMonitoring: (data: Omit<Monitoring, 'id'>) =>
        setDb((s) => {
          const m = { ...data, id: uid('m') }
          // Termíny podle frekvence a konce ze šablony, nejpozději do konce monitorace pacienta.
          const program = s.programs.find((p) => p.id === m.programId)
          const dates = program ? planDates(program.schedule, program.ending, m.start, m.end) : planDates(scheduleFromDays(7), DEFAULT_END(), m.start, m.end)
          const qs: Questionnaire[] = dates.reverse().map((date) => ({ id: uid('q'), monitoringId: m.id, scheduledFor: date, filledAt: null, answers: null }))
          return { ...s, monitorings: [...s.monitorings, m], questionnaires: [...s.questionnaires, ...qs] }
        }),
      /** Nastavit (nebo zrušit) značku pacienta u jeho monitorace. */
      setNextStep: (monitoringId: string, step: Monitoring['nextStep']) =>
        setDb((s) => ({ ...s, monitorings: s.monitorings.map((m) => (m.id === monitoringId ? { ...m, nextStep: step } : m)) })),
      updateMonitoring: (m: Monitoring) =>
        setDb((s) => ({ ...s, monitorings: s.monitorings.map((x) => (x.id === m.id ? m : x)) })),
      deleteMonitorings: (ids: string[]) =>
        setDb((s) => ({
          ...s,
          monitorings: s.monitorings.filter((m) => !ids.includes(m.id)),
          questionnaires: s.questionnaires.filter((q) => !ids.includes(q.monitoringId)),
        })),

      /** „Vytvořit dotazník“ – přidá nevyplněný dotazník s dnešním termínem. */
      createQuestionnaire: (monitoringId: string) =>
        setDb((s) => ({
          ...s,
          questionnaires: [
            ...s.questionnaires,
            { id: uid('q'), monitoringId, scheduledFor: todayIso(), filledAt: null, answers: null },
          ],
        })),
      // --- Šablony monitorace (programy) ---
      createProgram: (data: Omit<MonitoringProgram, 'id'>) => {
        const p = { ...data, id: uid('pr') }
        setDb((s) => ({ ...s, programs: [...s.programs, p] }))
        return p
      },
      updateProgram: (p: MonitoringProgram) => setDb((s) => ({ ...s, programs: s.programs.map((x) => (x.id === p.id ? p : x)) })),
      /** Smazání monitorace jen odpojí pacienty (jejich data zůstanou) a odebere ji z filtrů pohledů. */
      deleteProgram: (id: string) =>
        setDb((s) => ({
          ...s,
          programs: s.programs.filter((x) => x.id !== id),
          monitorings: s.monitorings.map((m) => (m.programId === id ? { ...m, programId: null } : m)),
          views: s.views.map((v) => ({ ...v, filters: { ...v.filters, programIds: v.filters.programIds.filter((x) => x !== id) } })),
        })),

      // --- Pohledy ---
      createView: (data: Omit<DashboardView, 'id'>) => {
        const v = { ...data, id: uid('v') }
        setDb((s) => ({ ...s, views: [...s.views, v] }))
        return v
      },
      updateView: (v: DashboardView) => setDb((s) => ({ ...s, views: s.views.map((x) => (x.id === v.id ? v : x)) })),
      deleteView: (id: string) => setDb((s) => ({ ...s, views: s.views.filter((x) => x.id !== id) })),

      // --- e-Skill ---
      addEskillResult: (r: Omit<ESkillResult, 'id'>) => {
        const full = { ...r, id: uid('es') }
        setDb((s) => ({ ...s, eskillResults: [...s.eskillResults, full] }))
        return full
      },
      deleteEskillResult: (id: string) => setDb((s) => ({ ...s, eskillResults: s.eskillResults.filter((r) => r.id !== id) })),

      // --- Zpětná vazba ---
      /** Uloží vlastní dotazník (nový dostane id, existující se přepíše). Vrací uložený dotazník. */
      saveCustomQuestionnaire: (q: QuestionnaireDef) => {
        const saved = q.id ? q : { ...q, id: uid('cq') }
        setDb((s) => ({
          ...s,
          customQuestionnaires: s.customQuestionnaires.some((x) => x.id === saved.id)
            ? s.customQuestionnaires.map((x) => (x.id === saved.id ? saved : x))
            : [...s.customQuestionnaires, saved],
        }))
        return saved
      },
      /** Smaže vlastní dotazník; šablony, které ho používaly, se vrátí na výchozí dotazník. */
      deleteCustomQuestionnaire: (id: string) =>
        setDb((s) => ({
          ...s,
          customQuestionnaires: s.customQuestionnaires.filter((x) => x.id !== id),
          programs: s.programs.map((p) => (p.questionnaireId === id ? { ...p, questionnaireId: DEFAULT_QUESTIONNAIRE_ID } : p)),
        })),
      addFeedback: (f: Omit<Feedback, 'id'>) => setDb((s) => ({ ...s, feedback: [...s.feedback, { ...f, id: uid('fb') }] })),

      submitQuestionnaire: (id: string, answers: Answers) =>
        setDb((s) => ({
          ...s,
          questionnaires: s.questionnaires.map((q) =>
            q.id === id ? { ...q, answers, filledAt: new Date().toISOString() } : q,
          ),
        })),
    }),
    [db],
  )
}

type Store = ReturnType<typeof useDBState>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useDBState()
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore mimo StoreProvider')
  return s
}

// ---- odvozené dotazy ----

/** Dotazníky monitorace seřazené jako v aplikaci: nejnovější termín vlevo. */
export function questionnairesOf(db: DB, monitoringId: string) {
  return db.questionnaires
    .filter((q) => q.monitoringId === monitoringId)
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))
}

/** Monitorace zobrazovaná na dashboardu: aktivní, jinak poslední podle začátku. */
export function currentMonitoring(db: DB, patientId: string) {
  const ms = db.monitorings.filter((m) => m.patientId === patientId).sort((a, b) => b.start.localeCompare(a.start))
  return ms.find((m) => m.active) ?? ms[0]
}

export type PlanStatus =
  | { kind: 'active'; monitoring: Monitoring }
  | { kind: 'planned'; monitoring: Monitoring }
  | { kind: 'ended'; monitoring: Monitoring }
  | { kind: 'none' }

/**
 * Stav plánu (monitorace) pacienta k dnešku:
 * active = označená jako aktivní a dnešek je mezi startem a koncem; planned = aktivní se startem v budoucnu;
 * ended = poslední monitorace už skončila (nebo není aktivní); none = žádná monitorace.
 */
export function planStatus(db: DB, patientId: string): PlanStatus {
  const today = todayIso()
  const ms = db.monitorings.filter((m) => m.patientId === patientId).sort((a, b) => b.start.localeCompare(a.start))
  const running = ms.find((m) => m.active && m.start <= today && m.end >= today)
  if (running) return { kind: 'active', monitoring: running }
  const planned = ms.filter((m) => m.active && m.start > today).sort((a, b) => a.start.localeCompare(b.start))[0]
  if (planned) return { kind: 'planned', monitoring: planned }
  const last = [...ms].sort((a, b) => b.end.localeCompare(a.end))[0]
  return last ? { kind: 'ended', monitoring: last } : { kind: 'none' }
}

/** Výsledky e-Skill pacienta, nejnovější první. */
export const eskillOf = (db: DB, patientId: string) =>
  db.eskillResults.filter((r) => r.patientId === patientId).sort((a, b) => b.takenAt.localeCompare(a.takenAt))

export const sortPatients = (ps: Patient[]) =>
  [...ps].sort((a, b) => `${a.prijmeni} ${a.jmeno}`.localeCompare(`${b.prijmeni} ${b.jmeno}`, 'cs'))
