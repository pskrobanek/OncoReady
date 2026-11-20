import { QUESTIONS, scalePoints } from '../data/questionnaire'
import { libraryItem } from '../data/questionnaireLibrary'
import type { Answers } from './types'

// Pásma výsledku dotazníku. Pravidla jsou odvozena ze screenshotů – OVĚŘIT s produkcí.
export type Band = 'green' | 'yellow' | 'red' | 'blue'
/** na = termín už proběhl a dotazník chybí; future = termín teprve bude. */
export type Status = Band | 'na' | 'future'

export const BAND_META: Record<Status, { label: string; dot: string; badge: string; stripe: string; pill: string }> = {
  green: { label: 'Zelené pásmo', dot: 'bg-emerald-500', badge: 'bg-emerald-500 text-white', stripe: 'shadow-[inset_3px_0_0_#10b981]', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  yellow: { label: 'Žluté pásmo', dot: 'bg-amber-400', badge: 'bg-amber-400 text-white', stripe: 'shadow-[inset_3px_0_0_#fbbf24]', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  red: { label: 'Červené pásmo', dot: 'bg-red-600', badge: 'bg-red-600 text-white', stripe: 'shadow-[inset_3px_0_0_#dc2626]', pill: 'bg-red-50 text-red-600 ring-red-600/20' },
  blue: { label: 'Vyžádal kontrolu', dot: 'bg-blue-600', badge: 'bg-blue-600 text-white', stripe: 'shadow-[inset_3px_0_0_#2563eb]', pill: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  na: { label: 'Nevyplněno', dot: 'bg-gray-200', badge: 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-300', stripe: '', pill: 'bg-gray-50 text-gray-600 ring-gray-500/20' },
  future: { label: 'Plánováno', dot: 'border border-dashed border-gray-400 bg-white', badge: 'border border-dashed border-gray-300 bg-white text-gray-400', stripe: '', pill: 'bg-white text-gray-500 ring-gray-300' },
}

/**
 * Dotazník podle definice z knihovny (např. EORTC): odpovědi obsahují klíč DEF_KEY s id dotazníku
 * a u každé otázky index zvolené odpovědi. Bez klíče = výchozí dotazník OncoReady (QUESTIONS).
 */
export const DEF_KEY = '__def'
export const defOf = (answers: Answers) => (typeof answers[DEF_KEY] === 'string' ? libraryItem(answers[DEF_KEY] as string) : undefined)
const chosen = (answers: Answers) => {
  const def = defOf(answers)!
  return def.questions.map((q) => ({ q, a: answers[q.id] === undefined ? undefined : q.answers[Number(answers[q.id])] }))
}

/** Otázka pro zobrazení v reportu (výchozí dotazník i dotazník z knihovny). */
export type QView = { id: string; source: string; text: string; type: 'choice' | 'scale' | 'control' }
export function questionsOf(answers: Answers): QView[] {
  const def = defOf(answers)
  if (def) return def.questions.map((q) => ({ id: q.id, source: def.name, text: q.text, type: 'choice' }))
  return QUESTIONS.map((q) => ({ id: q.id, source: q.source, text: q.text, type: q.type }))
}

/** Text zvolené odpovědi. */
export function answerLabel(qid: string, answers: Answers): string {
  const value = answers[qid]
  if (value === undefined || value === null) return '—'
  const def = defOf(answers)
  if (def) return def.questions.find((q) => q.id === qid)?.answers[Number(value)]?.text ?? '—'
  const q = QUESTIONS.find((x) => x.id === qid)!
  if (q.type === 'scale') return Number(value).toFixed(2)
  if (q.type === 'choice') return q.options[Number(value)]?.label ?? '—'
  return value ? 'Ano' : 'Ne'
}

/** Je zvolená odpověď red flag (jen dotazníky z knihovny / vlastní)? */
export const isRedFlag = (qid: string, answers: Answers) => {
  const def = defOf(answers)
  return !!def && answers[qid] !== undefined && !!def.questions.find((q) => q.id === qid)?.answers[Number(answers[qid])]?.redFlag
}

/** Body za jednu odpověď (null = otázka bez bodů). U dotazníku z knihovny je potřeba předat i `answers`. */
export function answerPoints(questionId: string, value: number | string | boolean | undefined, answers?: Answers): number | null {
  const def = answers && defOf(answers)
  if (def) return value === undefined ? null : (def.questions.find((q) => q.id === questionId)?.answers[Number(value)]?.points ?? null)
  const q = QUESTIONS.find((x) => x.id === questionId)
  if (!q || value === undefined) return null
  if (q.type === 'scale') return scalePoints(Number(value))
  if (q.type === 'choice') return q.options[Number(value)]?.points ?? null
  return null
}

export function totalScore(answers: Answers): number {
  if (defOf(answers)) return chosen(answers).reduce((sum, x) => sum + (x.a?.points ?? 0), 0)
  return QUESTIONS.reduce((sum, q) => sum + (answerPoints(q.id, answers[q.id]) ?? 0), 0)
}

export function maxPoints(answers: Answers): number {
  if (defOf(answers)) return Math.max(0, ...chosen(answers).map((x) => x.a?.points ?? 0))
  return Math.max(0, ...QUESTIONS.map((q) => answerPoints(q.id, answers[q.id]) ?? 0))
}

/**
 * Pravidla pásma (předpoklad):
 * 1. pacient žádá kontrolu → modré
 * 2. alespoň jedna odpověď za 4 body → červené
 * 3. alespoň jedna odpověď za 3 body → žluté
 * 4. jinak → zelené
 */
export function bandOf(answers: Answers): Band {
  // Dotazník z knihovny (EORTC…): red flag → červené, nejhorší odpověď škály („Velmi“, 3 b) → žluté. ⚠️ OVĚŘIT
  if (defOf(answers)) {
    const c = chosen(answers)
    if (c.some((x) => x.a?.redFlag)) return 'red'
    if (c.some((x) => (x.a?.points ?? 0) >= 3)) return 'yellow'
    return 'green'
  }
  if (answers.control === true) return 'blue'
  const max = maxPoints(answers)
  if (max >= 4) return 'red'
  if (max >= 3) return 'yellow'
  return 'green'
}

export function bandReason(answers: Answers): string {
  if (defOf(answers)) {
    const b = bandOf(answers)
    return b === 'red' ? 'Alespoň jedna odpověď je red flag.' : b === 'yellow' ? 'Alespoň jedna odpověď „Velmi“ (3 body).' : 'Žádná odpověď „Velmi“ ani red flag.'
  }
  switch (bandOf(answers)) {
    case 'blue':
      return 'Pacient si vyžádal kontrolu.'
    case 'red':
      return 'Alespoň jedna odpověď dosáhla 4 bodů.'
    case 'yellow':
      return 'Alespoň jedna odpověď dosáhla 3 bodů.'
    default:
      return 'Žádná odpověď nepřesáhla 2 body.'
  }
}

/** Barva textu odpovědi v klinickém reportu podle bodů. */
export function answerColor(points: number | null): string {
  switch (points) {
    case 0:
      return 'text-emerald-600'
    case 1:
      return 'text-amber-500'
    case 2:
    case 3:
      return 'text-orange-500'
    case 4:
      return 'text-red-600'
    default:
      return 'text-gray-700'
  }
}
