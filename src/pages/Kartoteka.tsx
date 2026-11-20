// Kartotéka: seznam pacientů s panelem Filtr / Řazení / Zobrazení a uložené pohledy (podstránky v menu) – jako Dashboard.
import { ArrowsUpDownIcon, FunnelIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { PlusIcon } from '@heroicons/react/20/solid'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ScorePill } from '../components/eskill'
import { FilterGroup, toggle, ToolPanel } from '../components/FilterPanel'
import { SourceIcon } from '../components/Readiness'
import { Button, Card, Checkbox, ConfirmModal, MultiSelect, PageHeader, PerPage, Radio, resultsLabel, SearchInput, useToast } from '../components/ui'
import { DEFAULT_PATIENT_FILTERS } from '../data/programs'
import { fullDate, tableName } from '../lib/format'
import { SOURCES } from '../lib/readiness'
import { eskillOf, planStatus, sortPatients, useStore } from '../lib/store'
import type { DB, PatientFilters, SourceKey } from '../lib/types'
import { NameModal, ViewMenu } from './Dashboard'
import { MonitoringModal } from './PatientForm'

type PlanKind = PatientFilters['plan'][number]
const PLAN_OPTIONS: { key: PlanKind; label: string }[] = [
  { key: 'active', label: 'Aktivní' },
  { key: 'planned', label: 'Naplánováno' },
  { key: 'ended', label: 'Ukončeno' },
  { key: 'none', label: 'Bez plánu' },
]
const ESKILL_OPTIONS: { key: PatientFilters['eskill']; label: string }[] = [
  { key: 'all', label: 'Vše' },
  { key: 'yes', label: 'Má výsledek' },
  { key: 'no', label: 'Bez výsledku' },
]
const sameFilters = (a: PatientFilters, b: PatientFilters) => {
  const norm = (f: PatientFilters) => JSON.stringify({ ...f, plan: [...f.plan].sort(), programIds: [...f.programIds].sort(), sources: [...f.sources].sort() })
  return norm(a) === norm(b)
}

/** Má pacient nějaká data ze zdroje (vyplněný dotazník, odběr, den z hodinek)? */
function hasSource(db: DB, patientId: string, s: SourceKey) {
  if (s === 'lab') return db.labs.some((l) => l.patientId === patientId)
  if (s === 'wearables') return db.wearables.some((w) => w.patientId === patientId)
  const mons = new Set(db.monitorings.filter((m) => m.patientId === patientId).map((m) => m.id))
  return db.questionnaires.some((q) => mons.has(q.monitoringId) && q.filledAt)
}

// Řazení (neukládá se do pohledu)
type SortKey = 'name' | 'rc' | 'plan' | 'end' | 'eskill'
const SORTS: { key: SortKey; label: string; asc: string; desc: string }[] = [
  { key: 'name', label: 'Jména', asc: 'A → Z', desc: 'Z → A' },
  { key: 'rc', label: 'Rodného čísla', asc: 'Vzestupně', desc: 'Sestupně' },
  { key: 'plan', label: 'Stavu monitorace', asc: 'Aktivní nahoře', desc: 'Bez plánu nahoře' },
  { key: 'end', label: 'Konce monitorace', asc: 'Nejbližší konec nahoře', desc: 'Nejvzdálenější konec nahoře' },
  { key: 'eskill', label: 'Skóre e-Skill', asc: 'Nejnižší nahoře', desc: 'Nejvyšší nahoře' },
]
const PLAN_ORDER: PlanKind[] = ['active', 'planned', 'ended', 'none']

// Zobrazení: sloupce tabulky (Celé jméno je vždy). Pamatuje se v prohlížeči zvlášť pro Kartotéku a každý pohled.
type ColKey = 'rc' | 'birth' | 'contact' | 'plan' | 'eskill' | 'action'
const COLUMNS: { key: ColKey; label: string }[] = [
  { key: 'rc', label: 'Rodné číslo' },
  { key: 'birth', label: 'Datum narození' },
  { key: 'contact', label: 'Kontakt' },
  { key: 'plan', label: 'Aktivní plán' },
  { key: 'eskill', label: 'e-Skill' },
  { key: 'action', label: 'Rychlá akce' },
]
const DEFAULT_COLS: ColKey[] = ['rc', 'plan', 'eskill', 'action']
const COLS_KEY = 'oncoready-kartoteka-sloupce'
const loadCols = (boardId: string): ColKey[] => {
  try {
    const v = JSON.parse(localStorage.getItem(`${COLS_KEY}:${boardId}`) ?? 'null')
    return Array.isArray(v) ? COLUMNS.map((c) => c.key).filter((k) => v.includes(k)) : DEFAULT_COLS
  } catch {
    return DEFAULT_COLS
  }
}

