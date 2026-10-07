// Ukázkové výsledky e-Skill (smyšlené).
import type { ESkillResult } from '../lib/types'
import { literacyScore, motorScore, type SurveyAnswers, type TestMetrics } from './eskill'

const r = (id: string, patientId: string, takenAt: string, survey: SurveyAnswers, metrics: TestMetrics): ESkillResult => {
  const motor = motorScore(metrics)
  return { id, patientId, takenAt, survey, metrics, motorScore: motor, literacyScore: literacyScore(motor, survey), timedOut: false }
}

export const seedEskill = (): ESkillResult[] => [
  r('es1', 'p1', '2026-03-19T10:12:00', { q1: ['mobile_phone', 'desktop_laptop'], q2: 'press_buttons', q3: 'family', q4: 'immediately' },
    { correctTasks: 8, totalTasks: 9, speed: 41.3, avgMisclickDistance: 62, typingDuration: 4.1, typingAccuracy: 100 }),
  r('es2', 'p3', '2026-08-05T09:40:00', { q1: ['mobile_phone'], q2: 'ask_help', q3: 'family', q4: 'within_day' },
    { correctTasks: 5, totalTasks: 9, speed: 98.2, avgMisclickDistance: 180, typingDuration: 14.6, typingAccuracy: 71 }),
  r('es3', 'p7', '2026-03-04T11:05:00', { q1: ['mobile_phone', 'mobile_tablet'], q2: 'take_break', q3: 'friends', q4: 'within_day' },
    { correctTasks: 7, totalTasks: 9, speed: 63.0, avgMisclickDistance: 95, typingDuration: 7.9, typingAccuracy: 86 }),
  r('es4', 'p7', '2026-04-30T10:20:00', { q1: ['mobile_phone', 'mobile_tablet'], q2: 'take_break', q3: 'friends', q4: 'immediately' },
    { correctTasks: 8, totalTasks: 9, speed: 48.5, avgMisclickDistance: 70, typingDuration: 5.2, typingAccuracy: 100 }),
  r('es5', 'p9', '2026-10-01T08:55:00', { q1: ['none'], q2: 'give_up', q3: 'caregivers', q4: 'once_a_week' },
    { correctTasks: 3, totalTasks: 9, speed: 120, avgMisclickDistance: 240, typingDuration: null, typingAccuracy: 43 }),
]
