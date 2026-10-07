// e-Skill – test digitální gramotnosti převzatý z repozitáře pskrobanek/digital_literacy
// (Django modul „Therahub“). Převzaty jsou otázky, úkoly, texty CZ/EN a výpočet skóre 1:1;
// registrace pacienta, heslo, souhlasy a staff login jsou odstraněny – pacienta vybírá personál.

export type Lang = 'cs' | 'en'

// ---------------------------------------------------------------------------
// Dotazník (4 otázky) – survey.html / survey.js
// ---------------------------------------------------------------------------
export type SurveyAnswers = { q1: string[]; q2: string; q3: string; q4: string }

export const SURVEY: {
  id: keyof SurveyAnswers
  multi: boolean
  prompt: Record<Lang, string>
  options: { value: string; label: Record<Lang, string> }[]
}[] = [
  {
    id: 'q1',
    multi: true,
    prompt: { cs: '„Denně používám ___“ (Vyberte vše, co platí)', en: '"I use ___ on a daily basis" (Select all that apply)' },
    options: [
      { value: 'mobile_phone', label: { cs: 'Mobilní telefon', en: 'Mobile phone' } },
      { value: 'mobile_tablet', label: { cs: 'Tablet', en: 'Mobile tablet' } },
      { value: 'desktop_laptop', label: { cs: 'Stolní počítač/Notebook', en: 'Desktop/Laptop' } },
      { value: 'smart_watch', label: { cs: 'Chytré hodinky', en: 'Smart Watch' } },
      { value: 'none', label: { cs: 'Žádné', en: 'None' } },
    ],
  },
  {
    id: 'q2',
    multi: false,
    prompt: { cs: '„Když se mi nedaří naučit se technologii, tak…“', en: '"When struggling to learn a technology, I..."' },
    options: [
      { value: 'give_up', label: { cs: 'Vzdám to', en: 'Give up' } },
      { value: 'ask_help', label: { cs: 'Požádám někoho o pomoc nebo předvedení', en: 'Ask someone for help or to demonstrate' } },
      { value: 'take_break', label: { cs: 'Dám si pauzu a zkusím to později', en: 'Take a break and try again later' } },
      { value: 'press_buttons', label: { cs: 'Mačkám tlačítka, abych viděl, co dělají', en: 'Press buttons to see what they do' } },
    ],
  },
  {
    id: 'q3',
    multi: false,
    prompt: {
      cs: '„Pokud máte potíže s používáním technologií, kdo vám obvykle nejvíce pomáhá?“',
      en: '"If you have difficulties using technology, who usually helps you the most?"',
    },
    options: [
      { value: 'family', label: { cs: 'Rodina', en: 'Family' } },
      { value: 'friends', label: { cs: 'Přátelé', en: 'Friends' } },
      { value: 'caregivers', label: { cs: 'Pečovatelé', en: 'Caregivers' } },
      { value: 'professionals', label: { cs: 'Profesionálové (IT/podpora)', en: 'Professionals (IT/support staff)' } },
      { value: 'no_one', label: { cs: 'Nikdo', en: 'No one' } },
    ],
  },
  {
    id: 'q4',
    multi: false,
    prompt: {
      cs: '„Jak často můžete získat pomoc, když máte potíže s používáním technologií?“',
      en: '"How often can you get help when you have difficulties using technology?"',
    },
    options: [
      { value: 'immediately', label: { cs: 'Okamžitě / na požádání', en: 'Immediately / on demand' } },
      { value: 'within_day', label: { cs: 'Do jednoho dne', en: 'Within a day' } },
      { value: 'within_few_days', label: { cs: 'Do několika dnů', en: 'Within a few days' } },
      { value: 'once_a_week', label: { cs: 'Přibližně jednou týdně', en: 'About once a week' } },
      { value: 'rarely', label: { cs: 'Zřídka nebo téměř nikdy', en: 'Rarely or almost never' } },
    ],
  },
]

export const surveyLabel = (q: keyof SurveyAnswers, value: string, lang: Lang = 'cs') =>
  SURVEY.find((s) => s.id === q)?.options.find((o) => o.value === value)?.label[lang] ?? value

// ---------------------------------------------------------------------------
// Interaktivní test (9 úkolů) – test.html / test.js
// ---------------------------------------------------------------------------
export const TEST_TIME_LIMIT_MS = 120_000
export const TARGET_DATE = '2026-02-15'

