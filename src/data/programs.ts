// Číselníky a demo data pro stránku „Monitorace“ a uživatelské pohledy.
import type { Classification, DashboardFilters, DashboardView, MonitoringProgram } from '../lib/types'

export const CLASSIFICATIONS: { value: Classification; label: string; hint: string; badge: string }[] = [
  { value: 'nonMD', label: 'nonMD', hint: 'Mimo zdravotnický prostředek', badge: 'bg-gray-50 text-gray-700 ring-gray-600/20' },
  { value: 'MD', label: 'MD', hint: 'Zdravotnický prostředek', badge: 'bg-primary-50 text-primary-700 ring-primary-600/20' },
  { value: 'research', label: 'research', hint: 'Výzkum / klinická studie', badge: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  { value: 'other', label: 'other', hint: 'Ostatní', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
]
export const classificationMeta = (c: Classification) => CLASSIFICATIONS.find((x) => x.value === c)!

/** Výběr frekvence odesílání dotazníku (v dnech). */
export const FREQUENCIES: { days: number; label: string }[] = [
  { days: 1, label: 'Denně' },
  { days: 3, label: 'Každé 3 dny' },
  { days: 7, label: 'Týdně' },
  { days: 14, label: 'Každé 2 týdny' },
  { days: 30, label: 'Měsíčně' },
  { days: 90, label: 'Každé 3 měsíce' },
]
export const frequencyLabel = (days: number) =>
  FREQUENCIES.find((f) => f.days === days)?.label ?? `Každých ${days} dní`

/** Nabídka diagnóz (MKN-10) – zkrácený výběr pro radioterapii. */
export const DIAGNOSES: { code: string; name: string }[] = [
  { code: 'C01', name: 'Zhoubný novotvar spodiny jazyka' },
  { code: 'C09', name: 'Zhoubný novotvar mandle' },
  { code: 'C10', name: 'Zhoubný novotvar ústní části hltanu' },
  { code: 'C15', name: 'Zhoubný novotvar jícnu' },
  { code: 'C20', name: 'Zhoubný novotvar konečníku' },
  { code: 'C32', name: 'Zhoubný novotvar hrtanu' },
  { code: 'C34', name: 'Zhoubný novotvar průdušky a plíce' },
  { code: 'C50', name: 'Zhoubný novotvar prsu' },
  { code: 'C53', name: 'Zhoubný novotvar hrdla děložního' },
  { code: 'C61', name: 'Zhoubný novotvar předstojné žlázy' },
  { code: 'C67', name: 'Zhoubný novotvar močového měchýře' },
  { code: 'C71', name: 'Zhoubný novotvar mozku' },
  { code: 'C79.5', name: 'Sekundární zhoubný novotvar kosti' },
  { code: 'D05', name: 'Karcinom in situ prsu' },
]
export const diagnosisName = (code: string) => DIAGNOSES.find((d) => d.code === code)?.name ?? code

export const MAX_SCORE = 40 // 10 bodovaných otázek × 4 body

export const seedPrograms = (): MonitoringProgram[] => [
  {
    id: 'pr1',
    name: 'Prs – adjuvantní RT',
    diagnoses: ['C50', 'D05'],
    tag: 'Prs',
    classification: 'MD',
    frequencyDays: 7,
    bands: { green: { min: 0, max: 7 }, yellow: { min: 8, max: 14 }, red: { min: 15, max: null } },
  },
  {
    id: 'pr2',
    name: 'Prostata – kurativní RT',
    diagnoses: ['C61'],
    tag: 'Urologie',
    classification: 'nonMD',
    frequencyDays: 7,
    bands: { green: { min: 0, max: 9 }, yellow: { min: 10, max: 16 }, red: { min: 17, max: null } },
  },
  {
    id: 'pr3',
    name: 'Hlava a krk – chemoradioterapie',
    diagnoses: ['C01', 'C09', 'C10', 'C32'],
    tag: 'ORL',
    classification: 'MD',
    frequencyDays: 7,
    bands: { green: { min: 0, max: 6 }, yellow: { min: 7, max: 12 }, red: { min: 13, max: null } },
  },
  {
    id: 'pr4',
    name: 'Studie PRO-RT 2026',
    diagnoses: ['C20', 'C53'],
    tag: 'Studie',
    classification: 'research',
    frequencyDays: 14,
    bands: { green: { min: 0, max: 8 }, yellow: { min: 9, max: 15 }, red: { min: 16, max: null } },
  },
  {
    id: 'pr5',
    name: 'Plíce – paliativní RT',
    diagnoses: ['C34', 'C79.5'],
    tag: 'Plíce',
    classification: 'other',
    frequencyDays: 3,
    bands: { green: { min: 0, max: 10 }, yellow: { min: 11, max: 18 }, red: { min: 19, max: null } },
  },
]

/** Výchozí filtr Dashboardu (podle produkce). */
export const DEFAULT_FILTERS: DashboardFilters = {
  scores: ['red', 'blue', 'na'],
  date: 'all',
  programIds: [],
  classifications: [],
  tags: [],
}

export const seedViews = (): DashboardView[] => [
  {
    id: 'v1',
    name: 'Prs – vyžaduje akci',
    filters: { ...DEFAULT_FILTERS, scores: ['red', 'blue'], programIds: ['pr1'] },
  },
  {
    id: 'v2',
    name: 'Studie – nevyplněné',
    filters: { ...DEFAULT_FILTERS, scores: ['na'], classifications: ['research'] },
  },
]
