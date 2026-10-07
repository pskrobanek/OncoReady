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

/** Klasifikace monitorace (regulatorní / účel). */
export type Classification = 'nonMD' | 'MD' | 'research' | 'other'

/** Rozsah bodů celkového skóre pro pásmo (max null = „a více“). */
export interface ScoreRange {
  min: number
  max: number | null
}

/** Monitorace = šablona/program sledování (stránka „Monitorace“). Pacientům se přiřazuje v kartotéce. */
export interface MonitoringProgram {
  id: string
  name: string
  diagnoses: string[] // kódy MKN-10, např. „C50“
  tag: string
  classification: Classification
  frequencyDays: number // jak často se pacientovi odesílá dotazník
  bands: { green: ScoreRange; yellow: ScoreRange; red: ScoreRange }
}

export type DateFilter = 'all' | '7' | '10' | '14'

/** Filtry dashboardu – stejná struktura pro výchozí Dashboard i uložené pohledy. */
export interface DashboardFilters {
  scores: ('green' | 'yellow' | 'red' | 'blue' | 'na')[]
  date: DateFilter
  programIds: string[]
  classifications: Classification[]
  tags: string[]
}

/** Uživatelský pohled = pojmenovaná kombinace filtrů (podstránka Dashboardu). */
export interface DashboardView {
  id: string
  name: string
  filters: DashboardFilters
}

export interface Monitoring {
  id: string
  patientId: string
  programId: string | null
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

/** Výsledek testu e-Skill (digitální gramotnost). patientId null = test bez registrace (neukládá se). */
export interface ESkillResult {
  id: string
  patientId: string
  takenAt: string // ISO
  survey: { q1: string[]; q2: string; q3: string; q4: string }
  metrics: {
    correctTasks: number
    totalTasks: number
    speed: number
    avgMisclickDistance: number
    typingDuration: number | null
    typingAccuracy: number | null
  }
  motorScore: number
  literacyScore: number
  timedOut: boolean
}

export interface DB {
  patients: Patient[]
  monitorings: Monitoring[]
  questionnaires: Questionnaire[]
  programs: MonitoringProgram[]
  views: DashboardView[]
  eskillResults: ESkillResult[]
}
