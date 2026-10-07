import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BandRanges, ClassificationBadge, DiagnosisChips, TagBadge } from '../components/programs'
import { Button, Card, ConfirmModal, LinkAction, PageHeader, PerPage, resultsLabel, SearchInput, useToast } from '../components/ui'
import { diagnosisName, frequencyLabel } from '../data/programs'
import { useStore } from '../lib/store'

/** Seznam monitorací (programů sledování). */
export function Monitorace() {
  const { db, deleteProgram } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [deleting, setDeleting] = useState<string | null>(null)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...db.programs]
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
      .filter(
        (p) =>
          !term ||
          [p.name, p.tag, p.classification, ...p.diagnoses, ...p.diagnoses.map(diagnosisName)].some((x) => x.toLowerCase().includes(term)),
      )
  }, [db.programs, search])

  const activePatients = (programId: string) =>
    new Set(db.monitorings.filter((m) => m.programId === programId && m.active).map((m) => m.patientId)).size

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Monitorace"
        breadcrumbs={[{ label: 'Monitorace', to: '/monitorace' }, { label: 'Přehled' }]}
        actions={<Button onClick={() => navigate('/monitorace/vytvorit')}>Vytvořit</Button>}
      />
      <Card className="overflow-hidden">
        <div className="flex justify-end px-4 py-3 sm:px-6">
          <SearchInput value={search} onChange={setSearch} className="w-full sm:max-w-xs" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
            <thead className="whitespace-nowrap bg-gray-50/50">
              <tr>
                {['Název', 'Diagnózy', 'Tag', 'Klasifikace', 'Frekvence', 'Pásma (body)', 'Pacienti'].map((h, i) => (
                  <th key={h} className={`${i === 0 ? 'px-6' : 'px-3'} py-3.5 text-start text-sm font-semibold text-gray-950`}>
                    {h}
                  </th>
                ))}
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.slice(0, perPage).map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/monitorace/${p.id}/upravit`)}>
                  <td className="min-w-[12rem] px-6 py-4 text-sm font-medium text-gray-950">{p.name}</td>
                  <td className="min-w-[9rem] px-3 py-4">
                    <DiagnosisChips codes={p.diagnoses} />
                  </td>
                  <td className="px-3 py-4">{p.tag && <TagBadge>{p.tag}</TagBadge>}</td>
                  <td className="px-3 py-4">
                    <ClassificationBadge value={p.classification} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-950">{frequencyLabel(p.frequencyDays)}</td>
                  <td className="whitespace-nowrap px-3 py-4">
                    <BandRanges bands={p.bands} />
                  </td>
                  <td className="px-3 py-4 text-sm tabular-nums text-gray-950" title="Pacienti s aktivní monitorací">{activePatients(p.id)}</td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      <LinkAction icon={PencilSquareIcon} onClick={() => navigate(`/monitorace/${p.id}/upravit`)}>
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
                    Nenalezeny žádné monitorace
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

      <ConfirmModal
        open={!!deleting}
        title="Smazat monitoraci"
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
