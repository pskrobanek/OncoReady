import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { seedDB } from '../data/seed'
import type { Answers, DB, Monitoring, Patient, Questionnaire } from './types'
import { addDays, todayIso } from './format'

// Jednoduché úložiště v prohlížeči (localStorage). Žádný backend – jde o UI prototyp.
const KEY = 'oncoready-mvp-db-v1'

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* prázdné nebo nedostupné úložiště → demo data */
  }
  return seedDB()
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
            patients: s.patients.filter((x) => x.id !== id),
            monitorings: s.monitorings.filter((m) => m.patientId !== id),
            questionnaires: s.questionnaires.filter((q) => !monIds.has(q.monitoringId)),
          }
        }),

      /** Nová monitorace – automaticky naplánuje dotazník každých 7 dní od začátku do konce (předpoklad). */
      createMonitoring: (data: Omit<Monitoring, 'id'>) =>
        setDb((s) => {
          const m = { ...data, id: uid('m') }
          const qs: Questionnaire[] = []
          for (let date = addDays(m.start, 7); date <= m.end; date = addDays(date, 7)) {
            qs.unshift({ id: uid('q'), monitoringId: m.id, scheduledFor: date, filledAt: null, answers: null })
          }
          return { ...s, monitorings: [...s.monitorings, m], questionnaires: [...s.questionnaires, ...qs] }
        }),
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

export const sortPatients = (ps: Patient[]) =>
  [...ps].sort((a, b) => `${a.prijmeni} ${a.jmeno}`.localeCompare(`${b.prijmeni} ${b.jmeno}`, 'cs'))
