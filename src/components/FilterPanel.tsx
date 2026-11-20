// Panel s filtry vpravo vedle seznamu (Kartotéka, Šablony) – stejný vzhled jako záložka Filtr na Dashboardu.
import { FunnelIcon } from '@heroicons/react/24/outline'
import type { ComponentType, ReactNode } from 'react'
import { cx } from './ui'

/** Bílá karta vpravo (na menší obrazovce pod seznamem): nadpis „Filtr“, vpravo „Obnovit výchozí“ při změně. */
export function FilterPanel({ onReset, children }: { onReset?: () => void; children: ReactNode }) {
  return (
    <aside className="flex w-full shrink-0 flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 xl:w-72">
      <div className="flex items-center justify-between border-b border-gray-200 px-6">
        <span className="-mb-px flex items-center gap-1 border-b-2 border-primary-600 py-3.5 text-sm font-semibold text-primary-600">
          <FunnelIcon className="h-4 w-4" />
          Filtr
          {onReset && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" title="Změněno oproti výchozímu" />}
        </span>
        {onReset && (
          <button type="button" onClick={onReset} className="text-sm font-medium text-primary-600 hover:underline">
            Obnovit výchozí
          </button>
        )}
      </div>
      <div className="flex flex-col px-6 pb-6">{children}</div>
    </aside>
  )
}

export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-medium text-gray-950">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

/** Přidá / odebere položku ze seznamu (zaškrtávací filtry; prázdný seznam = nefiltruje). */
export const toggle = <T,>(list: T[], item: T, on: boolean) => (on ? [...list, item] : list.filter((x) => x !== item))

/** Panel se záložkami (Filtr / Řazení / Zobrazení) – stejný vzhled jako na Dashboardu. */
export function ToolPanel<K extends string>({
  tabs,
  active,
  onTab,
  children,
  footer,
}: {
  tabs: { key: K; label: string; icon: ComponentType<{ className?: string }>; changed?: boolean }[]
  active: K
  onTab: (k: K) => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 xl:w-72">
      <div className="flex border-b border-gray-200 px-3" role="tablist">
        {tabs.map(({ key, label, icon: Icon, changed }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => onTab(key)}
            className={cx(
              '-mb-px flex items-center gap-1 border-b-2 px-2 py-3.5 text-sm font-semibold transition',
              active === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {changed && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" title="Změněno oproti výchozímu" />}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col px-6 pb-4">
        {children}
        {footer && <div className="mt-8 border-t border-gray-200 pt-4">{footer}</div>}
      </div>
    </aside>
  )
}