type Tool = 'filter' | 'sort' | 'view'

/** Výchozí Kartotéka. */
export function Kartoteka() {
  const { createPatientView } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [filters, setFilters] = useState<PatientFilters>(DEFAULT_PATIENT_FILTERS)
  const [naming, setNaming] = useState(false)
  return (
    <>
      <PatientList
        title="Kartotéka"
        breadcrumbs={[{ label: 'Kartotéka', to: '/kartoteka' }, { label: 'Přehled' }]}
        actions={<Button onClick={() => navigate('/kartoteka/vytvorit')}>Vytvořit</Button>}
        filters={filters}
        onChange={setFilters}
        onReset={sameFilters(filters, DEFAULT_PATIENT_FILTERS) ? undefined : () => setFilters(DEFAULT_PATIENT_FILTERS)}
        panelFooter={
          <Button color="gray" className="w-full" onClick={() => setNaming(true)}>
            Uložit jako pohled
          </Button>
        }
      />
      <NameModal
        open={naming}
        title="Uložit jako pohled"
        submitLabel="Uložit"
        onClose={() => setNaming(false)}
        onSubmit={(name) => {
          const v = createPatientView({ name, filters })
          setNaming(false)
          toast('Pohled uložen')
          navigate(`/kartoteka/pohledy/${v.id}`)
        }}
      />
    </>
  )
}

/** Uložený pohled Kartotéky. */
export function KartotekaView() {
  const { id } = useParams()
  const { db } = useStore()
  const view = db.patientViews.find((v) => v.id === id)
  if (!view) return <Navigate to="/kartoteka" replace />
  return <KartotekaViewEditor key={view.id} viewId={view.id} />
}

function KartotekaViewEditor({ viewId }: { viewId: string }) {
  const { db, updatePatientView, deletePatientView } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const view = db.patientViews.find((v) => v.id === viewId)!
  const [draft, setDraft] = useState<PatientFilters>(view.filters)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dirty = !sameFilters(draft, view.filters)
  return (
    <>
      <PatientList
        title={view.name}
        boardId={`pohled-${view.id}`}
        breadcrumbs={[{ label: 'Kartotéka', to: '/kartoteka' }, { label: 'Pohledy' }]}
        titleAside={<ViewMenu onRename={() => setRenaming(true)} onDelete={() => setDeleting(true)} />}
        filters={draft}
        onChange={setDraft}
        onReset={dirty ? () => setDraft(view.filters) : undefined}
        resetLabel="Zahodit změny"
        panelFooter={
          <Button
            className="w-full"
            disabled={!dirty}
            onClick={() => {
              updatePatientView({ ...view, filters: draft })
              toast('Pohled uložen')
            }}
          >
            {dirty ? 'Uložit změny filtru' : 'Filtr je uložen'}
          </Button>
        }
      />
      <NameModal
        open={renaming}
        title="Přejmenovat pohled"
        initial={view.name}
        submitLabel="Uložit"
        onClose={() => setRenaming(false)}
        onSubmit={(name) => {
          updatePatientView({ ...view, name })
          setRenaming(false)
          toast('Uloženo')
        }}
      />
      <ConfirmModal
        open={deleting}
        title="Smazat pohled"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          deletePatientView(view.id)
          toast('Pohled smazán')
          navigate('/kartoteka')
        }}
      />
    </>
  )
}

