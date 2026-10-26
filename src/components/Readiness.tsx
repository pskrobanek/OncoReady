// Prvky připravenosti k léčbě: barevný štítek souhrnu a odznaky laboratoře, wearables a souhrnu týdne.
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import type { ReactNode } from 'react'
import { shortDate, todayIso } from '../lib/format'
import { evalLab, sourceMeta, type Finding, type Overall, type WearWeek } from '../lib/readiness'
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

/** Seznam nálezů (hraniční hodnoty a chybějící data) s ikonou zdroje. */
export function FindingList({ findings, className }: { findings: Finding[]; className?: string }) {
  if (!findings.length) return null
  return (
    <ul className={cx('flex flex-col gap-0.5 whitespace-normal text-xs leading-4', className)}>
      {findings.map((f, i) => (
        <li key={i} className={cx('flex gap-1', FINDING_TEXT[f.level])}>
          <span className="shrink-0" title={sourceMeta(f.source).label}>
            {sourceMeta(f.source).icon}
          </span>
          <span>{f.text}</span>
        </li>
      ))}
    </ul>
  )
}

const caption = (date: string) => (date === todayIso() ? 'dnes' : shortDate(date))

/** Čtvercový odznak s popiskem pod ním – stejné rozměry jako odznak dotazníku. */
function Tile({ tone, title, children, below, belowClass }: { tone: string; title: string; children: ReactNode; below?: string; belowClass?: string }) {
  return (
    <span title={title} className="flex w-9 flex-col items-center gap-0.5">
      <span className={cx('flex h-8 w-8 items-center justify-center rounded font-semibold leading-none', tone)}>{children}</span>
      {below !== undefined && <span className={cx('text-[10px] leading-3', belowClass ?? 'text-gray-400')}>{below}</span>}
    </span>
  )
}

const ICON: Record<Overall, ReactNode> = {
  green: <CheckIcon className="h-5 w-5" />,
  yellow: <span className="text-base">!</span>,
  red: <XMarkIcon className="h-5 w-5" />,
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
          <span className="text-[8px] font-medium tracking-wide opacity-90">{ev.worst.metric.short}</span>
          <span className="text-[11px] tabular-nums">{ev.worst.value}</span>
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

/** Výsledný stav týdne ze všech zdrojů (kondenzovaný řádek). */
export function CombinedTile({ level, title }: { level: Overall; title: string }) {
  return (
    <Tile tone={OVERALL_META[level].box} title={title}>
      {ICON[level]}
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

/** Prázdný týden v časové ose. */
export const EmptyWeek = () => <span className="block min-w-[2.25rem] text-center text-gray-300">·</span>
