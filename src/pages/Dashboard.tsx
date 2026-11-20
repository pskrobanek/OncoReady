import { Fragment, useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { BadgeLegend } from '../components/BadgeLegend'
import { QuestionnaireTile, statusOf, worstQuestionnaire } from '../components/QuestionnaireBadges'
import { ArrowsUpDownIcon, FunnelIcon, UsersIcon, ViewColumnsIcon } from '@heroicons/react/24/outline'
import { tagIconByLabel, TagIconView } from '../components/TagIcons'
import { activeStep, NextStepButtons } from '../components/NextStep'
import { EmptySlot, LabTile, MissingTile, SourceIcon, WearTile } from '../components/Readiness'
import { ReadinessModal } from '../components/ReadinessModal'
import { ReportModal } from '../components/ReportModal'
import { Button, Card, Checkbox, CloseButton, ConfirmModal, cx, Field, Modal, MultiSelect, PageHeader, PerPage, Radio, SearchInput, TextInput, useToast } from '../components/ui'
import { DEFAULT_FILTERS } from '../data/programs'
import { addDays, agoText, shortDate, tableName, todayIso } from '../lib/format'
import { evalLab, monthName, periodsBack, readinessOf, sourceMeta, timelineOf, weekOf, worstCurrent, type Level, type PatientTimeline, type Readiness, type SourceKey, type TimelineMode } from '../lib/readiness'
import { BAND_META, type Band } from '../lib/scoring'
import { currentMonitoring, questionnairesOf, sortPatients, useStore } from '../lib/store'
import type { DashboardFilters, DateFilter, MonitoringProgram, Questionnaire } from '../lib/types'

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

/** Seskupení pacientů v tabulce (záložka Zobrazení). */
type GroupBy = 'none' | 'severity' | 'program'
const GROUP_BY: { key: GroupBy; label: string; hint: string }[] = [
  { key: 'none', label: 'Neseskupovat', hint: 'Jeden seznam pacientů' },
  { key: 'severity', label: 'Závažnosti', hint: 'Podle barvy pruhu u jména' },
  { key: 'program', label: 'Šablony', hint: 'Podle šablony monitorace pacienta' },
]
const GROUP_KEY = 'oncoready-dashboard-seskupeni'
const HIDDEN_TAGS_KEY = 'oncoready-dashboard-skryte-priznaky'
function loadHiddenTags(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_TAGS_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
/** Název příznaku s jeho ikonou (filtr, zobrazení). */
const TagLabel = ({ programs, label }: { programs: MonitoringProgram[]; label: string }) => (
  <span className="flex items-center gap-2">
    <TagIconView name={tagIconByLabel(programs, label)} className="h-4 w-4 text-gray-400" />
    {label}
  </span>
)
/** Všechny příznaky: tlačítka ze šablon v jejich pořadí + příznaky pacientů, jejichž tlačítko už v šabloně není. */
const allTagLabels = (programs: MonitoringProgram[], extra: string[] = []) => [...new Set([...programs.flatMap((p) => p.actions.map((a) => a.label)), ...extra])]
const loadGroupBy = (): GroupBy => {
  try {
    const v = localStorage.getItem(GROUP_KEY)
    return GROUP_BY.some((g) => g.key === v) ? (v as GroupBy) : 'none'
  } catch {
    return 'none'
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
/**
 * Pořadí naléhavosti = barva pruhu u jména (nejhorší výsledek z aktuálních zdrojů):
 * červená → vyžádal kontrolu → žlutá → nic aktuálního (šedá) → zelená. Stejné pořadí mají skupiny podle závažnosti.
 */
const SEVERITY_ORDER: (Band | 'na')[] = ['red', 'blue', 'yellow', 'na', 'green']
const DATE_FILTERS: { key: DateFilter; label: string; days: number | null }[] = [
  { key: 'all', label: 'Vše', days: null },
  { key: '7', label: 'Poslední týden', days: 7 },
  { key: '10', label: 'Posledních 10 dní', days: 10 },
  { key: '14', label: 'Poslední 2 týdny', days: 14 },
]

const sameFilters = (a: DashboardFilters, b: DashboardFilters) => {
  const norm = (f: DashboardFilters) =>
    JSON.stringify({ ...f, scores: [...f.scores].sort(), programIds: [...f.programIds].sort(), tags: [...(f.tags ?? [])].sort() })
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
  const [groupBy, setGroupBy] = useState<GroupBy>(loadGroupBy)
  const changeGroupBy = (g: GroupBy) => {
    setGroupBy(g)
    try {
      localStorage.setItem(GROUP_KEY, g)
    } catch {
      /* ignorovat */
    }
  }
  // Boxy příznaků skryté v Zobrazení (ukládá se skryté, aby nový příznak byl vidět hned)
  const [hiddenTags, setHiddenTags] = useState<string[]>(loadHiddenTags)
  const changeHiddenTags = (h: string[]) => {
    setHiddenTags(h)
    try {
      localStorage.setItem(HIDDEN_TAGS_KEY, JSON.stringify(h))
    } catch {
      /* ignorovat */
    }
  }
  // Pacient, jehož detail souhrnu je otevřený
  const [detail, setDetail] = useState<string | null>(null)
  // Posuvné oblasti tabulek jednotlivých boxů (kvůli společnému vodorovnému posunu)
  const scrollers = useRef<Record<string, HTMLDivElement | null>>({})


  const today = todayIso()
  const { rows, tagged } = useMemo(() => {
    const days = DATE_FILTERS.find((d) => d.key === filters.date)!.days
    const since = days ? addDays(todayIso(), -days) : null
    const term = search.trim().toLowerCase()
    const scores = new Set(filters.scores)

    const base = sortPatients(db.patients)
      .map((patient) => {
        const mon = currentMonitoring(db, patient.id)
        const program = db.programs.find((p) => p.id === mon?.programId)
        return { patient, mon, program, qs: mon ? questionnairesOf(db, mon.id) : [] }
      })
      .filter((r) => r.mon && r.qs.length > 0)
      .filter((r) => !term || tableName(r.patient).toLowerCase().includes(term) || r.patient.rodneCislo.includes(term))
      .map((r) => {
        const ready = readinessOf(db, r.patient.id, today)
        const step = activeStep(r.mon)
        return {
          ...r,
          ready,
          severity: worstCurrent(ready) ?? ('na' as const),
          // Dnešní značka pacienta (tlačítko ze šablony); čekárna = tlačítko, které šablona označuje jako čekárnu
          step,
          inWaitingRoom: !!step && !!r.program?.actions.find((a) => a.id === step.actionId)?.waiting,
          lastFilled: r.qs.reduce((m, q) => (q.filledAt && q.filledAt > m ? q.filledAt : m), ''),
          tl: timelineOf(db, r.patient.id, r.qs, mode, today),
        }
      })

    return {
      // Pacienti s dnešním příznakem: nahoře v boxu svého příznaku, řazeno podle času označení.
      // Platí jen filtr Šablona (v pohledu např. Stacionář jsou jen jeho pacienti) a hledání; skóre ani datum je neskryjí.
      tagged: base
        .filter((r) => r.step)
        .filter((r) => !!term || filters.programIds.length === 0 || (!!r.program && filters.programIds.includes(r.program.id)))
        .sort((a, b) => a.step!.at.localeCompare(b.step!.at)),
      rows: base
        // Hledání prohledává všechny pacienty – filtry se při něm nepoužijí (sestra musí najít i zeleného pacienta).
        // Šablona: pacient se zobrazí, pokud jeho monitorace vychází z některé ze zaškrtnutých šablon.
        .filter((r) => !!term || filters.programIds.length === 0 || (!!r.program && filters.programIds.includes(r.program.id)))
        // Příznak: dnešní příznak pacienta je mezi zaškrtnutými ('' = bez příznaku).
        .filter((r) => !!term || !filters.tags?.length || filters.tags.includes(r.step?.label ?? ''))
        // Datum vyplnění: pacient má v časovém okně aspoň jeden dotazník (vyplněný, nebo nevyplněný po termínu).
        .filter((r) => {
          if (!since || term) return true
          return r.qs.some((q) => {
            if (statusOf(q) === 'future') return false // budoucí termíny se do filtru nepočítají
            const date = q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor
            return date >= since && date <= todayIso()
          })
        })
        // Skóre (pásmo) = barva pruhu u jména: nejhorší výsledek z aktuálních zdrojů; „Nevyplněno“ = nic aktuálního (šedý pruh).
        .filter((r) => !!term || scores.size === 0 || scores.has(r.severity))
        .sort((a, b) => {
          const byName = tableName(a.patient).localeCompare(tableName(b.patient), 'cs')
          let c = 0
          if (sort === 'urgency') c = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
          else if (sort === 'rc') c = a.patient.rodneCislo.localeCompare(b.patient.rodneCislo, 'cs', { numeric: true })
          else if (sort === 'lastFilled') c = b.lastFilled.localeCompare(a.lastFilled) // nejnovější první
          else c = byName
          return (desc ? -c : c) || byName
        }),
    }
  }, [db, search, filters, sort, desc, mode, today])

  // Pacienti jsou v samostatných boxech pod sebou: box pro každý příznak zvolený v Zobrazení (Čekárna, K aplikaci…) a Všichni pacienti.
  // Boxy příznaků jsou vidět i prázdné. Všichni pacienti = celý seznam podle filtrů, včetně pacientů s příznakem.
  const shown = rows.slice(0, perPage)
  type Part = { key: string; label: string | null; dot: string | null; rows: typeof rows }
  type Box = { key: string; label: string; kind: 'waiting' | 'tag' | 'all'; count: number; parts: Part[] }
  const single = (list: typeof rows): Part[] => [{ key: 'vse', label: null, dot: null, rows: list }]
  // Podskupiny ze záložky Zobrazení (závažnost / šablony) se zobrazí uvnitř boxu Všichni pacienti.
  const subGroups: Part[] =
    groupBy === 'severity'
      ? SEVERITY_ORDER.map((sev) => ({ key: sev, label: BAND_META[sev].label, dot: BAND_META[sev].dot, rows: shown.filter((r) => r.severity === sev) }))
      : groupBy === 'program'
        ? [...new Set(shown.map((r) => r.program?.name ?? ''))]
            .sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b, 'cs')))
            .map((name) => ({ key: name || '-', label: name || 'Bez šablony', dot: null, rows: shown.filter((r) => (r.program?.name ?? '') === name) }))
        : []
  // Box pro každý příznak (tlačítka ze šablon v jejich pořadí + příznaky, jejichž tlačítko už v šabloně není),
  // jen ty, které nejsou skryté v Zobrazení. Hlavička boxu má ikonu příznaku.
  // Jen příznaky šablon vybraných ve filtru Šablona (nic nevybráno = všechny) – platí pro boxy, Zobrazení i filtr Příznak.
  const filteredPrograms = filters.programIds.length ? db.programs.filter((p) => filters.programIds.includes(p.id)) : db.programs
  const tagLabels = allTagLabels(filteredPrograms, tagged.map((r) => r.step!.label))
  const boxes: Box[] = [
    ...tagLabels
      .filter((label) => !hiddenTags.includes(label))
      .map((label) => {
        const list = tagged.filter((r) => r.step!.label === label)
        return { key: `tag:${label}`, label, kind: 'tag' as const, count: list.length, parts: single(list) }
      }),
    { key: 'all', label: 'Všichni pacienti', kind: 'all', count: rows.length, parts: subGroups.length ? subGroups.filter((g) => g.rows.length > 0) : single(shown) },
  ]
  // Boxy mají vlastní tabulky – vodorovný posun časové osy se mezi nimi drží společný.
  const syncScroll = (e: UIEvent<HTMLDivElement>) => {
    const x = e.currentTarget.scrollLeft
    for (const el of Object.values(scrollers.current)) if (el && el !== e.currentTarget && el.scrollLeft !== x) el.scrollLeft = x
  }

  // Časová osa: období od aktuálního zpět po nejstarší data zobrazených pacientů.
  // Po týdnech začíná osa minulým týdnem – aktuální stav je ve čtverci ve sloupci Aktuální.
  const periods = useMemo(() => {
    const earliest = [...tagged, ...rows].map((r) => r.tl.earliest).filter((d): d is string => !!d).sort()[0]
    if (!earliest) return []
    const all = periodsBack(mode, earliest, today)
    return mode === 'week' ? all.filter((w) => w !== weekOf(today)) : all
  }, [rows, tagged, mode, today])
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

  // Hlavička tabulky – stejná v každém boxu (sloupce mají pevné nejmenší šířky, aby boxy lícovaly pod sebou).
  const head = (
    <thead className="whitespace-nowrap bg-gray-50/50">
      <tr>
        <th className={cx(STICKY_PATIENT, 'z-10 bg-gray-50 py-3 pl-6 pr-4 text-start text-sm font-semibold text-gray-950')}>Pacient</th>
        {/* Sloupec zdrojů je bez nadpisu */}
        <th className={cx(STICKY_SOURCE, 'z-10 min-w-[7.5rem] bg-gray-50 px-3 py-3')}>
          <span className="sr-only">Zdroj</span>
        </th>
        <th className="w-px min-w-[9.5rem] border-r border-gray-200 px-3 py-3 text-start text-sm font-semibold text-gray-950">
          <span className="inline-flex items-center gap-1.5">
            Aktuální
            <BadgeLegend dashboard />
          </span>
        </th>
        <th className="w-px min-w-[7.75rem] border-r border-gray-200 px-3 py-3 text-start text-sm font-semibold text-gray-950">Příznak</th>
        {groups.map((g, gi) => (
          <th key={g.key} colSpan={g.count} className={cx('py-3 pr-0.5 text-start text-sm font-semibold text-gray-950', gi === 0 ? 'pl-3' : 'pl-5')}>
            {g.label}
          </th>
        ))}
        {/* Výplň – sloupce jsou jen tak široké, jak potřebují */}
        <th />
      </tr>
    </thead>
  )
  // Blok pacienta: řádek za každý zdroj, který pacient má (dotazník, případně laboratoř a wearables).
  const patientBody = ({ patient, program, ready, tl }: (typeof rows)[number]) => {
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
                {/* Klik na pacienta otevře souhrnný prescoring (dotazník, laboratoř, wearables) */}
                <button
                  type="button"
                  onClick={() => setDetail(patient.id)}
                  title="Otevřít souhrnný prescoring"
                  className="text-left font-semibold text-gray-950 hover:underline"
                >
                  {tableName(patient)}
                </button>
                <div className="tabular-nums text-gray-600">{patient.rodneCislo}</div>
                {program && (
                  <Link
                    to={`/sablony/${program.id}/upravit`}
                    title="Otevřít šablonu"
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
            {i === 0 && (
              // Příznak: tlačítka ze šablony pacienta nastaví jeho dnešní příznak (např. Čekárna, K aplikaci)
              <td rowSpan={lines.length} className="w-px border-r border-gray-200 px-3 py-2.5 align-top group-hover:bg-gray-50">
                <NextStepButtons patientId={patient.id} />
              </td>
            )}
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
}

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={headerActions} />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Vyhledávání */}
          <Card>
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-base font-semibold leading-6 text-gray-950">Hledat</h2>
              <span className="text-sm text-gray-500 tabular-nums">{new Set([...rows, ...tagged].map((r) => r.patient.id)).size} pacientů</span>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 sm:px-6">
              <SearchInput value={search} onChange={setSearch} className="w-full" />
            </div>
          </Card>

          {/* Boxy skupin: Čekárna, K aplikaci (a další značky ze šablon), Všichni pacienti */}
          {boxes.map((box) => (
            <Card key={box.key} className="overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4">
                {box.kind !== 'all' && <TagIconView name={tagIconByLabel(db.programs, box.label)} className="h-5 w-5 text-gray-400" />}
                {box.kind === 'all' && <UsersIcon className="h-5 w-5 text-gray-400" />}
                <h3 className="text-base font-semibold leading-6 text-gray-950">{box.label}</h3>
                <span className="text-sm tabular-nums text-gray-500">{box.count}</span>
              </div>
              {box.count === 0 ? (
                // Prázdný box značky zůstává vidět, aby bylo jasné, že v něm nikdo není
                <p className="border-t border-gray-200 px-6 py-4 text-sm text-gray-500">
                  {box.kind === 'all' ? 'Žádní pacienti neodpovídají filtru' : 'Dnes zatím nikdo.'}
                </p>
              ) : (
                <div
                  ref={(el) => {
                    scrollers.current[box.key] = el
                  }}
                  onScroll={syncScroll}
                  className="no-scrollbar overflow-x-auto border-t border-gray-200"
                >
                  <table className="w-full table-auto divide-y divide-gray-200 text-start">
                    {head}
                    {box.parts.map((part) => (
                      <Fragment key={part.key}>
                        {/* Nadpis podskupiny (seskupení podle závažnosti / šablon) – zůstává vlevo i při vodorovném posunu */}
                        {part.label && (
                          <tbody>
                            <tr>
                              <td colSpan={periods.length + 5} className="bg-gray-50 py-2">
                                <span className="sticky left-0 inline-flex items-center gap-2 pl-6 text-sm font-semibold text-gray-950">
                                  {part.dot && <span className={cx('h-2.5 w-2.5 rounded-full', part.dot)} />}
                                  {part.label}
                                  <span className="font-normal tabular-nums text-gray-500">{part.rows.length}</span>
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        )}
                        {part.rows.map(patientBody)}
                      </Fragment>
                    ))}
                  </table>
                </div>
              )}
              {box.kind === 'all' && (
                <div className="flex justify-center border-t border-gray-200 px-6 py-3">
                  <PerPage value={perPage} onChange={setPerPage} />
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Filtr */}
        <aside className="flex w-full shrink-0 flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 xl:w-72">
          {/* Nástroje panelu – přepínací záložky. Další nástroj = nová položka v TOOLS. */}
          <div className="flex border-b border-gray-200 px-3" role="tablist">
            {TOOLS.map(({ key, label, icon: Icon }) => {
              const active = tool === key
              const changed = key === 'filter' ? !!onReset : key === 'sort' ? sort !== 'urgency' || desc : mode !== 'week' || groupBy !== 'none' || hiddenTags.length > 0
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
              <FilterGroup title="Seskupit podle">
                {GROUP_BY.map((g) => (
                  <Radio
                    key={g.key}
                    name="groupBy"
                    checked={groupBy === g.key}
                    onChange={() => changeGroupBy(g.key)}
                    label={
                      <span>
                        {g.label}
                        <span className="block text-xs text-gray-500">{g.hint}</span>
                      </span>
                    }
                  />
                ))}
              </FilterGroup>
              <FilterGroup title="Boxy příznaků">
                {/* Které příznaky mají v hlavním okně vlastní box (nad boxem Všichni pacienti) */}
                {tagLabels.map((label) => (
                  <Checkbox
                    key={label}
                    checked={!hiddenTags.includes(label)}
                    onChange={(v) => changeHiddenTags(v ? hiddenTags.filter((x) => x !== label) : [...hiddenTags, label])}
                    label={<TagLabel programs={db.programs} label={label} />}
                  />
                ))}
                {tagLabels.length === 0 && <p className="text-sm text-gray-500">Šablony nemají žádné příznaky.</p>}
              </FilterGroup>
              {(mode !== 'week' || groupBy !== 'none' || hiddenTags.length > 0) && (
                <button
                  onClick={() => {
                    changeMode('week')
                    changeGroupBy('none')
                    changeHiddenTags([])
                  }}
                  className="mt-6 self-start text-sm font-medium text-primary-600 hover:underline"
                >
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
            {/* Vše = všechna pásma zaškrtnutá (výchozí); odškrtnutí zruší výběr – prázdná skupina nefiltruje */}
            <Checkbox
              checked={SCORE_FILTERS.every((s) => filters.scores.includes(s))}
              onChange={(v) => onChange({ ...filters, scores: v ? [...SCORE_FILTERS] : [] })}
              label="Vše"
            />
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

          <FilterGroup title="Příznak">
            {/* Dnešní příznak pacienta; nic nezaškrtnuto = nefiltruje */}
            {[...tagLabels, ''].map((label) => (
              <Checkbox
                key={label || '-'}
                checked={(filters.tags ?? []).includes(label)}
                onChange={(v) => onChange({ ...filters, tags: toggleIn(filters.tags ?? [], label, v) })}
                label={label ? <TagLabel programs={db.programs} label={label} /> : <span className="text-gray-500">Bez příznaku</span>}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Šablona">
            {/* Rozbalovací výběr více šablon; nic nevybráno = všechny */}
            <MultiSelect
              options={db.programs.map((p) => ({ value: p.id, label: p.name }))}
              value={filters.programIds}
              onChange={(programIds) => onChange({ ...filters, programIds })}
              placeholder="Všechny šablony"
            />
          </FilterGroup>

          </>
          )}

          {panelFooter && <div className="mt-8 border-t border-gray-200 pt-4">{panelFooter}</div>}
          </div>
        </aside>
      </div>

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
