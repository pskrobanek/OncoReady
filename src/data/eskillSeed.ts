// Ukázkové výsledky e-Skill (smyšlené) – u několika demo pacientů, vztažené k dnešku.
import { addDays } from '../lib/format'
import type { ESkillResult } from '../lib/types'
import { literacyScore, motorScore, type SurveyAnswers, type TestMetrics } from './eskill'

const r = (id: string, patientId: string, takenAt: string, survey: SurveyAnswers, metrics: TestMetrics): ESkillResult => {
  const motor = motorScore(metrics)
  return { id, patientId, takenAt, survey, metrics, motorScore: motor, literacyScore: literacyScore(motor, survey), timedOut: false }
}

/** Výsledky pro prvních pět zadaných pacientů (dny zpět od dneška). */
export const eskillFor = (ids: string[], today: string): ESkillResult[] =>
  [
    r('es1', ids[0], `${addDays(today, -320)}T10:12:00`, { q1: ['mobile_phone', 'desktop_laptop'], q2: 'press_buttons', q3: 'family', q4: 'immediately' },
      { correctTasks: 8, totalTasks: 9, speed: 41.3, avgMisclickDistance: 62, typingDuration: 4.1, typingAccuracy: 100 }),
    r('es2', ids[3], `${addDays(today, -280)}T09:40:00`, { q1: ['mobile_phone'], q2: 'ask_help', q3: 'family', q4: 'within_day' },
      { correctTasks: 5, totalTasks: 9, speed: 98.2, avgMisclickDistance: 180, typingDuration: 14.6, typingAccuracy: 71 }),
    r('es3', ids[6], `${addDays(today, -335)}T11:05:00`, { q1: ['mobile_phone', 'mobile_tablet'], q2: 'take_break', q3: 'friends', q4: 'within_day' },
      { correctTasks: 7, totalTasks: 9, speed: 63.0, avgMisclickDistance: 95, typingDuration: 7.9, typingAccuracy: 86 }),
    r('es4', ids[7], `${addDays(today, -238)}T10:20:00`, { q1: ['mobile_phone', 'mobile_tablet'], q2: 'take_break', q3: 'friends', q4: 'immediately' },
      { correctTasks: 8, totalTasks: 9, speed: 48.5, avgMisclickDistance: 70, typingDuration: 5.2, typingAccuracy: 100 }),
    r('es5', ids[10], `${addDays(today, -168)}T08:55:00`, { q1: ['none'], q2: 'give_up', q3: 'caregivers', q4: 'once_a_week' },
      { correctTasks: 3, totalTasks: 9, speed: 120, avgMisclickDistance: 240, typingDuration: null, typingAccuracy: 43 }),
  ].filter((x) => x.patientId)
