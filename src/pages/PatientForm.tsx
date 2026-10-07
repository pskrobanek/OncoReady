import { DocumentPlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { QuestionnaireBadges } from '../components/QuestionnaireBadges'
import { ReportModal } from '../components/ReportModal'
import {
  ActiveIcon,
  Button,
  Card,
  Checkbox,
  CloseButton,
  ConfirmModal,
  Field,
  LinkAction,
  Modal,
  PageHeader,
  PerPage,
  resultsLabel,
  TextInput,
  Toggle,
  useToast,
} from '../components/ui'
import { dateTime, fullDate } from '../lib/format'
import { ESkillResultModal, ScorePill } from '../components/eskill'
import { useOpenESkillTest } from './ESkill'
import { PlayIcon } from '@heroicons/react/20/solid'
import { frequencyLabel } from '../data/programs'
import { eskillOf, questionnairesOf, useStore } from '../lib/store'
import type { ESkillResult, Monitoring, Patient, Questionnaire } from '../lib/types'

const EMPTY: Omit<Patient, 'id'> = { prijmeni: '', jmeno: '', rodneCislo: '', datumNarozeni: '', telefon: '', email: '' }

/** Stránka „Vytvořit Kartotéka“ i „Upravit Kartotéka“ (názvy převzaty 1:1 z produkce). */
export function PatientForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const store = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const existing = mode === 'edit' ? store.db.patients.find((p) => p.id === id) : undefined
  const [form, setForm] = useState<Omit<Patient, 'id'>>(existing ?? EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Patient, string>>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (mode === 'edit' && !existing) return <Navigate to="/kartoteka" replace />

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const validate = () => {
    const e: typeof errors = {}
    const req = 'Toto pole je povinné.'
    if (!form.prijmeni.trim()) e.prijmeni = req
    if (!form.jmeno.trim()) e.jmeno = req
    if (!form.rodneCislo.trim()) e.rodneCislo = req
    if (!form.email.trim()) e.email = req
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Zadejte platnou e-mailovou adresu.'
    if (form.telefon && !/^\d{12}$/.test(form.telefon)) e.telefon = 'Číslo musí být ve formátu 420777888999.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = (another = false) => {
    if (!validate()) return
    if (existing) {
      store.updatePatient({ ...form, id: existing.id })
      toast('Uloženo')
    } else {
      const p = store.createPatient(form)
      toast('Vytvořeno')
      if (another) setForm(EMPTY)
      else navigate(`/kartoteka/${p.id}/upravit`)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={existing ? 'Upravit Kartotéka' : 'Vytvořit Kartotéka'}
        breadcrumbs={[{ label: 'Kartotéka', to: '/kartoteka' }, { label: existing ? 'Upravit' : 'Vytvořit' }]}
        actions={existing && <Button color="danger" onClick={() => setConfirmDelete(true)}>Smazat</Button>}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="flex flex-col gap-6"
      >
        <div className="grid items-start gap-6 md:grid-cols-2">
          <Field label="Příjmení" required error={errors.prijmeni}>
            <TextInput value={form.prijmeni} onChange={set('prijmeni')} invalid={!!errors.prijmeni} />
          </Field>
          <Field label="Jméno" required error={errors.jmeno}>
            <TextInput value={form.jmeno} onChange={set('jmeno')} invalid={!!errors.jmeno} />
          </Field>
          <Field label="Rodné číslo" required error={errors.rodneCislo}>
            <TextInput value={form.rodneCislo} onChange={set('rodneCislo')} invalid={!!errors.rodneCislo} />
          </Field>
          <Field label="Datum narození">
            <TextInput type="date" value={form.datumNarozeni} onChange={set('datumNarozeni')} />
          </Field>
          <Field label="Telefonní číslo" error={errors.telefon}>
            <TextInput value={form.telefon} onChange={set('telefon')} inputMode="numeric" invalid={!!errors.telefon} />
          </Field>
          <Field label="E-mailová adresa" required error={errors.email}>
            <TextInput type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} />
          </Field>
          {/* V produkci je nápověda k telefonu přes celou šířku pod řádkem telefon/e-mail. */}
          <p className="-mt-4 text-sm text-gray-500 md:col-span-2">Zadejte číslo ve formátu 420777888999 (bez +, mezer nebo pomlček).</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">{existing ? 'Uložit' : 'Vytvořit'}</Button>
          {!existing && (
            <Button color="gray" onClick={() => save(true)}>
              Vytvořit a vytvořit další
            </Button>
          )}
          <Button color="gray" onClick={() => navigate('/kartoteka')}>
            Zrušit
          </Button>
        </div>
      </form>

      {existing && <MonitoringsTable patientId={existing.id} />}

      {existing && <ESkillSection patientId={existing.id} />}

      <ConfirmModal
        open={confirmDelete}
        title="Smazat Kartotéka"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          store.deletePatient(existing!.id)
          toast('Smazáno')
          navigate('/kartoteka')
        }}
      />
    </div>
  )
}

