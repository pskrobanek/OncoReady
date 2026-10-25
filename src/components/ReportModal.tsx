import { DocumentDuplicateIcon } from '@heroicons/react/24/solid'
import { ArrowDownIcon, ArrowUpIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/20/solid'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { QUESTIONS } from '../data/questionnaire'
import { answerColor, answerPoints, BAND_META, bandOf, bandReason, totalScore } from '../lib/scoring'
import { dateTime, reportName, shortDate } from '../lib/format'
import { questionnairesOf, useStore } from '../lib/store'
import type { Answers, Questionnaire } from '../lib/types'
import { CloseButton, cx, Modal, useToast } from './ui'

export function answerText(qid: string, value: unknown): string {
  const q = QUESTIONS.find((x) => x.id === qid)!
  if (value === undefined || value === null) return '—'
  if (q.type === 'scale') return Number(value).toFixed(2)
  if (q.type === 'choice') return q.options[Number(value)]?.label ?? '—'
  return value ? 'Ano' : 'Ne'
}

/** 420603277036 → +420 603 277 036 */
const formatPhone = (t: string) => (/^\d{12}$/.test(t) ? `+${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 9)} ${t.slice(9)}` : t)

/** Závažnost odpovědi pro řazení a porovnání (žádost o kontrolu = nejvýš). */
export function severity(qid: string, answers: Answers): number | null {
  const q = QUESTIONS.find((x) => x.id === qid)!
  if (answers[qid] === undefined) return null
  if (q.type === 'control') return answers[qid] ? 5 : 0
  return answerPoints(qid, answers[qid])
}

const DOT_FILL: Record<string, string> = { green: '#10b981', yellow: '#fbbf24', red: '#dc2626', blue: '#2563eb' }

/** Modal „Klinický report — Jméno Příjmení“ (otevírá se kliknutím na vyplněný dotazník). */
export function ReportModal({ questionnaire, onClose }: { questionnaire: Questionnaire | null; onClose: () => void }) {
  const { db } = useStore()
  const toast = useToast()
  if (!questionnaire?.answers || !questionnaire.filledAt) return <Modal open={false} onClose={onClose}>{null}</Modal>

  const mon = db.monitorings.find((m) => m.id === questionnaire.monitoringId)!
  const patient = db.patients.find((p) => p.id === mon.patientId)!
  const answers = questionnaire.answers
  const band = bandOf(answers)
  const score = totalScore(answers)

  // Trend – vyplněné dotazníky monitorace ve stejném pořadí jako odznaky (nejnovější vlevo).
  const trend = questionnairesOf(db, mon.id)
    .filter((q) => q.answers && q.filledAt)
    .map((q) => ({ id: q.id, date: shortDate(q.filledAt!), score: totalScore(q.answers!), band: bandOf(q.answers!) }))

  // Osa Y jako v produkci: krok 4 (u vyšších skóre větší), horní mez zaokrouhlená nahoru.
  const step = Math.max(4, Math.ceil(Math.max(...trend.map((t) => t.score), 4) / 6 / 4) * 4)
  const top = Math.ceil(Math.max(...trend.map((t) => t.score), step) / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)

  // Předchozí vyplněný dotazník téže monitorace – pro porovnání odpovědí.
  const previous = questionnairesOf(db, mon.id)
    .filter((q) => q.answers && q.filledAt && q.filledAt < questionnaire.filledAt!)
    .sort((a, b) => b.filledAt!.localeCompare(a.filledAt!))[0]

  // Nejzávažnější odpovědi nahoře (stabilní řazení – při shodě pořadí z dotazníku).
  const rows = QUESTIONS.filter((q) => answers[q.id] !== undefined).sort(
    (a, b) => (severity(b.id, answers) ?? -1) - (severity(a.id, answers) ?? -1),
  )

  const copy = () => {
    const text = [
      `Klinický report — ${reportName(patient)}`,
      `Datum odeslání: ${dateTime(questionnaire.filledAt!)}`,
      `${BAND_META[band].label}: ${score} b – ${bandReason(answers)}`,
      '',
      ...rows.map((q) => `[${q.source}] ${q.text}\n→ ${answerText(q.id, answers[q.id])}`),
    ].join('\n')
    navigator.clipboard?.writeText(text).then(
      () => toast('Report zkopírován do schránky'),
      () => toast('Kopírování se nezdařilo'),
    )
  }

  return (
    <Modal open onClose={onClose} width="max-w-3xl">
      <div className="flex items-start gap-4 border-b border-gray-200 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-950">Klinický report — {reportName(patient)}</h2>
          <p className="mt-0.5 text-sm text-gray-500">Datum odeslání: {dateTime(questionnaire.filledAt)}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            {patient.telefon ? (
              <span className="inline-flex select-all items-center gap-1.5 tabular-nums">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
                {formatPhone(patient.telefon)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-gray-400">
                <PhoneIcon className="h-4 w-4" />
                Telefon nevyplněn
              </span>
            )}
            {patient.email && (
              <span className="inline-flex select-all items-center gap-1.5">
                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                {patient.email}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cx('rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset', BAND_META[band].pill)}>
            {band === 'blue' ? `Vyžádal kontrolu: ${score} b` : `${BAND_META[band].label}: ${score} b`}
          </span>
          <span className="text-[11px] text-gray-500">{bandReason(answers)}</span>
        </div>
        <button onClick={copy} title="Kopírovat report" className="mt-1 rounded-lg p-1 text-gray-500 hover:bg-gray-50">
          <DocumentDuplicateIcon className="h-5 w-5" />
        </button>
        <CloseButton onClick={onClose} />
      </div>

      <div className="overflow-y-auto px-6 py-5">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">Trend klinického stavu (vývoj skóre)</h3>
        <div className="mb-6 h-60 rounded-xl p-3 shadow-sm ring-1 ring-gray-950/10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} padding={{ left: 20, right: 20 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} domain={[0, top]} ticks={ticks} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#14b8a6"
                strokeWidth={2}
                fill="#14b8a6"
                fillOpacity={0.06}
                isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; index?: number; payload?: { id: string; band: string } }) => (
                  <circle
                    key={p.index}
                    cx={p.cx}
                    cy={p.cy}
                    r={p.payload?.id === questionnaire.id ? 6 : 4}
                    fill={DOT_FILL[p.payload?.band ?? 'green']}
                  />
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Odpovědi (od nejzávažnějších)</h3>
          <span className="text-xs text-gray-400">
            {previous ? `Porovnání s dotazníkem z ${shortDate(previous.filledAt!)}` : 'Předchozí dotazník není k dispozici'}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {rows.map((q) => {
            const pts = answerPoints(q.id, answers[q.id])
            const isControl = q.type === 'control'
            const now = severity(q.id, answers)
            const before = previous ? severity(q.id, previous.answers!) : null
            const delta = now !== null && before !== null ? now - before : null
            return (
              <div key={q.id} className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 ring-1 ring-gray-950/5">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-gray-500">{q.source}</div>
                  <div className="text-sm text-gray-800">{q.text}</div>
                </div>
                <div
                  className={cx(
                    'max-w-[45%] text-right text-base font-semibold',
                    isControl ? (answers[q.id] ? 'text-blue-600' : 'text-gray-700') : answerColor(pts),
                  )}
                >
                  {answerText(q.id, answers[q.id])}
                  {delta !== null && previous && (
                    <div
                      className={cx(
                        'mt-0.5 flex items-center justify-end gap-1 text-xs font-medium',
                        delta > 0 ? 'text-red-600' : delta < 0 ? 'text-emerald-600' : 'text-gray-400',
                      )}
                    >
                      {delta > 0 ? <ArrowUpIcon className="h-3.5 w-3.5" /> : delta < 0 ? <ArrowDownIcon className="h-3.5 w-3.5" /> : null}
                      {delta > 0 ? 'horší' : delta < 0 ? 'lepší' : 'beze změny'}
                      {delta !== 0 && <span className="font-normal text-gray-400">· dříve: {answerText(q.id, previous.answers![q.id])}</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
