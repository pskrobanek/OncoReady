import { PlayIcon } from '@heroicons/react/20/solid'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ESkillResultModal, ScorePill } from '../components/eskill'
import { Button, Card, PageHeader, PerPage, resultsLabel, SearchInput } from '../components/ui'
import { fullDate, tableName } from '../lib/format'
import { eskillOf, sortPatients, useStore } from '../lib/store'
import type { ESkillResult } from '../lib/types'

/**
 * Otevře test v novém okně. Ve sdílené jednosouborové verzi (bez adres) se test otevře ve stejném okně.
 */
export function useOpenESkillTest() {
  const navigate = useNavigate()
  return (patientId?: string) => {
    const path = patientId ? `/e-skill/test/${patientId}` : '/e-skill/test'
    if (import.meta.env.MODE !== 'single') {
      const w = window.open(`${location.pathname}${location.search}#${path}`, '_blank', 'popup,width=1100,height=850')
      if (w) return
    }
    navigate(path)
  }
}

/** e-Skill – test digitální gramotnosti u pacientů z kartotéky nebo bez registrace. */
export function ESkill() {
  const { db } = useStore()
  const openTest = useOpenESkillTest()
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<ESkillResult | null>(null)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sortPatients(db.patients)
      .filter((p) => !term || tableName(p).toLowerCase().includes(term) || p.rodneCislo.includes(term))
      .map((p) => ({ patient: p, results: eskillOf(db, p.id) }))
  }, [db, search])

  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(page, pages)
  const from = (current - 1) * perPage
  const visible = rows.slice(from, from + perPage)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="e-Skill"
        breadcrumbs={[{ label: 'e-Skill', to: '/e-skill' }, { label: 'Přehled' }]}
        actions={
          <Button onClick={() => openTest()}>
            Test bez registrace
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-sm text-gray-500">Test digitální gramotnosti: dotazník + 9 úkolů na obrazovce, asi 5 minut. Skóre 0–100.</p>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} className="w-full sm:max-w-xs" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
            <thead className="whitespace-nowrap bg-gray-50/50">
              <tr>
                <th className="px-6 py-3.5 text-start text-sm font-semibold text-gray-950">Celé jméno</th>
                <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Rodné číslo</th>
                <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Poslední výsledek</th>
                <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Datum</th>
                <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Testů</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 whitespace-nowrap">
              {visible.map(({ patient, results }) => {
                const last = results[0]
                return (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-950">{tableName(patient)}</td>
                    <td className="px-3 py-4 text-sm text-gray-950">{patient.rodneCislo}</td>
                    <td className="px-3 py-4">
                      {last ? (
                        <button onClick={() => setDetail(last)} className="hover:opacity-80" title="Zobrazit detail">
                          <ScorePill score={last.literacyScore} />
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">{last ? fullDate(last.takenAt) : ''}</td>
                    <td className="px-3 py-4 text-sm tabular-nums text-gray-500">{results.length || ''}</td>
                    <td className="px-6 py-3 text-right">
                      <Button className="!py-1.5" onClick={() => openTest(patient.id)}>
                        <PlayIcon className="h-4 w-4" />
                        Zahájit test
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    Nenalezeny žádné záznamy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-3">
          <span className="text-sm font-medium text-gray-700">{resultsLabel(from + 1, Math.min(from + perPage, rows.length), rows.length)}</span>
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

      <ESkillResultModal result={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
