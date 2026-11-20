import { PlayIcon } from '@heroicons/react/20/solid'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ESkillResultModal, ScorePill } from '../components/eskill'
import { Button, Card, Checkbox, cx, PageHeader, PerPage, Radio, resultsLabel, SearchInput } from '../components/ui'
import { FilterGroup, FilterPanel, toggle } from '../components/FilterPanel'
import { TIER_META, tierFor, type Tier } from '../data/eskill'
import { daysBetween, fullDate, tableName, todayIso } from '../lib/format'
import { eskillOf, planStatus, sortPatients, useStore } from '../lib/store'
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

/** Filtry e-Skill (prázdný seznam = nefiltruje). */
type EskillFilters = { tested: 'all' | 'yes' | 'no'; tiers: Tier[]; when: 'all' | '30' | '180' | 'old'; plan: ('active' | 'planned' | 'ended' | 'none')[] }
const EMPTY: EskillFilters = { tested: 'all', tiers: [], when: 'all', plan: [] }
const TESTED: { key: EskillFilters['tested']; label: string }[] = [
  { key: 'all', label: 'Vše' },
  { key: 'yes', label: 'Testovaní' },
  { key: 'no', label: 'Bez testu' },
]
const WHEN: { key: EskillFilters['when']; label: string }[] = [
  { key: 'all', label: 'Kdykoli' },
  { key: '30', label: 'Posledních 30 dní' },
  { key: '180', label: 'Posledních 6 měsíců' },
  { key: 'old', label: 'Starší než rok (k opakování)' },
]
const PLAN: { key: EskillFilters['plan'][number]; label: string }[] = [
  { key: 'active', label: 'Aktivní' },
  { key: 'planned', label: 'Naplánováno' },
  { key: 'ended', label: 'Ukončeno' },
  { key: 'none', label: 'Bez plánu' },
]

/** e-Skill – test digitální gramotnosti u pacientů z kartotéky nebo bez registrace. */
export function ESkill() {
  const { db } = useStore()
  const openTest = useOpenESkillTest()
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<ESkillResult | null>(null)

  const [f, setF] = useState<EskillFilters>(EMPTY)
  const changeF = (next: EskillFilters) => {
    setF(next)
    setPage(1)
  }
  const changed = JSON.stringify(f) !== JSON.stringify(EMPTY)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const today = todayIso()
    return sortPatients(db.patients)
      .filter((p) => !term || tableName(p).toLowerCase().includes(term) || p.rodneCislo.includes(term))
      .map((p) => ({ patient: p, results: eskillOf(db, p.id) }))
      .filter(({ patient, results }) => {
        const last = results[0]
        if (f.tested === 'yes' && !last) return false
        if (f.tested === 'no' && last) return false
        if (f.tiers.length && !(last && f.tiers.includes(tierFor(last.literacyScore)))) return false
        if (f.when !== 'all') {
          if (!last) return false
          const age = daysBetween(last.takenAt.slice(0, 10), today)
          if (f.when === '30' && age > 30) return false
          if (f.when === '180' && age > 180) return false
          if (f.when === 'old' && age <= 365) return false
        }
        if (f.plan.length && !f.plan.includes(planStatus(db, patient.id).kind)) return false
        return true
      })
  }, [db, search, f])

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

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <Card className="min-w-0 flex-1 overflow-hidden">
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

      <FilterPanel onReset={changed ? () => changeF(EMPTY) : undefined}>
        <FilterGroup title="Test">
          {TESTED.map((o) => (
            <Radio key={o.key} name="tested" checked={f.tested === o.key} onChange={() => changeF({ ...f, tested: o.key })} label={o.label} />
          ))}
        </FilterGroup>
        <FilterGroup title="Digitální gramotnost (poslední výsledek)">
          {(['Low', 'Medium', 'High'] as Tier[]).map((t) => (
            <Checkbox
              key={t}
              checked={f.tiers.includes(t)}
              onChange={(v) => changeF({ ...f, tiers: toggle(f.tiers, t, v) })}
              label={<span className={cx('inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TIER_META[t].badge)}>{TIER_META[t].label}</span>}
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Datum posledního testu">
          {WHEN.map((o) => (
            <Radio key={o.key} name="when" checked={f.when === o.key} onChange={() => changeF({ ...f, when: o.key })} label={o.label} />
          ))}
        </FilterGroup>
        <FilterGroup title="Stav monitorace">
          {PLAN.map((o) => (
            <Checkbox key={o.key} checked={f.plan.includes(o.key)} onChange={(v) => changeF({ ...f, plan: toggle(f.plan, o.key, v) })} label={o.label} />
          ))}
        </FilterGroup>
      </FilterPanel>
      </div>

      <ESkillResultModal result={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
