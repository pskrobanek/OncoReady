import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, PageHeader, PerPage, resultsLabel, SearchInput } from '../components/ui'
import { fullDate, tableName } from '../lib/format'
import { planStatus, sortPatients, useStore } from '../lib/store'
import type { DB } from '../lib/types'

export function Kartoteka() {
  const { db } = useStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sortPatients(db.patients).filter(
      (p) => !term || tableName(p).toLowerCase().includes(term) || p.rodneCislo.includes(term),
    )
  }, [db.patients, search])

  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(page, pages)
  const from = (current - 1) * perPage
  const visible = rows.slice(from, from + perPage)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Kartotéka"
        breadcrumbs={[{ label: 'Kartotéka', to: '/kartoteka' }, { label: 'Přehled' }]}
        actions={<Button onClick={() => navigate('/kartoteka/vytvorit')}>Vytvořit</Button>}
      />
      <Card className="overflow-hidden">
        <div className="flex justify-end px-4 py-3 sm:px-6">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} className="w-full sm:max-w-xs" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
            <thead className="whitespace-nowrap bg-gray-50/50">
              <tr>
                <th className="px-6 py-3.5 text-start text-sm font-semibold text-gray-950">Celé jméno</th>
                <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Rodné číslo</th>
                <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Aktivní plán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visible.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/kartoteka/${p.id}/upravit`)}
                >
                  <td className="px-6 py-4 text-sm text-gray-950">
                    <Link to={`/kartoteka/${p.id}/upravit`} onClick={(e) => e.stopPropagation()}>
                      {tableName(p)} →
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-950">{p.rodneCislo}</td>
                  <td className="px-3 py-3">
                    <PlanCell db={db} patientId={p.id} />
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                    Nenalezeny žádné záznamy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-3">
          <span className="text-sm font-medium text-gray-700">
            {resultsLabel(from + 1, Math.min(from + perPage, rows.length), rows.length)}
          </span>
          <PerPage value={perPage} onChange={(v) => { setPerPage(v); setPage(1) }} />
          <div className="flex overflow-hidden rounded-lg text-sm shadow-sm ring-1 ring-gray-950/10">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`min-w-9 px-3 py-1.5 ${n === current ? 'bg-gray-50 font-semibold text-primary-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

/** Sloupec „Aktivní plán“: stav monitorace pacienta k dnešku. */
function PlanCell({ db, patientId }: { db: DB; patientId: string }) {
  const st = planStatus(db, patientId)
  if (st.kind === 'none') return <span className="text-sm text-gray-400">Bez plánu</span>
  const m = st.monitoring
  const program = db.programs.find((p) => p.id === m.programId)?.name ?? 'Monitorace'
  const pill = {
    active: { label: 'Aktivní', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', when: `do ${fullDate(m.end)}` },
    planned: { label: 'Naplánováno', cls: 'bg-primary-50 text-primary-700 ring-primary-600/20', dot: 'bg-primary-500', when: `od ${fullDate(m.start)}` },
    ended: { label: 'Ukončeno', cls: 'bg-gray-50 text-gray-600 ring-gray-500/20', dot: 'bg-gray-400', when: fullDate(m.end) },
  }[st.kind]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
        {pill.label}
      </span>
      <span className={`text-sm ${st.kind === 'ended' ? 'text-gray-400' : 'text-gray-950'}`}>
        {program} <span className="text-gray-400">· {pill.when}</span>
      </span>
    </div>
  )
}
