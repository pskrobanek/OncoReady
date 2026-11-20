import { DEFAULT_QUESTIONNAIRE_ID } from './questionnaireLibrary'
import { approxDays, DEFAULT_END, DEFAULT_SCHEDULE } from '../lib/schedule'
// Číselníky a demo data pro stránku „Šablony“ (šablony monitorace) a uživatelské pohledy.
import type { Classification, DashboardFilters, DashboardView, MonitoringProgram, NextStepAction } from '../lib/types'

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

/** Výchozí tlačítka „Další postup“ pro nové i ukázkové šablony. */
export const DEFAULT_ACTIONS = (): NextStepAction[] => [
  { id: 'a-cekarna', label: 'Čekárna', waiting: true, icon: 'clock' },
  { id: 'a-aplikace', label: 'K aplikaci', icon: 'arrow' },
]

/** Šablona pro demo data: frekvence „každých N týdnů od zahájení“, frequencyDays se dopočítá. */
const tpl = (
  id: string,
  name: string,
  diagnoses: string[],
  sources: MonitoringProgram['sources'],
  questionnaireId: string,
  everyWeeks: number,
  ending: MonitoringProgram['ending'],
  actions: NextStepAction[],
): MonitoringProgram => {
  const schedule = { ...DEFAULT_SCHEDULE(), unit: 'week' as const, every: everyWeeks, weekday: 0 }
  return {
    id,
    name,
    diagnoses,
    tag: '',
    classification: 'MD',
    frequencyDays: approxDays(schedule),
    schedule,
    ending,
    bands: { green: { min: 0, max: 7 }, yellow: { min: 8, max: 14 }, red: { min: 15, max: null } },
    actions,
    sources,
    questionnaireId,
  }
}
const ACT = {
  cekarna: (): NextStepAction => ({ id: 'a-cekarna', label: 'Čekárna', waiting: true, icon: 'clock' }),
  aplikace: (): NextStepAction => ({ id: 'a-aplikace', label: 'K aplikaci', icon: 'arrow' }),
  lekar: (): NextStepAction => ({ id: 'a-lekar', label: 'K lékaři', icon: 'user' }),
  telefon: (): NextStepAction => ({ id: 'a-telefon', label: 'Zavolat', icon: 'phone' }),
}
const NEVER = DEFAULT_END()

/**
 * Demo šablony (2026-11-20) – pořadí určuje i pořadí příznaků (boxů) na Dashboardu:
 * - Chronická toxicita RT – 4 šablony s moduly EORTC, jen dotazník, každé 4 týdny;
 * - Akutní toxicita RT – dotazník OncoReady + laboratoř, každý týden po dobu 8 týdnů;
 * - Stacionář – intenzivní léčba (každý týden) a ostatní (každé 3 týdny), dotazník + laboratoř + wearables.
 */
export const seedPrograms = (): MonitoringProgram[] => [
  tpl('pr-st-int', 'Stacionář – intenzivní léčba', ['C15', 'C20', 'C34', 'C50'], ['questionnaire', 'lab', 'wearables'], DEFAULT_QUESTIONNAIRE_ID, 1, NEVER, [
    ACT.cekarna(),
    ACT.aplikace(),
    ACT.lekar(),
  ]),
  tpl('pr-st-ost', 'Stacionář – ostatní', ['C50', 'C53', 'C61', 'C67'], ['questionnaire', 'lab', 'wearables'], DEFAULT_QUESTIONNAIRE_ID, 3, NEVER, [
    ACT.cekarna(),
    ACT.aplikace(),
    ACT.lekar(),
  ]),
  tpl('pr-ak', 'Akutní toxicita RT', ['C50', 'C61', 'C20', 'C53', 'C32'], ['questionnaire', 'lab'], DEFAULT_QUESTIONNAIRE_ID, 1, { ...NEVER, kind: 'duration', amount: 8, unit: 'week' }, [
    ACT.cekarna(),
    ACT.lekar(),
  ]),
  tpl('pr-ch-br', 'Chronická toxicita RT – prs', ['C50'], ['questionnaire'], 'lib-eortc-br45', 4, NEVER, [ACT.lekar(), ACT.telefon()]),
  tpl('pr-ch-hn', 'Chronická toxicita RT – hlava a krk', ['C01', 'C09', 'C32'], ['questionnaire'], 'lib-eortc-hn43', 4, NEVER, [ACT.lekar(), ACT.telefon()]),
  tpl('pr-ch-pr', 'Chronická toxicita RT – prostata', ['C61'], ['questionnaire'], 'lib-eortc-pr25', 4, NEVER, [ACT.lekar(), ACT.telefon()]),
  tpl('pr-ch-lc', 'Chronická toxicita RT – plíce', ['C34'], ['questionnaire'], 'lib-eortc-lc29', 4, NEVER, [ACT.lekar(), ACT.telefon()]),
]

export const DEFAULT_FILTERS: DashboardFilters = {
  // Výchozí je Vše – všechna pásma (od 2026-11-20; dříve jen červené, vyžádaná kontrola a nevyplněno)
  scores: ['green', 'yellow', 'red', 'blue', 'na'],
  date: 'all',
  programIds: [],
  // Výchozí: jen pacienti bez příznaku – pacienti s dnešním příznakem jsou ve svém boxu nahoře.
  tags: [''],
}

/** Demo pohledy pod Dashboardem: Chronická toxicita RT, Akutní toxicita RT, Stacionář. */
export const seedViews = (): DashboardView[] => [
  { id: 'v-chron', name: 'Chronická toxicita RT', filters: { ...DEFAULT_FILTERS, programIds: ['pr-ch-br', 'pr-ch-hn', 'pr-ch-pr', 'pr-ch-lc'] } },
  { id: 'v-akut', name: 'Akutní toxicita RT', filters: { ...DEFAULT_FILTERS, programIds: ['pr-ak'] } },
  { id: 'v-stac', name: 'Stacionář', filters: { ...DEFAULT_FILTERS, programIds: ['pr-st-int', 'pr-st-ost'] } },
]
