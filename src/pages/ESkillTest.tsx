import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TierBadge } from '../components/eskill'
import { Logo } from '../components/Layout'
import { Button, cx, SearchInput, useToast } from '../components/ui'
import { literacyScore, motorScore, SURVEY, TARGET_DATE, TEST_TIME_LIMIT_MS, TEXT, TIER_META, tierFor, type Lang, type SurveyAnswers, type TestMetrics } from '../data/eskill'
import { tableName } from '../lib/format'
import { sortPatients, useStore } from '../lib/store'
import type { ESkillResult } from '../lib/types'

type Phase = 'intro' | 'survey' | 'testIntro' | 'test' | 'results'

/** Zavře okno testu; pokud to prohlížeč nedovolí (nebo nejde o vyskakovací okno), vrátí se na e-Skill. */
function useCloseWindow() {
  const navigate = useNavigate()
  return () => {
    if (window.opener) window.close()
    navigate('/e-skill')
  }
}

/**
 * Celoobrazovkový test e-Skill (otevírá se v novém okně).
 * /e-skill/test/:patientId – výsledek se uloží do karty pacienta
 * /e-skill/test            – test bez registrace, výsledek lze na konci přiřadit
 */
export function ESkillTest() {
  const { patientId } = useParams()
  const { db } = useStore()
  const patient = patientId ? db.patients.find((p) => p.id === patientId) : undefined
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('oncoready-eskill-lang') as Lang) || 'cs'
    } catch {
      return 'cs'
    }
  })
  const [phase, setPhase] = useState<Phase>('intro')
  const [survey, setSurvey] = useState<SurveyAnswers>({ q1: [], q2: '', q3: '', q4: '' })
  const [outcome, setOutcome] = useState<{ metrics: TestMetrics; timedOut: boolean } | null>(null)
  const t = TEXT[lang]

  const changeLang = (l: Lang) => {
    setLang(l)
    try {
      localStorage.setItem('oncoready-eskill-lang', l)
    } catch {
      /* ignorovat */
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-white px-4 shadow-sm ring-1 ring-gray-950/5 md:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden text-sm font-medium text-gray-400 sm:inline">e-Skill</span>
        </div>
        <div className="flex items-center gap-3">
          {patient && <span className="hidden text-sm font-medium text-gray-600 sm:inline">{tableName(patient)}</span>}
          {phase !== 'results' && (
            <select
              value={lang}
              onChange={(e) => changeLang(e.target.value as Lang)}
              className="rounded-lg border-none bg-white py-1 pl-2 pr-7 text-sm shadow-sm ring-1 ring-gray-950/10"
              aria-label="Jazyk"
            >
              <option value="cs">Čeština</option>
              <option value="en">English</option>
            </select>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {phase === 'intro' && (
          <CenterCard>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.introTitle}</h1>
            <p className="mt-3 text-gray-600">{t.introDesc}</p>
            <Button className="mt-8 px-6 py-3 text-base" onClick={() => setPhase('survey')}>
              {t.introBtn}
            </Button>
          </CenterCard>
        )}
        {phase === 'survey' && <Survey lang={lang} value={survey} onChange={setSurvey} onDone={() => setPhase('testIntro')} />}
        {phase === 'testIntro' && (
          <CenterCard>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.testTitle}</h1>
            <p className="mt-3 text-gray-600">{t.testDesc}</p>
            <p className="mt-2 text-sm text-gray-500">{t.timeLimitNote}</p>
            <Button className="mt-8 px-6 py-3 text-base" onClick={() => setPhase('test')}>
              {t.testBtn}
            </Button>
          </CenterCard>
        )}
        {phase === 'test' && (
          <InteractiveTest
            lang={lang}
            onFinish={(metrics, timedOut) => {
              setOutcome({ metrics, timedOut })
              setPhase('results')
            }}
          />
        )}
        {phase === 'results' && outcome && <Results patientId={patient?.id ?? null} survey={survey} outcome={outcome} lang={lang} />}
      </main>
    </div>
  )
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-950/5 sm:px-12">{children}</div>
}

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className="mt-6">
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-primary-600 transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <div className="mt-2 text-center text-sm text-gray-500">{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dotazník
// ---------------------------------------------------------------------------
function Survey({ lang, value, onChange, onDone }: { lang: Lang; value: SurveyAnswers; onChange: (v: SurveyAnswers) => void; onDone: () => void }) {
  const [i, setI] = useState(0)
  const t = TEXT[lang]
  const q = SURVEY[i]
  const current = value[q.id]
  const answered = Array.isArray(current) ? current.length > 0 : !!current

  const toggleMulti = (v: string) => {
    const list = value.q1
    let next: string[]
    if (list.includes(v)) next = list.filter((x) => x !== v)
    else if (v === 'none') next = ['none'] // „Žádné“ vylučuje ostatní (jako v originále)
    else next = [...list.filter((x) => x !== 'none'), v]
    onChange({ ...value, q1: next })
  }

  return (
    <div>
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {t.surveyTitle} · {t.questionCounter(i + 1, SURVEY.length)}
          </div>
          <h2 className="mt-1 text-lg font-semibold text-gray-950">{q.prompt[lang]}</h2>
        </div>
        <div className="grid gap-2 p-6">
          {q.options.map((o) => {
            const selected = q.multi ? value.q1.includes(o.value) : current === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => (q.multi ? toggleMulti(o.value) : onChange({ ...value, [q.id]: o.value }))}
                className={cx(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-left text-base ring-1 transition',
                  selected ? 'bg-primary-50 font-medium text-primary-700 ring-2 ring-primary-600' : 'bg-white text-gray-800 ring-gray-950/10 hover:bg-gray-50',
                )}
              >
                <span
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center ring-1',
                    q.multi ? 'rounded' : 'rounded-full',
                    selected ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white ring-gray-300',
                  )}
                >
                  {selected && (q.multi ? '✓' : <span className="h-2 w-2 rounded-full bg-white" />)}
                </span>
                {o.label[lang]}
              </button>
            )
          })}
        </div>
        <div className="flex justify-between gap-3 border-t border-gray-200 px-6 py-4">
          {i > 0 ? (
            <Button color="gray" onClick={() => setI(i - 1)}>
              {t.back}
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={!answered} onClick={() => (i < SURVEY.length - 1 ? setI(i + 1) : onDone())}>
            {i < SURVEY.length - 1 ? t.next : t.submitSurvey}
          </Button>
        </div>
      </div>
      <ProgressBar done={i} total={SURVEY.length} label={t.progress(i, SURVEY.length)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interaktivní test – 9 úkolů, časový limit 2 min, měření přesnosti kliknutí
// ---------------------------------------------------------------------------
const TOTAL_TASKS = 9

function InteractiveTest({ lang, onFinish }: { lang: Lang; onFinish: (m: TestMetrics, timedOut: boolean) => void }) {
  const t = TEXT[lang]
  const [idx, setIdx] = useState(0)
  const [flash, setFlash] = useState<{ el: HTMLElement; ok: boolean } | null>(null)
  const [remaining, setRemaining] = useState(TEST_TIME_LIMIT_MS / 1000)
  const [typed, setTyped] = useState('')
  const [date, setDate] = useState('')
  const [inputError, setInputError] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Měřené hodnoty (ref – nemají vyvolat překreslení)
  const st = useRef({
    start: Date.now(),
    attempts: 1,
    results: [] as { id: number; attempts: number }[],
    misclicks: [] as number[],
    typingStart: null as number | null,
    typingFirst: null as string | null,
    typingDuration: null as number | null,
    typingAccuracy: null as number | null,
    completedAt: null as number | null,
    finished: false,
  })

  const metrics = (): TestMetrics => {
    const s = st.current
    const elapsed = ((s.completedAt ?? Date.now()) - s.start) / 1000
    return {
      correctTasks: s.results.filter((r) => r.attempts === 1).length,
      totalTasks: TOTAL_TASKS,
      speed: Number(elapsed.toFixed(2)),
      avgMisclickDistance: s.misclicks.length ? Number((s.misclicks.reduce((a, b) => a + b, 0) / s.misclicks.length).toFixed(2)) : 0,
      typingDuration: s.typingDuration,
      typingAccuracy: s.typingAccuracy,
    }
  }

  const finish = (timedOut: boolean) => {
    if (st.current.finished) return
    st.current.finished = true
    onFinish(metrics(), timedOut)
  }

  // Časovač 2 minuty
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.ceil((TEST_TIME_LIMIT_MS - (Date.now() - st.current.start)) / 1000)
      setRemaining(Math.max(0, left))
      if (left <= 0) {
        clearInterval(id)
        finish(true)
      }
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = () => {
    const s = st.current
    s.results.push({ id: idx, attempts: s.attempts })
    s.attempts = 1
    if (idx === TOTAL_TASKS - 1) {
      s.completedAt = Date.now()
      finish(false)
    } else {
      setIdx(idx + 1)
      setTyped('')
      setDate('')
    }
  }

  const fail = () => {
    st.current.attempts++
    setInputError(true)
    setTimeout(() => setInputError(false), 600)
  }

  /** Klikací úkoly 1–7: správný prvek má data-target. Chybné kliknutí = vzdálenost od středu cíle. */
  const onPanelClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (idx >= 7 || flash?.ok) return
    const panel = panelRef.current
    if (!panel) return
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-target]')
    if (hit && panel.contains(hit)) {
      setFlash({ el: hit, ok: true })
      setTimeout(() => {
        setFlash(null)
        advance()
      }, 600)
      return
    }
    st.current.attempts++
    const targets = [...panel.querySelectorAll<HTMLElement>('[data-target]')]
    const d = Math.min(
      ...targets.map((el) => {
        const r = el.getBoundingClientRect()
        return Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2))
      }),
    )
    if (Number.isFinite(d)) st.current.misclicks.push(Number(d.toFixed(2)))
    const el = e.target as HTMLElement
    if (el !== panel) {
      setFlash({ el, ok: false })
      setTimeout(() => setFlash(null), 400)
    }
  }

  // Zvýraznění správně/špatně (stejně jako correct-flash / incorrect-flash v originále)
  useEffect(() => {
    if (!flash) return
    const cls = flash.ok ? ['!ring-4', '!ring-emerald-500'] : ['!ring-4', '!ring-red-500']
    flash.el.classList.add(...cls)
    return () => flash.el.classList.remove(...cls)
  }, [flash])

  const submitTyping = () => {
    const s = st.current
    const word = t.task8Word
    if (s.typingFirst === null) {
      s.typingFirst = typed
      let correct = 0
      for (let i = 0; i < Math.min(typed.length, word.length); i++) if (typed[i] === word[i]) correct++
      const maxLen = Math.max(typed.length, word.length)
      s.typingAccuracy = maxLen > 0 ? Math.round((correct / maxLen) * 100) : 0
    }
    if (typed !== word) return fail()
    if (s.typingStart) s.typingDuration = Number(((Date.now() - s.typingStart) / 1000).toFixed(2))
    advance()
  }

  const submitDate = () => (date === TARGET_DATE ? advance() : fail())

  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4 rounded-xl bg-white px-6 py-4 shadow-sm ring-1 ring-gray-950/5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{t.taskCounter(idx + 1, TOTAL_TASKS)}</div>
          <div className="mt-1 text-lg font-semibold text-gray-950">{t.instructions[idx]}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-gray-500">{t.timeRemaining}</div>
          <div className={cx('font-mono text-xl font-semibold tabular-nums', remaining <= 30 ? 'text-red-600' : 'text-gray-950')}>{mmss}</div>
        </div>
      </div>

      <div
        ref={panelRef}
        onClick={onPanelClick}
        className="flex min-h-[22rem] select-none items-center justify-center rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5"
      >
        {idx === 0 && (
          <button data-target className="rounded-2xl bg-emerald-600 px-14 py-8 text-3xl font-bold text-white shadow-lg transition hover:bg-emerald-500">
            {t.task1Btn}
          </button>
        )}

        {idx === 1 && (
          <div className="flex flex-wrap justify-center gap-4">
            {t.task2.map((label, i) => (
              <button key={label} data-target={i === 1 ? '' : undefined} className="rounded-lg bg-gray-100 px-6 py-3 text-lg font-medium text-gray-800 ring-1 ring-gray-300 transition hover:bg-gray-200">
                {label}
              </button>
            ))}
          </div>
        )}

        {idx === 2 && (
          <div className="grid grid-cols-3 gap-8">
            {['#e53935', '#43a047', '#1e88e5', '#fdd835', '#8e24aa', '#fb8c00'].map((c) => (
              <div key={c} data-target={c === '#1e88e5' ? '' : undefined} className="h-16 w-16 cursor-pointer rounded-full transition hover:scale-110" style={{ background: c }} />
            ))}
          </div>
        )}

        {idx === 3 && (
          <div className="flex flex-wrap justify-center gap-6">
            {ICONS.map((ic) => (
              <div key={ic.id} data-target={ic.id === 'email' ? '' : undefined} className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9">
                  {ic.paths}
                </svg>
              </div>
            ))}
          </div>
        )}

        {idx === 4 && (
          <p className="max-w-xl text-lg leading-relaxed text-gray-800">
            {t.task5[0]}
            <a href="#" data-target onClick={(e) => e.preventDefault()} className="text-blue-700 underline">
              {t.task5[1]}
            </a>
            {t.task5[2]}
          </p>
        )}

        {idx === 5 && (
          <nav className="flex w-full max-w-2xl flex-wrap justify-center gap-1 rounded-lg bg-slate-800 p-2">
            {t.task6.map((label, i) => (
              <button key={label} data-target={i === 3 ? '' : undefined} className="rounded-md px-4 py-2 text-base text-white transition hover:bg-slate-700">
                {label}
              </button>
            ))}
          </nav>
        )}

        {idx === 6 && (
          <div className="relative flex w-full items-center justify-center rounded-lg bg-gray-950/40 p-8">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h3 className="text-lg font-semibold">{t.task7Title}</h3>
                <button data-target className="rounded px-2 text-2xl leading-none text-gray-500 hover:bg-gray-100">
                  &times;
                </button>
              </div>
              <div className="px-4 py-4 text-gray-700">{t.task7Body}</div>
              <div className="flex justify-end border-t border-gray-200 px-4 py-3">
                <button data-target className="rounded-md bg-gray-100 px-4 py-2 text-gray-800 ring-1 ring-gray-300 hover:bg-gray-200">
                  {t.task7Dismiss}
                </button>
              </div>
            </div>
          </div>
        )}

        {idx === 7 && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <p className="text-gray-600">{t.task8Label}</p>
            <div className="text-3xl font-bold tracking-wide text-gray-950">{t.task8Word}</div>
            <input
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (!st.current.typingStart) st.current.typingStart = Date.now()
                if (e.key === 'Enter') submitTyping()
              }}
              className={cx('w-full rounded-lg px-4 py-3 text-center text-xl outline-none ring-2', inputError ? 'ring-red-500' : 'ring-gray-300 focus:ring-primary-600')}
            />
            <Button className="px-6 py-2.5 text-base" onClick={submitTyping}>
              {t.taskSubmit}
            </Button>
          </div>
        )}

        {idx === 8 && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <p className="text-gray-600">{t.task9Label}</p>
            <div className="text-3xl font-bold text-gray-950">{t.task9Date}</div>
            <input
              type="date"
              lang={lang === 'cs' ? 'cs-CZ' : 'en-US'}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cx('w-full rounded-lg px-4 py-3 text-center text-lg outline-none ring-2', inputError ? 'ring-red-500' : 'ring-gray-300 focus:ring-primary-600')}
            />
            <p className="text-center text-xs text-gray-500">{t.task9Hint}</p>
            <Button className="px-6 py-2.5 text-base" onClick={submitDate}>
              {t.taskSubmit}
            </Button>
          </div>
        )}
      </div>

      <ProgressBar done={idx} total={TOTAL_TASKS} label={t.progress(idx, TOTAL_TASKS)} />
    </div>
  )
}

