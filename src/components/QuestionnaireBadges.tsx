import { ClockIcon } from '@heroicons/react/24/outline'
import { useNavigate, useLocation } from 'react-router-dom'
import { BAND_META, bandOf, totalScore, type Status } from '../lib/scoring'
import { shortDate, todayIso } from '../lib/format'
import type { Questionnaire } from '../lib/types'
import { cx } from './ui'

export const statusOf = (q: Questionnaire): Status => (q.answers ? bandOf(q.answers) : q.scheduledFor > todayIso() ? 'future' : 'na')

/** Nejnovější dotazník, jehož termín už nastal (budoucí termíny se do stavu pacienta nepočítají). */
export const latestDue = (qs: Questionnaire[]) => qs.find((q) => statusOf(q) !== 'future')

/**
 * Řada odznaků dotazníků (nejnovější vlevo).
 * Vyplněný → číslo = skóre, barva = pásmo, pod ním datum vyplnění; klik otevře klinický report.
 * Nevyplněný po termínu → „N/A“ a pomlčka; budoucí termín → čárkovaný rámeček s hodinami a datem termínu.
 * Klik na nevyplněný otevře vyplnění dotazníku (např. v ambulanci).
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
            title={
              filled
                ? 'Zobrazit klinický report'
                : status === 'future'
                  ? `Plánováno na ${shortDate(q.scheduledFor)} – lze vyplnit předem`
                  : `Nevyplněno (termín ${shortDate(q.scheduledFor)}) – vyplnit dotazník`
            }
            onClick={() => (filled ? onOpenReport(q) : navigate(`/vyplnit/${q.id}`, { state: { from: location.pathname } }))}
            className="group flex w-9 flex-col items-center gap-0.5"
          >
            <span
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded font-semibold leading-none transition group-hover:opacity-80',
                filled ? 'text-sm' : 'text-[11px]',
                BAND_META[status].badge,
              )}
            >
              {filled ? totalScore(q.answers!) : status === 'future' ? <ClockIcon className="h-4 w-4" /> : 'N/A'}
            </span>
            <span className={cx('text-[10px] leading-3', status === 'future' ? 'italic text-gray-300' : 'text-gray-400')}>
              {filled ? shortDate(q.filledAt!) : status === 'future' ? shortDate(q.scheduledFor) : '-'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
