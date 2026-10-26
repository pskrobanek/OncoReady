// Prvky připravenosti k léčbě: barevný štítek souhrnu, ikony zdrojů a odznaky laboratoře a wearables.
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import type { ReactNode } from 'react'
import { shortDate, todayIso } from '../lib/format'
import { evalLab, sourceMeta, type Finding, type Overall, type SourceKey, type WearWeek } from '../lib/readiness'
import type { LabResult } from '../lib/types'
import { cx } from './ui'

export const OVERALL_META: Record<Overall, { label: string; text: string; box: string; stripe: string }> = {
  green: { label: 'Připraveno', text: 'text-emerald-700', box: 'bg-emerald-500 text-white', stripe: 'shadow-[inset_3px_0_0_#10b981]' },
  yellow: { label: 'K posouzení', text: 'text-amber-600', box: 'bg-amber-400 text-white', stripe: 'shadow-[inset_3px_0_0_#fbbf24]' },
  red: { label: 'Nepřipraveno', text: 'text-red-600', box: 'bg-red-600 text-white', stripe: 'shadow-[inset_3px_0_0_#dc2626]' },
  gray: { label: 'Neúplné', text: 'text-gray-500', box: 'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-300', stripe: 'shadow-[inset_3px_0_0_#d1d5db]' },
}

/** Barva textu nálezu podle úrovně. */
export const FINDING_TEXT: Record<Overall, string> = { red: 'text-red-600', yellow: 'text-amber-600', gray: 'text-gray-500', green: 'text-gray-600' }

/** Barevný štítek připravenosti (plné barvy jako odznaky): ✓ Připraveno, ! K posouzení, ✕ Nepřipraveno, ? Neúplné. */
export function ReadinessBadge({ level, size = 'sm' }: { level: Overall; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg'
  const icon = cx('shrink-0', lg ? 'h-5 w-5' : 'h-4 w-4')
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md font-semibold',
        lg ? 'px-3 py-1.5 text-base' : 'px-2 py-1 text-sm',
        OVERALL_META[level].box,
      )}
    >
      {level === 'green' ? (
        <CheckIcon className={icon} />
      ) : level === 'red' ? (
        <XMarkIcon className={icon} />
      ) : (
        <span className={cx(icon, 'text-center leading-none')}>{level === 'yellow' ? '!' : '?'}</span>
      )}
      {OVERALL_META[level].label}
    </span>
  )
}

/**
 * Minimalistické ikony zdrojů (obrys 1,5 px jako Heroicons): dotazník = podložka s řádky,
 * laboratoř = zkumavka, wearables = hodinky.
 */
export function SourceIcon({ source, className = 'h-4 w-4' }: { source: SourceKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={cx('shrink-0', className)} aria-hidden>
      {source === 'questionnaire' && (
        <>
          <rect x="5.25" y="4.5" width="13.5" height="16.5" rx="2" />
          <path d="M9 4.5v-.75A.75.75 0 0 1 9.75 3h4.5a.75.75 0 0 1 .75.75v.75M8.75 10h6.5M8.75 13.5h6.5M8.75 17h4" />
        </>
      )}
      {source === 'lab' && <path d="M7.5 3.75h9M9 3.75v13.5a3 3 0 0 0 6 0V3.75M9 12h6" />}
      {source === 'wearables' && (
        <>
          <rect x="6.75" y="7" width="10.5" height="10" rx="2.5" />
          <path d="M9 7l.6-3.25h4.8L15 7M9 17l.6 3.25h4.8L15 17M12 9.75V12l1.5 1" />
        </>
      )}
    </svg>
  )
}

/** Seznam nálezů (hraniční hodnoty a chybějící data) s ikonou zdroje. */
export function FindingList({ findings, className }: { findings: Finding[]; className?: string }) {
  if (!findings.length) return null
  return (
    <ul className={cx('flex flex-col gap-0.5 whitespace-normal text-xs leading-4', className)}>
      {findings.map((f, i) => (
        <li key={i} className={cx('flex gap-1', FINDING_TEXT[f.level])}>
          <span className="mt-px" title={sourceMeta(f.source).label}>
            <SourceIcon source={f.source} className="h-3.5 w-3.5" />
          </span>
          <span>{f.text}</span>
        </li>
      ))}
    </ul>
  )
}

const caption = (date: string) => (date === todayIso() ? 'dnes' : shortDate(date))

/** Čtvercový odznak 28 × 28 px s popiskem pod ním – stejné rozměry jako malý odznak dotazníku na Dashboardu. */
function Tile({ tone, title, children, below, belowClass }: { tone: string; title: string; children: ReactNode; below?: string; belowClass?: string }) {
  return (
    <span title={title} className="flex w-8 flex-col items-center gap-0.5">
      <span className={cx('flex h-7 w-7 items-center justify-center rounded font-semibold leading-none', tone)}>{children}</span>
      {below !== undefined && <span className={cx('text-[10px] leading-3', belowClass ?? 'text-gray-400')}>{below}</span>}
    </span>
  )
}

const ICON: Record<Overall, ReactNode> = {
  green: <CheckIcon className="h-4 w-4" />,
  yellow: <span className="text-sm">!</span>,
  red: <XMarkIcon className="h-4 w-4" />,
  gray: <span className="text-sm">?</span>,
}

const tooltip = (head: string, findings: Finding[]) => [head, ...findings.map((f) => `• ${f.text}`)].join('\n')

/**
 * Odznak laboratoře: zelená ✓, žlutá !, červená = hodnota nejhoršího parametru (nad ní jeho zkratka).
 */
export function LabTile({ lab, below }: { lab: LabResult; below?: string }) {
  const ev = evalLab(lab)
  return (
    <Tile tone={OVERALL_META[ev.level].box} title={tooltip(`Laboratoř ${shortDate(lab.date)}`, ev.findings.length ? ev.findings : [{ source: 'lab', level: 'green', text: 'Všechny parametry v mezích' }])} below={below ?? caption(lab.date)}>
      {ev.level === 'red' && ev.worst ? (
        <span className="flex flex-col items-center gap-px">
          <span className="text-[7px] font-medium tracking-wide opacity-90">{ev.worst.metric.short}</span>
          <span className="text-[10px] tabular-nums">{ev.worst.value}</span>
        </span>
      ) : (
        ICON[ev.level]
      )}
    </Tile>
  )
}

/** Odznak wearables za týden (nejhorší den) nebo za den. */
export function WearTile({ week, below }: { week: WearWeek; below?: string }) {
  return (
    <Tile
      tone={OVERALL_META[week.level].box}
      title={tooltip(`Wearables ${shortDate(week.day.date)}`, week.findings.length ? week.findings : [{ source: 'wearables', level: 'green', text: 'Bez odchylek' }])}
      below={below ?? caption(week.day.date)}
    >
      {ICON[week.level]}
    </Tile>
  )
}

/** Zdroj bez aktuálních dat: čárkovaný rámeček s pomlčkou, pod ním stáří posledních dat. */
export function MissingTile({ stale, below, title }: { stale: boolean; below: string; title: string }) {
  return (
    <Tile
      tone={cx('border border-dashed text-sm', stale ? 'border-red-300 text-red-400' : 'border-gray-300 text-gray-400')}
      title={title}
      below={below}
      belowClass={cx('whitespace-nowrap', stale ? 'text-red-500' : 'text-gray-400')}
    >
      —
    </Tile>
  )
}

/** Prázdné období v časové ose. */
export const EmptyCell = () => <span className="block min-w-8 text-center text-gray-300">·</span>
