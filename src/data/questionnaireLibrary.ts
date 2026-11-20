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
  /** Statický = pevná sada otázek; dynamický = otázky se mění podle odpovědí nebo pacienta. */
  kind: 'static' | 'dynamic'
}

export const KIND_META: Record<LibraryQuestionnaire['kind'] | 'custom', { label: string; hint: string }> = {
  static: { label: 'Statické', hint: 'Pevná sada otázek ve stále stejném pořadí – pacient dostane všechny otázky.' },
  dynamic: { label: 'Dynamické', hint: 'Otázky se mění podle odpovědí nebo podle pacienta – větvení, adaptivní testování, výběr položek podle léčby.' },
  custom: { label: 'Vlastní', hint: 'Dotazníky založené na pracovišti – vlastní otázky, odpovědi, body a red flagy.' },
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

/**
 * Zástupné otázky pro prototyp (vlastní volné znění podle oblastí modulu, NE oficiální text EORTC).
 * Odpovědi na 4bodové škále Vůbec ne / Trochu / Dost / Velmi = 0–3 body. `flag` = od které odpovědi (index) je red flag.
 */
type DemoItem = [id: string, text: string, flag?: number]
const SCALE4 = ['Vůbec ne', 'Trochu', 'Dost', 'Velmi']
const demo = (items: DemoItem[]): QuestionnaireDef['questions'] =>
  items.map(([id, text, flag]) => ({ id, text, answers: SCALE4.map((t, i) => ({ id: `${id}-${i}`, text: t, points: i, redFlag: flag !== undefined && i >= flag })) }))
/** Obecné otázky (oblasti QLQ-C30), které jsou v každém modulu na začátku. */
const CORE: DemoItem[] = [
  ['c-unava', 'Cítil(a) jste se během posledního týdne unavený/á?'],
  ['c-bolest', 'Měl(a) jste bolesti?', 3],
  ['c-nevolnost', 'Bylo vám nevolno?'],
  ['c-spanek', 'Měl(a) jste potíže se spánkem?'],
  ['c-cinnosti', 'Omezovaly vás potíže v běžných denních činnostech?'],
]
const DEMO_ITEMS: Record<string, DemoItem[]> = {
  'lib-eortc-c30': CORE,
  'lib-eortc-br45': [
    ...CORE,
    ['br-bolest', 'Bolelo vás v oblasti ozářeného prsu?'],
    ['br-otok', 'Byl ozářený prs oteklý?'],
    ['br-kuze', 'Byla kůže v ozařované oblasti podrážděná, zarudlá nebo bolestivá?', 3],
    ['br-paze-otok', 'Měla jste otok paže nebo ruky na straně léčby?', 3],
    ['br-paze-pohyb', 'Bylo pro vás obtížné zvednout paži nebo s ní pohybovat?'],
    ['br-telo', 'Byla jste nespokojená se vzhledem svého těla?'],
  ],
  'lib-eortc-hn43': [
    ...CORE,
    ['hn-sucho', 'Měl(a) jste sucho v ústech?'],
    ['hn-polykani', 'Měl(a) jste potíže s polykáním tuhé stravy?', 3],
    ['hn-chut', 'Změnila se vám chuť jídla?'],
    ['hn-bolest-usta', 'Bolelo vás v ústech nebo v krku?'],
    ['hn-slina', 'Měl(a) jste hustou nebo lepkavou slinu?'],
    ['hn-rec', 'Měl(a) jste potíže s řečí?'],
    ['hn-zuby', 'Měl(a) jste potíže se zuby nebo dásněmi?'],
  ],
  'lib-eortc-pr25': [
    ...CORE,
    ['pr-caste', 'Musel jste během dne močit často?'],
    ['pr-noc', 'Musel jste v noci vstávat na močení?'],
    ['pr-paleni', 'Pálilo nebo bolelo vás při močení?'],
    ['pr-krev-moc', 'Měl jste krev v moči?', 2],
    ['pr-unik', 'Unikala vám moč?'],
    ['pr-stolice', 'Měl jste potíže se stolicí (průjem, nucení na stolici)?'],
    ['pr-krev-stolice', 'Měl jste krev ve stolici?', 2],
    ['pr-erekce', 'Měl jste potíže s erekcí?'],
  ],
  'lib-eortc-lc29': [
    ...CORE,
    ['lc-kasel', 'Kašlal(a) jste?'],
    ['lc-krev', 'Vykašlával(a) jste krev?', 2],
    ['lc-dusnost-klid', 'Byl(a) jste dušný/á v klidu?', 3],
    ['lc-dusnost-chuze', 'Byl(a) jste dušný/á při chůzi?'],
    ['lc-hrudnik', 'Bolelo vás na hrudi?'],
    ['lc-polykani', 'Bolelo vás při polykání?'],
  ],
}

const licensed = (id: string, name: string, items: number, description: string, scales: string[], publisher = 'EORTC', kind: LibraryQuestionnaire['kind'] = 'static'): LibraryQuestionnaire => ({
  id,
  name,
  description,
  questions: DEMO_ITEMS[id] ? demo(DEMO_ITEMS[id]) : [],
  publisher,
  items,
  licensed: true,
  scales,
  kind,
})

export const LIBRARY: LibraryQuestionnaire[] = [
  { ...oncoready, publisher: 'OncoReady', items: oncoready.questions.length, licensed: false, scales: ['Akutní toxicita léčby', 'Žádost o kontakt'], kind: 'static' },
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
    ['Výskyt, frekvence, závažnost a vliv příznaku na běžné činnosti', 'Doplňující otázky jen u přítomného příznaku'],
    'NCI',
    'dynamic',
  ),
  licensed(
    'lib-eortc-cat',
    'EORTC CAT Core',
    0,
    'Adaptivní verze QLQ-C30 – další otázka se vybírá podle předchozích odpovědí, pacient odpoví na méně otázek.',
    ['Stejné škály jako QLQ-C30', 'Počet otázek se liší podle pacienta'],
    'EORTC',
    'dynamic',
  ),
]

export const libraryItem = (id: string) => LIBRARY.find((q) => q.id === id)

/** Název dotazníku podle id (knihovna nebo vlastní). */
export const questionnaireName = (db: { customQuestionnaires: QuestionnaireDef[] }, id: string) =>
  libraryItem(id)?.name ?? db.customQuestionnaires.find((q) => q.id === id)?.name ?? '—'
