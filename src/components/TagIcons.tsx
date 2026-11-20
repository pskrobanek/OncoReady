// Ikony příznaků: výběr v šabloně (box Příznaky) a zobrazení na Dashboardu (tlačítka, boxy, filtr, zobrazení).
import {
  ArrowRightCircleIcon,
  BeakerIcon,
  BellIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FlagIcon,
  HeartIcon,
  HomeIcon,
  PhoneIcon,
  ShieldExclamationIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import type { MonitoringProgram, NextStepAction } from '../lib/types'
import { cx } from './ui'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** Nabídka ikon (klíč se ukládá k příznaku). */
export const TAG_ICONS: { key: string; label: string; icon: Icon }[] = [
  { key: 'tag', label: 'Štítek', icon: TagIcon },
  { key: 'clock', label: 'Čekání', icon: ClockIcon },
  { key: 'arrow', label: 'Pokračovat', icon: ArrowRightCircleIcon },
  { key: 'check', label: 'Hotovo', icon: CheckCircleIcon },
  { key: 'cross', label: 'Zrušeno', icon: XCircleIcon },
  { key: 'warning', label: 'Pozor', icon: ExclamationTriangleIcon },
  { key: 'shield', label: 'Riziko', icon: ShieldExclamationIcon },
  { key: 'flag', label: 'Vlajka', icon: FlagIcon },
  { key: 'bell', label: 'Upozornění', icon: BellIcon },
  { key: 'star', label: 'Hvězda', icon: StarIcon },
  { key: 'user', label: 'Lékař / osoba', icon: UserIcon },
  { key: 'phone', label: 'Telefonát', icon: PhoneIcon },
  { key: 'chat', label: 'Konzultace', icon: ChatBubbleLeftIcon },
  { key: 'beaker', label: 'Laboratoř', icon: BeakerIcon },
  { key: 'heart', label: 'Zdraví', icon: HeartIcon },
  { key: 'eye', label: 'Sledovat', icon: EyeIcon },
  { key: 'calendar', label: 'Termín', icon: CalendarIcon },
  { key: 'document', label: 'Dokument', icon: DocumentTextIcon },
  { key: 'home', label: 'Domů', icon: HomeIcon },
  { key: 'truck', label: 'Doprava', icon: TruckIcon },
]

/** Ikona příznaku; příznaky bez zvolené ikony: čekárna = hodiny, „K aplikaci“ = šipka, ostatní štítek. */
export const tagIconKey = (a: Pick<NextStepAction, 'icon' | 'waiting' | 'label'>) =>
  a.icon ?? (a.waiting ? 'clock' : a.label.trim().toLowerCase() === 'k aplikaci' ? 'arrow' : 'tag')

/** Ikona příznaku podle názvu (první šablona, která příznak s tímto názvem má). */
export const tagIconByLabel = (programs: MonitoringProgram[], label: string) => {
  const a = programs.flatMap((p) => p.actions).find((x) => x.label === label)
  return a ? tagIconKey(a) : 'tag'
}

export function TagIconView({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const I = (TAG_ICONS.find((x) => x.key === name) ?? TAG_ICONS[0]).icon
  return <I className={cx('shrink-0', className)} aria-hidden />
}

/** Tlačítko s aktuální ikonou; klik otevře mřížku ikon. */
export function TagIconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const current = TAG_ICONS.find((x) => x.key === value) ?? TAG_ICONS[0]
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        title={`Ikona: ${current.label} – změnit`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm ring-1 transition hover:bg-gray-50',
          open ? 'ring-2 ring-primary-600' : 'ring-gray-950/10',
        )}
      >
        <TagIconView name={current.key} className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-[15.5rem] rounded-lg bg-white p-2 shadow-lg ring-1 ring-gray-950/10">
          <div className="grid grid-cols-5 gap-1">
            {TAG_ICONS.map((x) => (
              <button
                key={x.key}
                type="button"
                title={x.label}
                onClick={() => {
                  onChange(x.key)
                  setOpen(false)
                }}
                className={cx(
                  'flex h-10 w-11 items-center justify-center rounded-md transition',
                  x.key === current.key ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-600' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <x.icon className="h-5 w-5" />
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-gray-500">{current.label}</p>
        </div>
      )}
    </div>
  )
}
