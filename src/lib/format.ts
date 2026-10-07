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
