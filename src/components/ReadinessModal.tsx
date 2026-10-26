// Detail souhrnu připravenosti – otevírá se kliknutím na buňku Souhrn na Dashboardu.
import type { ReactNode } from 'react'
import { QUESTIONS } from '../data/questionnaire'
import { agoText, fullDate, num, reportName, shortDate, signed, todayIso } from '../lib/format'
import {
  evalLab,
  evalWearDay,
  FRESH_DAYS,
  readinessOf,
  sourceMeta,
  STEPS_DROP_YELLOW,
  type Level,
  type MetricRow,
  type SourceState,
} from '../lib/readiness'
import { answerColor, answerPoints, BAND_META, bandOf, bandReason, totalScore } from '../lib/scoring'
import { currentMonitoring, useStore } from '../lib/store'
import type { Questionnaire } from '../lib/types'
import { FindingList, ReadinessBadge } from './Readiness'
import { answerText, severity } from './ReportModal'
import { CloseButton, cx, Modal } from './ui'

const LEVEL_TEXT: Record<Level, string> = { green: 'text-gray-950', yellow: 'text-amber-600', red: 'text-red-600' }
const LEVEL_DOT: Record<Level, string> = { green: 'bg-emerald-500', yellow: 'bg-amber-400', red: 'bg-red-600' }
const LEVEL_LABEL: Record<Level, string> = { green: 'V mezích', yellow: 'Hraniční', red: 'Mimo mez' }

export function ReadinessModal({
  patientId,
  onClose,
  onOpenReport,
}: {
  patientId: string | null
  onClose: () => void
  onOpenReport: (q: Questionnaire) => void
}) {
  const { db } = useStore()
  const patient = db.patients.find((p) => p.id === patientId)
  if (!patient) return <Modal open={false} onClose={onClose}>{null}</Modal>

  const today = todayIso()
  const program = db.programs.find((p) => p.id === currentMonitoring(db, patient.id)?.programId)
  const r = readinessOf(db, patient.id, today)
  const src = (k: SourceState['source']) => r.sources.find((s) => s.source === k)!
  const days = db.wearables.filter((d) => d.patientId === patient.id).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Modal open onClose={onClose} width="max-w-4xl">
      <div className="flex items-start gap-4 border-b border-gray-200 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-950">Souhrn připravenosti — {reportName(patient)}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            RČ {patient.rodneCislo}
            {program && ` · ${program.name}`} · stav k {fullDate(today)}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
        {/* Výsledek */}
        <div className="flex flex-wrap items-start gap-4 rounded-xl bg-gray-50 px-5 py-4 ring-1 ring-gray-950/5">
          <div className="min-w-0 flex-1">
            <ReadinessBadge level={r.overall} size="lg" />
            {r.findings.length ? (
              <FindingList findings={r.findings} className="mt-2.5 text-sm leading-5" />
            ) : (
              <p className="mt-2.5 text-sm text-gray-600">Všechny tři zdroje jsou aktuální a v mezích.</p>
            )}
          </div>
          <p className="w-full text-xs text-gray-500 sm:w-72">
            <span className="font-medium text-gray-700">Pravidlo:</span> zelená = všechny 3 zdroje aktuální a v mezích · červená = kterýkoli zdroj
            červený · šedá = některý zdroj chybí nebo je neaktuální · žlutá = kterýkoli zdroj žlutý (dotazník i modrý).
            <br />
            Aktuální = dotazník v intervalu monitorace (min. {FRESH_DAYS.questionnaireMin} dní) · laboratoř ≤ {FRESH_DAYS.lab} dní · wearables ≤{' '}
            {FRESH_DAYS.wearables} den.
          </p>
        </div>

        {/* Dotazník */}
        <Section s={src('questionnaire')}>
          {src('questionnaire').questionnaire ? (
            <QuestionnaireResult
              q={src('questionnaire').questionnaire!}
              onOpenReport={(q) => {
                onClose()
                onOpenReport(q)
              }}
            />
          ) : (
            <Empty>Pacient zatím nevyplnil žádný dotazník.</Empty>
          )}
        </Section>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Laboratoř */}
          <Section s={src('lab')}>
            {src('lab').lab ? <MetricTable rows={evalLab(src('lab').lab!).rows} /> : <Empty>Žádný výsledek laboratoře.</Empty>}
          </Section>

          {/* Wearables */}
          <Section s={src('wearables')}>
            {src('wearables').day ? (
              (() => {
                const ev = evalWearDay(src('wearables').day!, days)
                return (
                  <MetricTable
                    rows={ev.rows}
                    extra={
                      <tr>
                        <td className="py-2 pr-3 text-gray-700">Kroky</td>
                        <td className={cx('py-2 pr-3 font-semibold tabular-nums', LEVEL_TEXT[ev.stepsLevel])}>
                          {num(ev.steps)}
                          {ev.change !== null && (
                            <span className="ml-1.5 text-xs font-medium">
                              ({signed(ev.change)} % za 7 dní)
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">pokles do {-STEPS_DROP_YELLOW} % proti předchozím 14 dnům</td>
                        <td className="py-2">
                          <LevelDot level={ev.stepsLevel} />
                        </td>
                      </tr>
                    }
                  />
                )
              })()
            ) : (
              <Empty>Pacient nemá připojené zařízení.</Empty>
            )}
          </Section>
        </div>
      </div>
    </Modal>
  )
}

