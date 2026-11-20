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

/** Tlačítko ve sloupci „Další postup“ na Dashboardu – nastavuje se v šabloně. */
export interface NextStepAction {
  id: string
  label: string
  /** Dřívější volba „Čekárna“ (už se nenastavuje); bez ikony určuje výchozí ikonu hodin. */
  waiting?: boolean
  /** Ikona příznaku – klíč z TAG_ICONS (src/components/TagIcons.tsx). */
  icon?: string
}

/** Šablona monitorace = program sledování (stránka „Šablony“). Pacientům se přiřazuje v kartotéce. */
/** Odpověď otázky v definici dotazníku. */
export interface QAnswerDef {
  id: string
  text: string
  points: number
  /** Varovná odpověď – vyžaduje pozornost bez ohledu na součet bodů. */
  redFlag: boolean
}
export interface QQuestionDef {
  id: string
  text: string
  answers: QAnswerDef[]
}
/** Definice dotazníku (předpřipravený z knihovny nebo vlastní). */
export interface QuestionnaireDef {
  id: string
  name: string
  description: string
  questions: QQuestionDef[]
}

/** Zdroj dat pro připravenost pacienta. */
export type SourceKey = 'questionnaire' | 'lab' | 'wearables'

export type ScheduleUnit = 'day' | 'week' | 'month' | 'year'

/**
 * Frekvence dotazníků v šabloně. Všechna pole jsou vždy vyplněná (formulář si pamatuje volby i při přepnutí druhu).
 * - once: jeden dotazník v den začátku monitorace
 * - regular: každých `every` jednotek; týden ve dni `weekday` (0 = od data zahájení, 1 = po … 7 = ne), měsíc ve dni `monthDay` (1–31), rok v měsíci `month` (1–12)
 * - custom: termíny `steps` – každý za `count` jednotek od začátku monitorace
 */
export interface Schedule {
  kind: 'once' | 'regular' | 'custom'
  unit: ScheduleUnit
  every: number
  weekday: number
  monthDay: number
  month: number
  steps: { id: string; count: number; unit: ScheduleUnit }[]
}

/** Konec monitorace: nikdy / po počtu dotazníků / po době od začátku. */
export interface ScheduleEnd {
  kind: 'never' | 'count' | 'duration'
  count: number
  amount: number
  unit: ScheduleUnit
}

export interface MonitoringProgram {
  id: string
  name: string
  diagnoses: string[] // kódy MKN-10, např. „C50“
  tag: string
  classification: Classification
  /** Přibližný interval v dnech – dopočítává se z `schedule` (stáří dotazníku, starší logika). */
  frequencyDays: number
  /** Frekvence odesílání dotazníků (od 2026-11-20). */
  schedule: Schedule
  /** Zdroje, ze kterých se počítá připravenost pacientů s touto šablonou (od 2026-11-20). */
  sources: SourceKey[]
  /** Dotazník zdroje Dotazník – id z knihovny (`lib-…`) nebo vlastního dotazníku (od 2026-11-20). */
  questionnaireId: string
  /** Konec monitorace – uplatní se jen u pravidelné frekvence. */
  ending: ScheduleEnd
  bands: { green: ScoreRange; yellow: ScoreRange; red: ScoreRange }
  /** Tlačítka „Další postup“ (v pořadí zobrazení). */
  actions: NextStepAction[]
}

export type DateFilter = 'all' | '7' | '10' | '14'

/** Filtry dashboardu – stejná struktura pro výchozí Dashboard i uložené pohledy. */
export interface DashboardFilters {
  scores: ('green' | 'yellow' | 'red' | 'blue' | 'na')[]
  date: DateFilter
  programIds: string[]
  /** Příznaky (dnešní, z tlačítek šablony); '' = bez příznaku. Prázdné = nefiltruje. */
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
  /** Značka pacienta zvolená tlačítkem ze šablony; platí jen v den volby. Popisek se ukládá, aby zůstal i po změně šablony. */
  nextStep?: { actionId: string; label: string; at: string } | null
}

export interface Questionnaire {
  id: string
  monitoringId: string
  scheduledFor: string // YYYY-MM-DD – termín, kdy má pacient dotazník vyplnit
  filledAt: string | null // ISO datum a čas odeslání; null = nevyplněno (N/A)
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

/** Laboratorní parametry sledované před léčbou (klíče hodnot ve výsledku). */
export type LabParam = 'neu' | 'plt' | 'hb' | 'krea' | 'bili'

/** Výsledek laboratoře (jeden odběr). */
export interface LabResult {
  id: string
  patientId: string
  date: string // YYYY-MM-DD – datum odběru
  values: Partial<Record<LabParam, number>>
}

/** Denní souhrn z nositelného zařízení (wearables). */
export interface WearableDay {
  id: string
  patientId: string
  date: string // YYYY-MM-DD
  temp: number // nejvyšší teplota za den (°C)
  spo2: number // nejnižší saturace kyslíkem (%)
  hr: number // klidová tepová frekvence (/min)
  steps: number // počet kroků za den
}

/** Připomínka odeslaná přes okno Zpětná vazba v levém menu. */
export interface Feedback {
  id: string
  text: string
  /** Stránka aplikace, ze které byla připomínka odeslána (cesta, např. „/kartoteka“). */
  page: string
  createdAt: string // ISO
  author: string
  /** Snímek obrazovky jako data URL (JPEG), nebo null. */
  screenshot: string | null
}

export interface DB {
  patients: Patient[]
  monitorings: Monitoring[]
  questionnaires: Questionnaire[]
  programs: MonitoringProgram[]
  views: DashboardView[]
  eskillResults: ESkillResult[]
  labs: LabResult[]
  wearables: WearableDay[]
  feedback: Feedback[]
  /** Vlastní dotazníky založené uživatelem (předpřipravené jsou v kódu, src/data/questionnaireLibrary.ts). */
  customQuestionnaires: QuestionnaireDef[]
}
