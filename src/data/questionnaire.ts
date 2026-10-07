// Definice dotazníku. Otázky a bodování jsou ZÁSTUPNÉ – sestavené podle screenshotů
// (TheraData + PRO-CTCAE). Skutečné znění a bodování je potřeba doplnit z produkce.

export type ChoiceOption = { label: string; points: number }

export type Question =
  | {
      id: string
      source: 'TheraData' | 'PRO-CTCAE'
      text: string
      type: 'choice'
      options: ChoiceOption[]
    }
  | {
      id: string
      source: 'TheraData' | 'PRO-CTCAE'
      text: string
      type: 'scale' // číselná škála 0–100
      min: number
      max: number
    }
  | {
      id: string
      source: 'TheraData' | 'PRO-CTCAE'
      text: string
      type: 'control' // Ano/Ne – pacient žádá kontrolu, nemá body
    }

const severity = (labels: string[]): ChoiceOption[] => labels.map((label, points) => ({ label, points }))

export const QUESTIONS: Question[] = [
  {
    id: 'health',
    source: 'TheraData',
    text: 'Jak byste ohodnotil(a) svůj celkový zdravotní stav během posledního týdne na škále 100 nejlepší možný stav, 0 nejhorší možný zdravotní stav.',
    type: 'scale',
    min: 0,
    max: 100,
  },
  {
    id: 'fatigue',
    source: 'PRO-CTCAE',
    text: 'Jak závažná byla během uplynulých 7 dnů vaše nejhorší únava, vyčerpanost nebo nedostatek energie?',
    type: 'choice',
    options: severity(['Žádná', 'Mírná', 'Střední', 'Závažná', 'Velmi závažná']),
  },
  {
    id: 'symptoms',
    source: 'TheraData',
    text: 'Zaznamenal/a jste v posledním týdnu některý z těchto symptomů?',
    type: 'choice',
    options: severity([
      'Žádný z uvedených',
      'Mírná nevolnost',
      'Průjem',
      'Opakované zvracení',
      'Zvýšená teplota nebo horečka',
    ]),
  },
  {
    id: 'skin',
    source: 'TheraData',
    text: 'Vyskytují se na kůži v ozařované oblasti některé z těchto symptomů?',
    type: 'choice',
    options: severity([
      'Žádné',
      'Slabé zarudnutí',
      'Mírné, ale patrné zarudnutí',
      'Výrazné zarudnutí nebo olupování kůže',
      'Mokvání, krvácení nebo vřed',
    ]),
  },
  {
    id: 'pain',
    source: 'PRO-CTCAE',
    text: 'Jaká byla během uplynulých 7 dnů intenzita vaší bolesti v nejhorším případě?',
    type: 'choice',
    options: severity(['Žádná', 'Mírná', 'Střední', 'Silná', 'Velmi silná']),
  },
  {
    id: 'appetite',
    source: 'PRO-CTCAE',
    text: 'Jak závažné bylo během uplynulých 7 dnů vaše nechutenství?',
    type: 'choice',
    options: severity(['Žádné', 'Mírné', 'Střední', 'Závažné', 'Velmi závažné']),
  },
  {
    id: 'nausea',
    source: 'PRO-CTCAE',
    text: 'Jak často jste během uplynulých 7 dnů pociťoval(a) nevolnost?',
    type: 'choice',
    options: severity(['Nikdy', 'Zřídka', 'Občas', 'Často', 'Téměř neustále']),
  },
  {
    id: 'diarrhea',
    source: 'PRO-CTCAE',
    text: 'Jak často jste během uplynulých 7 dnů měl(a) řídkou nebo vodnatou stolici?',
    type: 'choice',
    options: severity(['Nikdy', 'Zřídka', 'Občas', 'Často', 'Téměř neustále']),
  },
  {
    id: 'swallowing',
    source: 'PRO-CTCAE',
    text: 'Jak závažné byly během uplynulých 7 dnů vaše obtíže s polykáním?',
    type: 'choice',
    options: severity(['Žádné', 'Mírné', 'Střední', 'Závažné', 'Velmi závažné']),
  },
  {
    id: 'mood',
    source: 'TheraData',
    text: 'Jak byste ohodnotil(a) svou psychickou pohodu během posledního týdne?',
    type: 'choice',
    options: severity(['Velmi dobrá', 'Dobrá', 'Průměrná', 'Špatná', 'Velmi špatná']),
  },
  {
    id: 'control',
    source: 'TheraData',
    text: 'Přejete si, aby vás před další návštěvou kontaktoval ošetřující tým?',
    type: 'control',
  },
]

/** Převod škály 0–100 na body (vyšší hodnota = lepší stav = méně bodů). */
export function scalePoints(value: number): number {
  if (value >= 60) return 0
  if (value >= 40) return 1
  if (value >= 20) return 2
  if (value >= 10) return 3
  return 4
}

/** Typická hodnota škály pro daný počet bodů (pro generování demo dat). */
export function scaleValueForPoints(points: number): number {
  return [80, 50, 30, 15, 5][points] ?? 50
}
