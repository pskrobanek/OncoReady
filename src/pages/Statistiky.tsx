import { Card, cx, PageHeader } from '../components/ui'
import { statusOf } from '../components/QuestionnaireBadges'
import { BAND_META, type Status } from '../lib/scoring'
import { useStore } from '../lib/store'

/**
 * ZÁSTUPNÁ stránka – obsah produkční stránky Statistiky zatím neznáme (chybí screenshot).
 * Ukazuje základní přehled ve stylu Filament „stats overview“.
 */
export function Statistiky() {
  const { db } = useStore()
  const counts = db.questionnaires.reduce<Record<Status, number>>(
    (acc, q) => ({ ...acc, [statusOf(q)]: acc[statusOf(q)] + 1 }),
    { green: 0, yellow: 0, red: 0, blue: 0, na: 0 },
  )
  const filled = db.questionnaires.length - counts.na
  const stats = [
    { label: 'Pacientů v kartotéce', value: db.patients.length },
    { label: 'Aktivních monitorací', value: db.monitorings.filter((m) => m.active).length },
    { label: 'Vyplněných dotazníků', value: filled },
    { label: 'Míra vyplnění', value: db.questionnaires.length ? `${Math.round((filled / db.questionnaires.length) * 100)} %` : '—' },
  ]
  const max = Math.max(1, ...Object.values(counts))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Statistiky" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-6">
            <div className="text-sm font-medium text-gray-500">{s.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">{s.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-950">Dotazníky podle pásma</h2>
        <div className="mt-6 flex flex-col gap-3">
          {(Object.keys(counts) as Status[]).map((s) => (
            <div key={s} className="flex items-center gap-4">
              <span className="w-36 shrink-0 text-sm text-gray-700">{BAND_META[s].label}</span>
              <div className="h-3 flex-1 rounded-full bg-gray-100">
                <div className={cx('h-3 rounded-full', BAND_META[s].dot)} style={{ width: `${(counts[s] / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-semibold tabular-nums text-gray-950">{counts[s]}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-gray-400">Zástupná stránka – podoba produkčních statistik není v MVP zatím známa.</p>
      </Card>
    </div>
  )
}
