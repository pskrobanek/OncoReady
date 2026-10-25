// Ukázková data laboratoře a wearables (smyšlená). Data jsou vztažená k „dnešku“ demo dat (SEED_TODAY)
// a posouvají se spolu s ostatními demo daty, aby byla aktuální vždy, když se demo otevře.
import { addDays } from '../lib/format'
import type { LabParam, LabResult, WearableDay } from '../lib/types'

/** Deterministický generátor náhodných čísel – demo data jsou při každém načtení stejná. */
function rng(seed: number) {
  let s = seed
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
}

const NORMAL: Record<LabParam, [number, number]> = {
  // [střed, rozptyl] – rozptyl nikdy nepřekročí žlutou mez
  neu: [3.4, 0.4],
  plt: [235, 25],
  hb: [128, 6],
  krea: [76, 8],
  bili: [9, 3],
}

type LabSpec = [patientId: string, when: number | string, overrides?: Partial<Record<LabParam, number>>]

/** Odběry: `when` = počet dní před dneškem nebo pevné datum (starší monitorace). */
const LABS: LabSpec[] = [
  // Šťastná – vše v pořádku
  ['p10', 1], ['p10', 22], ['p10', 43], ['p10', 64],
  // Krokerová – neutropenie v posledním odběru
  ['p6', 1, { neu: 1.2, hb: 104 }], ['p6', 22, { neu: 2.4 }], ['p6', 43], ['p6', 64],
  // Dlouhá – laboratoř v pořádku
  ['p2', 3], ['p2', 24, { hb: 112 }], ['p2', 45],
  // Kokošková – poslední odběr před 24 dny (neaktuální)
  ['p4', 24], ['p4', 45, { plt: 190 }],
  // Dvořáková – trombocytopenie
  ['p3', 2, { plt: 85, hb: 96 }], ['p3', 23, { plt: 128 }], ['p3', 44],
  // Plyšová – čerstvý odběr, ale zatím žádný dotazník ani wearables
  ['p9', 5],
  // Starší monitorace
  ['p1', '2026-03-20'], ['p1', '2026-04-10', { hb: 97 }],
  ['p7', '2026-03-05'], ['p7', '2026-03-26', { krea: 118 }], ['p7', '2026-04-16', { krea: 162 }],
]

export function seedLabs(today: string): LabResult[] {
  const r = rng(7)
  return LABS.map(([patientId, when, over = {}], i) => {
    const values = {} as Record<LabParam, number>
    for (const [k, [mid, spread]] of Object.entries(NORMAL) as [LabParam, [number, number]][]) {
      const v = mid + (r() * 2 - 1) * spread
      values[k] = k === 'neu' ? Math.round(v * 10) / 10 : Math.round(v)
    }
    return { id: `lab${i + 1}`, patientId, date: typeof when === 'number' ? addDays(today, -when) : when, values: { ...values, ...over } }
  })
}

/** Pacienti s připojeným zařízením a odchylky v konkrétních dnech (počet dní před dneškem). */
const WEARABLES: Record<string, (daysAgo: number) => Partial<WearableDay>> = {
  p10: () => ({}),
  // Krokerová – dnes horečka, předtím zvýšená teplota
  p6: (n) => (n === 0 ? { temp: 38.1 } : n === 1 ? { temp: 37.6 } : n === 8 ? { temp: 37.7 } : {}),
  // Dlouhá – posledních 12 dní výrazně méně kroků
  p2: (n) => (n <= 11 ? { steps: 2400 + ((n * 137) % 400) } : {}),
  p4: () => ({}),
}
const WEAR_DAYS = 56

export function seedWearables(today: string): WearableDay[] {
  const out: WearableDay[] = []
  let i = 0
  for (const [patientId, override] of Object.entries(WEARABLES)) {
    const r = rng(patientId.length * 31 + Number(patientId.slice(1)))
    for (let n = WEAR_DAYS - 1; n >= 0; n--) {
      out.push({
        id: `w${++i}`,
        patientId,
        date: addDays(today, -n),
        temp: Math.round((36.5 + r() * 0.5) * 10) / 10,
        spo2: 96 + Math.floor(r() * 3),
        hr: 68 + Math.floor(r() * 12),
        steps: 5500 + Math.floor(r() * 1500),
        ...override(n),
      })
    }
  }
  return out
}