// ---------------- Monitorings (relation manager) ----------------

function MonitoringsTable({ patientId }: { patientId: string }) {
  const store = useStore()
  const toast = useToast()
  const monitorings = store.db.monitorings.filter((m) => m.patientId === patientId).sort((a, b) => b.start.localeCompare(a.start))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Monitoring | 'new' | null>(null)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [perPage, setPerPage] = useState(10)
  const [report, setReport] = useState<Questionnaire | null>(null)

  const allChecked = monitorings.length > 0 && monitorings.every((m) => selected.has(m.id))

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <h2 className="text-base font-semibold leading-6 text-gray-950">Monitorings</h2>
        <div className="flex gap-3">
          {selected.size > 0 && (
            <Button color="danger" onClick={() => setDeleting([...selected])}>
              Smazat vybrané ({selected.size})
            </Button>
          )}
          <Button onClick={() => setEditing('new')}>Vytvořit</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
          <thead className="whitespace-nowrap bg-gray-50/50">
            <tr>
              <th className="w-12 px-6 py-3.5">
                <Checkbox checked={allChecked} onChange={(v) => setSelected(v ? new Set(monitorings.map((m) => m.id)) : new Set())} />
              </th>
              <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Monitorace</th>
              <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Start</th>
              <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Konec</th>
              <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Aktivní</th>
              <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Dotazníky</th>
              <th className="px-6 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 whitespace-nowrap">
            {monitorings.slice(0, perPage).map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Checkbox
                    checked={selected.has(m.id)}
                    onChange={(v) =>
                      setSelected((s) => {
                        const n = new Set(s)
                        if (v) n.add(m.id)
                        else n.delete(m.id)
                        return n
                      })
                    }
                  />
                </td>
                <td className="px-3 py-4 text-sm text-gray-950">
                  {store.db.programs.find((p) => p.id === m.programId)?.name ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-4 text-sm text-gray-950">{fullDate(m.start)}</td>
                <td className="px-3 py-4 text-sm text-gray-950">{fullDate(m.end)}</td>
                <td className="px-3 py-4">
                  <ActiveIcon active={m.active} />
                </td>
                <td className="px-3 py-3">
                  <QuestionnaireBadges questionnaires={questionnairesOf(store.db, m.id)} onOpenReport={setReport} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-3">
                    <LinkAction
                      icon={DocumentPlusIcon}
                      onClick={() => {
                        store.createQuestionnaire(m.id)
                        toast('Dotazník vytvořen')
                      }}
                    >
                      Vytvořit dotazník
                    </LinkAction>
                    <LinkAction icon={PencilSquareIcon} onClick={() => setEditing(m)}>
                      Upravit
                    </LinkAction>
                    <LinkAction icon={TrashIcon} color="danger" onClick={() => setDeleting([m.id])}>
                      Smazat
                    </LinkAction>
                  </div>
                </td>
              </tr>
            ))}
            {monitorings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                  Žádné monitorace
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-3">
        <span className="text-sm font-medium text-gray-700">
          {resultsLabel(1, Math.min(perPage, monitorings.length), monitorings.length)}
        </span>
        <PerPage value={perPage} onChange={setPerPage} />
        <span className="hidden w-32 sm:block" />
      </div>

      {editing && (
        <MonitoringModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') {
              store.createMonitoring({ ...data, patientId })
              toast('Vytvořeno')
            } else {
              store.updateMonitoring({ ...editing, ...data })
              toast('Uloženo')
            }
            setEditing(null)
          }}
        />
      )}
      <ConfirmModal
        open={!!deleting}
        title={deleting && deleting.length > 1 ? 'Smazat vybrané' : 'Smazat Monitoring'}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          store.deleteMonitorings(deleting!)
          setSelected(new Set())
          setDeleting(null)
          toast('Smazáno')
        }}
      />
      <ReportModal questionnaire={report} onClose={() => setReport(null)} />
    </Card>
  )
}

function MonitoringModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Monitoring | null
  onClose: () => void
  onSave: (d: { programId: string | null; start: string; end: string; active: boolean }) => void
}) {
  const { db } = useStore()
  const [programId, setProgramId] = useState<string>(initial?.programId ?? '')
  const program = db.programs.find((p) => p.id === programId)
  const [start, setStart] = useState(initial?.start ?? '')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [active, setActive] = useState(initial?.active ?? true)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!start || !end) return setError('Start i Konec jsou povinné.')
    if (end < start) return setError('Konec musí být po začátku.')
    onSave({ programId: programId || null, start, end, active })
  }

  return (
    <Modal open onClose={onClose} width="max-w-xl">
      <div className="flex items-center justify-between px-6 pt-6">
        <h2 className="text-base font-semibold text-gray-950">{initial ? 'Upravit Monitoring' : 'Vytvořit Monitoring'}</h2>
        <CloseButton onClick={onClose} />
      </div>
      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Monitorace">
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="block w-full rounded-lg border-none bg-white px-3 py-1.5 text-sm leading-6 text-gray-950 shadow-sm outline-none ring-1 ring-gray-950/10 focus:ring-2 focus:ring-primary-600"
            >
              <option value="">— bez monitorace —</option>
              {db.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Start" required>
          <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Konec" required>
          <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Toggle checked={active} onChange={setActive} />
          <span className="text-sm font-medium text-gray-950">Aktivní</span>
        </div>
        {!initial && (
          <p className="text-sm text-gray-500 sm:col-span-2">
            Dotazníky se naplánují automaticky: {program ? frequencyLabel(program.frequencyDays).toLowerCase() : 'každých 7 dní'} od
            začátku monitorace.
          </p>
        )}
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </div>
      <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
        <Button onClick={submit}>{initial ? 'Uložit změny' : 'Vytvořit'}</Button>
        <Button color="gray" onClick={onClose}>
          Zrušit
        </Button>
      </div>
    </Modal>
  )
}

// ---------------- e-Skill (výsledky testu digitální gramotnosti) ----------------

function ESkillSection({ patientId }: { patientId: string }) {
  const store = useStore()
  const toast = useToast()
  const openTest = useOpenESkillTest()
  const results = eskillOf(store.db, patientId)
  const [detail, setDetail] = useState<ESkillResult | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <h2 className="text-base font-semibold leading-6 text-gray-950">e-Skill</h2>
        <Button onClick={() => openTest(patientId)}>
          <PlayIcon className="h-4 w-4" />
          Zahájit test
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
          <thead className="whitespace-nowrap bg-gray-50/50">
            <tr>
              {['Datum', 'Digitální gramotnost', 'Motorika', 'Správné úkoly', 'Čas testu'].map((h, i) => (
                <th key={h} className={`${i === 0 ? 'px-6' : 'px-3'} py-3.5 text-start text-sm font-semibold text-gray-950`}>
                  {h}
                </th>
              ))}
              <th className="px-6 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 whitespace-nowrap">
            {results.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setDetail(r)}>
                <td className="px-6 py-4 text-sm text-gray-950">{dateTime(r.takenAt)}</td>
                <td className="px-3 py-4">
                  <ScorePill score={r.literacyScore} />
                </td>
                <td className="px-3 py-4 text-sm tabular-nums text-gray-950">{r.motorScore}</td>
                <td className="px-3 py-4 text-sm tabular-nums text-gray-950">
                  {r.metrics.correctTasks} / {r.metrics.totalTasks}
                </td>
                <td className="px-3 py-4 text-sm tabular-nums text-gray-950">
                  {r.metrics.speed.toFixed(0)} s{r.timedOut && <span className="ml-1 text-xs text-red-600">(limit)</span>}
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-3">
                    <LinkAction icon={TrashIcon} color="danger" onClick={() => setDeleting(r.id)}>
                      Smazat
                    </LinkAction>
                  </div>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                  Pacient zatím test e-Skill nevyplnil
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ESkillResultModal result={detail} onClose={() => setDetail(null)} />
      <ConfirmModal
        open={!!deleting}
        title="Smazat výsledek e-Skill"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          store.deleteEskillResult(deleting!)
          setDeleting(null)
          toast('Smazáno')
        }}
      />
    </Card>
  )
}
