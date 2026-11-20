// Knihovna předpřipravených dotazníků, ze kterých lze vybrat dotazník pro šablonu.
// Výchozí dotazník OncoReady je převedený ze zástupných otázek v questionnaire.ts (lze zobrazit i zkopírovat).
// Dotazníky EORTC a PRO-CTCAE jsou jen metadata: jejich znění je chráněné licencí / podmínkami použití,
// do aplikace se vloží až po získání licence (⚠️ OVĚŘIT licence a oficiální české verze).
import type { QuestionnaireDef } from '../lib/types'
import { QUESTIONS } from './questionnaire'

export interface LibraryQuestionnaire extends QuestionnaireDef {
  publisher: string
  /** Počet položek (u licencovaných dotazníků, kde otázky v aplikaci nejsou). */
  items: number
  /** Znění je chráněné licencí – otázky nejde zobrazit ani zkopírovat. */
  licensed: boolean
  /** Škály / oblasti, které dotazník hodnotí (popis pro výběr). */
  scales: string[]
}

export const DEFAULT_QUESTIONNAIRE_ID = 'lib-oncoready'

/** Výchozí dotazník: odpovědi za 4 body jsou red flag (stejně jako pravidlo červeného pásma). */
const oncoready: QuestionnaireDef = {
  id: DEFAULT_QUESTIONNAIRE_ID,
  name: 'OncoReady – akutní toxicita',
  description: 'Výchozí dotazník aplikace (TheraData + PRO-CTCAE, zástupné znění). Celkový stav, únava, symptomy, kůže, bolest, nechutenství, nevolnost, průjem, polykání, psychika a žádost o kontakt.',
  questions: QUESTIONS.map((q) => {
    const answers =
      q.type === 'choice'
        ? q.options.map((o) => ({ text: o.label, points: o.points }))
        : q.type === 'scale'
          ? [
              { text: '60–100 (dobrý stav)', points: 0 },
              { text: '40–59', points: 1 },
              { text: '20–39', points: 2 },
              { text: '10–19', points: 3 },
              { text: '0–9 (nejhorší stav)', points: 4 },
            ]
          : [
              { text: 'Ano – pacient žádá o kontakt (modré pásmo)', points: 0 },
              { text: 'Ne', points: 0 },
            ]
    return { id: q.id, text: q.text, answers: answers.map((a, i) => ({ id: `${q.id}-${i}`, ...a, redFlag: a.points >= 4 })) }
  }),
}

const licensed = (id: string, name: string, items: number, description: string, scales: string[], publisher = 'EORTC'): LibraryQuestionnaire => ({
  id,
  name,
  description,
  questions: [],
  publisher,
  items,
  licensed: true,
  scales,
})

export const LIBRARY: LibraryQuestionnaire[] = [
  { ...oncoready, publisher: 'OncoReady', items: oncoready.questions.length, licensed: false, scales: ['Akutní toxicita léčby', 'Žádost o kontakt'] },
  licensed('lib-eortc-c30', 'EORTC QLQ-C30', 30, 'Základní dotazník kvality života onkologických pacientů.', [
    'Fyzické, pracovní, emoční, kognitivní a sociální fungování',
    'Celkový zdravotní stav',
    'Únava, nevolnost a zvracení, bolest',
    'Dušnost, nespavost, nechutenství, zácpa, průjem',
    'Finanční potíže',
  ]),
  licensed('lib-eortc-br45', 'EORTC QLQ-BR45', 45, 'Modul pro karcinom prsu (doplněk k QLQ-C30).', ['Obraz těla, sexualita', 'Příznaky v oblasti prsu a paže', 'Nežádoucí účinky systémové léčby']),
  licensed('lib-eortc-hn43', 'EORTC QLQ-H&N43', 43, 'Modul pro nádory hlavy a krku (doplněk k QLQ-C30).', ['Bolest v ústech, polykání', 'Sucho v ústech, chuť', 'Řeč, sociální kontakt']),
  licensed('lib-eortc-pr25', 'EORTC QLQ-PR25', 25, 'Modul pro karcinom prostaty (doplněk k QLQ-C30).', ['Močové a střevní příznaky', 'Příznaky hormonální léčby', 'Sexualita']),
  licensed('lib-eortc-lc29', 'EORTC QLQ-LC29', 29, 'Modul pro karcinom plic (doplněk k QLQ-C30).', ['Kašel, dušnost, bolest na hrudi', 'Nežádoucí účinky léčby']),
  licensed(
    'lib-pro-ctcae',
    'PRO-CTCAE (výběr položek)',
    0,
    'Knihovna příznaků nežádoucích účinků hlášených pacientem (NCI). Položky se vybírají podle léčby.',
    ['Výskyt, frekvence, závažnost a vliv příznaku na běžné činnosti'],
    'NCI',
  ),
]

export const libraryItem = (id: string) => LIBRARY.find((q) => q.id === id)

/** Název dotazníku podle id (knihovna nebo vlastní). */
export const questionnaireName = (db: { customQuestionnaires: QuestionnaireDef[] }, id: string) =>
  libraryItem(id)?.name ?? db.customQuestionnaires.find((q) => q.id === id)?.name ?? '—'
