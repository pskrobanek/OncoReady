import { PlusIcon } from '@heroicons/react/20/solid'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, ConfirmModal, cx, Field, PageHeader, Radio, TextInput, useToast } from '../components/ui'
import { DEFAULT_ACTIONS } from '../data/programs'
import { SourceIcon } from '../components/Readiness'
import { fullDate, todayIso } from '../lib/format'
import { approxDays, DEFAULT_END, DEFAULT_SCHEDULE, DEFAULT_START, MAX_COUNT, MONTHS, planDates, UNIT_LABEL, UNITS, unitWord, WEEKDAYS } from '../lib/schedule'
import { useStore } from '../lib/store'
import type { MonitoringProgram, SourceKey, Schedule, ScheduleEnd, ScheduleStart, ScheduleUnit } from '../lib/types'

const SELECT =
  'block w-full rounded-lg border-none bg-white px-3 py-1.5 text-sm leading-6 text-gray-950 shadow-sm outline-none ring-1 ring-gray-950/10 focus:ring-2 focus:ring-primary-600'

const EMPTY: Omit<MonitoringProgram, 'id'> = {
  name: '',
  diagnoses: [],
  tag: '',
  classification: 'nonMD',
  frequencyDays: 7,
  schedule: DEFAULT_SCHEDULE(),
  start: DEFAULT_START(),
  ending: DEFAULT_END(),
  // Diagnózy, klasifikace, tag, pásma a tlačítka Další postup se ve formuláři od 2026-11-20 nezadávají – zůstávají výchozí.
  bands: { green: { min: 0, max: 7 }, yellow: { min: 8, max: 14 }, red: { min: 15, max: null } },
  actions: DEFAULT_ACTIONS(),
  sources: ['questionnaire'],
}

const stepId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Vytvořit / upravit šablonu monitorace (program sledování). */
export function ProgramForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const existing = mode === 'edit' ? store.db.programs.find((p) => p.id === id) : undefined
  const [form, setForm] = useState<Omit<MonitoringProgram, 'id'>>(existing ?? EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (mode === 'edit' && !existing) return <Navigate to="/sablony" replace />

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Toto pole je povinné.'
    if (form.sources.length === 0) e.sources = 'Přidejte alespoň jeden zdroj.'
    const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_COUNT
    const sc = form.schedule
    if (sc.kind === 'regular' && !inRange(sc.every)) e.frequency = `Zadejte číslo od 1 do ${MAX_COUNT}.`
    if (sc.kind === 'custom' && sc.steps.length === 0) e.frequency = 'Přidejte alespoň jeden termín.'
    else if (sc.kind === 'custom' && sc.steps.some((x) => !inRange(x.count))) e.frequency = `U každého termínu zadejte číslo od 1 do ${MAX_COUNT}.`
    if (form.start.kind === 'date' && !form.start.date) e.start = 'Vyberte datum zahájení.'
    if (sc.kind === 'regular' && form.ending.kind === 'count' && !inRange(form.ending.count)) e.ending = `Zadejte počet dotazníků od 1 do ${MAX_COUNT}.`
    if (sc.kind === 'regular' && form.ending.kind === 'duration' && !inRange(form.ending.amount)) e.ending = `Zadejte dobu od 1 do ${MAX_COUNT}.`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) return
    const data = { ...form, frequencyDays: approxDays(form.schedule), name: form.name.trim(), }
    if (existing) {
      store.updateProgram({ ...data, id: existing.id })
      toast('Uloženo')
    } else {
      store.createProgram(data)
      toast('Vytvořeno')
      navigate('/sablony')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={existing ? 'Upravit šablonu' : 'Nová šablona'}
        breadcrumbs={[{ label: 'Šablony', to: '/sablony' }, { label: existing ? 'Upravit' : 'Vytvořit' }]}
        actions={existing && <Button color="danger" onClick={() => setConfirmDelete(true)}>Smazat</Button>}
      />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Card className="p-6">
          <Field label="Název" required error={errors.name}>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
          </Field>
        </Card>

        <FrequencyCard
          schedule={form.schedule}
          ending={form.ending}
          start={form.start}
          errors={errors}
          onStart={(start) => setForm({ ...form, start })}
          onSchedule={(schedule) => setForm({ ...form, schedule })}
          onEnding={(ending) => setForm({ ...form, ending })}
        />

        <SourcesCard value={form.sources} error={errors.sources} onChange={(sources) => setForm({ ...form, sources })} />

        <div className="flex gap-3">
          <Button type="submit">{existing ? 'Uložit' : 'Vytvořit'}</Button>
          <Button color="gray" onClick={() => navigate('/sablony')}>
            Zrušit
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        title="Smazat šablonu"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          store.deleteProgram(existing!.id)
          toast('Smazáno')
          navigate('/sablony')
        }}
      />
    </div>
  )
}

