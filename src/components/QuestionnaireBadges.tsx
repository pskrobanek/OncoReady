import { ClockIcon } from '@heroicons/react/24/outline'
import { useNavigate, useLocation } from 'react-router-dom'
import { BAND_META, bandOf, totalScore, type Status } from '../lib/scoring'
import { shortDate, todayIso } from '../lib/format'
import type { Questionnaire } from '../lib/types'
import { cx } from './ui'

export const statusOf = (q: Questionnaire): Status => (q.answers ? bandOf(q.answers) : q.scheduledFor > todayIso() ? 'future' : 'na')

/** Nejnovější dotazník, jehož termín už nastal (budoucí termíny se do stavu pacienta nepočítají). */
export const latestDue = (qs: Questionnaire[]) => qs.find((q) => statusOf(q) !== 'future')

/** Datum, podle kterého se dotazník řadí do skupiny: vyplnění, jinak termín. */
const groupDate = (q: Questionnaire) => (q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor)

type Group = { key: string; label: string; items: Questionnaire[] }

/**
 * Rozdělí dotazníky do skupin (zleva): Plánované → Poslední vyplněný (vždy jen jeden) → ostatní po letech.
 * Uvnitř skupiny nejnovější vlevo.
 */
export function groupQuestionnaires(qs: Questionnaire[]): Group[] {
  const sorted = [...qs].sort((a, b) => groupDate(b).localeCompare(groupDate(a)))
  // Poslední vyplněný = vyplněný dotazník s nejnovějším datem vyplnění
  const last = qs.filter((q) => q.filledAt).sort((a, b) => b.filledAt!.localeCompare(a.filledAt!))[0]
  const groups: Group[] = []
  const push = (key: string, label: string, q: Questionnaire) => {
    let g = groups.find((x) => x.key === key)
    if (!g) groups.push((g = { key, label, items: [] }))
    g.items.push(q)
  }
  for (const q of sorted) {
    if (statusOf(q) === 'future') push('future', 'Plánované', q)
    else if (q === last) push('last', 'Poslední vyplněný', q)
    else push(groupDate(q).slice(0, 4), groupDate(q).slice(0, 4), q)
  }
  return groups
}

/** Popisek skupiny podle klíče (future / last / rok). */
export const groupLabel = (key: string) => (key === 'future' ? 'Plánované' : key === 'last' ? 'Poslední vyplněný' : key)

/** Podklad buňky/skupiny podle klíče. */
export const groupTone = (key: string) => (key === 'future' ? 'bg-white' : key === 'last' ? 'bg-primary-50/60' : 'bg-gray-50/70')

/**
 * Odznaky dotazníků bez seskupení (nejnovější vlevo).
 * Vyplněný → číslo = skóre, barva = pásmo, pod ním datum vyplnění; klik otevře klinický report.
 * Nevyplněný po termínu → „N/A“ a pomlčka; budoucí termín → čárkovaný rámeček s hodinami a datem termínu.
 * Klik na nevyplněný otevře vyplnění dotazníku (např. v ambulanci).
 */
export function BadgeRow({
  items,
  onOpenReport,
  wrap = false,
  size = 'md',
}: {
  items: Questionnaire[]
  onOpenReport: (q: Questionnaire) => void
  wrap?: boolean
  /** sm = 28 × 28 px (Dashboard, nižší řádky), md = 32 × 32 px */
  size?: 'sm' | 'md'
}) {
  const sm = size === 'sm'
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div className={cx('flex gap-x-1.5', wrap && 'flex-wrap gap-y-1.5')}>
      {items.map((q) => {
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
            className={cx('group flex flex-col items-center gap-0.5', sm ? 'w-8' : 'w-9')}
          >
            <span
              className={cx(
                'flex items-center justify-center rounded font-semibold leading-none transition group-hover:opacity-80',
                sm ? 'h-7 w-7' : 'h-8 w-8',
                filled ? (sm ? 'text-[13px]' : 'text-sm') : sm ? 'text-[10px]' : 'text-[11px]',
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

/** Odznaky ve skupinách vedle sebe (pro místa s jedním řádkem, např. Monitorace pacienta). */
export function QuestionnaireBadges({
  questionnaires,
  onOpenReport,
}: {
  questionnaires: Questionnaire[]
  onOpenReport: (q: Questionnaire) => void
}) {
  return (
    <div className="flex items-stretch gap-2">
      {groupQuestionnaires(questionnaires).map((g) => (
        <div
          key={g.key}
          className={cx(
            'flex flex-col gap-1 rounded-md px-1.5 pb-1 pt-0.5',
            g.key === 'future' ? 'border border-dashed border-gray-200 bg-white' : groupTone(g.key),
          )}
        >
          <span className={cx('px-0.5 text-[9px] font-semibold uppercase tracking-wider', g.key === 'last' ? 'text-primary-600' : 'text-gray-400')}>
            {g.label}
          </span>
          <BadgeRow items={g.items} onOpenReport={onOpenReport} />
        </div>
      ))}
    </div>
  )
}
