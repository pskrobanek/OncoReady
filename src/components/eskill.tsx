// Prvky pro e-Skill: odznak úrovně, skóre a detail výsledku.
import { APPS, recommendApps, SURVEY, surveyLabel, TIER_META, tierFor } from '../data/eskill'
import { dateTime, tableName } from '../lib/format'
import { useStore } from '../lib/store'
import type { ESkillResult } from '../lib/types'
import { CloseButton, cx, Modal } from './ui'

export function TierBadge({ score }: { score: number }) {
  const m = TIER_META[tierFor(score)]
  return <span className={cx('inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', m.badge)}>{m.label}</span>
}

/** „72 / 100 · Vysoká“ */
export function ScorePill({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx('text-sm font-semibold tabular-nums', TIER_META[tierFor(score)].text)}>{score}</span>
      <TierBadge score={score} />
    </span>
  )
}

export function metricRows(m: ESkillResult['metrics']) {
  return [
    { label: 'Správné úkoly (napoprvé)', value: `${m.correctTasks} / ${m.totalTasks}` },
    { label: 'Rychlost', value: `${m.speed.toFixed(2)} s` },
    { label: 'Prům. vzdálenost chybných kliknutí', value: `${m.avgMisclickDistance.toFixed(2)} px` },
    { label: 'Čas psaní', value: m.typingDuration === null ? '—' : `${m.typingDuration.toFixed(2)} s` },
    { label: 'Přesnost psaní', value: m.typingAccuracy === null ? '—' : `${m.typingAccuracy} %` },
  ]
}

/** Detail výsledku pro personál: skóre, metriky testu, odpovědi dotazníku, doporučené aplikace. */
export function ESkillResultModal({ result, onClose }: { result: ESkillResult | null; onClose: () => void }) {
  const { db } = useStore()
  if (!result) return null
  const patient = db.patients.find((p) => p.id === result.patientId)
  const tier = tierFor(result.literacyScore)
  const apps = recommendApps(result.literacyScore)
  const filtered = APPS.length - apps.length

  return (
    <Modal open onClose={onClose} width="max-w-2xl">
      <div className="flex items-start gap-4 border-b border-gray-200 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-950">e-Skill — {patient ? tableName(patient) : 'Neznámý pacient'}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Vyplněno: {dateTime(result.takenAt)}
            {result.timedOut && ' · ukončeno časovým limitem'}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="overflow-y-auto px-6 py-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Digitální gramotnost</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={cx('text-4xl font-bold tabular-nums', TIER_META[tier].text)}>{result.literacyScore}</span>
              <span className="text-sm text-gray-400">/ 100</span>
              <TierBadge score={result.literacyScore} />
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Skóre testu (motorika)</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-950">
              {result.motorScore} <span className="text-sm font-normal text-gray-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-950">Test</h3>
            <dl className="divide-y divide-gray-100 rounded-lg bg-gray-50 px-4 ring-1 ring-gray-950/5">
              {metricRows(result.metrics).map((r) => (
                <div key={r.label} className="flex justify-between gap-4 py-2 text-sm">
                  <dt className="text-gray-600">{r.label}</dt>
                  <dd className="whitespace-nowrap font-medium tabular-nums text-gray-950">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-950">Dotazník</h3>
            <dl className="divide-y divide-gray-100 rounded-lg bg-gray-50 px-4 ring-1 ring-gray-950/5">
              {SURVEY.map((q) => {
                const v = result.survey[q.id]
                return (
                  <div key={q.id} className="py-2 text-sm">
                    <dt className="text-xs text-gray-500">{q.prompt.cs}</dt>
                    <dd className="font-medium text-gray-950">
                      {(Array.isArray(v) ? v : [v]).map((x) => surveyLabel(q.id, x)).join(', ')}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        </div>

        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-950">Doporučené aplikace</h3>
          {apps.length === 0 ? (
            <p className="text-sm text-gray-500">Žádná aplikace neodpovídá úrovni pacienta.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {apps.map((a) => (
                <li key={a.name} title={a.note || undefined} className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm ring-1 ring-gray-950/10">
                  <span className="font-medium text-gray-950">{a.name}</span>{' '}
                  <span className={cx('ml-1 rounded px-1.5 py-0.5 text-xs ring-1 ring-inset', TIER_META[a.tier].badge)}>{TIER_META[a.tier].label}</span>
                </li>
              ))}
            </ul>
          )}
          {filtered > 0 && (
            <p className="mt-2 text-xs text-gray-500">Náročnější aplikace ({filtered}) byly vyřazeny podle úrovně pacienta.</p>
          )}
        </section>

        <p className="mt-6 text-xs text-gray-400">
          Skóre = motorika × šíře technologií × L faktor × kvalita podpory − penalizace dostupnosti pomoci (0–100). Úroveň: ≤ 33 nízká, ≤ 66
          střední, jinak vysoká.
        </p>
      </div>
    </Modal>
  )
}
