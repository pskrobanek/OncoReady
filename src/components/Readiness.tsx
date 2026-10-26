// Prvky připravenosti k léčbě: barevný štítek souhrnu, ikony zdrojů a odznaky laboratoře a wearables.
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import type { ReactNode } from 'react'
import { shortDate } from '../lib/format'
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

export type TileShape = 'square' | 'narrow'
const SHAPE: Record<TileShape, string> = { square: 'h-9 w-9', narrow: 'h-9 w-[22px]' }

/**
 * Dlaždice bez popisku (datum a hodnoty jsou v tooltipu).
 * square = sloupec Aktuální (36 × 36 px), narrow = týden / položka na časové ose (22 × 36 px).
 */
function Tile({ tone, title, shape, onClick, children }: { tone: string; title: string; shape: TileShape; onClick?: () => void; children: ReactNode }) {
  const cls = cx('flex shrink-0 items-center justify-center rounded font-semibold leading-none', SHAPE[shape], tone)
  return onClick ? (
    <button type="button" title={title} onClick={onClick} className={cx(cls, 'transition hover:opacity-80')}>
      {children}
    </button>
  ) : (
    <span title={title} className={cls}>
      {children}
    </span>
  )
}

const icon = (level: Overall, shape: TileShape): ReactNode => {
  const i = shape === 'square' ? 'h-5 w-5' : 'h-3.5 w-3.5'
  return level === 'green' ? <CheckIcon className={i} /> : level === 'red' ? <XMarkIcon className={i} /> : <span className={shape === 'square' ? 'text-base' : 'text-xs'}>{level === 'yellow' ? '!' : '?'}</span>
}

const tooltip = (head: string, findings: Finding[]) => [head, ...findings.map((f) => `• ${f.text}`)].join('\n')

/**
 * Laboratoř: zelená ✓, žlutá !, červená = hodnota nejhoršího parametru
 * (ve čtverci nad ní i zkratka parametru, v úzké dlaždici jen hodnota – zkratka je v tooltipu).
 */
export function LabTile({ lab, shape, onClick, hint }: { lab: LabResult; shape: TileShape; onClick?: () => void; hint?: string }) {
  const ev = evalLab(lab)
  const head = `Laboratoř ${shortDate(lab.date)}${hint ? ` – ${hint}` : ''}`
  return (
    <Tile
      tone={OVERALL_META[ev.level].box}
      shape={shape}
      onClick={onClick}
      title={tooltip(head, ev.findings.length ? ev.findings : [{ source: 'lab', level: 'green', text: 'Všechny parametry v mezích' }])}
    >
      {ev.level === 'red' && ev.worst ? (
        shape === 'square' ? (
          <span className="flex flex-col items-center gap-px">
            <span className="text-[8px] font-medium tracking-wide opacity-90">{ev.worst.metric.short}</span>
            <span className="text-[11px] tabular-nums">{ev.worst.value}</span>
          </span>
        ) : (
          <span className="text-[9px] tabular-nums">{ev.worst.value}</span>
        )
      ) : (
        icon(ev.level, shape)
      )}
    </Tile>
  )
}

/** Wearables za týden (nejhorší den) nebo poslední den. */
export function WearTile({ week, shape, onClick, hint }: { week: WearWeek; shape: TileShape; onClick?: () => void; hint?: string }) {
  return (
    <Tile
      tone={OVERALL_META[week.level].box}
      shape={shape}
      onClick={onClick}
      title={tooltip(`Wearables ${shortDate(week.day.date)}${hint ? ` – ${hint}` : ''}`, week.findings.length ? week.findings : [{ source: 'wearables', level: 'green', text: 'Bez odchylek' }])}
    >
      {icon(week.level, shape)}
    </Tile>
  )
}

/** Zdroj bez aktuálních dat (sloupec Aktuální): čárkovaný čtverec s pomlčkou; stáří posledních dat je v tooltipu. */
export function MissingTile({ stale, title }: { stale: boolean; title: string }) {
  return (
    <Tile shape="square" title={title} tone={cx('border border-dashed text-sm', stale ? 'border-red-300 text-red-400' : 'border-gray-300 text-gray-400')}>
      —
    </Tile>
  )
}

/** Prázdné období na časové ose: světle šedá úzká dlaždice. */
export const EmptySlot = () => <span className="block h-9 w-[22px] rounded bg-gray-100" aria-hidden />
