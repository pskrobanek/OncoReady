// Detail zdroje Dotazník v šabloně: výběr předpřipraveného dotazníku z knihovny, nebo založení vlastního
// (otázky, odpovědi, body a red flag).
import { ArrowLeftIcon, CheckIcon, FlagIcon as FlagSolid, LockClosedIcon, PlusIcon } from '@heroicons/react/20/solid'
import { DocumentDuplicateIcon, FlagIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { LIBRARY, type LibraryQuestionnaire } from '../data/questionnaireLibrary'
import { useStore } from '../lib/store'
import type { QAnswerDef, QQuestionDef, QuestionnaireDef } from '../lib/types'
import { Button, CloseButton, ConfirmModal, cx, Field, Modal, TextInput, useToast } from './ui'

const nid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const newAnswer = (points = 0): QAnswerDef => ({ id: nid('a'), text: '', points, redFlag: false })
const newQuestion = (): QQuestionDef => ({ id: nid('q'), text: '', answers: [newAnswer(0), newAnswer(1)] })

/** Kopie dotazníku s novými id (pro „Duplikovat jako vlastní“). */
const copyOf = (q: QuestionnaireDef): QuestionnaireDef => ({
  id: '',
  name: `${q.name} (kopie)`,
  description: q.description,
  questions: q.questions.map((x) => ({ ...x, id: nid('q'), answers: x.answers.map((a) => ({ ...a, id: nid('a') })) })),
})

const stats = (q: QuestionnaireDef) => {
  const max = q.questions.reduce((sum, x) => sum + Math.max(0, ...x.answers.map((a) => a.points)), 0)
  const flags = q.questions.reduce((n, x) => n + x.answers.filter((a) => a.redFlag).length, 0)
  return { max, flags }
}
const plural = (n: number, f: [string, string, string]) => (n === 1 ? f[0] : n >= 2 && n <= 4 ? f[1] : f[2])
const questionsText = (n: number) => `${n} ${plural(n, ['otázka', 'otázky', 'otázek'])}`

type View = { kind: 'list' } | { kind: 'view'; q: LibraryQuestionnaire } | { kind: 'edit'; q: QuestionnaireDef }

/** Velké okno „Dotazník“ – otevírá se ze zdroje Dotazník v šabloně. */
export function QuestionnairePicker({ open, value, onSelect, onClose }: { open: boolean; value: string; onSelect: (id: string) => void; onClose: () => void }) {
  const [view, setView] = useState<View>({ kind: 'list' })
  const close = () => {
    setView({ kind: 'list' })
    onClose()
  }
  const select = (id: string) => {
    onSelect(id)
    close()
  }
  return (
    <Modal open={open} onClose={close} width="max-w-5xl">
      {view.kind === 'list' && <ListView value={value} onSelect={select} onView={(q) => setView({ kind: 'view', q })} onEdit={(q) => setView({ kind: 'edit', q })} onClose={close} />}
      {view.kind === 'view' && <PreviewView q={view.q} selected={value === view.q.id} onSelect={select} onCopy={() => setView({ kind: 'edit', q: copyOf(view.q) })} onBack={() => setView({ kind: 'list' })} onClose={close} />}
      {view.kind === 'edit' && <EditorView initial={view.q} onSaved={select} onBack={() => setView({ kind: 'list' })} onClose={close} />}
    </Modal>
  )
}

function Header({ title, subtitle, onBack, onClose }: { title: string; subtitle?: string; onBack?: () => void; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
      <div className="min-w-0">
        {onBack && (
          <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-4 w-4" />
            Zpět na výběr
          </button>
        )}
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <CloseButton onClick={onClose} />
    </div>
  )
}

const SelectButton = ({ selected, onClick, disabled }: { selected: boolean; onClick: () => void; disabled?: boolean }) =>
  selected ? (
    <span className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700 ring-1 ring-inset ring-primary-600/30">
      <CheckIcon className="h-4 w-4" />
      Vybráno
    </span>
  ) : (
    <Button onClick={onClick} disabled={disabled}>
      Vybrat
    </Button>
  )

/** Přehled: předpřipravené dotazníky a vlastní dotazníky. */
function ListView({
  value,
  onSelect,
  onView,
  onEdit,
  onClose,
}: {
  value: string
  onSelect: (id: string) => void
  onView: (q: LibraryQuestionnaire) => void
  onEdit: (q: QuestionnaireDef) => void
  onClose: () => void
}) {
  const { db, deleteCustomQuestionnaire } = useStore()
  const toast = useToast()
  const [deleting, setDeleting] = useState<string | null>(null)
  return (
    <>
      <Header title="Dotazník" subtitle="Vyberte předpřipravený dotazník, nebo založte vlastní s otázkami, odpověďmi, body a red flagy." onClose={onClose} />
      <div className="flex flex-col gap-8 overflow-y-auto px-6 py-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-950">Předpřipravené</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {LIBRARY.map((q) => (
              <div key={q.id} className={cx('flex flex-col gap-3 rounded-lg p-4 ring-1', value === q.id ? 'ring-2 ring-primary-600' : 'ring-gray-950/10')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-950">{q.name}</div>
                    <div className="text-xs text-gray-500">
                      {q.publisher}
                      {q.items > 0 && ` · ${questionsText(q.items)}`}
                    </div>
                  </div>
                  {q.licensed && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20" title="Znění je chráněné licencí – vloží se po jejím získání">
                      <LockClosedIcon className="h-3.5 w-3.5" />
                      Licence
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{q.description}</p>
                <ul className="list-disc pl-5 text-xs text-gray-500">
                  {q.scales.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                  <SelectButton selected={value === q.id} onClick={() => onSelect(q.id)} />
                  {!q.licensed && (
                    <button type="button" onClick={() => onView(q)} className="text-sm font-semibold text-primary-600 hover:underline">
                      Zobrazit otázky
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-950">Vlastní dotazníky</h3>
            <Button color="gray" onClick={() => onEdit({ id: '', name: '', description: '', questions: [newQuestion()] })}>
              <PlusIcon className="h-4 w-4" />
              Nový dotazník
            </Button>
          </div>
          {db.customQuestionnaires.length === 0 ? (
            <p className="mt-3 rounded-lg px-4 py-6 text-center text-sm text-gray-500 ring-1 ring-dashed ring-gray-300">
              Zatím žádný vlastní dotazník. Založte nový, nebo zkopírujte předpřipravený (Zobrazit otázky → Duplikovat jako vlastní).
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 rounded-lg ring-1 ring-gray-950/10">
              {db.customQuestionnaires.map((q) => {
                const st = stats(q)
                return (
                  <li key={q.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-3', value === q.id && 'bg-primary-50/50')}>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-950">{q.name}</div>
                      <div className="text-xs text-gray-500">
                        {questionsText(q.questions.length)} · max. {st.max} b
                        {st.flags > 0 && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-red-600">
                            · <FlagSolid className="h-3 w-3" /> {st.flags} red flag
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" title="Upravit" onClick={() => onEdit(q)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button type="button" title="Smazat" onClick={() => setDeleting(q.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    <SelectButton selected={value === q.id} onClick={() => onSelect(q.id)} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
      <ConfirmModal
        open={!!deleting}
        title="Smazat dotazník"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          deleteCustomQuestionnaire(deleting!)
          if (value === deleting) onSelect(LIBRARY[0].id)
          setDeleting(null)
          toast('Smazáno')
        }}
      />
    </>
  )
}

/** Náhled předpřipraveného dotazníku (jen pro čtení). */
function PreviewView({ q, selected, onSelect, onCopy, onBack, onClose }: { q: LibraryQuestionnaire; selected: boolean; onSelect: (id: string) => void; onCopy: () => void; onBack: () => void; onClose: () => void }) {
  const st = stats(q)
  return (
    <>
      <Header title={q.name} subtitle={`${q.publisher} · ${questionsText(q.questions.length)} · max. ${st.max} b · ${st.flags} red flag`} onBack={onBack} onClose={onClose} />
      <ol className="flex flex-col gap-4 overflow-y-auto px-6 py-6">
        {q.questions.map((x, i) => (
          <li key={x.id} className="rounded-lg p-4 ring-1 ring-gray-950/10">
            <div className="text-sm font-medium text-gray-950">
              {i + 1}. {x.text}
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {x.answers.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-10 shrink-0 text-right tabular-nums text-gray-500">{a.points} b</span>
                  <span className="min-w-0 flex-1">{a.text}</span>
                  {a.redFlag && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                      <FlagSolid className="h-3.5 w-3.5" />
                      Red flag
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-6 py-4">
        <SelectButton selected={selected} onClick={() => onSelect(q.id)} />
        <Button color="gray" onClick={onCopy}>
          <DocumentDuplicateIcon className="h-4 w-4" />
          Duplikovat jako vlastní
        </Button>
      </div>
    </>
  )
}

/** Editor vlastního dotazníku: název, popis, otázky → odpovědi s body a red flagem. */
function EditorView({ initial, onSaved, onBack, onClose }: { initial: QuestionnaireDef; onSaved: (id: string) => void; onBack: () => void; onClose: () => void }) {
  const { saveCustomQuestionnaire } = useStore()
  const toast = useToast()
  const [q, setQ] = useState<QuestionnaireDef>(initial)
  const [tried, setTried] = useState(false)

  const setQuestion = (id: string, patch: Partial<QQuestionDef>) => setQ({ ...q, questions: q.questions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  const setAnswer = (qid: string, aid: string, patch: Partial<QAnswerDef>) =>
    setQ({ ...q, questions: q.questions.map((x) => (x.id === qid ? { ...x, answers: x.answers.map((a) => (a.id === aid ? { ...a, ...patch } : a)) } : x)) })

  const validate = () => {
    if (!q.name.trim()) return 'Vyplňte název dotazníku.'
    if (q.questions.length === 0) return 'Přidejte alespoň jednu otázku.'
    if (q.questions.some((x) => !x.text.trim())) return 'Vyplňte znění všech otázek.'
    if (q.questions.some((x) => x.answers.length < 2)) return 'Každá otázka musí mít alespoň dvě odpovědi.'
    if (q.questions.some((x) => x.answers.some((a) => !a.text.trim()))) return 'Vyplňte text všech odpovědí.'
    if (q.questions.some((x) => x.answers.some((a) => !Number.isInteger(a.points) || a.points < 0 || a.points > 99))) return 'Body musí být celé číslo 0–99.'
    return null
  }
  const save = () => {
    setTried(true)
    if (validate()) return
    const saved = saveCustomQuestionnaire({
      ...q,
      name: q.name.trim(),
      description: q.description.trim(),
      questions: q.questions.map((x) => ({ ...x, text: x.text.trim(), answers: x.answers.map((a) => ({ ...a, text: a.text.trim() })) })),
    })
    toast(initial.id ? 'Dotazník uložen' : 'Dotazník vytvořen')
    onSaved(saved.id)
  }
  const st = stats(q)
  // Chyba se po prvním pokusu o uložení přepočítává při každé změně.
  const error = tried ? validate() : null

  return (
    <>
      <Header title={initial.id ? 'Upravit dotazník' : 'Nový dotazník'} subtitle={`${questionsText(q.questions.length)} · max. ${st.max} b · ${st.flags} red flag`} onBack={onBack} onClose={onClose} />
      <div className="flex flex-col gap-6 overflow-y-auto px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Název" required>
            <TextInput value={q.name} invalid={tried && !q.name.trim()} placeholder="např. Kontrola před chemoterapií" onChange={(e) => setQ({ ...q, name: e.target.value })} />
          </Field>
          <Field label="Popis">
            <TextInput value={q.description} placeholder="K čemu dotazník slouží" onChange={(e) => setQ({ ...q, description: e.target.value })} />
          </Field>
        </div>

        <ol className="flex flex-col gap-4">
          {q.questions.map((x, i) => (
            <li key={x.id} className="rounded-lg bg-gray-50 p-4 ring-1 ring-gray-950/5">
              <div className="flex items-start gap-3">
                <span className="mt-2 w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-400">{i + 1}.</span>
                <TextInput value={x.text} invalid={tried && !x.text.trim()} placeholder="Znění otázky" onChange={(e) => setQuestion(x.id, { text: e.target.value })} />
                <button type="button" title="Odebrat otázku" onClick={() => setQ({ ...q, questions: q.questions.filter((y) => y.id !== x.id) })} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 pl-9">
                <div className="grid grid-cols-[1fr_5rem_6.5rem_2.25rem] items-center gap-x-2 gap-y-2">
                  <span className="text-xs font-medium text-gray-500">Odpověď</span>
                  <span className="text-xs font-medium text-gray-500">Body</span>
                  <span className="text-xs font-medium text-gray-500">Red flag</span>
                  <span />
                  {x.answers.map((a) => (
                    <AnswerRow
                      key={a.id}
                      a={a}
                      tried={tried}
                      onChange={(patch) => setAnswer(x.id, a.id, patch)}
                      onRemove={() => setQuestion(x.id, { answers: x.answers.filter((b) => b.id !== a.id) })}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setQuestion(x.id, { answers: [...x.answers, newAnswer(x.answers.length)] })}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline"
                >
                  <PlusIcon className="h-4 w-4" />
                  Přidat odpověď
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setQ({ ...q, questions: [...q.questions, newQuestion()] })}
          className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-3 text-sm font-semibold text-primary-600 ring-1 ring-dashed ring-gray-300 hover:bg-gray-50"
        >
          <PlusIcon className="h-4 w-4" />
          Přidat otázku
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-6 py-4">
        <Button onClick={save}>Uložit a vybrat</Button>
        <Button color="gray" onClick={onBack}>
          Zrušit
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </>
  )
}

function AnswerRow({ a, tried, onChange, onRemove }: { a: QAnswerDef; tried: boolean; onChange: (p: Partial<QAnswerDef>) => void; onRemove: () => void }) {
  return (
    <>
      <TextInput value={a.text} invalid={tried && !a.text.trim()} placeholder="Text odpovědi" onChange={(e) => onChange({ text: e.target.value })} />
      <TextInput type="number" min={0} max={99} className="tabular-nums" value={Number.isNaN(a.points) ? '' : a.points} onChange={(e) => onChange({ points: e.target.value === '' ? NaN : Number(e.target.value) })} />
      <button
        type="button"
        aria-pressed={a.redFlag}
        title={a.redFlag ? 'Red flag – kliknutím zrušíte' : 'Označit jako red flag'}
        onClick={() => onChange({ redFlag: !a.redFlag })}
        className={cx(
          'inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold ring-1 transition',
          a.redFlag ? 'bg-red-50 text-red-700 ring-red-600/40' : 'bg-white text-gray-400 ring-gray-950/10 hover:text-gray-600',
        )}
      >
        {a.redFlag ? <FlagSolid className="h-4 w-4" /> : <FlagIcon className="h-4 w-4" />}
        {a.redFlag ? 'Ano' : 'Ne'}
      </button>
      <button type="button" title="Odebrat odpověď" onClick={onRemove} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600">
        <TrashIcon className="h-4 w-4" />
      </button>
    </>
  )
}
