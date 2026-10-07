// Sdílené prvky pro monitorace (programy): odznaky klasifikace, diagnóz a pásem.
import { classificationMeta, diagnosisName, MAX_SCORE } from '../data/programs'
import type { Classification, MonitoringProgram, ScoreRange } from '../lib/types'
import { cx } from './ui'

export function ClassificationBadge({ value }: { value: Classification }) {
  const m = classificationMeta(value)
  return (
    <span title={m.hint} className={cx('inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', m.badge)}>
      {m.label}
    </span>
  )
}

export function TagBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-950/10">
      {children}
    </span>
  )
}

export function DiagnosisChips({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((c) => (
        <span key={c} title={diagnosisName(c)} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-xs text-gray-700 ring-1 ring-inset ring-gray-950/10">
          {c}
        </span>
      ))}
    </div>
  )
}

export const rangeLabel = (r: ScoreRange) => (r.max === null ? `${r.min}+` : `${r.min}–${r.max}`)

/** Tři pásma vedle sebe: zelené 0–7 · žluté 8–14 · červené 15+ */
export function BandRanges({ bands }: { bands: MonitoringProgram['bands'] }) {
  const items = [
    { r: bands.green, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', label: 'Zelené' },
    { r: bands.yellow, cls: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-400', label: 'Žluté' },
    { r: bands.red, cls: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-600', label: 'Červené' },
  ]
  return (
    <div className="flex gap-1">
      {items.map((i) => (
        <span key={i.label} title={`${i.label} pásmo: ${rangeLabel(i.r)} b`} className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ring-1 ring-inset', i.cls)}>
          <span className={cx('h-1.5 w-1.5 rounded-full', i.dot)} />
          {rangeLabel(i.r)}
        </span>
      ))}
    </div>
  )
}

/** Vodorovný pruh 0–MAX_SCORE rozdělený na pásma (náhled ve formuláři). */
export function BandBar({ bands }: { bands: MonitoringProgram['bands'] }) {
  const pct = (n: number) => `${(Math.min(Math.max(n, 0), MAX_SCORE + 1) / (MAX_SCORE + 1)) * 100}%`
  const gEnd = (bands.green.max ?? MAX_SCORE) + 1
  const yEnd = (bands.yellow.max ?? MAX_SCORE) + 1
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-emerald-500" style={{ width: pct(gEnd) }} />
        <div className="bg-amber-400" style={{ width: `calc(${pct(yEnd)} - ${pct(gEnd)})` }} />
        <div className="flex-1 bg-red-600" />
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-gray-500">
        <span>0 b</span>
        <span>{MAX_SCORE} b</span>
      </div>
    </div>
  )
}
