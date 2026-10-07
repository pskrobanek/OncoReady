import { QUESTIONS, scalePoints } from '../data/questionnaire'
import type { Answers } from './types'

// Pásma výsledku dotazníku. Pravidla jsou odvozena ze screenshotů – OVĚŘIT s produkcí.
export type Band = 'green' | 'yellow' | 'red' | 'blue'
export type Status = Band | 'na'

export const BAND_META: Record<Status, { label: string; dot: string; badge: string; stripe: string; pill: string }> = {
  green: { label: 'Zelené pásmo', dot: 'bg-emerald-500', badge: 'bg-emerald-500 text-white', stripe: 'shadow-[inset_3px_0_0_#10b981]', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  yellow: { label: 'Žluté pásmo', dot: 'bg-amber-400', badge: 'bg-amber-400 text-white', stripe: 'shadow-[inset_3px_0_0_#fbbf24]', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  red: { label: 'Červené pásmo', dot: 'bg-red-600', badge: 'bg-red-600 text-white', stripe: 'shadow-[inset_3px_0_0_#dc2626]', pill: 'bg-red-50 text-red-600 ring-red-600/20' },
  blue: { label: 'Vyžádal kontrolu', dot: 'bg-blue-600', badge: 'bg-blue-600 text-white', stripe: 'shadow-[inset_3px_0_0_#2563eb]', pill: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  na: { label: 'Nevyplněno', dot: 'bg-gray-200', badge: 'bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200', stripe: '', pill: 'bg-gray-50 text-gray-600 ring-gray-500/20' },
}

/** Body za jednu odpověď (null = otázka bez bodů). */
export function answerPoints(questionId: string, value: number | string | boolean | undefined): number | null {
  const q = QUESTIONS.find((x) => x.id === questionId)
  if (!q || value === undefined) return null
  if (q.type === 'scale') return scalePoints(Number(value))
  if (q.type === 'choice') return q.options[Number(value)]?.points ?? null
  return null
}

export function totalScore(answers: Answers): number {
  return QUESTIONS.reduce((sum, q) => sum + (answerPoints(q.id, answers[q.id]) ?? 0), 0)
}

export function maxPoints(answers: Answers): number {
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
  if (answers.control === true) return 'blue'
  const max = maxPoints(answers)
  if (max >= 4) return 'red'
  if (max >= 3) return 'yellow'
  return 'green'
}

export function bandReason(answers: Answers): string {
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
