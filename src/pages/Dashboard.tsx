import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ClassificationBadge } from '../components/programs'
import { QuestionnaireBadges, statusOf } from '../components/QuestionnaireBadges'
import { ReportModal } from '../components/ReportModal'
import { Button, Card, Checkbox, CloseButton, ConfirmModal, cx, Field, Modal, PageHeader, PerPage, Radio, SearchInput, TextInput, useToast } from '../components/ui'
import { CLASSIFICATIONS, DEFAULT_FILTERS } from '../data/programs'
import { addDays, tableName, todayIso } from '../lib/format'
import { BAND_META, type Status } from '../lib/scoring'
import { currentMonitoring, questionnairesOf, sortPatients, useStore } from '../lib/store'
import type { DashboardFilters, DateFilter, Questionnaire } from '../lib/types'

const SCORE_FILTERS: Status[] = ['green', 'yellow', 'red', 'blue', 'na']
const DATE_FILTERS: { key: DateFilter; label: string; days: number | null }[] = [
  { key: 'all', label: 'Vše', days: null },
  { key: '7', label: 'Poslední týden', days: 7 },
  { key: '10', label: 'Posledních 10 dní', days: 10 },
  { key: '14', label: 'Poslední 2 týdny', days: 14 },
]

const sameFilters = (a: DashboardFilters, b: DashboardFilters) => {
  const norm = (f: DashboardFilters) =>
    JSON.stringify({ ...f, scores: [...f.scores].sort(), programIds: [...f.programIds].sort(), classifications: [...f.classifications].sort(), tags: [...f.tags].sort() })
  return norm(a) === norm(b)
}

const toggleIn = <T,>(list: T[], item: T, on: boolean) => (on ? [...list, item] : list.filter((x) => x !== item))