const KINDS: { value: Schedule['kind']; label: string; hint: string }[] = [
  { value: 'once', label: 'Jednorázově', hint: 'Jeden dotazník v den začátku monitorace.' },
  { value: 'regular', label: 'Pravidelně', hint: 'Dotazník se opakuje po zvoleném intervalu.' },
  { value: 'custom', label: 'Vlastní', hint: 'Termíny zadáte po řádcích – každý za určitou dobu od začátku monitorace.' },
]

/** Přepínač z několika tlačítek (stejný vzhled jako Klasifikace). */
function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void; size?: 'md' | 'sm' }) {
  return (
    <div className={cx('grid gap-2', size === 'md' ? 'grid-cols-3' : 'grid-cols-4 sm:max-w-md')}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-lg px-3 text-sm font-semibold ring-1 transition',
            size === 'md' ? 'py-2' : 'py-1.5',
            value === o.value ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-600' : 'bg-white text-gray-700 ring-gray-950/10 hover:bg-gray-50',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const NumberInput = ({ value, onChange, invalid }: { value: number; onChange: (n: number) => void; invalid?: boolean }) => (
  <TextInput type="number" min={1} max={MAX_COUNT} className="!w-20 tabular-nums" value={value || ''} invalid={invalid} onChange={(e) => onChange(Number(e.target.value))} />
)

const UnitSelect = ({ value, count, onChange }: { value: ScheduleUnit; count: number; onChange: (u: ScheduleUnit) => void }) => (
  <select className={cx(SELECT, '!w-auto')} value={value} onChange={(e) => onChange(e.target.value as ScheduleUnit)}>
    {UNITS.map((u) => (
      <option key={u} value={u}>
        {unitWord(count || 5, u)}
      </option>
    ))}
  </select>
)

/** Box Frekvence: Jednorázově / Pravidelně / Vlastní, konec monitorace a náhled termínů. */
function FrequencyCard({
  schedule: sc,
  ending,
  start,
  errors,
  onSchedule,
  onEnding,
  onStart,
}: {
  schedule: Schedule
  ending: ScheduleEnd
  start: ScheduleStart
  errors: Record<string, string>
  onSchedule: (s: Schedule) => void
  onEnding: (e: ScheduleEnd) => void
  onStart: (s: ScheduleStart) => void
}) {
  const set = (patch: Partial<Schedule>) => onSchedule({ ...sc, ...patch })
  const setStep = (id: string, patch: Partial<Schedule['steps'][number]>) => set({ steps: sc.steps.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  const today = todayIso()
  // Náhled počítá od zvoleného data zahájení, při ručním zahájení od dneška.
  const base = start.kind === 'date' && start.date ? start.date : today
  const preview = planDates(sc, ending, base, null, 9)
  const endless = sc.kind === 'regular' && ending.kind === 'never'

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-950">Frekvence</h2>
      <p className="mt-1 text-sm text-gray-500">Jak často se pacientovi automaticky odešle dotazník.</p>

      <div className="mt-6 flex flex-col gap-6">
        {/* Zahájení monitorace: datum z kalendáře, nebo ručně */}
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-5">
          <h3 className="text-sm font-medium text-gray-950">Zahájení monitorace</h3>
          <Radio
            name="start"
            checked={start.kind === 'date'}
            onChange={() => onStart({ ...start, kind: 'date' })}
            label={
              <span className="flex flex-wrap items-center gap-2">
                Datum
                <TextInput
                  type="date"
                  className="!w-44"
                  value={start.date}
                  invalid={!!errors.start}
                  onChange={(e) => onStart({ kind: 'date', date: e.target.value })}
                />
              </span>
            }
          />
          <Radio
            name="start"
            checked={start.kind === 'manual'}
            onChange={() => onStart({ ...start, kind: 'manual' })}
            label={
              <span>
                Aktivovat ručně <span className="font-normal text-gray-500">– monitorace se spustí, až ji u pacienta zapnete</span>
              </span>
            }
          />
          {errors.start && <p className="text-sm text-red-600">{errors.start}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Segmented
            value={sc.kind}
            options={KINDS}
            onChange={(kind) => set({ kind, steps: kind === 'custom' && sc.steps.length === 0 ? [{ id: stepId(), count: 1, unit: 'week' }] : sc.steps })}
          />
          <p className="text-sm text-gray-500">{KINDS.find((k) => k.value === sc.kind)!.hint}</p>
        </div>

        {/* Pravidelně: jednotka, interval a den v týdnu / den v měsíci / měsíc */}
        {sc.kind === 'regular' && (
          <div className="flex flex-col gap-5 border-t border-gray-100 pt-5">
            <Field label="Opakovat po">
              <Segmented size="sm" value={sc.unit} options={UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))} onChange={(unit) => set({ unit })} />
            </Field>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              {sc.every >= 2 && sc.every <= 4 ? 'Každé' : sc.every === 1 ? 'Každý' : 'Každých'}
              <NumberInput value={sc.every} invalid={!!errors.frequency} onChange={(every) => set({ every })} />
              {unitWord(sc.every || 5, sc.unit)}
              <span className="text-gray-400">(1–{MAX_COUNT})</span>
            </div>
            {sc.unit === 'week' && (
              <Field label="Den v týdnu">
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d, i) => (
                    <button
                      type="button"
                      key={d}
                      title={d}
                      onClick={() => set({ weekday: i + 1 })}
                      className={cx(
                        'h-9 w-11 rounded-lg text-sm font-semibold ring-1 transition',
                        sc.weekday === i + 1 ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-600' : 'bg-white text-gray-700 ring-gray-950/10 hover:bg-gray-50',
                      )}
                    >
                      {d.slice(0, 2)}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            {sc.unit === 'month' && (
              <Field label="Den v měsíci" helper="Když měsíc tolik dní nemá, dotazník se odešle poslední den měsíce.">
                <select className={cx(SELECT, '!w-28')} value={sc.monthDay} onChange={(e) => set({ monthDay: Number(e.target.value) })}>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}.
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {sc.unit === 'year' && (
              <Field label="Měsíc" helper="Den v měsíci je stejný jako den začátku monitorace.">
                <select className={cx(SELECT, '!w-44')} value={sc.month} onChange={(e) => set({ month: Number(e.target.value) })}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        )}

        {/* Vlastní: řádky „za N jednotek od začátku monitorace“ */}
        {sc.kind === 'custom' && (
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-5">
            {sc.steps.map((x, i) => (
              <div key={x.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <span className="w-5 shrink-0 text-right tabular-nums text-gray-400">{i + 1}.</span>
                za
                <NumberInput value={x.count} invalid={!!errors.frequency && !(x.count >= 1 && x.count <= MAX_COUNT)} onChange={(count) => setStep(x.id, { count })} />
                <UnitSelect value={x.unit} count={x.count} onChange={(unit) => setStep(x.id, { unit })} />
                od začátku monitorace
                <button
                  type="button"
                  title="Odebrat termín"
                  onClick={() => set({ steps: sc.steps.filter((y) => y.id !== x.id) })}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const last = sc.steps[sc.steps.length - 1]
                set({ steps: [...sc.steps, { id: stepId(), count: last ? last.count + 1 : 1, unit: last?.unit ?? 'week' }] })
              }}
              className="inline-flex items-center gap-1 self-start text-sm font-semibold text-primary-600 hover:underline"
            >
              <PlusIcon className="h-4 w-4" />
              Přidat termín
            </button>
          </div>
        )}
        {errors.frequency && <p className="-mt-3 text-sm text-red-600">{errors.frequency}</p>}

        {/* Konec monitorace – jen u pravidelné frekvence */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5">
          <h3 className="text-sm font-medium text-gray-950">Konec monitorace</h3>
          {sc.kind === 'regular' ? (
            <>
              <Radio name="ending" checked={ending.kind === 'never'} onChange={() => onEnding({ ...ending, kind: 'never' })} label="Nikdy (dotazníky chodí až do konce monitorace pacienta)" />
              <Radio
                name="ending"
                checked={ending.kind === 'count'}
                onChange={() => onEnding({ ...ending, kind: 'count' })}
                label={
                  <span className="flex flex-wrap items-center gap-2 font-normal text-gray-700">
                    <span className="font-medium text-gray-950">Počtem dotazníků</span>
                    <NumberInput value={ending.count} invalid={!!errors.ending && ending.kind === 'count'} onChange={(count) => onEnding({ ...ending, kind: 'count', count })} />
                    {ending.count === 1 ? 'dotazník' : ending.count >= 2 && ending.count <= 4 ? 'dotazníky' : 'dotazníků'}
                  </span>
                }
              />
              <Radio
                name="ending"
                checked={ending.kind === 'duration'}
                onChange={() => onEnding({ ...ending, kind: 'duration' })}
                label={
                  <span className="flex flex-wrap items-center gap-2 font-normal text-gray-700">
                    <span className="font-medium text-gray-950">Dobou</span>
                    <NumberInput value={ending.amount} invalid={!!errors.ending && ending.kind === 'duration'} onChange={(amount) => onEnding({ ...ending, kind: 'duration', amount })} />
                    <UnitSelect value={ending.unit} count={ending.amount} onChange={(unit) => onEnding({ ...ending, kind: 'duration', unit })} />
                    od začátku monitorace
                  </span>
                }
              />
              {errors.ending && <p className="text-sm text-red-600">{errors.ending}</p>}
            </>
          ) : (
            <p className="text-sm text-gray-500">{sc.kind === 'once' ? 'Monitorace končí jediným dotazníkem.' : 'Monitorace končí posledním zadaným termínem.'}</p>
          )}
        </div>

        {/* Náhled termínů při začátku monitorace dnes */}
        {preview.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4 ring-1 ring-gray-950/5">
            <span className="text-sm text-gray-500">
              Náhled – při zahájení {base === today ? `dnes (${fullDate(today)})` : fullDate(base)} {preview.length === 1 ? 'přijde dotazník' : 'přijdou dotazníky'}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {preview.slice(0, 8).map((d) => (
                <span key={d} className="rounded-md bg-white px-2 py-1 text-xs font-medium tabular-nums text-gray-950 ring-1 ring-gray-950/10">
                  {fullDate(d)}
                </span>
              ))}
              {(preview.length > 8 || endless) && <span className="px-1 py-1 text-xs text-gray-500">{endless ? '… a dál až do konce monitorace pacienta' : `… celkem ${planDates(sc, ending, base, null).length}`}</span>}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

/** Zdroje, ze kterých lze počítat připravenost. Další zdroje = nová položka (a jejich zpracování v readiness.ts). */
const SOURCE_OPTIONS: { key: SourceKey; label: string; hint: string }[] = [
  { key: 'questionnaire', label: 'Dotazník', hint: 'Odpovědi pacienta – pásmo podle bodů. Termíny podle frekvence výše.' },
  { key: 'lab', label: 'Laboratoř', hint: 'Krevní obraz a biochemie (neutrofily, trombocyty, hemoglobin, kreatinin, bilirubin).' },
  { key: 'wearables', label: 'Wearables', hint: 'Teplota, saturace, tep a kroky z chytrých hodinek nebo náramku.' },
]

/** Box Zdroje: seznam zvolených zdrojů a tlačítka pro přidání dalších. */
function SourcesCard({ value, error, onChange }: { value: SourceKey[]; error?: string; onChange: (v: SourceKey[]) => void }) {
  const rest = SOURCE_OPTIONS.filter((o) => !value.includes(o.key))
  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-gray-950">Zdroje</h2>
      <p className="mt-1 text-sm text-gray-500">Ze kterých zdrojů se u pacientů s touto šablonou počítá připravenost. Barva pacienta je nejhorší výsledek ze zvolených zdrojů.</p>

      <ul className="mt-6 flex flex-col divide-y divide-gray-100 rounded-lg ring-1 ring-gray-950/10">
        {SOURCE_OPTIONS.filter((o) => value.includes(o.key)).map((o) => (
          <li key={o.key} className="flex items-center gap-3 px-4 py-3">
            <SourceIcon source={o.key} className="h-5 w-5 text-gray-500" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-950">{o.label}</div>
              <div className="text-sm text-gray-500">{o.hint}</div>
            </div>
            <button
              type="button"
              title="Odebrat zdroj"
              onClick={() => onChange(value.filter((x) => x !== o.key))}
              className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </li>
        ))}
        {value.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">Zatím žádný zdroj.</li>}
      </ul>

      {rest.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {rest.map((o) => (
            <button
              type="button"
              key={o.key}
              onClick={() => onChange(SOURCE_OPTIONS.map((x) => x.key).filter((k) => k === o.key || value.includes(k)))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-950 shadow-sm ring-1 ring-gray-950/10 hover:bg-gray-50"
            >
              <PlusIcon className="h-4 w-4 text-gray-400" />
              {o.label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  )
}
