import { ChartBarIcon, HomeIcon, RectangleStackIcon } from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { cx, useToast } from './ui'

export function Logo() {
  // Přibližná rekonstrukce loga OncoReady (kruh ze tří modrých oblouků + text).
  return (
    <span className="flex items-center gap-1.5">
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <path d="M20 4a16 16 0 0 1 13.86 8" stroke="#1d4ed8" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M35.5 18A16 16 0 0 1 24 35.5" stroke="#3b82f6" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M16 35.5A16 16 0 0 1 6.1 12" stroke="#2563eb" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-sm font-bold tracking-tight">
        <span className="text-gray-950">Onco</span>
        <span className="text-primary-600">Ready</span>
      </span>
    </span>
  )
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/kartoteka', label: 'Kartotéka', icon: RectangleStackIcon, end: false },
  { to: '/statistiky', label: 'Statistiky', icon: ChartBarIcon, end: false },
]

function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { resetDemo } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-950 text-sm font-medium text-white"
        title="Uživatelské menu"
      >
        T
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 divide-y divide-gray-100 rounded-lg bg-white shadow-lg ring-1 ring-gray-950/5">
          <div className="px-3 py-2 text-sm font-medium text-gray-950">Testovací uživatel</div>
          <div className="p-1">
            <button
              className="w-full rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                resetDemo()
                setOpen(false)
                navigate('/')
                toast('Demo data byla obnovena')
              }}
            >
              Obnovit demo data
            </button>
            <button className="w-full rounded-md px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-white px-4 shadow-sm ring-1 ring-gray-950/5 md:px-6">
        <NavLink to="/">
          <Logo />
        </NavLink>
        <UserMenu />
      </header>
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 px-3 py-8 lg:block">
          <nav className="flex flex-col gap-y-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-x-3 rounded-lg px-2 py-2 text-sm font-medium outline-none transition duration-75',
                    isActive ? 'bg-gray-100 text-primary-600' : 'text-gray-700 hover:bg-gray-100',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cx('h-6 w-6', isActive ? 'text-primary-600' : 'text-gray-400')} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>
        {/* Mobilní navigace */}
        <main className="min-w-0 flex-1 px-4 py-8 md:px-6 lg:px-8">
          <nav className="mb-6 flex gap-2 lg:hidden">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx('rounded-lg px-3 py-1.5 text-sm font-medium', isActive ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-950/5' : 'text-gray-600')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
