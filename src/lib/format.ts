// Formátování dat v českém stylu, jak je vidět v aplikaci.

const d = (iso: string) => new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)

/** 12.4. */
export const shortDate = (iso: string) => {
  const x = d(iso)
  return `${x.getDate()}.${x.getMonth() + 1}.`
}

/** 19.3.2026 */
export const fullDate = (iso: string) => {
  const x = d(iso)
  return `${x.getDate()}.${x.getMonth() + 1}.${x.getFullYear()}`
}

/** 12. 4. 2026 08:41 */
export const dateTime = (iso: string) => {
  const x = d(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${x.getDate()}. ${x.getMonth() + 1}. ${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`
}

export const todayIso = () => {
  const x = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export const addDays = (iso: string, days: number) => {
  const x = d(iso)
  x.setDate(x.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

/** Jméno v tabulkách: „Příjmení Jméno“. */
export const tableName = (p: { prijmeni: string; jmeno: string }) => `${p.prijmeni} ${p.jmeno}`
/** Jméno v klinickém reportu: „Jméno Příjmení“. */
export const reportName = (p: { prijmeni: string; jmeno: string }) => `${p.jmeno} ${p.prijmeni}`

/** Počet dní mezi dvěma daty YYYY-MM-DD (b − a). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000)

/** „dnes“, „včera“, „před 5 dny“. */
export const agoText = (iso: string, today = todayIso()) => {
  const n = daysBetween(iso, today)
  return n <= 0 ? 'dnes' : n === 1 ? 'včera' : `před ${n} dny`
}

/** Číslo se znaménkem a typografickým minus: „−45“, „+12“. */
export const signed = (v: number) => (v < 0 ? `−${num(-v)}` : `+${num(v)}`)

/** Číslo v českém formátu (desetinná čárka). */
export const num = (v: number, decimals = 0) =>
  v.toLocaleString('cs-CZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
