// Základní UI prvky ve stylu Filament (Laravel admin), který používá produkční aplikace.
import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ---------- Tlačítka ----------
type BtnColor = 'primary' | 'danger' | 'gray'
export function Button({
  color = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { color?: BtnColor }) {
  const colors: Record<BtnColor, string> = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500 focus-visible:ring-primary-500/50 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500/50 shadow-sm',
    gray: 'bg-white text-gray-950 ring-1 ring-gray-950/10 hover:bg-gray-50 shadow-sm',
  }
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold outline-none transition duration-75 focus-visible:ring-2 disabled:opacity-70',
        colors[color],
        className,
      )}
    />
  )
}

/** Odkazová akce v tabulce (ikona + text), např. „Upravit“. */
export function LinkAction({
  icon: Icon,
  children,
  color = 'primary',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: ReactNode
  color?: 'primary' | 'danger'
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1 text-sm font-semibold hover:underline',
        color === 'primary' ? 'text-primary-600' : 'text-red-600',
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

// ---------- Karta / sekce ----------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5', className)}>{children}</div>
}

// ---------- Hlavička stránky ----------
export function PageHeader({
  title,
  breadcrumbs,
  actions,
}: {
  title: string
  breadcrumbs?: { label: string; to?: string }[]
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumbs && (
          <nav className="mb-2 flex items-center gap-x-3 text-sm font-medium text-gray-500">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-x-3">
                {i > 0 && <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
                {b.to ? (
                  <Link to={b.to} className="hover:text-gray-700">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </header>
  )
}

// ---------- Formulářové prvky ----------
export function Field({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string
  required?: boolean
  helper?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-y-2">
      <label className="text-sm font-medium leading-6 text-gray-950">
        {label}
        {required && <sup className="font-medium text-red-600">*</sup>}
      </label>
      {children}
      {helper && <p className="text-sm text-gray-500">{helper}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function TextInput({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={cx(
        'block w-full rounded-lg border-none bg-white px-3 py-1.5 text-base text-gray-950 shadow-sm outline-none ring-1 transition duration-75 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6',
        invalid ? 'ring-red-600' : 'ring-gray-950/10',
        className,
      )}
    />
  )
}

export function SearchInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div
      className={cx(
        'flex items-center gap-2 rounded-lg bg-white px-3 shadow-sm ring-1 ring-gray-950/10 focus-within:ring-2 focus-within:ring-primary-600',
        className,
      )}
    >
      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Hledat"
        className="w-full border-none bg-transparent py-1.5 text-sm leading-6 text-gray-950 outline-none placeholder:text-gray-400"
      />
    </div>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-x-3 text-sm font-medium text-gray-950">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer appearance-none rounded border-none bg-white shadow-sm ring-1 ring-gray-950/10 checked:bg-primary-600 checked:ring-0 checked:[background-image:url('data:image/svg+xml,%3csvg%20viewBox=%270%200%2016%2016%27%20fill=%27white%27%20xmlns=%27http://www.w3.org/2000/svg%27%3e%3cpath%20d=%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')]"
      />
      {label}
    </label>
  )
}

export function Radio({ checked, onChange, label, name }: { checked: boolean; onChange: () => void; label: ReactNode; name: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-x-3 text-sm font-medium text-gray-950">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer appearance-none rounded-full bg-white shadow-sm ring-1 ring-gray-950/10 checked:bg-primary-600 checked:ring-0 checked:[background-image:url('data:image/svg+xml,%3csvg%20viewBox=%270%200%2016%2016%27%20fill=%27white%27%20xmlns=%27http://www.w3.org/2000/svg%27%3e%3ccircle%20cx=%278%27%20cy=%278%27%20r=%273%27/%3e%3c/svg%3e')]"
      />
      {label}
    </label>
  )
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-primary-600' : 'bg-gray-200',
      )}
    >
      <span
        className={cx(
          'pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow ring-0 transition duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

/** „na stránku | 10 ▾“ */
export function PerPage({ value, onChange, options = [5, 10, 25, 50, 500] }: { value: number; onChange: (v: number) => void; options?: number[] }) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-white text-sm shadow-sm ring-1 ring-gray-950/10">
      <span className="flex items-center border-r border-gray-950/10 px-3 text-gray-500">na stránku</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="appearance-none bg-transparent py-1.5 pl-3 pr-8 leading-6 text-gray-950 outline-none"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  )
}

export const ActiveIcon = ({ active }: { active: boolean }) =>
  active ? (
    <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-red-600">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" strokeLinecap="round" />
    </svg>
  )

/** Výsledkový text „Zobrazuji 1 výsledek“ / „Zobrazuji 1 až 10 z 12 výsledků“ */
export function resultsLabel(from: number, to: number, total: number) {
  if (total === 0) return 'Žádné výsledky'
  if (total === 1) return 'Zobrazuji 1 výsledek'
  if (from === 1 && to === total) return `Zobrazuji ${total} ${total < 5 ? 'výsledky' : 'výsledků'}`
  return `Zobrazuji ${from} až ${to} z ${total} výsledků`
}

// ---------- Modal ----------
export function Modal({
  open,
  onClose,
  width = 'max-w-3xl',
  children,
}: {
  open: boolean
  onClose: () => void
  width?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        className={cx('relative my-8 flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-950/5', width)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500" title="Zavřít">
      <XMarkIcon className="h-6 w-6" />
    </button>
  )
}

/** Potvrzovací dialog ve stylu Filament (Smazat …). */
export function ConfirmModal({
  open,
  title,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} width="max-w-sm">
      <div className="flex flex-col items-center px-6 pb-2 pt-6 text-center">
        <div className="mb-5 rounded-full bg-red-100 p-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-red-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">Opravdu to chcete udělat?</p>
      </div>
      <div className="grid grid-cols-2 gap-3 px-6 py-6">
        <Button color="gray" onClick={onCancel}>
          Zrušit
        </Button>
        <Button color="danger" onClick={onConfirm}>
          Potvrdit
        </Button>
      </div>
    </Modal>
  )
}

// ---------- Notifikace (toast) ----------
type Toast = { id: number; title: string }
const ToastCtx = createContext<(title: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((title: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, title }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-3">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-gray-950/5">
            <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
            <p className="flex-1 pt-0.5 text-sm font-medium text-gray-950">{t.title}</p>
            <button className="text-gray-400 hover:text-gray-500" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
