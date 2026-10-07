// Vždy viditelný kalendář pro výběr období monitorace (Start → Konec).
// Klik = Start, další klik na pozdější den = Konec; Konec lze nastavit i tlačítky „+N týdnů“.
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { addDays, todayIso } from '../lib/format'
import { cx } from './ui'

const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec']
const WEEKDAYS = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne']
export const DURATION_WEEKS = [1, 2, 3, 4, 5, 6]

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

/** Dny měsíce včetně doplnění na celé týdny (pondělí první). */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // pondělí = 0
  const start = addDays(iso(year, month, 1), -offset)
  const days: string[] = []
  for (let i = 0; i < 42; i++) days.push(addDays(start, i))
  // Ořízne poslední řádek, pokud je celý v dalším měsíci
  return days[35].slice(5, 7) !== pad(month + 1) ? days.slice(0, 35) : days
}

export const weeksLabel = (n: number) => (n === 1 ? '1 týden' : n < 5 ? `${n} týdny` : `${n} týdnů`)

export function RangeCalendar({
  start,
  end,
  onChange,
}: {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}) {
  const initial = start || todayIso()
  const [view, setView] = useState({ y: Number(initial.slice(0, 4)), m: Number(initial.slice(5, 7)) - 1 })
  const [hover, setHover] = useState<string | null>(null)
  const today = todayIso()

  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const pick = (day: string) => {
    // Bez startu, s hotovým obdobím nebo klik před start → nový start
    if (!start || (start && end) || day < start) return onChange(day, '')
    onChange(start, day)
  }

  // Náhled období při najetí myší (když je vybraný jen start)
  const rangeEnd = end || (start && hover && hover > start ? hover : '')
  const inRange = (d: string) => !!start && !!rangeEnd && d > start && d < rangeEnd

  const second = new Date(view.y, view.m + 1, 1)
  const months = [
    { y: view.y, m: view.m },
    { y: second.getFullYear(), m: second.getMonth() },
  ]

  return (
    <div className="select-none">
      <div className="grid gap-6 sm:grid-cols-2">
        {months.map((mo, i) => (
          <div key={`${mo.y}-${mo.m}`}>
            <div className="mb-3 flex h-8 items-center justify-between">
              {i === 0 ? (
                <button type="button" onClick={() => shift(-1)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Předchozí měsíc">
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              ) : (
                <span className="w-8" />
              )}
              <div className="text-sm font-semibold capitalize text-gray-950">
                {MONTHS[mo.m]} {mo.y}
              </div>
              {i === 1 ? (
                <button type="button" onClick={() => shift(1)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Další měsíc">
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              ) : (
                <span className="w-8" />
              )}
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHover(null)}>
              {monthGrid(mo.y, mo.m).map((d) => {
                // Dny jiného měsíce se nezobrazují (jsou ve vedlejším kalendáři)
                if (Number(d.slice(5, 7)) - 1 !== mo.m) return <span key={d} className="h-9" />
                const isStart = d === start
                const isEnd = d === rangeEnd
                const between = inRange(d)
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => pick(d)}
                    onMouseEnter={() => setHover(d)}
                    className={cx(
                      'relative h-9 text-sm tabular-nums transition',
                      between && 'bg-primary-50',
                      isStart && rangeEnd && 'rounded-l-lg bg-primary-50',
                      isEnd && 'rounded-r-lg bg-primary-50',
                    )}
                  >
                    <span
                      className={cx(
                        'mx-auto flex h-9 w-9 items-center justify-center rounded-lg',
                        isStart || (isEnd && end)
                          ? 'bg-primary-600 font-semibold text-white'
                          : isEnd
                            ? 'text-primary-700 ring-1 ring-inset ring-primary-400'
                            : 'text-gray-800 hover:bg-gray-100',
                        d === today && !isStart && !isEnd && 'font-semibold text-primary-600 underline decoration-2 underline-offset-4',
                      )}
                    >
                      {Number(d.slice(8, 10))}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-4 text-xs">
        <button
          type="button"
          onClick={() => {
            const t = todayIso()
            setView({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 })
          }}
          className="font-medium text-primary-600 hover:underline"
        >
          Dnes
        </button>
        <span className="text-right text-gray-400">{!start ? 'Klikněte na den začátku' : !end ? 'Klikněte na den konce nebo zvolte délku' : 'Nový klik začne nový výběr'}</span>
      </div>
    </div>
  )
}