function Section({ s, children }: { s: SourceState; children: ReactNode }) {
  const m = sourceMeta(s.source)
  const pill =
    s.state === 'missing'
      ? { text: 'Bez dat', cls: 'bg-gray-50 text-gray-600 ring-gray-500/20' }
      : s.state === 'stale'
        ? { text: 'Neaktuální', cls: 'bg-red-50 text-red-600 ring-red-600/20' }
        : s.level === 'red'
          ? { text: 'Mimo mez', cls: 'bg-red-50 text-red-600 ring-red-600/20' }
          : s.level === 'yellow'
            ? { text: 'K posouzení', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' }
            : { text: 'V pořádku', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' }
  return (
    <section className="rounded-xl ring-1 ring-gray-950/10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-950">
          {m.icon} {m.label}
        </h3>
        <span className={cx('rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', pill.cls)}>{pill.text}</span>
        {s.date && (
          <span className={cx('ml-auto text-xs', s.state === 'stale' ? 'text-red-500' : 'text-gray-500')}>
            {fullDate(s.date)} · {agoText(s.date)}
          </span>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

const Empty = ({ children }: { children: ReactNode }) => <p className="py-2 text-sm text-gray-500">{children}</p>

const LevelDot = ({ level }: { level: Level }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-500">
    <span className={cx('h-2 w-2 rounded-full', LEVEL_DOT[level])} />
    {LEVEL_LABEL[level]}
  </span>
)

/** Tabulka hodnot s mezemi; hodnoty mimo meze barevně. */
function MetricTable({ rows, extra }: { rows: MetricRow[]; extra?: ReactNode }) {
  return (
    <table className="w-full text-start text-sm">
      <thead>
        <tr className="text-xs text-gray-500">
          <th className="pb-1.5 pr-3 text-start font-medium">Parametr</th>
          <th className="pb-1.5 pr-3 text-start font-medium">Hodnota</th>
          <th className="pb-1.5 pr-3 text-start font-medium">Mez (v pořádku)</th>
          <th className="pb-1.5 text-start font-medium">Stav</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.metric.label}>
            <td className="py-2 pr-3 text-gray-700">{r.metric.label}</td>
            <td className={cx('whitespace-nowrap py-2 pr-3 font-semibold tabular-nums', LEVEL_TEXT[r.level])}>
              {r.value} <span className="text-xs font-normal text-gray-500">{r.metric.unit}</span>
            </td>
            <td className="py-2 pr-3 text-xs text-gray-500">{r.metric.limit.dir === 'min' ? '≥' : '<'} {num(r.metric.limit.yellow, r.metric.decimals)} · červená {r.metric.limit.dir === 'min' ? '<' : '≥'} {num(r.metric.limit.red, r.metric.decimals)}</td>
            <td className="py-2">
              <LevelDot level={r.level} />
            </td>
          </tr>
        ))}
        {extra}
      </tbody>
    </table>
  )
}

/** Výsledek dotazníku: skóre, pásmo a odpovědi za 3 a více bodů (žádost o kontrolu nahoře). */
function QuestionnaireResult({ q, onOpenReport }: { q: Questionnaire; onOpenReport: (q: Questionnaire) => void }) {
  const answers = q.answers!
  const band = bandOf(answers)
  const score = totalScore(answers)
  const notable = QUESTIONS.filter((x) => (severity(x.id, answers) ?? 0) >= 3).sort(
    (a, b) => (severity(b.id, answers) ?? 0) - (severity(a.id, answers) ?? 0),
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={cx('rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset', BAND_META[band].pill)}>
          {band === 'blue' ? `Vyžádal kontrolu: ${score} b` : `${BAND_META[band].label}: ${score} b`}
        </span>
        <span className="text-xs text-gray-500">{bandReason(answers)}</span>
        <button type="button" onClick={() => onOpenReport(q)} className="ml-auto text-sm font-medium text-primary-600 hover:underline">
          Klinický report z {shortDate(q.filledAt!)} →
        </button>
      </div>
      {notable.length > 0 ? (
        <ul className="divide-y divide-gray-100">
          {notable.map((x) => {
            const pts = answerPoints(x.id, answers[x.id])
            return (
              <li key={x.id} className="flex items-center gap-4 py-2">
                <span className="min-w-0 flex-1 text-sm text-gray-700">{x.text}</span>
                <span className={cx('max-w-[40%] text-right text-sm font-semibold', x.type === 'control' ? 'text-blue-600' : answerColor(pts))}>
                  {answerText(x.id, answers[x.id])}
                  {pts !== null && <span className="ml-1 text-xs font-normal text-gray-400">({pts} b)</span>}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Žádná odpověď za 3 a více bodů.</p>
      )}
    </div>
  )
}
