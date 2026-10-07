export type Answers = Record<string, number | string | boolean | undefined>

export interface Patient {
  id: string
  prijmeni: string
  jmeno: string
  rodneCislo: string
  datumNarozeni: string // YYYY-MM-DD nebo ''
  telefon: string
  email: string
}

export interface Monitoring {
  id: string
  patientId: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  active: boolean
}

export interface Questionnaire {
  id: string
  monitoringId: string
  scheduledFor: string // YYYY-MM-DD – termín, kdy má pacient dotazník vyplnit
  filledAt: string | null // ISO datum a čas odeslání; null = nevyplněno (n/a)
  answers: Answers | null
}

export interface DB {
  patients: Patient[]
  monitorings: Monitoring[]
  questionnaires: Questionnaire[]
}