const ICONS = [
  { id: 'phone', paths: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /> },
  { id: 'email', paths: (<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>) },
  { id: 'camera', paths: (<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>) },
  { id: 'printer', paths: (<><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>) },
  { id: 'settings', paths: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>) },
]

// ---------------------------------------------------------------------------
// Výsledek
// ---------------------------------------------------------------------------
function Results({
  patientId,
  survey,
  outcome,
  lang,
}: {
  patientId: string | null
  survey: SurveyAnswers
  outcome: { metrics: TestMetrics; timedOut: boolean }
  lang: Lang
}) {
  const { db, addEskillResult } = useStore()
  const toast = useToast()
  const close = useCloseWindow()
  const t = TEXT[lang]
  const motor = motorScore(outcome.metrics)
  const score = literacyScore(motor, survey)
  const tier = tierFor(score)
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const savedOnce = useRef(false)

  const result: Omit<ESkillResult, 'id' | 'patientId'> = useMemo(
    () => ({ takenAt: new Date().toISOString(), survey, metrics: outcome.metrics, motorScore: motor, literacyScore: score, timedOut: outcome.timedOut }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Test u konkrétního pacienta se uloží automaticky
  useEffect(() => {
    if (patientId && !savedOnce.current) {
      savedOnce.current = true
      addEskillResult({ ...result, patientId })
      setSavedTo(patientId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const savedPatient = db.patients.find((p) => p.id === savedTo)
  const m = outcome.metrics

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-gray-950/5">
        <div className="text-sm font-medium uppercase tracking-wider text-gray-500">{t.resultsTitle}</div>
        <div className={cx('mt-2 text-7xl font-bold tabular-nums', TIER_META[tier].text)}>{score}</div>
        <div className="mt-1 text-sm text-gray-400">/ 100</div>
        <div className="mt-3">
          <TierBadge score={score} />
        </div>
        <p className="mt-4 text-gray-600">{t.resultsDesc}</p>

        <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 text-left sm:grid-cols-3">
          {[
            { l: t.motorScore, v: `${motor} / 100` },
            { l: t.correctTasks, v: `${m.correctTasks} / ${m.totalTasks}` },
            { l: t.speed, v: `${m.speed.toFixed(2)} s` },
            { l: t.misclick, v: `${m.avgMisclickDistance.toFixed(2)} px` },
            { l: t.typingTime, v: m.typingDuration === null ? '—' : `${m.typingDuration.toFixed(2)} s` },
            { l: t.typingAccuracy, v: m.typingAccuracy === null ? '—' : `${m.typingAccuracy} %` },
          ].map((x) => (
            <div key={x.l} className="rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-950/5">
              <div className="text-xs text-gray-500">{x.l}</div>
              <div className="font-semibold tabular-nums text-gray-950">{x.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Část pro personál */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5">
        {savedPatient ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
              <span className="text-sm text-gray-700">
                Výsledek uložen do karty pacienta <strong className="text-gray-950">{tableName(savedPatient)}</strong>.
              </span>
            </div>
            <Button onClick={close}>Zavřít</Button>
          </div>
        ) : assigning ? (
          <AssignPicker
            onCancel={() => setAssigning(false)}
            onPick={(pid) => {
              addEskillResult({ ...result, patientId: pid })
              setSavedTo(pid)
              setAssigning(false)
              toast('Výsledek přiřazen pacientovi')
            }}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm text-gray-600">Test bez registrace – výsledek zatím není nikde uložen.</span>
            <div className="flex gap-3">
              <Button color="gray" onClick={close}>
                Zavřít bez uložení
              </Button>
              <Button onClick={() => setAssigning(true)}>Přiřadit pacientovi</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Výběr pacienta z kartotéky pro přiřazení výsledku. */
function AssignPicker({ onPick, onCancel }: { onPick: (patientId: string) => void; onCancel: () => void }) {
  const { db } = useStore()
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const list = sortPatients(db.patients).filter((p) => !term || tableName(p).toLowerCase().includes(term) || p.rodneCislo.includes(term))
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-950">Přiřadit výsledek pacientovi</h3>
        <SearchInput value={search} onChange={setSearch} className="w-full sm:max-w-xs" />
      </div>
      <ul className="mt-4 max-h-72 divide-y divide-gray-200 overflow-y-auto rounded-lg ring-1 ring-gray-950/10">
        {list.map((p) => (
          <li key={p.id}>
            <button onClick={() => onPick(p.id)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50">
              <span className="text-gray-950">{tableName(p)}</span>
              <span className="text-gray-500">RČ {p.rodneCislo}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">Nenalezeno</li>}
      </ul>
      <div className="mt-4">
        <Button color="gray" onClick={onCancel}>
          Zpět
        </Button>
      </div>
    </div>
  )
}
