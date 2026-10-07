import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { Button, cx } from '../components/ui'
import { QUESTIONS } from '../data/questionnaire'
import { fullDate, reportName } from '../lib/format'
import { useStore } from '../lib/store'
import type { Answers } from '../lib/types'

/**
 * Vyplnění dotazníku pacientem (např. na tabletu v ambulanci).
 * Otevírá se kliknutím na odznak „n/a“. Celoobrazovkový režim bez menu – zařízení se podává pacientovi.
 */
export function FillQuestionnaire() {
  const { qid } = useParams()
  const { db, submitQuestionnaire } = useStore()
  const navigate = useNavigate()
  const back = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [answers, setAnswers] = useState<Answers>({})
  const [showMissing, setShowMissing] = useState(false)
  const [done, setDone] = useState(false)

  const q = db.questionnaires.find((x) => x.id === qid)
  if (!q) return <Navigate to="/" replace />
  const mon = db.monitorings.find((m) => m.id === q.monitoringId)!
  const patient = db.patients.find((p) => p.id === mon.patientId)!

  if (q.answers && !done) return <Navigate to={back} replace />

  const missing = QUESTIONS.filter((x) => answers[x.id] === undefined)
  const answered = QUESTIONS.length - missing.length

  const submit = () => {
    if (missing.length) {
      setShowMissing(true)
      document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    submitQuestionnaire(q.id, answers)
    setDone(true)
    window.scrollTo(0, 0)
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 text-center">
        <CheckCircleIcon className="h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">Děkujeme, dotazník byl odeslán.</h1>
        <p className="max-w-md text-gray-600">Nyní prosím vraťte zařízení zdravotnickému personálu.</p>
        <Button onClick={() => navigate(back)}>Zpět do aplikace</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm ring-1 ring-gray-950/5">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <Link to={back} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Zrušit
          </Link>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-primary-600 transition-all" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm font-medium text-gray-500">
          {reportName(patient)} · termín {fullDate(q.scheduledFor)}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Týdenní dotazník</h1>
        <p className="mt-2 text-gray-600">Odpovídejte prosím podle toho, jak jste se cítil(a) během posledních 7 dní.</p>

        <div className="mt-8 flex flex-col gap-4">
          {QUESTIONS.map((question, i) => {
            const isMissing = showMissing && answers[question.id] === undefined
            return (
              <section
                id={`q-${question.id}`}
                key={question.id}
                className={cx('rounded-xl bg-white p-5 shadow-sm ring-1', isMissing ? 'ring-red-500' : 'ring-gray-950/5')}
              >
                <div className="text-xs font-medium text-gray-400">
                  Otázka {i + 1} z {QUESTIONS.length}
                </div>
                <h2 className="mt-1 text-base font-semibold text-gray-950">{question.text}</h2>

                {question.type === 'scale' && (
                  <div className="mt-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={question.min}
                        max={question.max}
                        value={Number(answers[question.id] ?? 50)}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: Number(e.target.value) })}
                        className="h-2 flex-1 cursor-pointer accent-primary-600"
                      />
                      <span className={cx('w-12 text-right text-xl font-semibold', answers[question.id] === undefined ? 'text-gray-300' : 'text-gray-950')}>
                        {Number(answers[question.id] ?? 50)}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <span>0 = nejhorší</span>
                      <span>100 = nejlepší</span>
                    </div>
                  </div>
                )}

                {question.type === 'choice' && (
                  <div className="mt-4 grid gap-2">
                    {question.options.map((o, idx) => (
                      <OptionButton
                        key={o.label}
                        selected={answers[question.id] === idx}
                        onClick={() => setAnswers({ ...answers, [question.id]: idx })}
                      >
                        {o.label}
                      </OptionButton>
                    ))}
                  </div>
                )}

                {question.type === 'control' && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <OptionButton selected={answers[question.id] === true} onClick={() => setAnswers({ ...answers, [question.id]: true })}>
                      Ano
                    </OptionButton>
                    <OptionButton selected={answers[question.id] === false} onClick={() => setAnswers({ ...answers, [question.id]: false })}>
                      Ne
                    </OptionButton>
                  </div>
                )}
                {isMissing && <p className="mt-3 text-sm text-red-600">Odpovězte prosím na tuto otázku.</p>}
              </section>
            )
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <span className="text-sm text-gray-500">
            Zodpovězeno {answered} z {QUESTIONS.length}
          </span>
          <Button onClick={submit} className="px-6 py-3 text-base">
            Odeslat dotazník
          </Button>
        </div>
      </main>
    </div>
  )
}

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex items-center gap-3 rounded-lg px-4 py-3 text-left text-base ring-1 transition',
        selected ? 'bg-primary-50 font-medium text-primary-700 ring-2 ring-primary-600' : 'bg-white text-gray-800 ring-gray-950/10 hover:bg-gray-50',
      )}
    >
      <span className={cx('h-4 w-4 shrink-0 rounded-full ring-1', selected ? 'bg-primary-600 ring-primary-600 [box-shadow:inset_0_0_0_3px_white]' : 'ring-gray-300')} />
      {children}
    </button>
  )
}
