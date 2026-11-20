import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SourceIcon } from '../components/Readiness'
import { Button, Card, Checkbox, ConfirmModal, LinkAction, PageHeader, PerPage, Radio, resultsLabel, SearchInput, useToast } from '../components/ui'
import { sourceMeta } from '../lib/readiness'
import { questionnaireName } from '../data/questionnaireLibrary'
import { endLabel, scheduleLabel } from '../lib/schedule'
import { useStore } from '../lib/store'
import { FilterGroup, FilterPanel, toggle } from '../components/FilterPanel'
import { KIND_META, libraryItem } from '../data/questionnaireLibrary'
import { SOURCES } from '../lib/readiness'
import type { Schedule, SourceKey } from '../lib/types'

/** Seznam šablon monitorace (programů sledování). */
/** Filtry seznamu šablon (prázdný seznam = nefiltruje). */
type TemplateFilters = {
  sources: SourceKey[]
  frequency: Schedule['kind'][]
  questionnaire: ('static' | 'dynamic' | 'custom')[]
  patients: 'all' | 'yes' | 'no'
}
const EMPTY: TemplateFilters = { sources: [], frequency: [], questionnaire: [], patients: 'all' }
const FREQ_OPTIONS: { key: Schedule['kind']; label: string }[] = [
  { key: 'once', label: 'Jednorázově' },
  { key: 'regular', label: 'Pravidelně' },
  { key: 'custom', label: 'Vlastní' },
]
const PATIENT_OPTIONS: { key: TemplateFilters['patients']; label: string }[] = [
  { key: 'all', label: 'Vše' },
  { key: 'yes', label: 'S aktivními pacienty' },
  { key: 'no', label: 'Bez pacientů' },
]

export function Sablony() {
  const { db, deleteProgram } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [f, setF] = useState<TemplateFilters>(EMPTY)
  const changed = JSON.stringify(f) !== JSON.stringify(EMPTY)

  const activePatients = (programId: string) =>
    new Set(db.monitorings.filter((m) => m.programId === programId && m.active).map((m) => m.patientId)).size

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const kindOf = (id: string) => libraryItem(id)?.kind ?? 'custom'
    return [...db.programs]
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .filter((p) => !f.sources.length || f.sources.some((s) => p.sources.includes(s)))
      .filter((p) => !f.frequency.length || f.frequency.includes(p.schedule.kind))
      .filter((p) => !f.questionnaire.length || (p.sources.includes('questionnaire') && f.questionnaire.includes(kindOf(p.questionnaireId))))
      .filter((p) => f.patients === 'all' || (activePatients(p.id) > 0) === (f.patients === 'yes'))
  }, [db, search, f])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Šablony"
        breadcrumbs={[{ label: 'Šablony', to: '/sablony' }, { label: 'Přehled' }]}
        actions={<Button onClick={() => navigate('/sablony/vytvorit')}>Vytvořit</Button>}
      />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <Card className="min-w-0 flex-1 overflow-hidden">
        <div className="flex justify-end px-4 py-3 sm:px-6">
          <SearchInput value={search} onChange={setSearch} className="w-full sm:max-w-xs" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
            <thead className="whitespace-nowrap bg-gray-50/50">
              <tr>
                {['Název', 'Zdroje', 'Frekvence', 'Pacienti'].map((h, i) => (
                  <th key={h} className={`${i === 0 ? 'px-6' : 'px-3'} py-3.5 text-start text-sm font-semibold text-gray-950`}>
                    {h}
                  </th>
                ))}
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.slice(0, perPage).map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/sablony/${p.id}/upravit`)}>
                  <td className="min-w-[12rem] px-6 py-4 text-sm font-medium text-gray-950">{p.name}</td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-1">
                      {p.sources.map((k) => (
                        <span key={k} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-gray-700">
                          <SourceIcon source={k} className="h-4 w-4 text-gray-400" />
                          {sourceMeta(k).label}
                          {k === 'questionnaire' && <span className="text-gray-400">· {questionnaireName(db, p.questionnaireId)}</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">
                    {scheduleLabel(p.schedule)}
                    <div className="text-gray-500">{endLabel(p.schedule, p.ending)}</div>
                  </td>
                  <td className="px-3 py-4 text-sm tabular-nums text-gray-950" title="Pacienti s aktivní monitorací podle této šablony">{activePatients(p.id)}</td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      <LinkAction icon={PencilSquareIcon} onClick={() => navigate(`/sablony/${p.id}/upravit`)}>
                        Upravit
                      </LinkAction>
                      <LinkAction icon={TrashIcon} color="danger" onClick={() => setDeleting(p.id)}>
                        Smazat
                      </LinkAction>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    Nenalezeny žádné šablony
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-3">
          <span className="text-sm font-medium text-gray-700">{resultsLabel(1, Math.min(perPage, rows.length), rows.length)}</span>
          <PerPage value={perPage} onChange={setPerPage} />
          <span className="hidden w-32 sm:block" />
        </div>
      </Card>

      <FilterPanel onReset={changed ? () => setF(EMPTY) : undefined}>
        <FilterGroup title="Zdroje">
          {SOURCES.map((o) => (
            <Checkbox
              key={o.key}
              checked={f.sources.includes(o.key)}
              onChange={(v) => setF({ ...f, sources: toggle(f.sources, o.key, v) })}
              label={
                <span className="flex items-center gap-2">
                  <SourceIcon source={o.key} className="h-4 w-4 text-gray-400" />
                  {o.label}
                </span>
              }
            />
          ))}
        </FilterGroup>
        <FilterGroup title="Frekvence">
          {FREQ_OPTIONS.map((o) => (
            <Checkbox key={o.key} checked={f.frequency.includes(o.key)} onChange={(v) => setF({ ...f, frequency: toggle(f.frequency, o.key, v) })} label={o.label} />
          ))}
        </FilterGroup>
        <FilterGroup title="Dotazník">
          {(['static', 'dynamic', 'custom'] as const).map((k) => (
            <Checkbox key={k} checked={f.questionnaire.includes(k)} onChange={(v) => setF({ ...f, questionnaire: toggle(f.questionnaire, k, v) })} label={KIND_META[k].label} />
          ))}
        </FilterGroup>
        <FilterGroup title="Pacienti">
          {PATIENT_OPTIONS.map((o) => (
            <Radio key={o.key} name="patients" checked={f.patients === o.key} onChange={() => setF({ ...f, patients: o.key })} label={o.label} />
          ))}
        </FilterGroup>
      </FilterPanel>
      </div>

      <ConfirmModal
        open={!!deleting}
        title="Smazat šablonu"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          deleteProgram(deleting!)
          setDeleting(null)
          toast('Smazáno')
        }}
      />
    </div>
  )
}
