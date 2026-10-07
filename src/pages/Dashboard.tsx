import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuestionnaireBadges, statusOf } from '../components/QuestionnaireBadges'
import { ReportModal } from '../components/ReportModal'
import { Card, Checkbox, cx, PageHeader, PerPage, Radio, SearchInput } from '../components/ui'
import { addDays, tableName, todayIso } from '../lib/format'
import { BAND_META, type Status } from '../lib/scoring'
import { currentMonitoring, questionnairesOf, sortPatients, useStore } from '../lib/store'
import type { Questionnaire } from '../lib/types'

const SCORE_FILTERS: Status[] = ['green', 'yellow', 'red', 'blue', 'na']
const DATE_FILTERS = [
  { key: 'all', label: 'Vše', days: null },
  { key: '7', label: 'Poslední týden', days: 7 },
  { key: '10', label: 'Posledních 10 dní', days: 10 },
  { key: '14', label: 'Poslední 2 týdny', days: 14 },
] as const

export function Dashboard() {
  const { db } = useStore()
  const [search, setSearch] = useState('')
  // Výchozí stav filtru podle produkce: červené, vyžádal kontrolu, nevyplněno.
  const [scores, setScores] = useState<Set<Status>>(new Set(['red', 'blue', 'na']))
  const [dateKey, setDateKey] = useState<(typeof DATE_FILTERS)[number]['key']>('all')
  const [perPage, setPerPage] = useState(500)
  const [report, setReport] = useState<Questionnaire | null>(null)

  const rows = useMemo(() => {
    const days = DATE_FILTERS.find((d) => d.key === dateKey)!.days
    const since = days ? addDays(todayIso(), -days) : null
    const term = search.trim().toLowerCase()

    return sortPatients(db.patients)
      .map((patient) => {
        const mon = currentMonitoring(db, patient.id)
        return { patient, mon, qs: mon ? questionnairesOf(db, mon.id) : [] }
      })
      .filter((r) => r.mon && r.qs.length > 0)
      .filter((r) => !term || tableName(r.patient).toLowerCase().includes(term) || r.patient.rodneCislo.includes(term))
      .filter((r) => {
        // Pacient se zobrazí, pokud má alespoň jeden dotazník ve zvoleném pásmu (a v časovém okně).
        if (scores.size === 0 && !since) return true
        return r.qs.some((q) => {
          const st = statusOf(q)
          if (scores.size > 0 && !scores.has(st)) return false
          if (since) {
            const date = q.filledAt ? q.filledAt.slice(0, 10) : q.scheduledFor
            if (date < since || date > todayIso()) return false
          }
          return true
        })
      })
  }, [db, search, scores, dateKey])

  const toggle = (s: Status, on: boolean) =>
    setScores((prev) => {
      const next = new Set(prev)
      if (on) next.add(s)
      else next.delete(s)
      return next
    })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" />

      <Card className="flex flex-col overflow-hidden xl:flex-row">
        {/* Tabulka pacientů */}
        <div className="min-w-0 flex-1 xl:border-r xl:border-gray-200">
          <div className="px-6 py-4">
            <h2 className="text-base font-semibold leading-6 text-gray-950">Patients Table</h2>
          </div>
          <div className="flex justify-end border-t border-gray-200 px-4 py-3 sm:px-6">
            <SearchInput value={search} onChange={setSearch} className="w-full sm:max-w-xs" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-auto divide-y divide-gray-200 text-start">
              <thead className="whitespace-nowrap bg-gray-50/50">
                <tr>
                  <th className="w-56 px-6 py-3.5 text-start text-sm font-semibold text-gray-950">Celé jméno</th>
                  <th className="w-32 px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Rodné číslo</th>
                  <th className="px-3 py-3.5 text-start text-sm font-semibold text-gray-950">Dotazníky</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 whitespace-nowrap">
                {rows.slice(0, perPage).map(({ patient, qs }) => {
                  const latest = statusOf(qs[0])
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      {/* Barevný proužek vlevo = stav nejnovějšího dotazníku */}
                      <td className={cx('px-6 py-4 text-sm text-gray-950', BAND_META[latest].stripe)}>
                        <Link to={`/kartoteka/${patient.id}/upravit`} className="hover:underline">
                          {tableName(patient)} →
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-950">{patient.rodneCislo}</td>
                      <td className="px-3 py-3">
                        <QuestionnaireBadges questionnaires={qs} onOpenReport={setReport} />
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500">
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
        <aside className="w-full shrink-0 border-t border-gray-200 px-6 py-4 xl:w-72 xl:border-t-0">
          <h2 className="text-base font-semibold leading-6 text-gray-950">Filtrovat</h2>
          <div className="mt-5">
            <h3 className="mb-3 text-sm font-medium text-gray-950">Skóre</h3>
            <div className="flex flex-col gap-3">
              {SCORE_FILTERS.map((s) => (
                <Checkbox
                  key={s}
                  checked={scores.has(s)}
                  onChange={(v) => toggle(s, v)}
                  label={
                    <span className="flex items-center gap-2">
                      {BAND_META[s].label}
                      <span className={cx('h-2.5 w-2.5 rounded-full', BAND_META[s].dot)} />
                    </span>
                  }
                />
              ))}
            </div>
          </div>
          <div className="mt-7">
            <h3 className="mb-3 text-sm font-medium text-gray-950">Datum vyplnění</h3>
            <div className="flex flex-col gap-3">
              {DATE_FILTERS.map((d) => (
                <Radio key={d.key} name="date" checked={dateKey === d.key} onChange={() => setDateKey(d.key)} label={d.label} />
              ))}
            </div>
          </div>
        </aside>
      </Card>

      <ReportModal questionnaire={report} onClose={() => setReport(null)} />
    </div>
  )
}
