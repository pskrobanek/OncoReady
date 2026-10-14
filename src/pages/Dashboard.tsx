import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ClassificationBadge } from '../components/programs'
import { BadgeLegend } from '../components/BadgeLegend'
import { BadgeRow, groupLabel, groupQuestionnaires, groupTone, latestDue, statusOf } from '../components/QuestionnaireBadges'
import { ArrowsUpDownIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { ReportModal } from '../components/ReportModal'
import { Button, Card, Checkbox, CloseButton, ConfirmModal, cx, Field, Modal, PageHeader, PerPage, Radio, SearchInput, TextInput, useToast } from '../components/ui'
import { CLASSIFICATIONS, DEFAULT_FILTERS } from '../data/programs'
import { addDays, tableName, todayIso } from '../lib/format'
import { BAND_META, type Status } from '../lib/scoring'
import { currentMonitoring, questionnairesOf, sortPatients, useStore } from '../lib/store'
import type { DashboardFilters, DateFilter, Questionnaire } from '../lib/types'

const SCORE_FILTERS: DashboardFilters['scores'] = ['green', 'yellow', 'red', 'blue', 'na']

type SortKey = 'urgency' | 'name' | 'rc' | 'lastFilled'
const SORTS: { key: SortKey; label: string; asc: string; desc: string }[] = [
  { key: 'urgency', label: 'Naléhavosti', asc: 'Nejnaléhavější nahoře', desc: 'Nejnaléhavější dole' },
  { key: 'name', label: 'Jména', asc: 'A → Z', desc: 'Z → A' },
  { key: 'rc', label: 'Rodného čísla', asc: 'Vzestupně', desc: 'Sestupně' },
  { key: 'lastFilled', label: 'Posledního vyplnění', asc: 'Nejnovější nahoře', desc: 'Nejstarší nahoře' },
]

/** Sloupec pacienta (jméno + RČ) zůstává při vodorovném posunu na místě; svislá linka odděluje posuvnou část. */
const STICKY_PATIENT =
  'sticky left-0 w-60 min-w-[15rem] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-gray-200'

/** Nástroje v pravém panelu (přepínají se záložkami). Další nástroje lze přidat sem. */
type ToolKey = 'filter' | 'sort'
const TOOLS: { key: ToolKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'filter', label: 'Filtr', icon: FunnelIcon },
  { key: 'sort', label: 'Řazení', icon: ArrowsUpDownIcon },
]
/** Pořadí naléhavosti podle stavu nejnovějšího dotazníku, jehož termín už nastal. */
const URGENCY: Record<Status, number> = { red: 0, blue: 1, yellow: 2, na: 3, green: 4, future: 5 }
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
  const [tool, setTool] = useState<ToolKey>('filter')
  // Pacienti, u kterých je rozbalený sloupec Plánované
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortKey>('urgency')
  const [desc, setDesc] = useState(false)

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
          if (st === 'future') return false // budoucí termíny se do filtru nepočítají
          if (scores.size > 0 && !scores.has(st)) return false
          if (since) {
            const date = q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor
            if (date < since || date > todayIso()) return false
          }
          return true
        })
      })
      .map((r) => {
        const due = latestDue(r.qs)
        const lastFilled = r.qs.reduce((m, q) => (q.filledAt && q.filledAt > m ? q.filledAt : m), '')
        return { ...r, latest: due ? statusOf(due) : ('future' as Status), lastFilled }
      })
      .sort((a, b) => {
        const byName = tableName(a.patient).localeCompare(tableName(b.patient), 'cs')
        let c = 0
        if (sort === 'urgency') c = URGENCY[a.latest] - URGENCY[b.latest]
        else if (sort === 'rc') c = a.patient.rodneCislo.localeCompare(b.patient.rodneCislo, 'cs', { numeric: true })
        else if (sort === 'lastFilled') c = b.lastFilled.localeCompare(a.lastFilled) // nejnovější první
        else c = byName
        return (desc ? -c : c) || byName
      })
  }, [db, search, filters, sort, desc])

  // Sloupce skupin: Plánované a Poslední vyplněný vždy, pak roky, které se v zobrazených řádcích vyskytují.
  const groupKeys = useMemo(() => {
    const years = new Set<string>()
    for (const r of rows) for (const g of groupQuestionnaires(r.qs)) if (g.key !== 'future' && g.key !== 'last') years.add(g.key)
    return ['future', 'last', ...[...years].sort().reverse()]
  }, [rows])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={headerActions} />

      <Card className="flex flex-col overflow-hidden xl:flex-row">
        {/* Tabulka pacientů */}
        <div className="min-w-0 flex-1 xl:border-r xl:border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-base font-semibold leading-6 text-gray-950">Pacienti</h2>
            <span className="text-sm text-gray-500 tabular-nums">{rows.length} pacientů</span>
          </div>
          <div className="flex justify-end border-t border-gray-200 px-4 py-3 sm:px-6">
            <SearchInput value={search} onChange={setSearch} className="w-full sm:max-w-xs" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto divide-y divide-gray-200 text-start">
              <thead className="whitespace-nowrap bg-gray-50/50">
                <tr>
                  <th rowSpan={2} className={cx(STICKY_PATIENT, 'z-10 bg-gray-50 px-6 py-3.5 text-start align-bottom text-sm font-semibold text-gray-950')}>
                    Pacient
                  </th>
                  <th colSpan={groupKeys.length} className="px-3 pb-1 pt-3 text-start text-sm font-semibold text-gray-950">
                    <span className="inline-flex items-center gap-1.5">
                      Dotazníky
                      <BadgeLegend />
                    </span>
                  </th>
                  {/* Výplň – sloupce skupin jsou jen tak široké, jak potřebují */}
                  <th rowSpan={2} className="border-l border-gray-200" />
                </tr>
                {/* Pevné sloupce skupin – kategorie jsou v zákrytu napříč pacienty */}
                <tr>
                  {groupKeys.map((k) => (
                    <th
                      key={k}
                      title={k === 'last' ? 'Poslední vyplněný dotazník' : undefined}
                      className={cx(
                        'w-px border-l border-gray-200 pb-2 pt-1 text-start align-bottom text-[10px] font-semibold uppercase',
                        k === 'last' ? 'px-2 text-center tracking-normal' : 'px-3 tracking-wider',
                        k === 'last' ? 'text-primary-600' : 'text-gray-400',
                      )}
                    >
                      {/* Krátký popisek, aby sloupec s jediným odznakem nebyl zbytečně široký */}
                      {k === 'last' ? 'Poslední' : groupLabel(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 whitespace-nowrap">
                {rows.slice(0, perPage).map(({ patient, qs, program, latest }) => {
                  return (
                    <tr key={patient.id} className="group">
                      {/* Barevný proužek vlevo = stav nejnovějšího dotazníku, jehož termín už nastal */}
                      <td className={cx(STICKY_PATIENT, 'z-[1] bg-white px-6 py-3 text-sm text-gray-950 group-hover:bg-gray-50', BAND_META[latest].stripe)}>
                        <Link to={`/kartoteka/${patient.id}/upravit`} className="font-medium hover:underline">
                          {tableName(patient)} →
                        </Link>
                        <div className="mt-0.5 truncate text-xs text-gray-500">
                          <span className="tabular-nums">RČ {patient.rodneCislo}</span>
                          {program && <span className="text-gray-400"> · {program.name}</span>}
                        </div>
                      </td>
                      {groupKeys.map((k) => {
                        const items = groupQuestionnaires(qs).find((g) => g.key === k)?.items ?? []
                        return (
                          <td key={k} className={cx('w-px border-l border-gray-200 py-3 align-middle group-hover:brightness-[0.98]', k === 'last' ? 'px-2 [&>*]:mx-auto [&>div]:w-fit' : 'min-w-[3.75rem] px-3', groupTone(k))}>
                            {k === 'future' && items.length > 1 ? (
                              <PlannedCell
                                items={items}
                                expanded={expanded.has(patient.id)}
                                onToggle={() =>
                                  setExpanded((s) => {
                                    const n = new Set(s)
                                    if (n.has(patient.id)) n.delete(patient.id)
                                    else n.add(patient.id)
                                    return n
                                  })
                                }
                                onOpenReport={setReport}
                              />
                            ) : items.length ? (
                              <BadgeRow items={items} onOpenReport={setReport} />
                            ) : (
                              <span className="block min-w-[2.25rem] text-center text-sm text-gray-300">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="border-l border-gray-200 group-hover:bg-gray-50" />
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={groupKeys.length + 2} className="px-6 py-12 text-center text-sm text-gray-500">
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
        <aside className="flex w-full shrink-0 flex-col border-t border-gray-200 xl:w-72 xl:border-t-0">
          {/* Nástroje panelu – přepínací záložky. Další nástroj = nová položka v TOOLS. */}
          <div className="flex border-b border-gray-200 px-3" role="tablist">
            {TOOLS.map(({ key, label, icon: Icon }) => {
              const active = tool === key
              const changed = key === 'filter' ? !!onReset : sort !== 'urgency' || desc
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTool(key)}
                  className={cx(
                    '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-3.5 text-sm font-semibold transition',
                    active ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {changed && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" title="Změněno oproti výchozímu" />}
                </button>
              )
            })}
          </div>

          <div className="flex flex-1 flex-col px-6 pb-4">
          {tool === 'sort' && (
            <>
              <FilterGroup title="Řadit podle">
                {SORTS.map((o) => (
                  <Radio key={o.key} name="sort" checked={sort === o.key} onChange={() => setSort(o.key)} label={o.label} />
                ))}
              </FilterGroup>
              <FilterGroup title="Pořadí">
                <Radio name="dir" checked={!desc} onChange={() => setDesc(false)} label={SORTS.find((o) => o.key === sort)!.asc} />
                <Radio name="dir" checked={desc} onChange={() => setDesc(true)} label={SORTS.find((o) => o.key === sort)!.desc} />
              </FilterGroup>
              {(sort !== 'urgency' || desc) && (
                <button
                  onClick={() => {
                    setSort('urgency')
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

          {tool === 'filter' && (
          <>
          {onReset && (
            <button onClick={onReset} className="mt-4 self-end text-sm font-medium text-primary-600 hover:underline">
              {resetLabel}
            </button>
          )}

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

          </>
          )}

          {panelFooter && <div className="mt-8 border-t border-gray-200 pt-4">{panelFooter}</div>}
          </div>
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

/**
 * Sloupec Plánované: ve výchozím stavu jen nejbližší další dotazník a tlačítko „+N“,
 * po rozkliknutí všechny plánované termíny (nejbližší vpravo, u sloupce Poslední vyplněný).
 */
function PlannedCell({
  items,
  expanded,
  onToggle,
  onOpenReport,
}: {
  items: Questionnaire[]
  expanded: boolean
  onToggle: () => void
  onOpenReport: (q: Questionnaire) => void
}) {
  const next = items[items.length - 1] // položky jsou seřazené od nejvzdálenějšího termínu
  const rest = items.length - 1
  return (
    <div className="flex items-start gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        title={expanded ? 'Skrýt další plánované dotazníky' : `Zobrazit další plánované dotazníky (${rest})`}
        className="flex h-8 min-w-8 items-center justify-center rounded border border-gray-200 bg-gray-50 px-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        {expanded ? '−' : `+${rest}`}
      </button>
      <BadgeRow items={expanded ? items : [next]} onOpenReport={onOpenReport} />
    </div>
  )
}