export const TEXT = {
  cs: {
    introTitle: 'Test digitální gramotnosti',
    introDesc:
      'Test má dvě krátké části: dotazník o tom, jak používáte technologie, a sérii jednoduchých úkolů na obrazovce. Celé to zabere asi 5 minut.',
    introBtn: 'Začít',
    surveyTitle: 'Průzkum používání technologií',
    testTitle: 'Test digitální gramotnosti',
    testDesc:
      'Tento krátký test prověří vaši schopnost pracovat s běžnými prvky na obrazovce počítače. Postupujte podle pokynů u každého úkolu.',
    testBtn: 'Začít test',
    next: 'Další',
    back: 'Zpět',
    submitSurvey: 'Odeslat průzkum',
    questionCounter: (c: number, t: number) => `Otázka ${c} z ${t}`,
    taskCounter: (c: number, t: number) => `Úkol ${c} z ${t}`,
    progress: (d: number, t: number) => `${d} z ${t} splněno`,
    timeRemaining: 'Zbývající čas',
    timeLimitNote: 'Test se automaticky ukončí po 2 minutách. Nedokončené úkoly budou označeny jako prázdné.',
    instructions: [
      'Klikněte na zelené tlačítko.',
      "Klikněte na tlačítko 'Pokračovat'.",
      'Klikněte na modrý bod.',
      'Klikněte na ikonu e-mailu.',
      'Klikněte na odkaz v odstavci níže.',
      "Klikněte na 'Kontakt' v navigační liště.",
      'Zavřete vyskakovací okno.',
      'Napište slovo zobrazené níže.',
      'Vyberte datum zobrazené níže.',
    ],
    task1Btn: 'START',
    task2: ['Zrušit', 'Pokračovat', 'Zpět'],
    task5: ['Vítejte na našich stránkách. Nabízíme různé služby, které vám pomohou začít s technologiemi. Pokud potřebujete pomoc, navštivte naše ', 'centrum nápovědy', ' pro více informací. Náš tým je k dispozici od pondělí do pátku.'],
    task6: ['Domů', 'O nás', 'Služby', 'Kontakt', 'Nápověda'],
    task7Title: 'Oznámení',
    task7Body: 'Děkujeme za návštěvu. Toto je ukázková vyskakovací zpráva. Zavřete toto okno pro pokračování.',
    task7Dismiss: 'Zavřít',
    task8Label: 'Napište toto slovo:',
    task8Word: 'počítač',
    task9Label: 'Vyberte toto datum:',
    task9Date: '15. 2. 2026',
    task9Hint: 'Formát data na zařízení se může lišit. Vyberte stejné kalendářní datum.',
    taskSubmit: 'Potvrdit',
    resultsTitle: 'Celkové skóre',
    resultsDesc: 'Děkujeme, test je dokončen.',
    correctTasks: 'Správné úkoly',
    speed: 'Rychlost',
    misclick: 'Prům. vzdálenost chybných kliknutí',
    typingTime: 'Čas psaní',
    typingAccuracy: 'Přesnost psaní',
    motorScore: 'Skóre testu (motorika)',
  },
  en: {
    introTitle: 'Digital Literacy Test',
    introDesc:
      'The test has two short parts: a survey about how you use technology and a series of simple on-screen tasks. It takes about 5 minutes.',
    introBtn: 'Start',
    surveyTitle: 'Technology Usage Survey',
    testTitle: 'Digital Literacy Test',
    testDesc:
      'This short test will check your ability to interact with common items on a computer screen. Follow the instructions for each task.',
    testBtn: 'Begin Test',
    next: 'Next',
    back: 'Back',
    submitSurvey: 'Submit Survey',
    questionCounter: (c: number, t: number) => `Question ${c} of ${t}`,
    taskCounter: (c: number, t: number) => `Task ${c} of ${t}`,
    progress: (d: number, t: number) => `${d} of ${t} completed`,
    timeRemaining: 'Time Remaining',
    timeLimitNote: 'The test will automatically finish after 2 minutes. Incomplete tasks will be marked blank.',
    instructions: [
      'Click the green button below.',
      "Click the 'Continue' button.",
      'Click the blue dot.',
      'Click the email icon.',
      'Click the link in the paragraph below.',
      "Click 'Contact' in the navigation menu.",
      'Close the popup window.',
      'Type the word shown below.',
      'Select the date shown below.',
    ],
    task1Btn: 'START',
    task2: ['Cancel', 'Continue', 'Go Back'],
    task5: ['Welcome to our website. We offer a variety of services to help you get started with technology. If you need assistance, please visit our ', 'help center', ' for more information. Our team is available Monday through Friday to answer your questions.'],
    task6: ['Home', 'About', 'Services', 'Contact', 'Help'],
    task7Title: 'Notification',
    task7Body: 'Thank you for visiting. This is a sample popup message. You can close this window to continue.',
    task7Dismiss: 'Dismiss',
    task8Label: 'Type this word:',
    task8Word: 'computer',
    task9Label: 'Select this date:',
    task9Date: 'February 15, 2026',
    task9Hint: 'Your device date format may vary. Select the same calendar date.',
    taskSubmit: 'Submit',
    resultsTitle: 'Final Score',
    resultsDesc: 'Thank you, the test is complete.',
    correctTasks: 'Correct Tasks',
    speed: 'Speed',
    misclick: 'Avg Misclick Distance',
    typingTime: 'Typing Time',
    typingAccuracy: 'Typing Accuracy',
    motorScore: 'Test score (motor)',
  },
}

