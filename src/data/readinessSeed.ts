// Generátory demo dat laboratoře a wearables (smyšlená, deterministická). Používá je src/data/seed.ts.
import type { LabParam, WearableDay } from '../lib/types'

/** Deterministický generátor náhodných čísel – demo data jsou při každém načtení stejná. */
export function rng(seed: number) {
  let s = seed
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
}

/** [střed, rozptyl] – rozptyl nikdy nepřekročí žlutou mez. */
const NORMAL: Record<LabParam, [number, number]> = {
  neu: [3.6, 0.9],
  plt: [240, 50],
  hb: [128, 8],
  krea: [78, 12],
  bili: [10, 4],
}
/** Hodnoty pro žlutou a červenou odchylku: [žlutá, červená]. */
const ABNORMAL: Record<LabParam, [number, number]> = {
  neu: [1.7, 1.1],
  plt: [122, 78],
  hb: [93, 76],
  krea: [126, 168],
  bili: [26, 38],
}
const round = (k: LabParam, v: number) => (k === 'neu' ? Math.round(v * 10) / 10 : Math.round(v))

/**
 * Jeden odběr. `level` = ok / žlutá / červená odchylka jednoho parametru;
 * u chemoterapie (stacionář) jsou odchylky hlavně v krevním obrazu (neutrofily, trombocyty), u RT spíš hemoglobin a kreatinin.
 */
export function labValues(r: () => number, level: 'ok' | 'yellow' | 'red', chemo: boolean): Partial<Record<LabParam, number>> {
  const values = {} as Record<LabParam, number>
  for (const [k, [mid, spread]] of Object.entries(NORMAL) as [LabParam, [number, number]][]) values[k] = round(k, mid + (r() * 2 - 1) * spread)
  if (level !== 'ok') {
    const pool: LabParam[] = chemo ? ['neu', 'neu', 'neu', 'plt', 'plt', 'hb', 'bili'] : ['hb', 'hb', 'krea', 'neu', 'plt']
    const k = pool[Math.floor(r() * pool.length)]
    const [y, red] = ABNORMAL[k]
    const base = level === 'yellow' ? y : red
    values[k] = round(k, base * (0.95 + r() * 0.1))
  }
  return values
}

/** Den z hodinek; u horšího profilu občas zvýšená teplota nebo nižší saturace. */
export function wearDay(r: () => number, date: string, profile: 'good' | 'moderate' | 'poor'): Omit<WearableDay, 'id' | 'patientId'> {
  const fever = profile === 'poor' ? 0.06 : profile === 'moderate' ? 0.03 : 0.01
  const x = r()
  return {
    date,
    temp: x < fever / 2 ? 38.2 + Math.round(r() * 5) / 10 : x < fever ? 37.6 + Math.round(r() * 3) / 10 : Math.round((36.4 + r() * 0.6) * 10) / 10,
    spo2: r() < fever / 2 ? 93 + Math.floor(r() * 2) : 96 + Math.floor(r() * 3),
    hr: 66 + Math.floor(r() * 16),
    steps: Math.round((profile === 'poor' ? 2800 : profile === 'moderate' ? 4200 : 5800) + r() * 2200),
  }
}