// ---------------------------------------------------------------------------
// Výchozí Dashboard
// ---------------------------------------------------------------------------
export function Dashboard() {
  const { createView } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [naming, setNaming] = useState(false)

  return (
    <>
      <PatientsBoard
        title="Dashboard"
        filters={filters}
        onChange={setFilters}
        onReset={sameFilters(filters, DEFAULT_FILTERS) ? undefined : () => setFilters(DEFAULT_FILTERS)}
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
          const v = createView({ name, filters })
          setNaming(false)
          toast('Pohled uložen')
          navigate(`/pohledy/${v.id}`)
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Uživatelský pohled (podstránka Dashboardu)
// ---------------------------------------------------------------------------
export function ViewPage() {
  const { id } = useParams()
  const { db } = useStore()
  const view = db.views.find((v) => v.id === id)
  if (!view) return <Navigate to="/" replace />
  return <ViewEditor key={view.id} viewId={view.id} />
}

function ViewEditor({ viewId }: { viewId: string }) {
  const { db, updateView, deleteView } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const view = db.views.find((v) => v.id === viewId)!
  const [draft, setDraft] = useState<DashboardFilters>(view.filters)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dirty = !sameFilters(draft, view.filters)

  return (
    <>
      <PatientsBoard
        title={view.name}
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Pohledy' }]}
        headerActions={
          <>
            <Button color="gray" onClick={() => setRenaming(true)}>
              Přejmenovat
            </Button>
            <Button color="danger" onClick={() => setDeleting(true)}>
              Smazat
            </Button>
          </>
        }
        filters={draft}
        onChange={setDraft}
        onReset={dirty ? () => setDraft(view.filters) : undefined}
        resetLabel="Zahodit změny"
        panelFooter={
          <Button
            className="w-full"
            disabled={!dirty}
            onClick={() => {
              updateView({ ...view, filters: draft })
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
          updateView({ ...view, name })
          setRenaming(false)
          toast('Uloženo')
        }}
      />
      <ConfirmModal
        open={deleting}
        title="Smazat pohled"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          deleteView(view.id)
          toast('Pohled smazán')
          navigate('/')
        }}
      />
    </>
  )
}

/** Dialog pro zadání názvu pohledu (nový / přejmenovat). */
export function NameModal({
  open,
  title,
  initial = '',
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean
  title: string
  initial?: string
  submitLabel: string
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      {open && <NameForm title={title} initial={initial} submitLabel={submitLabel} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  )
}

function NameForm({ title, initial, submitLabel, onClose, onSubmit }: { title: string; initial: string; submitLabel: string; onClose: () => void; onSubmit: (n: string) => void }) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return setError('Zadejte název pohledu.')
        onSubmit(name.trim())
      }}
    >
      <div className="flex items-center justify-between px-6 pt-6">
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        <CloseButton onClick={onClose} />
      </div>
      <div className="px-6 py-6">
        <Field label="Název" required error={error}>
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Prs – červené pásmo" invalid={!!error} />
        </Field>
      </div>
      <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
        <Button type="submit">{submitLabel}</Button>
        <Button color="gray" onClick={onClose}>
          Zrušit
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Tabulka pacientů + panel filtrů (sdílené Dashboardem i pohledy)
// ---------------------------------------------------------------------------
function PatientsBoard({
  title,
  breadcrumbs,
  headerActions,
  filters,
  onChange,
  onReset,
  resetLabel = 'Obnovit výchozí',
  panelFooter,
}: {
  title: string
  breadcrumbs?: { label: string; to?: string }[]
  headerActions?: ReactNode
  filters: DashboardFilters
  onChange: (f: DashboardFilters) => void
  onReset?: () => void
  resetLabel?: string
  panelFooter?: ReactNode
}) {
  const { db } = useStore()
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(500)
  const [report, setReport] = useState<Questionnaire | null>(null)

  const tags = useMemo(() => [...new Set(db.programs.map((p) => p.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'cs')), [db.programs])

  const rows = useMemo(() => {
    const days = DATE_FILTERS.find((d) => d.key === filters.date)!.days
    const since = days ? addDays(todayIso(), -days) : null
    const term = search.trim().toLowerCase()
    const scores = new Set(filters.scores)

    return sortPatients(db.patients)
      .map((patient) => {
        const mon = currentMonitoring(db, patient.id)
        const program = db.programs.find((p) => p.id === mon?.programId)
        return { patient, mon, program, qs: mon ? questionnairesOf(db, mon.id) : [] }
      })
      .filter((r) => r.mon && r.qs.length > 0)
      .filter((r) => !term || tableName(r.patient).toLowerCase().includes(term) || r.patient.rodneCislo.includes(term))
      // Monitorace, klasifikace, tag: v rámci skupiny NEBO, mezi skupinami A ZÁROVEŇ.
      .filter((r) => filters.programIds.length === 0 || (!!r.program && filters.programIds.includes(r.program.id)))
      .filter((r) => filters.classifications.length === 0 || (!!r.program && filters.classifications.includes(r.program.classification)))
      .filter((r) => filters.tags.length === 0 || (!!r.program && filters.tags.includes(r.program.tag)))
      .filter((r) => {
        // Pacient se zobrazí, pokud má alespoň jeden dotazník ve zvoleném pásmu (a v časovém okně).
        if (scores.size === 0 && !since) return true
        return r.qs.some((q) => {
          const st = statusOf(q)
          if (scores.size > 0 && !scores.has(st)) return false
          if (since) {
            const date = q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor
            if (date < since || date > todayIso()) return false
          }
          return true
        })
      })
  }, [db, search, filters])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={headerActions} />

      <Card className="flex flex-col overflow-hidden xl:flex-row">
        {/* Tabulka pacientů */}
        <div className="min-w-0 flex-1 xl:border-r xl:border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-base font-semibold leading-6 text-gray-950">Patients Table</h2>
            <span className="text-sm text-gray-500 tabular-nums">{rows.length} pacientů</span>
          </div>
          <div className="flex justify-end border-t border-gray-200 px-4 py-3 sm:px-6">
            <SearchInput value={search} onChange={setSearch} className="w-full sm:max-w-xs" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto divide-y divide-gray-200 text-start">
              <thead className="whitespace-nowrap bg-gray-50/50">
                <tr>
                  <th className="w-56 px-6 py-3.5 text-start text-sm font-semibold text-gray-950">Celé jméno</th>
                  <th className="w-32 px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Rodné číslo</th>
                  <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Dotazníky</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 whitespace-nowrap">
                {rows.slice(0, perPage).map(({ patient, qs, program }) => {
                  const latest = statusOf(qs[0])
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      {/* Barevný proužek vlevo = stav nejnovějšího dotazníku */}
                      <td className={cx('px-6 py-4 text-sm text-gray-950', BAND_META[latest].stripe)}>
                        <Link to={`/kartoteka/${patient.id}/upravit`} className="hover:underline">
                          {tableName(patient)} →
                        </Link>
                        {program && <div className="mt-0.5 text-xs text-gray-400">{program.name}</div>}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-950">{patient.rodneCislo}</td>
                      <td className="px-3 py-3">
                        <QuestionnaireBadges questionnaires={qs} onOpenReport={setReport} />
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
                      Žádní pacienti neodpovídají filtru
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center border-t border-gray-200 px-6 py-3">
            <PerPage value={perPage} onChange={setPerPage} />
          </div>
        </div>

        {/* Filtr */}
        <aside className="flex w-full shrink-0 flex-col border-t border-gray-200 px-6 py-4 xl:w-72 xl:border-t-0">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold leading-6 text-gray-950">Filtrovat</h2>
            {onReset && (
              <button onClick={onReset} className="text-sm font-medium text-primary-600 hover:underline">
                {resetLabel}
              </button>
            )}
          </div>

          <FilterGroup title="Skóre">
            {SCORE_FILTERS.map((s) => (
              <Checkbox
                key={s}
                checked={filters.scores.includes(s)}
                onChange={(v) => onChange({ ...filters, scores: toggleIn(filters.scores, s, v) })}
                label={
                  <span className="flex items-center gap-2">
                    {BAND_META[s].label}
                    <span className={cx('h-2.5 w-2.5 rounded-full', BAND_META[s].dot)} />
                  </span>
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Datum vyplnění">
            {DATE_FILTERS.map((d) => (
              <Radio key={d.key} name="date" checked={filters.date === d.key} onChange={() => onChange({ ...filters, date: d.key })} label={d.label} />
            ))}
          </FilterGroup>

          <FilterGroup title="Monitorace">
            {db.programs.map((p) => (
              <Checkbox
                key={p.id}
                checked={filters.programIds.includes(p.id)}
                onChange={(v) => onChange({ ...filters, programIds: toggleIn(filters.programIds, p.id, v) })}
                label={p.name}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Klasifikace">
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {CLASSIFICATIONS.map((c) => (
                <Checkbox
                  key={c.value}
                  checked={filters.classifications.includes(c.value)}
                  onChange={(v) => onChange({ ...filters, classifications: toggleIn(filters.classifications, c.value, v) })}
                  label={<ClassificationBadge value={c.value} />}
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Tag">
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const on = filters.tags.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange({ ...filters, tags: toggleIn(filters.tags, t, !on) })}
                    className={cx(
                      'rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition',
                      on ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-gray-700 ring-gray-950/10 hover:bg-gray-50',
                    )}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </FilterGroup>

          {panelFooter && <div className="mt-8 border-t border-gray-200 pt-4">{panelFooter}</div>}
        </aside>
      </Card>

      <ReportModal questionnaire={report} onClose={() => setReport(null)} />
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-medium text-gray-950">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
