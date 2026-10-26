// Ikona ⓘ s legendou: dlaždice dotazníku, laboratoře a wearables (otevírá se kliknutím i najetím myší).
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { ClockIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BAND_META, type Status } from '../lib/scoring'
import type { SourceKey } from '../lib/readiness'
import { OVERALL_META, SourceIcon } from './Readiness'
import { cx } from './ui'

const QUESTIONNAIRE: { status: Status; sample: ReactNode; text: string }[] = [
  { status: 'green', sample: '5', text: 'Zelené pásmo – bez výrazných potíží.' },
  { status: 'yellow', sample: '9', text: 'Žluté pásmo – alespoň jedna odpověď za 3 body.' },
  { status: 'red', sample: '14', text: 'Červené pásmo – alespoň jedna odpověď za 4 body.' },
  { status: 'blue', sample: '8', text: 'Pacient si vyžádal kontrolu.' },
  { status: 'na', sample: 'N/A', text: 'Termín proběhl, dotazník chybí. Kliknutím ho lze vyplnit.' },
  { status: 'future', sample: <ClockIcon className="h-4 w-4" />, text: 'Plánovaný termín (datum pod odznakem). Lze vyplnit předem.' },
]

const Box = ({ tone, children }: { tone: string; children: ReactNode }) => (
  <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded font-semibold leading-none', tone)}>{children}</span>
)
const Row = ({ sample, children }: { sample: ReactNode; children: ReactNode }) => (
  <span className="flex items-center gap-3">
    {sample}
    <span className="text-sm text-gray-700">{children}</span>
  </span>
)
const Heading = ({ icon, children }: { icon?: SourceKey; children: ReactNode }) => (
  <span className="mt-1 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400 first:mt-0 first:border-t-0 first:pt-0">
    {icon && <SourceIcon source={icon} className="h-4 w-4" />}
    {children}
  </span>
)

/** `dashboard` = celá legenda (dlaždice, laboratoř, wearables); jinak jen odznaky dotazníku (karta pacienta). */
export function BadgeLegend({ dashboard = false }: { dashboard?: boolean }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const open = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom, left: Math.max(8, Math.min(r.left, window.innerWidth - 400)) })
  }
  useEffect(() => {
    if (!pos) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setPos(null)
    const hide = () => setPos(null)
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', hide, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', hide, true)
    }
  }, [pos])

  return (
    <span ref={ref} className="relative" onMouseEnter={open} onMouseLeave={() => setPos(null)}>
      <button type="button" onClick={() => (pos ? setPos(null) : open())} className="flex text-gray-400 hover:text-gray-600" aria-label="Legenda">
        <InformationCircleIcon className="h-5 w-5" />
      </button>
      {/* Pevná pozice – legenda nesmí být oříznutá posuvnou tabulkou */}
      {pos && (
        <span className="fixed z-30 block w-96 pt-2 text-left font-normal" style={{ top: pos.top, left: pos.left }}>
          <span className="block max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-lg ring-1 ring-gray-950/5">
            <span className="mb-3 block text-sm font-semibold text-gray-950">Legenda</span>
            <span className="flex flex-col gap-2.5 whitespace-normal">
              {dashboard && (
                <span className="text-sm text-gray-700">
                  <span className="font-medium text-gray-950">Čtverec</span> ve sloupci Aktuální = poslední data zdroje,{' '}
                  <span className="font-medium text-gray-950">úzké dlaždice</span> = minulé týdny seskupené po měsících. Datum a hodnoty jsou v
                  tooltipu.
                </span>
              )}
              {dashboard && <Heading icon="questionnaire">Dotazník</Heading>}
              {/* Plánované dotazníky se na Dashboardu nezobrazují */}
              {QUESTIONNAIRE.filter((i) => !dashboard || i.status !== 'future').map((i) => (
                <Row key={i.status} sample={<Box tone={cx(i.status === 'na' ? 'text-[11px]' : 'text-sm', BAND_META[i.status].badge)}>{i.sample}</Box>}>
                  {i.text}
                </Row>
              ))}

              {dashboard && (
                <>
                  <Heading icon="lab">Laboratoř a wearables</Heading>
                  <Row sample={<Box tone={OVERALL_META.green.box}><CheckIcon className="h-5 w-5" /></Box>}>V mezích.</Row>
                  <Row sample={<Box tone={OVERALL_META.yellow.box}>!</Box>}>Hraniční hodnota (žlutá mez).</Row>
                  <Row
                    sample={
                      <Box tone={OVERALL_META.red.box}>
                        <span className="flex flex-col items-center gap-px">
                          <span className="text-[8px] font-medium tracking-wide opacity-90">NEU</span>
                          <span className="text-[11px]">1,2</span>
                        </span>
                      </Box>
                    }
                  >
                    Laboratoř mimo mez – hodnota nejhoršího parametru (ve čtverci i jeho zkratka).
                  </Row>
                  <Row sample={<Box tone={OVERALL_META.red.box}><XMarkIcon className="h-5 w-5" /></Box>}>Wearables mimo mez (např. horečka).</Row>
                  <Row sample={<Box tone="border border-dashed border-red-300 text-sm text-red-400">—</Box>}>
                    Aktuální: data jsou neaktuální (stáří v tooltipu), šedě = bez dat.
                  </Row>
                  <Row sample={<span className="flex h-8 w-8 shrink-0 items-center justify-center"><span className="h-8 w-5 rounded bg-gray-100" /></span>}>
                    Období bez dat na časové ose.
                  </Row>
                  <Row
                    sample={
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center gap-1">
                        <span className="h-8 w-[9px] bg-red-600" />
                        <span className="h-8 w-[9px] bg-gray-200" />
                      </span>
                    }
                  >
                    Barevný pruh vlevo u jména pacienta = nejhorší výsledek z aktuálních zdrojů (červená, modrá, žlutá, zelená; šedá = nic aktuálního).
                  </Row>
                </>
              )}
            </span>
            {!dashboard && <span className="mt-3 block text-xs text-gray-400">Pod odznakem je datum vyplnění.</span>}
          </span>
        </span>
      )}
    </span>
  )
}
