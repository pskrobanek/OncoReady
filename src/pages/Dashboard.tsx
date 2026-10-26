import { useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { BadgeLegend } from '../components/BadgeLegend'
import { latestDue, QuestionnaireTile, statusOf, worstQuestionnaire } from '../components/QuestionnaireBadges'
import { ArrowsUpDownIcon, FunnelIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { EmptySlot, LabTile, MissingTile, SourceIcon, WearTile } from '../components/Readiness'
import { ReadinessModal } from '../components/ReadinessModal'
import { ReportModal } from '../components/ReportModal'
import { Button, Card, Checkbox, CloseButton, ConfirmModal, cx, Field, Modal, PageHeader, PerPage, Radio, SearchInput, TextInput, useToast } from '../components/ui'
import { DEFAULT_FILTERS } from '../data/programs'
import { addDays, agoText, shortDate, tableName, todayIso } from '../lib/format'
import { evalLab, monthName, periodsBack, readinessOf, sourceMeta, timelineOf, weekOf, worstCurrent, type Level, type PatientTimeline, type Readiness, type SourceKey, type TimelineMode } from '../lib/readiness'
import { BAND_META, type Band, type Status } from '../lib/scoring'
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

/** Sloupec pacienta zůstává při vodorovném posunu na místě; svislá linka je za sloupcem zdrojů (na mobilu za pacientem). */
const STICKY_PATIENT =
  'sticky left-0 w-52 min-w-[13rem] max-w-[13rem] max-sm:after:absolute max-sm:after:inset-y-0 max-sm:after:right-0 max-sm:after:w-px max-sm:after:bg-gray-200'

/** Sloupec Zdroj zůstává při vodorovném posunu vedle sloupce pacienta (left = šířka sloupce pacienta); na mobilu se posouvá. */
const STICKY_SOURCE = 'w-px sm:sticky sm:left-52 sm:after:absolute sm:after:inset-y-0 sm:after:right-0 sm:after:w-px sm:after:bg-gray-200'

/** Časová osa: týdny (po měsících), měsíce, roky, nebo jen vyplněné bez prázdných období (záložka Zobrazení). */
const TIMELINE_MODES: { key: TimelineMode; label: string; hint: string }[] = [
  { key: 'week', label: 'Po týdnech', hint: 'Dlaždice = týden, seskupené po měsících' },
  { key: 'month', label: 'Po měsících', hint: 'Sloupec = měsíc, všechny položky' },
  { key: 'year', label: 'Po letech', hint: 'Sloupec = rok, všechny položky' },
  { key: 'filled', label: 'Jen vyplněné', hint: 'Bez prázdných období a bez nevyplněných dotazníků' },
]
const MODE_KEY = 'oncoready-dashboard-osa'
const loadMode = (): TimelineMode => {
  try {
    const v = localStorage.getItem(MODE_KEY)
    return TIMELINE_MODES.some((m) => m.key === v) ? (v as TimelineMode) : 'week'
  } catch {
    return 'week'
  }
}

/** Barevný pruh na levé straně sloupce Pacient (9 px) podle nejhoršího aktuálního výsledku; šedá = žádný zdroj není aktuální. */
const WORST_BAR: Record<Band | 'none', string> = {
  red: 'shadow-[inset_9px_0_0_#dc2626]',
  blue: 'shadow-[inset_9px_0_0_#2563eb]',
  yellow: 'shadow-[inset_9px_0_0_#fbbf24]',
  green: 'shadow-[inset_9px_0_0_#10b981]',
  none: 'shadow-[inset_9px_0_0_#e5e7eb]',
}

/** Nástroje v pravém panelu (přepínají se záložkami). Další nástroje lze přidat sem. */
type ToolKey = 'filter' | 'sort' | 'view'
const TOOLS: { key: ToolKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'filter', label: 'Filtr', icon: FunnelIcon },
  { key: 'sort', label: 'Řazení', icon: ArrowsUpDownIcon },
  { key: 'view', label: 'Zobrazení', icon: ViewColumnsIcon },
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
    JSON.stringify({ ...f, scores: [...f.scores].sort(), programIds: [...f.programIds].sort() })
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
  const [sort, setSort] = useState<SortKey>('urgency')
  const [desc, setDesc] = useState(false)
  const [mode, setMode] = useState<TimelineMode>(loadMode)
  const changeMode = (m: TimelineMode) => {
    setMode(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      /* ignorovat */
    }
  }
  // Pacient, jehož detail souhrnu je otevřený
  const [detail, setDetail] = useState<string | null>(null)


  const today = todayIso()
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
      // Monitorace: pacient se zobrazí, pokud má některou ze zaškrtnutých monitorací.
      .filter((r) => filters.programIds.length === 0 || (!!r.program && filters.programIds.includes(r.program.id)))
      // Datum vyplnění: pacient má v časovém okně aspoň jeden dotazník (vyplněný, nebo nevyplněný po termínu).
      .filter((r) => {
        if (!since) return true
        return r.qs.some((q) => {
          if (statusOf(q) === 'future') return false // budoucí termíny se do filtru nepočítají
          const date = q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor
          return date >= since && date <= todayIso()
        })
      })
      .map((r) => ({ ...r, ready: readinessOf(db, r.patient.id, today) }))
      // Skóre (pásmo) = barva pruhu u jména: nejhorší výsledek z aktuálních zdrojů; „Nevyplněno“ = nic aktuálního (šedý pruh).
      .filter((r) => scores.size === 0 || scores.has(worstCurrent(r.ready) ?? 'na'))
      .map((r) => {
        const due = latestDue(r.qs)
        const lastFilled = r.qs.reduce((m, q) => (q.filledAt && q.filledAt > m ? q.filledAt : m), '')
        return {
          ...r,
          latest: due ? statusOf(due) : ('future' as Status),
          lastFilled,
          tl: timelineOf(db, r.patient.id, r.qs, mode, today),
        }
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
  }, [db, search, filters, sort, desc, mode, today])

  // Časová osa: období od aktuálního zpět po nejstarší data zobrazených pacientů.
  // Po týdnech začíná osa minulým týdnem – aktuální stav je ve čtverci ve sloupci Aktuální.
  const periods = useMemo(() => {
    const earliest = rows.map((r) => r.tl.earliest).filter((d): d is string => !!d).sort()[0]
    if (!earliest) return []
    const all = periodsBack(mode, earliest, today)
    return mode === 'week' ? all.filter((w) => w !== weekOf(today)) : all
  }, [rows, mode, today])
  // Skupiny v hlavičce: týdny po měsících („Říjen 2026“); měsíc, rok i „Jen vyplněné“ = jeden sloupec na skupinu.
  const groupOf = (p: string) => (mode === 'week' ? p.slice(0, 7) : p)
  const groups: { key: string; label: string; count: number }[] = []
  for (const p of periods) {
    const last = groups[groups.length - 1]
    if (last?.key === groupOf(p)) last.count++
    else groups.push({ key: groupOf(p), label: mode === 'week' || mode === 'month' ? monthName(p) : mode === 'year' ? p : 'Vyplněné', count: 1 })
  }
  // Mezi skupinami (měsíci) je malá mezera.
  const groupStart = (i: number) => i === 0 || groupOf(periods[i]) !== groupOf(periods[i - 1])

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
                  <th className={cx(STICKY_PATIENT, 'z-10 bg-gray-50 py-3 pl-6 pr-4 text-start text-sm font-semibold text-gray-950')}>Pacient</th>
                  {/* Sloupec zdrojů je bez nadpisu */}
                  <th className={cx(STICKY_SOURCE, 'z-10 bg-gray-50 px-3 py-3')}>
                    <span className="sr-only">Zdroj</span>
                  </th>
                  <th className="w-px border-r border-gray-200 px-3 py-3 text-start text-sm font-semibold text-gray-950">
                    <span className="inline-flex items-center gap-1.5">
                      Aktuální
                      <BadgeLegend dashboard />
                    </span>
                  </th>
                  {groups.map((g, gi) => (
                    <th key={g.key} colSpan={g.count} className={cx('py-3 pr-0.5 text-start text-sm font-semibold text-gray-950', gi === 0 ? 'pl-3' : 'pl-5')}>
                      {g.label}
                    </th>
                  ))}
                  {/* Výplň – sloupce jsou jen tak široké, jak potřebují */}
                  <th />
                </tr>
              </thead>
              {rows.slice(0, perPage).map(({ patient, program, ready, tl }) => {
                // Řádek za každý zdroj, který pacient má (dotazník, případně laboratoř a wearables).
                const lines = ready.sources.map((s) => s.source)
                return (
                  <tbody key={patient.id} className="group whitespace-nowrap">
                    {lines.map((line, i) => {
                      // Horní a dolní okraj bloku pacienta; mezi řádky zdrojů bez čar.
                      const edge = cx(i === 0 && 'pt-2.5', i === lines.length - 1 && 'pb-2.5')
                      return (
                        <tr key={line}>
                          {i === 0 && (
                            // Barevný pruh vlevo u jména = nejhorší výsledek z aktuálních zdrojů pacienta
                            <td
                              rowSpan={lines.length}
                              className={cx(STICKY_PATIENT, 'z-[1] bg-white py-2.5 pl-6 pr-4 align-top text-sm group-hover:bg-gray-50', WORST_BAR[worstCurrent(ready) ?? 'none'])}
                            >
                              <Link to={`/kartoteka/${patient.id}/upravit`} className="font-semibold text-gray-950 hover:underline">
                                {tableName(patient)}
                              </Link>
                              <div className="tabular-nums text-gray-600">{patient.rodneCislo}</div>
                              {program && (
                                <Link
                                  to={`/monitorace/${program.id}/upravit`}
                                  title="Otevřít monitoraci"
                                  className="mt-1.5 block truncate text-gray-600 underline decoration-gray-300 underline-offset-2 hover:text-primary-600"
                                >
                                  {program.name}
                                </Link>
                              )}
                            </td>
                          )}
                          <td className={cx(STICKY_SOURCE, 'z-[1] bg-white px-3 py-1 text-sm text-gray-600 group-hover:bg-gray-50', edge)}>
                            <span className="inline-flex items-center gap-1.5">
                              <SourceIcon source={line} className="h-4 w-4 text-gray-400" />
                              {sourceMeta(line).label}
                            </span>
                          </td>
                          <td className={cx('w-px border-r border-gray-200 px-3 py-1 align-middle group-hover:bg-gray-50', edge)}>
                            <CurrentCell line={line} ready={ready} onOpenReport={setReport} onOpenDetail={() => setDetail(patient.id)} />
                          </td>
                          {periods.map((p, pi) => (
                            <td key={p} className={cx('w-px py-1 pr-0.5 align-middle group-hover:bg-gray-50', groupStart(pi) ? (pi === 0 ? 'pl-3' : 'pl-5') : 'pl-0.5', edge)}>
                              <PeriodCell line={line} period={p} mode={mode} tl={tl} onOpenReport={setReport} />
                            </td>
                          ))}
                          <td className={cx('group-hover:bg-gray-50', edge)} />
                        </tr>
                      )
                    })}
                  </tbody>
                )
              })}
              {rows.length === 0 && (
                <tbody>
                  <tr>
                    <td colSpan={periods.length + 4} className="px-6 py-12 text-center text-sm text-gray-500">
                      Žádní pacienti neodpovídají filtru
                    </td>
                  </tr>
                </tbody>
              )}
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
              const changed = key === 'filter' ? !!onReset : key === 'sort' ? sort !== 'urgency' || desc : mode !== 'week'
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTool(key)}
                  className={cx(
                    '-mb-px flex items-center gap-1 border-b-2 px-2 py-3.5 text-sm font-semibold transition',
                    active ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
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

          {tool === 'view' && (
            <>
              <FilterGroup title="Časová osa">
                {TIMELINE_MODES.map((m) => (
                  <Radio
                    key={m.key}
                    name="mode"
                    checked={mode === m.key}
                    onChange={() => changeMode(m.key)}
                    label={
                      <span>
                        {m.label}
                        <span className="block text-xs text-gray-500">{m.hint}</span>
                      </span>
                    }
                  />
                ))}
              </FilterGroup>
              {mode !== 'week' && (
                <button onClick={() => changeMode('week')} className="mt-6 self-start text-sm font-medium text-primary-600 hover:underline">
                  Obnovit výchozí zobrazení
                </button>
              )}
              <p className="mt-6 text-xs text-gray-400">Zobrazení se pamatuje v tomto prohlížeči a neukládá se do pohledu.</p>
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

          </>
          )}

          {panelFooter && <div className="mt-8 border-t border-gray-200 pt-4">{panelFooter}</div>}
          </div>
        </aside>
      </Card>

      <ReportModal questionnaire={report} onClose={() => setReport(null)} />
      <ReadinessModal patientId={detail} onClose={() => setDetail(null)} onOpenReport={setReport} />
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

/** Buňka Aktuální: čtverec s posledními daty zdroje; neaktuální nebo chybějící = čárkovaný čtverec. */
function CurrentCell({
  line,
  ready,
  onOpenReport,
  onOpenDetail,
}: {
  line: SourceKey
  ready: Readiness
  onOpenReport: (q: Questionnaire) => void
  /** Laboratoř a wearables: klik otevře detail s hodnotami a mezemi. */
  onOpenDetail: () => void
}) {
  const s = ready.sources.find((x) => x.source === line)!
  const tile =
    s.state !== 'ok' ? (
      <MissingTile
        stale={s.state === 'stale'}
        title={s.date ? `${sourceMeta(line).label}: poslední data ${shortDate(s.date)} (${agoText(s.date)}) – neaktuální` : `${sourceMeta(line).label}: bez dat`}
      />
    ) : line === 'questionnaire' ? (
      <QuestionnaireTile q={s.questionnaire!} shape="square" onOpenReport={onOpenReport} />
    ) : line === 'lab' ? (
      <LabTile lab={s.lab!} shape="square" onClick={onOpenDetail} hint="klik pro detail" />
    ) : (
      <WearTile week={{ level: s.level as Level, day: s.day!, findings: s.findings }} shape="square" onClick={onOpenDetail} hint="klik pro detail" />
    )
  return (
    <div className="flex items-center gap-2">
      {tile}
      {/* Před kolika dny byla data (vyplnění, odběr, měření); neaktuální červeně */}
      <span className={cx('whitespace-nowrap text-xs', s.state === 'stale' ? 'text-red-500' : 'text-gray-500')}>{s.date ? agoText(s.date) : 'bez dat'}</span>
    </div>
  )
}

const LEVEL_RANK: Record<Level, number> = { red: 2, yellow: 1, green: 0 }

/**
 * Buňka období časové osy (úzké dlaždice).
 * Po týdnech: jedna dlaždice za týden – nejzávažnější položka (ostatní jsou v tooltipu).
 * Po měsících / letech / jen vyplněné: všechny položky období vedle sebe, nejnovější vlevo.
 */
function PeriodCell({
  line,
  period,
  mode,
  tl,
  onOpenReport,
}: {
  line: SourceKey
  period: string
  mode: TimelineMode
  tl: PatientTimeline
  onOpenReport: (q: Questionnaire) => void
}) {
  const one = mode === 'week'
  const row = (children: ReactNode) => <div className="flex gap-x-1">{children}</div>
  if (line === 'questionnaire') {
    const items = tl.questionnaires.get(period)
    if (!items) return <EmptySlot />
    if (one) return <QuestionnaireTile q={worstQuestionnaire(items)} shape="narrow" more={items.length - 1} onOpenReport={onOpenReport} />
    return row(items.map((q) => <QuestionnaireTile key={q.id} q={q} shape="narrow" onOpenReport={onOpenReport} />))
  }
  if (line === 'lab') {
    const labs = tl.labs.get(period)
    if (!labs) return <EmptySlot />
    if (one) return <LabTile lab={labs.reduce((a, b) => (LEVEL_RANK[evalLab(b).level] > LEVEL_RANK[evalLab(a).level] ? b : a))} shape="narrow" />
    return row(labs.map((l) => <LabTile key={l.id} lab={l} shape="narrow" />))
  }
  const weeks = tl.wearables.get(period)
  if (!weeks) return <EmptySlot />
  return row(weeks.map((w) => <WearTile key={w.day.id} week={w} shape="narrow" />))
}
