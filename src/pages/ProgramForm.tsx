import { XMarkIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BandBar } from '../components/programs'
import { Button, Card, ConfirmModal, cx, Field, PageHeader, TextInput, useToast } from '../components/ui'
import { CLASSIFICATIONS, DIAGNOSES, diagnosisName, FREQUENCIES, MAX_SCORE } from '../data/programs'
import { useStore } from '../lib/store'
import type { Classification, MonitoringProgram } from '../lib/types'

const SELECT =
  'block w-full rounded-lg border-none bg-white px-3 py-1.5 text-sm leading-6 text-gray-950 shadow-sm outline-none ring-1 ring-gray-950/10 focus:ring-2 focus:ring-primary-600'

const EMPTY: Omit<MonitoringProgram, 'id'> = {
  name: '',
  diagnoses: [],
  tag: '',
  classification: 'nonMD',
  frequencyDays: 7,
  bands: { green: { min: 0, max: 7 }, yellow: { min: 8, max: 14 }, red: { min: 15, max: null } },
}

/** Vytvořit / upravit monitoraci (program sledování). */
export function ProgramForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const existing = mode === 'edit' ? store.db.programs.find((p) => p.id === id) : undefined
  const [form, setForm] = useState<Omit<MonitoringProgram, 'id'>>(existing ?? EMPTY)
  const [customFreq, setCustomFreq] = useState(!FREQUENCIES.some((f) => f.days === form.frequencyDays))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (mode === 'edit' && !existing) return <Navigate to="/monitorace" replace />

  // Pásma se zadávají dvěma hranicemi, takže se nepřekrývají a nemají mezery.
  const greenMax = form.bands.green.max ?? 0
  const yellowMax = form.bands.yellow.max ?? 0
  const setBounds = (g: number, y: number) =>
    setForm({
      ...form,
      bands: { green: { min: 0, max: g }, yellow: { min: g + 1, max: y }, red: { min: y + 1, max: null } },
    })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Toto pole je povinné.'
    if (form.diagnoses.length === 0) e.diagnoses = 'Vyberte alespoň jednu diagnózu.'
    if (!form.frequencyDays || form.frequencyDays < 1) e.frequency = 'Zadejte počet dní (alespoň 1).'
    if (greenMax < 0) e.bands = 'Zelené pásmo musí končit na 0 nebo více bodech.'
    else if (yellowMax <= greenMax) e.bands = 'Žluté pásmo musí končit výš než zelené.'
    else if (yellowMax >= MAX_SCORE) e.bands = `Žluté pásmo musí končit pod maximem dotazníku (${MAX_SCORE} b).`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) return
    const data = { ...form, name: form.name.trim(), tag: form.tag.trim() }
    if (existing) {
      store.updateProgram({ ...data, id: existing.id })
      toast('Uloženo')
    } else {
      store.createProgram(data)
      toast('Vytvořeno')
      navigate('/monitorace')
    }
  }

  const availableDx = DIAGNOSES.filter((d) => !form.diagnoses.includes(d.code))
  const usedTags = [...new Set(store.db.programs.map((p) => p.tag).filter(Boolean))]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={existing ? 'Upravit monitoraci' : 'Nová monitorace'}
        breadcrumbs={[{ label: 'Monitorace', to: '/monitorace' }, { label: existing ? 'Upravit' : 'Vytvořit' }]}
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
          <div className="grid items-start gap-6 md:grid-cols-2">
            <Field label="Název" required error={errors.name}>
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
            </Field>
            <Field label="Tag" helper="Krátký štítek pro filtrování, např. Prs, ORL, Studie.">
              <TextInput list="tags" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
              <datalist id="tags">
                {usedTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>

            <div className="md:col-span-2">
              <Field label="Diagnózy" required error={errors.diagnoses}>
                <div
                  className={cx(
                    'flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1',
                    errors.diagnoses ? 'ring-red-600' : 'ring-gray-950/10',
                  )}
                >
                  {form.diagnoses.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-md bg-primary-50 py-0.5 pl-2 pr-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-600/20">
                      <span className="font-mono">{c}</span>
                      <span className="hidden text-primary-600/80 sm:inline">{diagnosisName(c)}</span>
                      <button
                        type="button"
                        title="Odebrat"
                        onClick={() => setForm({ ...form, diagnoses: form.diagnoses.filter((x) => x !== c) })}
                        className="rounded text-primary-500 hover:bg-primary-100"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => e.target.value && setForm({ ...form, diagnoses: [...form.diagnoses, e.target.value] })}
                    className="min-w-[12rem] flex-1 border-none bg-transparent py-0.5 text-sm text-gray-500 outline-none"
                  >
                    <option value="">+ Přidat diagnózu (MKN-10)…</option>
                    {availableDx.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} – {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            <Field label="Klasifikace" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CLASSIFICATIONS.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    title={c.hint}
                    onClick={() => setForm({ ...form, classification: c.value as Classification })}
                    className={cx(
                      'rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition',
                      form.classification === c.value
                        ? 'bg-primary-50 text-primary-700 ring-2 ring-primary-600'
                        : 'bg-white text-gray-700 ring-gray-950/10 hover:bg-gray-50',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500">{CLASSIFICATIONS.find((c) => c.value === form.classification)!.hint}</p>
            </Field>

            <Field label="Frekvence odesílání" required error={errors.frequency}>
              <div className="flex gap-3">
                <select
                  className={SELECT}
                  value={customFreq ? 'custom' : String(form.frequencyDays)}
                  onChange={(e) => {
                    if (e.target.value === 'custom') setCustomFreq(true)
                    else {
                      setCustomFreq(false)
                      setForm({ ...form, frequencyDays: Number(e.target.value) })
                    }
                  }}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.days} value={f.days}>
                      {f.label}
                    </option>
                  ))}
                  <option value="custom">Vlastní interval…</option>
                </select>
                {customFreq && (
                  <div className="flex shrink-0 items-center gap-2 text-sm text-gray-500">
                    každých
                    <TextInput
                      type="number"
                      min={1}
                      className="!w-20"
                      value={form.frequencyDays}
                      onChange={(e) => setForm({ ...form, frequencyDays: Number(e.target.value) })}
                    />
                    dní
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">Jak často se pacientovi automaticky odešle dotazník.</p>
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-950">Rozsah pásem</h2>
          <p className="mt-1 text-sm text-gray-500">
            Celkové skóre dotazníku (0–{MAX_SCORE} b) se zařadí do pásma podle těchto hranic.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <BandInput dot="bg-emerald-500" label="Zelené pásmo" from={0}>
              <TextInput type="number" min={0} className="!w-20" value={greenMax} onChange={(e) => setBounds(Number(e.target.value), yellowMax)} />
            </BandInput>
            <BandInput dot="bg-amber-400" label="Žluté pásmo" from={greenMax + 1}>
              <TextInput type="number" min={greenMax + 1} className="!w-20" value={yellowMax} onChange={(e) => setBounds(greenMax, Number(e.target.value))} />
            </BandInput>
            <BandInput dot="bg-red-600" label="Červené pásmo" from={yellowMax + 1} />
          </div>
          <div className="mt-6">
            <BandBar bands={form.bands} />
          </div>
          {errors.bands && <p className="mt-3 text-sm text-red-600">{errors.bands}</p>}
          <p className="mt-4 text-xs text-gray-400">
            ⚠️ Modré pásmo („Vyžádal kontrolu“) nezávisí na skóre – nastaví ho odpověď pacienta.
          </p>
        </Card>

        <div className="flex gap-3">
          <Button type="submit">{existing ? 'Uložit' : 'Vytvořit'}</Button>
          <Button color="gray" onClick={() => navigate('/monitorace')}>
            Zrušit
          </Button>
        </div>
      </form>

      <ConfirmModal
        open={confirmDelete}
        title="Smazat monitoraci"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          store.deleteProgram(existing!.id)
          toast('Smazáno')
          navigate('/monitorace')
        }}
      />
    </div>
  )
}

function BandInput({ dot, label, from, children }: { dot: string; label: string; from: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-950/5">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-950">
        <span className={cx('h-2.5 w-2.5 rounded-full', dot)} />
        {label}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 tabular-nums">
        od <span className="w-6 font-semibold text-gray-950">{from}</span>
        {children ? <>do {children}</> : <span className="py-1.5">a více</span>}
      </div>
    </div>
  )
}
