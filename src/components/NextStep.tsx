// Příznak pacienta: tlačítka ze šablony (box Příznaky), která pacientovi nastaví příznak pro dnešní den
// (např. Čekárna, K aplikaci). Používá je sloupec Příznak na Dashboardu i souhrnný prescoring.
import { tableName } from '../lib/format'
import { currentMonitoring, useStore } from '../lib/store'
import type { Monitoring } from '../lib/types'
import { tagIconKey, TagIconView } from './TagIcons'
import { cx, useToast } from './ui'

/** Příznak platí jen v den, kdy byl zvolen – další den je pacient zase bez příznaku. */
export function activeStep(m: Monitoring | undefined) {
  const s = m?.nextStep
  return s && new Date(s.at).toDateString() === new Date().toDateString() ? s : null
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('cs-CZ', { hour: 'numeric', minute: '2-digit' })

/**
 * Tlačítka ze šablony pacienta. Klik nastaví příznak (tlačítko zmodrá, u něj čas volby),
 * klik na jiné tlačítko příznak změní, klik na zvolené ji zruší. Příznak se ukládá k monitoraci pacienta.
 */
export function NextStepButtons({ patientId, row = false }: { patientId: string; row?: boolean }) {
  const { db, setNextStep } = useStore()
  const toast = useToast()
  const patient = db.patients.find((p) => p.id === patientId)
  const mon = currentMonitoring(db, patientId)
  const actions = db.programs.find((p) => p.id === mon?.programId)?.actions ?? []
  const chosen = activeStep(mon)
  // Zvolené tlačítko mohlo být mezitím ze šablony odebráno – příznak zůstane vidět jako text.
  const orphan = chosen && !actions.some((a) => a.id === chosen.actionId)
  if (!patient || !mon) return null
  if (!actions.length && !chosen) return <span className="text-sm text-gray-300" title="Šablona nemá žádné příznaky">—</span>

  return (
    <div className={cx('flex gap-1.5', row ? 'flex-wrap items-center' : 'flex-col items-stretch')}>
      {actions.map((a) => {
        const on = chosen?.actionId === a.id
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={on}
            title={on ? 'Zrušit příznak' : `Označit: ${a.label}`}
            onClick={() => {
              setNextStep(mon.id, on ? null : { actionId: a.id, label: a.label, at: new Date().toISOString() })
              toast(on ? `Příznak zrušen – ${tableName(patient)}` : `${a.label} – ${tableName(patient)}`)
            }}
            className={cx(
              'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm transition',
              on ? 'bg-primary-600 text-white hover:bg-primary-500' : 'bg-white text-gray-950 ring-1 ring-gray-950/10 hover:bg-gray-50',
            )}
          >
            <TagIconView name={tagIconKey(a)} className={cx('h-4 w-4', on ? 'text-white' : 'text-gray-500')} />
            {a.label}
          </button>
        )
      })}
      {chosen && (
        <span className="whitespace-nowrap text-xs text-gray-500">
          {orphan && <span className="font-medium text-gray-700">{chosen.label} · </span>}
          od {timeOf(chosen.at)}
        </span>
      )}
    </div>
  )
}
