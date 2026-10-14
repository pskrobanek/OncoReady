// Ikona ⓘ s legendou barev odznaků dotazníků (otevírá se kliknutím i najetím myší).
import { ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import { BAND_META, type Status } from '../lib/scoring'
import { cx } from './ui'

const ITEMS: { status: Status; sample: React.ReactNode; text: string }[] = [
  { status: 'green', sample: '5', text: 'Zelené pásmo – bez výrazných potíží.' },
  { status: 'yellow', sample: '9', text: 'Žluté pásmo – alespoň jedna odpověď za 3 body.' },
  { status: 'red', sample: '14', text: 'Červené pásmo – alespoň jedna odpověď za 4 body.' },
  { status: 'blue', sample: '8', text: 'Pacient si vyžádal kontrolu.' },
  { status: 'na', sample: 'N/A', text: 'Termín proběhl, dotazník chybí. Kliknutím ho lze vyplnit.' },
  { status: 'future', sample: <ClockIcon className="h-4 w-4" />, text: 'Plánovaný termín (datum pod odznakem). Lze vyplnit předem.' },
]

export function BadgeLegend() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <span ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(!open)} className="flex text-gray-400 hover:text-gray-600" aria-label="Legenda barev">
        <InformationCircleIcon className="h-5 w-5" />
      </button>
      {open && (
        <span className="absolute left-0 top-full z-30 block w-80 pt-2 text-left font-normal">
          <span className="block rounded-xl bg-white p-4 shadow-lg ring-1 ring-gray-950/5">
            <span className="mb-3 block text-sm font-semibold text-gray-950">Legenda</span>
            <span className="flex flex-col gap-2.5 whitespace-normal">
              {ITEMS.map((i) => (
                <span key={i.status} className="flex items-center gap-3">
                  <span
                    className={cx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded font-semibold leading-none',
                      i.status === 'na' ? 'text-[11px]' : 'text-sm',
                      BAND_META[i.status].badge,
                    )}
                  >
                    {i.sample}
                  </span>
                  <span className="text-sm text-gray-700">{i.text}</span>
                </span>
              ))}
              <span className="mt-1 flex items-center gap-3 border-t border-gray-100 pt-3">
                <span className="h-8 w-8 shrink-0 shadow-[inset_3px_0_0_#dc2626]" />
                <span className="text-sm text-gray-700">Proužek u řádku = stav posledního dotazníku po termínu.</span>
              </span>
            </span>
            <span className="mt-3 block text-xs text-gray-400">Číslo = celkové skóre, pod odznakem datum vyplnění.</span>
          </span>
        </span>
      )}
    </span>
  )
}
