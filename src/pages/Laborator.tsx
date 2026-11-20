// Šablony › Laboratoř: parametry laboratoře a meze, podle kterých se počítá barva zdroje Laboratoř (jen pro čtení).
import { Card, PageHeader } from '../components/ui'
import { num } from '../lib/format'
import { FRESH_DAYS, LAB_PARAMS } from '../lib/readiness'

export function Laborator() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Laboratoř" breadcrumbs={[{ label: 'Šablony', to: '/sablony' }, { label: 'Laboratoř' }]} />
      <Card className="overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-base font-semibold text-gray-950">Parametry a meze</h2>
          <p className="mt-1 text-sm text-gray-500">
            Podle těchto mezí se barví zdroj Laboratoř u pacientů. Výsledek se počítá jako aktuální {FRESH_DAYS.lab} dní od odběru. Barva laboratoře = nejhorší
            parametr.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto divide-y divide-gray-200 border-t border-gray-200 text-start">
            <thead className="whitespace-nowrap bg-gray-50/50">
              <tr>
                {['Parametr', 'Zkratka', 'Jednotka', 'Žlutá', 'Červená'].map((h, i) => (
                  <th key={h} className={`${i === 0 ? 'px-6' : 'px-3'} py-3.5 text-start text-sm font-semibold text-gray-950`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {LAB_PARAMS.map((m) => {
                const sign = m.limit.dir === 'min' ? '<' : '≥'
                return (
                  <tr key={m.key}>
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-950">{m.label}</td>
                    <td className="px-3 py-3.5 font-mono text-xs text-gray-600">{m.short}</td>
                    <td className="px-3 py-3.5 text-sm text-gray-600">{m.unit}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-sm tabular-nums">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                      {sign} {num(m.limit.yellow, m.decimals)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-sm tabular-nums">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                      {sign} {num(m.limit.red, m.decimals)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-gray-200 px-6 py-3 text-xs text-gray-400">⚠️ Meze jsou předpoklad pro prototyp – ověřit s klinikem. Úpravy mezí a výběr parametrů zatím nejsou.</p>
      </Card>
    </div>
  )
}
