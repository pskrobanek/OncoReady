import { useNavigate, useLocation } from 'react-router-dom'
import { BAND_META, bandOf, totalScore, type Status } from '../lib/scoring'
import { shortDate } from '../lib/format'
import type { Questionnaire } from '../lib/types'
import { cx } from './ui'

export const statusOf = (q: Questionnaire): Status => (q.answers ? bandOf(q.answers) : 'na')

/**
 * Řada odznaků dotazníků (nejnovější vlevo).
 * Vyplněný → číslo = skóre, barva = pásmo, pod ním datum vyplnění; klik otevře klinický report.
 * Nevyplněný → „n/a“ a pomlčka; klik otevře vyplnění dotazníku (např. v ambulanci).
 */
export function QuestionnaireBadges({
  questionnaires,
  onOpenReport,
}: {
  questionnaires: Questionnaire[]
  onOpenReport: (q: Questionnaire) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className="flex gap-x-1.5">
      {questionnaires.map((q) => {
        const status = statusOf(q)
        const filled = q.answers && q.filledAt
        return (
          <button
            key={q.id}
            type="button"
            title={filled ? 'Zobrazit klinický report' : `Nevyplněno (termín ${shortDate(q.scheduledFor)}) – vyplnit dotazník`}
            onClick={() => (filled ? onOpenReport(q) : navigate(`/vyplnit/${q.id}`, { state: { from: location.pathname } }))}
            className="group flex min-w-[2.1rem] flex-col items-center gap-0.5"
          >
            <span
              className={cx(
                'flex h-7 min-w-[1.9rem] items-center justify-center rounded-md px-1.5 text-sm font-semibold transition group-hover:opacity-80',
                BAND_META[status].badge,
              )}
            >
              {filled ? totalScore(q.answers!) : 'n/a'}
            </span>
            <span className="text-[10px] leading-3 text-gray-400">{filled ? shortDate(q.filledAt!) : '-'}</span>
          </button>
        )
      })}
    </div>
  )
}