/** Seznam pacientů s panelem nástrojů (sdílí výchozí Kartotéka i pohledy). */
function PatientList({
  title,
  breadcrumbs,
  actions,
  titleAside,
  filters: f,
  onChange,
  onReset,
  resetLabel = 'Obnovit výchozí',
  panelFooter,
  boardId = 'kartoteka',
}: {
  title: string
  breadcrumbs: { label: string; to?: string }[]
  actions?: ReactNode
  titleAside?: ReactNode
  filters: PatientFilters
  onChange: (f: PatientFilters) => void
  onReset?: () => void
  resetLabel?: string
  panelFooter?: ReactNode
  boardId?: string
}) {
  const { db, createMonitoring } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [tool, setTool] = useState<Tool>('filter')
  const [sort, setSort] = useState<SortKey>('name')
  const [desc, setDesc] = useState(false)
  const [cols, setCols] = useState<ColKey[]>(() => loadCols(boardId))
  const changeCols = (next: ColKey[]) => {
    const ordered = COLUMNS.map((c) => c.key).filter((k) => next.includes(k))
    setCols(ordered)
    try {
      localStorage.setItem(`${COLS_KEY}:${boardId}`, JSON.stringify(ordered))
    } catch {
      /* ignorovat */
    }
  }
  const changeF = (next: PatientFilters) => {
    onChange(next)
    setPage(1)
  }
  const colsChanged = cols.join() !== DEFAULT_COLS.join()

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = sortPatients(db.patients)
      .filter((p) => !term || tableName(p).toLowerCase().includes(term) || p.rodneCislo.includes(term))
      .filter((p) => {
        const st = planStatus(db, p.id)
        if (f.plan.length && !f.plan.includes(st.kind)) return false
        if (f.programIds.length && !(st.kind !== 'none' && st.monitoring.programId && f.programIds.includes(st.monitoring.programId))) return false
        if (f.sources.length && !f.sources.some((s) => hasSource(db, p.id, s))) return false
        if (f.eskill !== 'all' && (eskillOf(db, p.id).length > 0) !== (f.eskill === 'yes')) return false
        return true
      })
    if (sort === 'name') return desc ? [...list].reverse() : list
    const key = (id: string, rc: string): string | number => {
      if (sort === 'rc') return rc
      const st = planStatus(db, id)
      if (sort === 'plan') return PLAN_ORDER.indexOf(st.kind)
      if (sort === 'end') return st.kind === 'none' ? '9999' : st.monitoring.end
      return eskillOf(db, id)[0]?.literacyScore ?? (desc ? -1 : 999)
    }
    const sorted = [...list].sort((a, b) => {
      const x = key(a.id, a.rodneCislo)
      const y = key(b.id, b.rodneCislo)
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'cs', { numeric: true })
    })
    return desc ? sorted.reverse() : sorted
  }, [db, search, f, sort, desc])

  const pages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(page, pages)
  const from = (current - 1) * perPage
  const visible = rows.slice(from, from + perPage)
  const sortMeta = SORTS.find((x) => x.key === sort)!

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={actions} titleAside={titleAside} />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <Card className="min-w-0 flex-1 overflow-hidden">
          <div className="flex justify-end px-4 py-3 sm:px-6">
            <SearchInput value={search} onChange={(v) => {
                setSearch(v)
                setPage(1)
              }} className="w-full sm:max-w-xs" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
              <thead className="whitespace-nowrap bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-start text-sm font-semibold text-gray-950">Celé jméno</th>
                  {COLUMNS.filter((c) => cols.includes(c.key)).map((c) =>
                    c.key === 'action' ? (
                      <th key={c.key} className="px-6 py-3.5" />
                    ) : (
                      <th key={c.key} className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">
                        {c.label}
                      </th>
                    ),
                  )}
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
                    {cols.includes('rc') && <td className="px-3 py-4 text-sm tabular-nums text-gray-950">{p.rodneCislo}</td>}
                    {cols.includes('birth') && <td className="whitespace-nowrap px-3 py-4 text-sm tabular-nums text-gray-950">{p.datumNarozeni ? fullDate(p.datumNarozeni) : '—'}</td>}
                    {cols.includes('contact') && (
                      <td className="px-3 py-4 text-sm text-gray-600">
                        {p.email || p.telefon ? (
                          <>
                            {p.email && <div>{p.email}</div>}
                            {p.telefon && <div className="tabular-nums">{p.telefon}</div>}
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    )}
                    {cols.includes('plan') && (
                      <td className="px-3 py-3">
                        <PlanCell db={db} patientId={p.id} />
                      </td>
                    )}
                    {cols.includes('eskill') && (
                    <td className="whitespace-nowrap px-3 py-3">
                      {eskillOf(db, p.id)[0] ? (
                        <ScorePill score={eskillOf(db, p.id)[0].literacyScore} />
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    )}
                    {cols.includes('action') && (
                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setAddingFor(p.id)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary-600 hover:underline"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Monitorace
                      </button>
                    </td>
                    )}
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={cols.length + 1} className="px-6 py-12 text-center text-sm text-gray-500">
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
            <PerPage value={perPage} onChange={(v) => {
                setPerPage(v)
                setPage(1)
              }} />
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

        <ToolPanel
          tabs={[
            { key: 'filter' as const, label: 'Filtr', icon: FunnelIcon, changed: !!onReset },
            { key: 'sort' as const, label: 'Řazení', icon: ArrowsUpDownIcon, changed: sort !== 'name' || desc },
            { key: 'view' as const, label: 'Zobrazení', icon: ViewColumnsIcon, changed: colsChanged },
          ]}
          active={tool}
          onTab={setTool}
          footer={tool === 'filter' ? panelFooter : undefined}
        >
          {tool === 'filter' && (
            <>
              {onReset && (
                <button type="button" onClick={onReset} className="mt-4 self-end text-sm font-medium text-primary-600 hover:underline">
                  {resetLabel}
                </button>
              )}
              <FilterGroup title="Stav monitorace">
                {PLAN_OPTIONS.map((o) => (
                  <Checkbox key={o.key} checked={f.plan.includes(o.key)} onChange={(v) => changeF({ ...f, plan: toggle(f.plan, o.key, v) })} label={o.label} />
                ))}
              </FilterGroup>
              <FilterGroup title="Šablona">
                <MultiSelect
                  options={db.programs.map((p) => ({ value: p.id, label: p.name }))}
                  value={f.programIds}
                  onChange={(programIds) => changeF({ ...f, programIds })}
                  placeholder="Všechny šablony"
                />
              </FilterGroup>
              <FilterGroup title="Data ze zdroje">
                {SOURCES.map((s) => (
                  <Checkbox
                    key={s.key}
                    checked={f.sources.includes(s.key)}
                    onChange={(v) => changeF({ ...f, sources: toggle(f.sources, s.key, v) })}
                    label={
                      <span className="flex items-center gap-2">
                        <SourceIcon source={s.key} className="h-4 w-4 text-gray-400" />
                        {s.label}
                      </span>
                    }
                  />
                ))}
              </FilterGroup>
              <FilterGroup title="e-Skill">
                {ESKILL_OPTIONS.map((o) => (
                  <Radio key={o.key} name={`eskill-${boardId}`} checked={f.eskill === o.key} onChange={() => changeF({ ...f, eskill: o.key })} label={o.label} />
                ))}
              </FilterGroup>
            </>
          )}

          {tool === 'sort' && (
            <>
              <FilterGroup title="Řadit podle">
                {SORTS.map((o) => (
                  <Radio key={o.key} name={`sort-${boardId}`} checked={sort === o.key} onChange={() => setSort(o.key)} label={o.label} />
                ))}
              </FilterGroup>
              <FilterGroup title="Pořadí">
                <Radio name={`dir-${boardId}`} checked={!desc} onChange={() => setDesc(false)} label={sortMeta.asc} />
                <Radio name={`dir-${boardId}`} checked={desc} onChange={() => setDesc(true)} label={sortMeta.desc} />
              </FilterGroup>
              {(sort !== 'name' || desc) && (
                <button
                  type="button"
                  onClick={() => {
                    setSort('name')
                    setDesc(false)
                  }}
                  className="mt-6 self-start text-sm font-medium text-primary-600 hover:underline"
                >
                  Obnovit výchozí řazení
                </button>
              )}
              <p className="mt-6 text-xs text-gray-400">Řazení platí jen pro aktuální zobrazení a neukládá se do pohledu.</p>
            </>
          )}

          {tool === 'view' && (
            <>
              <FilterGroup title="Sloupce">
                <p className="text-sm text-gray-500">Celé jméno je vidět vždy.</p>
                {COLUMNS.map((c) => (
                  <Checkbox key={c.key} checked={cols.includes(c.key)} onChange={(v) => changeCols(toggle(cols, c.key, v))} label={c.label} />
                ))}
              </FilterGroup>
              {colsChanged && (
                <button type="button" onClick={() => changeCols(DEFAULT_COLS)} className="mt-6 self-start text-sm font-medium text-primary-600 hover:underline">
                  Obnovit výchozí zobrazení
                </button>
              )}
              <p className="mt-6 text-xs text-gray-400">Zobrazení se pamatuje v tomto prohlížeči a neukládá se do pohledu.</p>
            </>
          )}
        </ToolPanel>
      </div>

      {/* Rychlá akce: přidat monitoraci přímo ze seznamu */}
      {addingFor && (
        <MonitoringModal
          initial={null}
          patientName={(() => {
            const p = db.patients.find((x) => x.id === addingFor)
            return p ? tableName(p) : undefined
          })()}
          onClose={() => setAddingFor(null)}
          onSave={(data) => {
            createMonitoring({ ...data, patientId: addingFor })
            const p = db.patients.find((x) => x.id === addingFor)
            toast(`Monitorace vytvořena${p ? ` – ${tableName(p)}` : ''}`)
            setAddingFor(null)
          }}
        />
      )}
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
