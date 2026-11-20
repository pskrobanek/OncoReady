// Šablony › Dotazníky: vlevo box s menu (Přehled, Statické, Dynamické, Vlastní), vpravo obsah.
import { FlagIcon, LockClosedIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { copyOf, CustomList, EditorView, LibraryCard, newQuestion, PreviewView } from '../components/QuestionnairePicker'
import { Button, Card, cx, Modal, PageHeader } from '../components/ui'
import { KIND_META, LIBRARY, type LibraryQuestionnaire } from '../data/questionnaireLibrary'
import { useStore } from '../lib/store'
import type { QuestionnaireDef } from '../lib/types'

type Tab = 'prehled' | 'staticke' | 'dynamicke' | 'vlastni'
const TABS: { key: Tab; label: string; to: string }[] = [
  { key: 'prehled', label: 'Přehled', to: '/sablony/dotazniky' },
  { key: 'staticke', label: 'Statické', to: '/sablony/dotazniky/staticke' },
  { key: 'dynamicke', label: 'Dynamické', to: '/sablony/dotazniky/dynamicke' },
  { key: 'vlastni', label: 'Vlastní', to: '/sablony/dotazniky/vlastni' },
]

type Dialog = { kind: 'view'; q: LibraryQuestionnaire } | { kind: 'edit'; q: QuestionnaireDef } | null

export function Dotazniky() {
  const { tab = 'prehled' } = useParams()
  const { db } = useStore()
  const [dialog, setDialog] = useState<Dialog>(null)
  if (!TABS.some((t) => t.key === tab)) return <Navigate to="/sablony/dotazniky" replace />

  const usage = (id: string) => db.programs.filter((p) => p.questionnaireId === id).length
  const counts: Record<Tab, number> = {
    prehled: LIBRARY.length + db.customQuestionnaires.length,
    staticke: LIBRARY.filter((q) => q.kind === 'static').length,
    dynamicke: LIBRARY.filter((q) => q.kind === 'dynamic').length,
    vlastni: db.customQuestionnaires.length,
  }
  const newCustom = () => setDialog({ kind: 'edit', q: { id: '', name: '', description: '', questions: [newQuestion()] } })
  const current = TABS.find((t) => t.key === tab)!

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dotazníky"
        breadcrumbs={[{ label: 'Šablony', to: '/sablony' }, { label: 'Dotazníky', to: '/sablony/dotazniky' }, { label: current.label }]}
        actions={<Button onClick={newCustom}>Nový dotazník</Button>}
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Box s menu */}
        <Card className="shrink-0 p-2 md:w-56">
          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
            {TABS.map((t) => (
              <NavLink
                key={t.key}
                to={t.to}
                end
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-75',
                    isActive ? 'bg-gray-100 text-primary-600' : 'text-gray-700 hover:bg-gray-50',
                  )
                }
              >
                {t.label}
                <span className="text-xs tabular-nums text-gray-400">{counts[t.key]}</span>
              </NavLink>
            ))}
          </nav>
        </Card>

        {/* Obsah */}
        <div className="min-w-0 flex-1">
          {tab === 'prehled' && <Overview usage={usage} />}
          {(tab === 'staticke' || tab === 'dynamicke') && (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-950">{KIND_META[tab === 'staticke' ? 'static' : 'dynamic'].label} dotazníky</h2>
              <p className="mt-1 text-sm text-gray-500">{KIND_META[tab === 'staticke' ? 'static' : 'dynamic'].hint}</p>
              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {LIBRARY.filter((q) => q.kind === (tab === 'staticke' ? 'static' : 'dynamic')).map((q) => (
                  <LibraryCard key={q.id} q={q} usage={usage(q.id)} onView={() => setDialog({ kind: 'view', q })} />
                ))}
              </div>
            </Card>
          )}
          {tab === 'vlastni' && (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-gray-950">Vlastní dotazníky</h2>
              <p className="mt-1 text-sm text-gray-500">{KIND_META.custom.hint}</p>
              <div className="mt-3">
                <CustomList onEdit={(q) => setDialog({ kind: 'edit', q })} />
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={!!dialog} onClose={() => setDialog(null)} width="max-w-5xl">
        {dialog?.kind === 'view' && <PreviewView q={dialog.q} onCopy={() => setDialog({ kind: 'edit', q: copyOf(dialog.q) })} onClose={() => setDialog(null)} />}
        {dialog?.kind === 'edit' && <EditorView key={dialog.q.id || 'new'} initial={dialog.q} saveLabel="Uložit" onSaved={() => setDialog(null)} onClose={() => setDialog(null)} />}
      </Modal>
    </div>
  )
}

/** Přehled: tři druhy dotazníků a tabulka všech dotazníků. */
function Overview({ usage }: { usage: (id: string) => number }) {
  const { db } = useStore()
  const rows = [
    ...LIBRARY.map((q) => ({ id: q.id, name: q.name, kind: q.kind, items: q.licensed ? q.items : q.questions.length, licensed: q.licensed, flags: flagsOf(q) })),
    ...db.customQuestionnaires.map((q) => ({ id: q.id, name: q.name, kind: 'custom' as const, items: q.questions.length, licensed: false, flags: flagsOf(q) })),
  ]
  const KIND_TO: Record<'static' | 'dynamic' | 'custom', string> = { static: '/sablony/dotazniky/staticke', dynamic: '/sablony/dotazniky/dynamicke', custom: '/sablony/dotazniky/vlastni' }
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {(['static', 'dynamic', 'custom'] as const).map((k) => (
          <NavLink key={k} to={KIND_TO[k]} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-950/5 transition hover:ring-gray-950/10">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-gray-950">{KIND_META[k].label}</span>
              <span className="text-2xl font-semibold tabular-nums text-gray-950">{rows.filter((r) => r.kind === k).length}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{KIND_META[k].hint}</p>
          </NavLink>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 text-start">
            <thead className="whitespace-nowrap bg-gray-50/50">
              <tr>
                {['Název', 'Druh', 'Otázky', 'Red flagy', 'Použito v šablonách'].map((h, i) => (
                  <th key={h} className={cx(i === 0 ? 'px-6' : 'px-3', 'py-3.5 text-start text-sm font-semibold text-gray-950')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-950">
                    <span className="inline-flex items-center gap-1.5">
                      {r.name}
                      {r.licensed && <LockClosedIcon className="h-3.5 w-3.5 text-amber-600" title="Licence" />}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-600">{KIND_META[r.kind].label.replace(/é$/, 'ý')}</td>
                  <td className="px-3 py-3.5 text-sm tabular-nums text-gray-600">{r.items || '—'}</td>
                  <td className="px-3 py-3.5 text-sm tabular-nums">
                    {r.flags > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <FlagIcon className="h-3.5 w-3.5" />
                        {r.flags}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-sm tabular-nums text-gray-600">{usage(r.id) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

const flagsOf = (q: QuestionnaireDef) => q.questions.reduce((n, x) => n + x.answers.filter((a) => a.redFlag).length, 0)
