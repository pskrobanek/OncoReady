// Statistiky kliniky: přehledové dlaždice, akutní toxicita podle týdne léčby, G3+ toxicita v modulech EORTC
// (chronická toxicita), vyplňování dotazníků, nejčastější závažné příznaky a laboratoř ve stacionáři.
// Barvy: pásma = stavové barvy aplikace; kohorty = kategorické barvy (modrá, oranžová, zelenomodrá – ověřeno validátorem).
import { useMemo, useState, type ReactNode } from 'react'
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, cx, PageHeader } from '../components/ui'
import { acuteCourse, acuteTopSymptoms, chronicG3, complianceByMonth, COHORTS, EORTC_MODULES, overview, stacLab } from '../lib/stats'
import { useStore } from '../lib/store'

const C = {
  green: '#10b981',
  yellow: '#fbbf24',
  red: '#dc2626',
  blue: '#2563eb',
  series: '#2a78d6',
  grid: '#eef0f3',
  axis: '#6b7280',
}
const AXIS = { tickLine: false, axisLine: false, tick: { fontSize: 12, fill: C.axis } }

export function Statistiky() {
  const { db } = useStore()
  const o = useMemo(() => overview(db), [db])
  const course = useMemo(() => acuteCourse(db), [db])
  const symptoms = useMemo(() => acuteTopSymptoms(db), [db])
  const compliance = useMemo(() => complianceByMonth(db), [db])
  const lab = useMemo(() => stacLab(db), [db])
  const [module, setModule] = useState(EORTC_MODULES[0].questionnaireId)
  const g3 = useMemo(() => chronicG3(db, module), [db, module])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Statistiky" breadcrumbs={[{ label: 'Statistiky' }, { label: 'Přehled' }]} />

      {/* Dlaždice */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Pacienti v aktivní monitoraci" value={String(o.activePatients)} />
        <Tile label="Vyplnění dotazníků" value={`${o.fillRate} %`} note={`posledních 30 dní · ${o.due} termínů`} />
        <Tile label="Aktuálně v červeném pásmu" value={String(o.red)} note={`${o.redShare} % pacientů v monitoraci`} dot={C.red} />
        <Tile label="Dotazníky s G3+ příznakem" value={String(o.g3)} note="posledních 30 dní" dot={C.red} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Akutní toxicita – průměrný průběh */}
        <ChartCard
          title="Akutní toxicita RT – průměrný průběh"
          subtitle="Skóre dotazníku OncoReady podle týdne léčby: průměr (čára) a rozpětí prostředních 50 % pacientů (pás, 25.–75. percentil)."
          table={{ head: ['Týden', 'Průměr', '25.–75. percentil', 'Dotazníků'], rows: course.map((r) => [r.label, r.mean, `${r.p25}–${r.p75}`, r.n]) }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={course} margin={{ top: 16, right: 24, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip content={<Tip rows={(p) => [['Průměr', `${p.mean} b`], ['25.–75. percentil', `${p.p25}–${p.p75} b`], ['Dotazníků', p.n]]} title={(p) => p.label} />} cursor={{ stroke: '#9ca3af', strokeWidth: 1 }} />
              <Area dataKey="band" stroke="none" fill={C.series} fillOpacity={0.1} isAnimationActive={false} activeDot={false} />
              <Line dataKey="mean" stroke={C.series} strokeWidth={2} dot={{ r: 4, fill: C.series, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false}>
                <LabelList dataKey="mean" position="top" fontSize={11} fill="#374151" formatter={(v: unknown) => String(v)} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Akutní toxicita – podíl pásem podle týdne */}
        <ChartCard
          title="Akutní toxicita RT – pásma podle týdne léčby"
          subtitle="Podíl vyplněných dotazníků v jednotlivých pásmech (100 % = všechny dotazníky daného týdne)."
          legend={[
            ['Zelené', C.green],
            ['Žluté', C.yellow],
            ['Červené', C.red],
            ['Vyžádal kontrolu', C.blue],
          ]}
          table={{ head: ['Týden', 'Zelené', 'Žluté', 'Červené', 'Vyžádal kontrolu', 'Dotazníků'], rows: course.map((r) => [r.label, `${r.green} %`, `${r.yellow} %`, `${r.red} %`, `${r.blue} %`, r.n]) }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={course} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v} %`} />
              <Tooltip
                cursor={{ fill: '#f3f4f6' }}
                content={<Tip title={(p) => p.label} rows={(p) => [['Zelené', `${p.green} %`], ['Žluté', `${p.yellow} %`], ['Červené', `${p.red} %`], ['Vyžádal kontrolu', `${p.blue} %`], ['Dotazníků', p.n]]} />}
              />
              {(['green', 'yellow', 'red', 'blue'] as const).map((k, i, all) => (
                <Bar key={k} dataKey={k} stackId="b" fill={C[k]} stroke="#fff" strokeWidth={2} maxBarSize={28} radius={i === all.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Chronická toxicita – G3+ v modulech EORTC */}
      <ChartCard
        title="Chronická toxicita RT – vývoj G3+ toxicity (EORTC)"
        subtitle="G3+ = aspoň jedna odpověď „Velmi“ nebo red flag. Vlevo podíl dotazníků s G3+ podle roku po radioterapii, vpravo jednotlivé otázky modulu."
        controls={
          <div className="flex flex-wrap gap-1 rounded-lg bg-gray-50 p-1 ring-1 ring-gray-950/5">
            {EORTC_MODULES.map((m) => (
              <button
                key={m.questionnaireId}
                type="button"
                onClick={() => setModule(m.questionnaireId)}
                className={cx(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                  module === m.questionnaireId ? 'bg-white text-primary-700 shadow-sm ring-1 ring-gray-950/10' : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
        table={{
          head: ['Otázka', ...g3.years],
          rows: [['Dotazníky s G3+ celkem', ...g3.byYear.map((y) => `${y.g3} % (n = ${y.n})`)], ...g3.heat.map((h) => [h.label, ...h.cells.map((c) => (c.n ? `${c.share} % (${c.hits}/${c.n})` : '—'))])],
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={g3.byYear} margin={{ top: 20, right: 24, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="year" {...AXIS} />
                <YAxis {...AXIS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v} %`} />
                <Tooltip content={<Tip title={(p) => `${p.year} po RT`} rows={(p) => [['Dotazníky s G3+', `${p.g3} %`], ['Dotazníků', p.n], ['Pacientů', p.patients], ['S red flagem', p.flags]]} />} cursor={{ stroke: '#9ca3af', strokeWidth: 1 }} />
                <Line dataKey="g3" stroke={C.red} strokeWidth={2} dot={{ r: 4, fill: C.red, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false}>
                  <LabelList dataKey="g3" position="top" fontSize={11} fill="#374151" formatter={(v: unknown) => `${v} %`} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-1 text-xs text-gray-500">
              Počet dotazníků: {g3.byYear.map((y) => `${y.year} n = ${y.n}`).join(' · ')}.
            </p>
          </div>
          <Heatmap years={g3.years} rows={g3.heat} />
        </div>
      </ChartCard>

      {/* Vyplňování dotazníků */}
      <ChartCard
        title="Vyplňování dotazníků"
        subtitle="Podíl vyplněných dotazníků z termínů v daném měsíci podle kohorty (posledních 12 měsíců; prázdný měsíc = žádný termín)."
        legend={COHORTS.map((c) => [c.label, c.color, 'line'])}
        table={{ head: ['Měsíc', ...COHORTS.map((c) => c.label)], rows: compliance.map((r) => [r.month as string, ...COHORTS.map((c) => (r[c.key] === null ? '—' : `${r[c.key]} % (n = ${r[`${c.key}_n`]})`))]) }}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={compliance} margin={{ top: 12, right: 24, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis dataKey="label" {...AXIS} interval={0} />
            <YAxis {...AXIS} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v} %`} />
            <Tooltip
              cursor={{ stroke: '#9ca3af', strokeWidth: 1 }}
              content={
                <Tip
                  title={(p) => String(p.month)}
                  rows={(p) => COHORTS.map((c) => [c.label, p[c.key] === null ? '—' : `${p[c.key]} % (n = ${p[`${c.key}_n`]})`, c.color] as [string, string, string])}
                />
              }
            />
            {COHORTS.map((c) => (
              <Line key={c.key} dataKey={c.key} stroke={c.color} strokeWidth={2} dot={{ r: 4, fill: c.color, stroke: '#fff', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Nejčastější závažné příznaky */}
        <ChartCard
          title="Akutní toxicita RT – nejčastější závažné příznaky"
          subtitle="Podíl vyplněných dotazníků, kde byla odpověď na otázku za 3 nebo 4 body."
          table={{ head: ['Příznak', 'Podíl', 'Dotazníků'], rows: symptoms.map((s) => [s.label, `${s.share} %`, `${s.hits}/${s.n}`]) }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={symptoms} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" {...AXIS} domain={[0, 'dataMax']} tickFormatter={(v) => `${v} %`} allowDecimals={false} />
              <YAxis type="category" dataKey="label" {...AXIS} width={170} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} content={<Tip title={(p) => p.label} rows={(p) => [['Podíl', `${p.share} %`], ['Dotazníků', `${p.hits} z ${p.n}`]]} />} />
              <Bar dataKey="share" fill={C.series} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                <LabelList dataKey="share" position="right" fontSize={11} fill="#374151" formatter={(v: unknown) => `${v} %`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Laboratoř ve stacionáři */}
        <ChartCard
          title="Stacionář – laboratoř mimo meze"
          subtitle="Podíl odběrů, kde byl parametr ve žluté nebo červené mezi (meze viz Šablony › Laboratoř)."
          legend={[
            ['Žlutá mez', C.yellow],
            ['Červená mez', C.red],
          ]}
          table={{ head: ['Parametr', 'Žlutá', 'Červená', 'Odběrů'], rows: lab.map((l) => [l.label, `${l.yellow} %`, `${l.red} %`, l.n]) }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={lab} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap="32%">
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" {...AXIS} tickFormatter={(v) => `${v} %`} allowDecimals={false} />
              <YAxis type="category" dataKey="label" {...AXIS} width={110} />
              <Tooltip cursor={{ fill: '#f3f4f6' }} content={<Tip title={(p) => p.label} rows={(p) => [['Žlutá mez', `${p.yellow} %`, C.yellow], ['Červená mez', `${p.red} %`, C.red], ['Odběrů', p.n]]} />} />
              <Bar dataKey="yellow" stackId="l" fill={C.yellow} stroke="#fff" strokeWidth={2} maxBarSize={18} isAnimationActive={false} />
              <Bar dataKey="red" stackId="l" fill={C.red} stroke="#fff" strokeWidth={2} maxBarSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="text-xs text-gray-400">
        ⚠️ Statistiky počítají z demo dat (smyšlení pacienti). Definice G3+ (nejvyšší závažnost odpovědi nebo red flag) a kohorty podle šablon je potřeba ověřit s klinikem.
      </p>
    </div>
  )
}

/** Dlaždice s číslem (stat tile). */
function Tile({ label, value, note, dot }: { label: string; value: string; note?: string; dot?: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-gray-950">{value}</div>
      {note && <div className="mt-1 text-xs text-gray-500">{note}</div>}
    </Card>
  )
}

/** Karta grafu: nadpis, popis, ovládání, legenda a přepínač Graf / Tabulka (tabulka = přístupná podoba dat). */
function ChartCard({
  title,
  subtitle,
  controls,
  legend,
  table,
  children,
}: {
  title: string
  subtitle: string
  controls?: ReactNode
  legend?: (string[] | [string, string] | [string, string, string])[]
  table: { head: (string | number)[]; rows: (string | number)[][] }
  children: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex rounded-lg bg-gray-50 p-1 text-xs font-semibold ring-1 ring-gray-950/5" role="tablist" aria-label="Podoba">
          {(['Graf', 'Tabulka'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={(t === 'Tabulka') === asTable}
              onClick={() => setAsTable(t === 'Tabulka')}
              className={cx('rounded-md px-2.5 py-1 transition', (t === 'Tabulka') === asTable ? 'bg-white text-gray-950 shadow-sm ring-1 ring-gray-950/10' : 'text-gray-500 hover:text-gray-800')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {controls}
      {legend && !asTable && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {legend.map(([label, color, kind]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              {kind === 'line' ? <span className="h-0.5 w-3.5 rounded-full" style={{ background: color }} /> : <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />}
              {label}
            </span>
          ))}
        </div>
      )}
      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {table.head.map((h, i) => (
                  <th key={i} className={cx('py-2 pr-4 font-semibold text-gray-950', i > 0 && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={cx('py-2 pr-4 text-gray-700', j > 0 && 'text-right tabular-nums')}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  )
}

/** Tooltip grafu: nadpis + řádky (hodnota výrazně, popisek šedě, případně barevná čárka série). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Payload = any
function Tip({ active, payload, title, rows }: { active?: boolean; payload?: { payload: Payload }[]; title: (p: Payload) => string; rows: (p: Payload) => (string | number)[][] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="min-w-[10rem] rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-gray-950/10">
      <div className="mb-1 font-semibold text-gray-950">{title(p)}</div>
      {rows(p).map(([label, value, color]) => (
        <div key={String(label)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            {color && <span className="h-0.5 w-3 rounded-full" style={{ background: String(color) }} />}
            {label}
          </span>
          <span className="font-semibold tabular-nums text-gray-950">{value}</span>
        </div>
      ))}
    </div>
  )
}

/** Teplotní mapa: otázky modulu × roky, intenzita červené = podíl odpovědí „Velmi“ / red flag. */
function Heatmap({ years, rows }: { years: string[]; rows: { id: string; label: string; cells: { year: string; share: number; hits: number; n: number }[] }[] }) {
  // Sekvenční škála jedné barvy: světle → tmavě červená
  const shade = (v: number) => {
    const a = [254, 242, 242]
    const b = [185, 28, 28]
    const t = Math.min(1, v / 100)
    return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-xs">
        <thead>
          <tr>
            <th className="pb-1 text-left font-medium text-gray-500">Otázka modulu · rok po RT</th>
            {years.map((y) => (
              <th key={y} className="w-14 pb-1 text-center font-medium text-gray-500">
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="max-w-[16rem] py-1 pr-3 text-gray-700">{r.label}</td>
              {r.cells.map((c) => (
                <td
                  key={c.year}
                  title={c.n ? `${r.label} – ${c.year}: ${c.share} % (${c.hits} z ${c.n})` : `${c.year}: bez dat`}
                  className={cx('h-8 rounded text-center font-semibold tabular-nums', c.n ? (c.share >= 50 ? 'text-white' : 'text-gray-800') : 'bg-gray-50 text-gray-300')}
                  style={c.n ? { background: shade(c.share) } : undefined}
                >
                  {c.n ? `${c.share} %` : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        0 %
        <span className="h-2 w-28 rounded-full" style={{ background: `linear-gradient(to right, ${shade(0)}, ${shade(100)})` }} />
        100 % odpovědí „Velmi“ / red flag
      </div>
    </div>
  )
}
