import { ClockIcon } from '@heroicons/react/24/outline'
import { useNavigate, useLocation } from 'react-router-dom'
import { BAND_META, bandOf, totalScore, type Status } from '../lib/scoring'
import { addDays, shortDate, todayIso } from '../lib/format'
import type { Questionnaire } from '../lib/types'
import { cx } from './ui'

export const statusOf = (q: Questionnaire): Status => (q.answers ? bandOf(q.answers) : q.scheduledFor > todayIso() ? 'future' : 'na')

/** Nejnovější dotazník, jehož termín už nastal (budoucí termíny se do stavu pacienta nepočítají). */
export const latestDue = (qs: Questionnaire[]) => qs.find((q) => statusOf(q) !== 'future')

/** Datum, podle kterého se dotazník řadí do skupiny: vyplnění, jinak termín. */
const groupDate = (q: Questionnaire) => (q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor)

type Group = { key: string; label: string; items: Questionnaire[] }

/**
 * Rozdělí dotazníky do skupin (zleva): Plánované → Poslední měsíc → starší po letech.
 * Uvnitř skupiny nejnovější vlevo.
 */
export function groupQuestionnaires(qs: Questionnaire[]): Group[] {
  const today = todayIso()
  const monthAgo = addDays(today, -30)
  const sorted = [...qs].sort((a, b) => groupDate(b).localeCompare(groupDate(a)))
  const groups: Group[] = []
  const push = (key: string, label: string, q: Questionnaire) => {
    let g = groups.find((x) => x.key === key)
    if (!g) groups.push((g = { key, label, items: [] }))
    g.items.push(q)
  }
  for (const q of sorted) {
    if (statusOf(q) === 'future') push('future', 'Plánované', q)
    else if (groupDate(q) >= monthAgo) push('month', 'Poslední měsíc', q)
    else push(groupDate(q).slice(0, 4), groupDate(q).slice(0, 4), q)
  }
  return groups
}

/**
 * Řada odznaků dotazníků rozdělená do skupin (Plánované, Poslední měsíc, roky); nejnovější vlevo.
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

  const badge = (q: Questionnaire) => {
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
  }

  return (
    <div className="flex items-stretch gap-2">
      {groupQuestionnaires(questionnaires).map((g) => (
        <div
          key={g.key}
          className={cx(
            'flex flex-col gap-1 rounded-md px-1.5 pb-1 pt-0.5',
            g.key === 'future' ? 'border border-dashed border-gray-200 bg-white' : g.key === 'month' ? 'bg-primary-50/60' : 'bg-gray-50',
          )}
        >
          <span className={cx('px-0.5 text-[9px] font-semibold uppercase tracking-wider', g.key === 'month' ? 'text-primary-600' : 'text-gray-400')}>
            {g.label}
          </span>
          <div className="flex gap-x-1.5">{g.items.map(badge)}</div>
        </div>
      ))}
    </div>
  )
}