export interface TestMetrics {
  correctTasks: number
  totalTasks: number
  speed: number // s
  avgMisclickDistance: number // px
  typingDuration: number | null // s
  typingAccuracy: number | null // %
}

// ---------------------------------------------------------------------------
// Skóre – views.calculate_final_test_score + scoring.py (Self-Reflection v4.0)
// ---------------------------------------------------------------------------
const MAX_TEST_DURATION_SECONDS = 120
const MISCLICK_DISTANCE_CAP_PIXELS = 500
const MAX_TYPING_DURATION_SECONDS = 30

/** Motorické skóre testu 0–100: 65 % správnost, 15 % rychlost, 10 % přesnost kliknutí, 5 % rychlost psaní, 5 % přesnost psaní. */
export function motorScore(m: TestMetrics): number {
  if (!m.totalTasks) return 0
  const acc = Math.max(0, Math.min(m.correctTasks, m.totalTasks)) / m.totalTasks
  const speed = Math.max(0, 1 - Math.min(m.speed, MAX_TEST_DURATION_SECONDS) / MAX_TEST_DURATION_SECONDS)
  const precision = Math.max(0, 1 - Math.min(m.avgMisclickDistance, MISCLICK_DISTANCE_CAP_PIXELS) / MISCLICK_DISTANCE_CAP_PIXELS)
  const typingSpeed = m.typingDuration === null ? 0 : Math.max(0, 1 - Math.min(m.typingDuration, MAX_TYPING_DURATION_SECONDS) / MAX_TYPING_DURATION_SECONDS)
  const typingAcc = m.typingAccuracy === null ? 0 : Math.max(0, Math.min(m.typingAccuracy, 100)) / 100
  return Math.round(acc * 65 + speed * 15 + precision * 10 + typingSpeed * 5 + typingAcc * 5)
}

const DEVICE_WEIGHTS: Record<string, number> = { desktop_laptop: 0.1, mobile_tablet: 0.1, mobile_phone: 0.1, smart_watch: 0 }
const L_FACTOR: Record<string, number> = { press_buttons: 1.1, take_break: 1.0, ask_help: 0.8, give_up: 0.4 }
const RESOURCE_QUALITY: Record<string, number> = { family: 1, friends: 1, caregivers: 1, professionals: 0.8, no_one: 0.7 }
const PENALTY: Record<string, number> = { immediately: 0, within_day: 5, within_few_days: 10, once_a_week: 15, rarely: 25 }

/** Digitální gramotnost 0–100 = motorika × šíře technologií × L faktor × kvalita podpory − penalizace dostupnosti pomoci. */
export function literacyScore(motor: number, s: SurveyAnswers): number {
  const devices = s.q1.filter((d) => d in DEVICE_WEIGHTS)
  const breadth = devices.length ? 0.7 + devices.reduce((a, d) => a + DEVICE_WEIGHTS[d], 0) : 0
  const raw = motor * breadth * (L_FACTOR[s.q2] ?? 0) * (RESOURCE_QUALITY[s.q3] ?? 0) - (PENALTY[s.q4] ?? 0)
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export type Tier = 'Low' | 'Medium' | 'High'
export const tierFor = (score: number): Tier => (score <= 33 ? 'Low' : score <= 66 ? 'Medium' : 'High')

export const TIER_META: Record<Tier, { label: string; badge: string; text: string }> = {
  Low: { label: 'Nízká', badge: 'bg-red-50 text-red-700 ring-red-600/20', text: 'text-red-600' },
  Medium: { label: 'Střední', badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', text: 'text-amber-500' },
  High: { label: 'Vysoká', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', text: 'text-emerald-600' },
}

const TIER_RANK: Record<Tier, number> = { Low: 0, Medium: 1, High: 2 }

/** Katalog aplikací (vlastní „digitální náročnost“ aplikace; nižší = jednodušší). */
export const APPS: { name: string; score: number; tier: Tier; note: string }[] = [
  { name: 'Oncontest', score: 10.6, tier: 'Low', note: '' },
  { name: 'Noona', score: 10.6, tier: 'Low', note: '' },
  { name: 'Cureety*', score: 41.7, tier: 'Medium', note: 'Demo skóre – interpretovat opatrně' },
  { name: 'Medevio', score: 50.7, tier: 'Medium', note: '' },
  { name: 'Elekta Kaiku', score: 72.1, tier: 'High', note: '' },
  { name: 'MEDDI', score: 95.0, tier: 'High', note: '' },
]

/** Aplikace vhodné pro úroveň pacienta (jeho úroveň a nižší), od nejjednodušší. */
export const recommendApps = (score: number) =>
  APPS.filter((a) => TIER_RANK[a.tier] <= TIER_RANK[tierFor(score)]).sort((a, b) => a.score - b.score)
