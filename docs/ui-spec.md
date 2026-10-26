# OncoReady – specifikace UI

Specifikace popisuje UI repliky. Kde se replika liší od produkce nebo kde jde o předpoklad, je to označeno **⚠️ OVĚŘIT**.
Produkce běží na Laravel Filament, a proto replika přebírá jeho vzhled (komponenty, rozestupy, barvy).

## Globální layout

- **Horní lišta** (výška 64 px, bílá, spodní stín): vlevo logo OncoReady („Onco“ černě, „Ready“ primární modrou), vpravo kulatý avatar s iniciálou (černé pozadí, bílé písmeno).
- **Boční menu** (od šířky ≥ 1024 px), v tomto pořadí:
  - Dashboard (ikona domu);
  - pod ním odsazené **pohledy** uživatele a „+ Nový pohled“ (viz *Pohledy*);
  - **Monitorace** (ikona schránky se seznamem);
  - Kartotéka (ikona složek);
  - Statistiky (ikona sloupcového grafu);
  - **e-Skill** (ikona kurzoru).
  - Aktivní položka má světle šedé pozadí, text i ikona jsou v primární modré.
  - Neaktivní položka má šedou ikonu a tmavý text.
- **Obsah**: šedé pozadí (`gray-50`), bílé karty se zaoblením 12 px a jemným rámečkem.
- **Nadpis stránky**: 30 px, tučný. Nad ním drobečková navigace (šedá, oddělovač `›`).

### Barvy

| Token | Hodnota | Použití |
| --- | --- | --- |
| primary-600 | `#2550f0` | tlačítka Vytvořit/Uložit, aktivní menu, odkazy akcí |
| danger | `#dc2626` | Smazat, červené pásmo |
| zelené pásmo | `#10b981` | odznak skóre, proužek souhrnu „Připraveno“ |
| žluté pásmo | `#fbbf24` | odznak skóre, proužek souhrnu „K posouzení“ |
| červené pásmo | `#dc2626` | odznak skóre, laboratoř / wearables mimo mez, proužek souhrnu „Nepřipraveno“ |
| vyžádal kontrolu | `#2563eb` | odznak skóre |
| souhrn neúplné | `gray-300` (`#d1d5db`) | proužek souhrnu „Neúplné“ |
| nevyplněno (po termínu) | `gray-100` pozadí, šedý text | odznak „N/A“ |
| plánováno (budoucí termín) | bílé pozadí, čárkovaný šedý rámeček | odznak s ikonou hodin |

Primární modrá je odhadnutá ze screenshotu. **⚠️ OVĚŘIT** přesný HEX v produkčním Filament panelu (`->colors(['primary' => …])`).

## Odznak dotazníku (komponenta)

Používá se na Dashboardu i v tabulce Monitorace pacienta.

- Odznaky stojí v jedné řadě a **nejnovější termín je vlevo**.
- **Skupiny** (NOVÉ): odznaky jsou rozdělené podle času do skupin:
  1. **PLÁNOVANÉ**: budoucí termíny;
  2. **POSLEDNÍ VYPLNĚNÝ** (v hlavičce tabulky zkráceně „POSLEDNÍ“, plný název v tooltipu; sloupec je úzký, cca 67 px, odznak vycentrovaný): vždy **jen jeden** dotazník, ten s nejnovějším datem vyplnění. Nevyplněné (N/A) sem nepatří ani když jsou novější, ty jsou ve sloupci roku;
  3. **starší po letech** („2026“, „2025“…).
  - Zařazení se řídí datem vyplnění, u nevyplněných datem termínu. Uvnitř skupiny je nejnovější vlevo.
  - **Na Dashboardu a v pohledech se skupiny nepoužívají** (od 2026-10-25): dotazníky jsou v řádku „Dotazník“ na časové ose (viz *Dashboard*). Skupiny zůstávají v kartě pacienta.
  - V kartě pacienta (Monitorace pacienta) jsou skupiny vedle sebe v jednom řádku jako malé rámečky s popiskem (Plánované = čárkovaný rámeček).
- **Rozměr**: vždy **čtverec 32 × 32 px** se zaoblením 4 px (rozestup odznaků 36 px), bez ohledu na obsah.
- **Vyplněný dotazník**: barevný čtverec s celkovým skóre (bílé tučné číslo, 14 px), pod ním datum vyplnění ve formátu `12.4.` (10 px, šedá).
  - Kliknutím se otevře *Klinický report*.
- **Nevyplněný dotazník po termínu**: šedý čtverec s textem **„N/A“** (velkými písmeny, tučně, 11 px), pod ním „-“.
- **Budoucí termín** (NOVÉ): bílý čtverec s **čárkovaným šedým rámečkem** a ikonou hodin, pod ním šedou kurzívou datum termínu. Tooltip „Plánováno na 22.10. – lze vyplnit předem“. Do filtru „Nevyplněno“ ani do souhrnu se nepočítá.
- Klik na N/A i na budoucí termín otevře *Vyplnění dotazníku*.

### Legenda ⓘ

Šedá ikona **ⓘ**: po najetí myší nebo kliknutí se zobrazí bublina „Legenda“. Bublina má pevnou pozici pod ikonou, takže ji posuvná tabulka neořízne. Při posunu stránky se zavře.
- **Na Dashboardu a v pohledech** je ikona v hlavičce sloupce **Aktuální**. Legenda má tři části:
  1. úvodní věta: „Čtverec ve sloupci Aktuální = poslední data zdroje, úzké dlaždice = minulé týdny seskupené po měsících. Datum a hodnoty jsou v tooltipu.“;
  2. *Dotazník* (s ikonou zdroje): 5 vzorových odznaků (zelené, žluté, červené, vyžádal kontrolu, N/A);
  3. *Laboratoř a wearables* (s ikonou zdroje):
     - ✓ v mezích, „!“ hraniční hodnota;
     - červená laboratoř = hodnota nejhoršího parametru (ve čtverci i jeho zkratka);
     - ✕ wearables mimo mez;
     - čárkovaný „—“ = neaktuální data (stáří v tooltipu), šedě = bez dat;
     - světle šedá úzká dlaždice = období bez dat;
     - barevný pruh vlevo u jména pacienta = nejhorší výsledek z aktuálních zdrojů (šedá = nic aktuálního).
- **V kartě pacienta** (Monitorace pacienta) je ikona u dotazníků a legenda ukazuje jen odznaky dotazníku, dole „Pod odznakem je datum vyplnění.“

### Pravidla pásma (⚠️ OVĚŘIT – odvozeno ze screenshotů)

Pravidla se vyhodnocují v tomto pořadí:

1. Pacient odpověděl, že žádá kontrolu → **modré** („Vyžádal kontrolu“).
2. Alespoň jedna odpověď má 4 body → **červené** („Alespoň jedna odpověď dosáhla 4 bodů.“).
3. Alespoň jedna odpověď má 3 body → **žluté**.
4. Jinak → **zelené**.

Celkové skóre je součet bodů všech odpovědí. Pravidla jsou na jednom místě v `src/lib/scoring.ts`.

## Dashboard

Jedna karta má dvě části: vlevo tabulka **„Pacienti“** (dříve „Patients Table“) s počtem pacientů vpravo v hlavičce, vpravo panel nástrojů se záložkami Filtr, Řazení a Zobrazení (šířka 288 px). Na menší obrazovce je panel pod tabulkou.

**Tabulka** (rozložení podle náčrtu 2026-10-26; sloupec Souhrn odebrán)
- Nad tabulkou vpravo je hledání (jméno a rodné číslo).
- **Řazení** a **časová osa** se nastavují v pravém panelu (viz *Panel nástrojů*).
- **Sloupce** (zleva): Pacient · zdroj (bez nadpisu) · Aktuální · časová osa · prázdná výplň. Hlavička má jeden řádek, všechny nadpisy jsou stejné (14 px, tučně).
- **Řádky**: pacient má **řádek za každý zdroj, který má**, v pořadí Dotazník, Laboratoř, Wearables.
  - Dotazník má každý pacient na Dashboardu (má monitoraci).
  - Laboratoř jen když má aspoň jeden výsledek, wearables jen když má aspoň jeden den dat z připojeného zařízení.
  - Pacient má tedy 1–3 řádky; buňka Pacient je sloučená přes všechny.
  - Mezi řádky zdrojů jednoho pacienta nejsou čáry, mezi pacienty je šedá linka. Najetí myší zvýrazní celého pacienta.
  - Řádek zdroje má cca 44 px (dlaždice 36 px + 4 px nahoře a dole), blok pacienta má navíc 10 px nahoře a dole.
- **Pacient** (208 px, zarovnaný nahoru):
  - **Barevný pruh na levé straně** (9 px, přes všechny řádky pacienta; obsah buňky je odsazený 24 px) má barvu **nejhoršího výsledku z aktuálních zdrojů**:
    - pořadí: červená > modrá (vyžádal kontrolu) > žlutá > zelená;
    - neaktuální zdroje se nepočítají; když není aktuální žádný zdroj, je čára světle šedá;
    - **⚠️ OVĚŘIT**, jestli mají neaktuální zdroje čáru ovlivnit (např. šedě jako „Neúplné“).
  - Obsah má tři řádky:
    1. jméno `Příjmení Jméno` tučně (odkaz na úpravu pacienta, bez šipky);
    2. rodné číslo šedě, bez popisku „RČ“ (např. „7061233652“);
    3. po malé mezeře **název monitorace podtržený** (odkaz na úpravu monitorace; dlouhý název se zkrátí „…“).
- **Zdroj** (sloupec bez nadpisu): minimalistická ikona (16 px, šedá, obrys 1,5 px ve stylu Heroicons) a název šedým textem 14 px:
  - Dotazník – podložka s řádky;
  - Laboratoř – zkumavka;
  - Wearables – hodinky.
  - Stejné ikony jsou v detailu, v seznamu hraničních hodnot a v legendě.
- Při vodorovném posunu zůstávají **Pacient a zdroj** na místě, za sloupcem zdrojů je svislá linka. Na mobilu (< 640 px) zůstává na místě jen Pacient (linka za ním).
- Plánované (budoucí) dotazníky se na Dashboardu ani v pohledech **nezobrazují**. Vidět jsou jen v kartě pacienta (Monitorace pacienta).
- **Aktuální** – **čtverec 36 × 36 px** s posledními daty zdroje, pokud jsou aktuální; bez popisku pod sebou, datum a hodnoty jsou v tooltipu.
  - Dotazník: poslední vyplněný (skóre 14 px; klik otevře klinický report).
  - Laboratoř: poslední odběr (červená = zkratka 8 px a hodnota 11 px nejhoršího parametru). Klik otevře *Detail připravenosti*.
  - Wearables: poslední den (✓ / ! / ✕). Klik otevře *Detail připravenosti*.
  - Neaktuální data: čárkovaný červený čtverec s „—“; tooltip „Laboratoř: poslední data 2.10. (před 24 dny) – neaktuální“.
  - Žádný vyplněný dotazník: šedý čárkovaný čtverec s „—“.
  - Vpravo od čtverce je **stáří dat** (12 px): „dnes“, „včera“, „před 3 dny“ – kdy byl dotazník vyplněn, odběr proveden nebo měření pořízeno. U neaktuálních dat červeně („před 24 dny“), bez vyplněného dotazníku „bez dat“.
  - Sloupec Aktuální odděluje od měsíců šedá svislá čára 1 px (v hlavičce i v řádcích).
- **Časová osa** – **úzké dlaždice 22 × 36 px**, mezi dlaždicemi 4 px, **mezi skupinami (měsíci) malá mezera** 20 px, bez svislých čar. Nejnovější je vlevo. Členění se volí na záložce *Zobrazení*:
  - **Po týdnech** (výchozí):
    - jedna úzká dlaždice = jeden týden (pondělí–neděle);
    - týdny jsou seskupené po měsících s nadpisem „Říjen 2026“, „Září 2026“…; týden patří do měsíce, ve kterém začíná (pondělí), měsíc má tedy 4–5 dlaždic;
    - **osa začíná minulým týdnem** – aktuální stav je ve čtverci ve sloupci Aktuální;
    - má-li zdroj v týdnu víc položek, dlaždice ukazuje nejzávažnější (dotazník: červené > vyžádal kontrolu > žluté > zelené > N/A; laboratoř: nejhorší odběr) a tooltip doplní „+ 1 další ve stejném týdnu“;
    - týden bez dat = světle šedá úzká dlaždice (osa týdnů je tak vidět i bez dat).
  - **Po měsících**: sloupec = měsíc s nadpisem „Říjen 2026“, v něm všechny položky měsíce jako úzké dlaždice vedle sebe (včetně aktuálního týdne).
  - **Po letech**: sloupec = rok s nadpisem „2026“, v něm všechny položky roku.
  - **Jen vyplněné**: jediný sloupec „Vyplněné“; položky jdou za sebou bez prázdných období a **bez nevyplněných dotazníků (N/A)**.
  - Osa sahá po nejstarší data zobrazených pacientů; sloupce jsou u všech pacientů v zákrytu.
  - Obsah úzkých dlaždic:
    - dotazník: skóre 11 px, „N/A“ 8 px; klik otevře report nebo vyplnění;
    - laboratoř: ✓ / ! nebo u červené jen hodnota nejhoršího parametru 9 px (zkratka v tooltipu);
    - wearables: jedna dlaždice za týden = nejhorší den (✓ / ! / ✕).
- V patičce je uprostřed výběr „na stránku“ (výchozí 500).
- Dotazníky se berou z aktivní monitorace pacienta. Pokud žádná aktivní není, zobrazí se poslední monitorace.
- **Souhrn připravenosti v tabulce není** (sloupec Souhrn i barevný proužek řádku odebrány 2026-10-26). Pravidlo souhrnu zůstává v detailu připravenosti.

**Dlaždice laboratoře a wearables**
- Zelená s ✓ = vše v mezích.
- Žlutá s „!“ = hraniční hodnota.
- Červená:
  - laboratoř: **hodnota nejhoršího parametru** – ve čtverci se zkratkou nad ní (např. „PLT / 85“), v úzké dlaždici jen hodnota („85“). Nejhorší je parametr s nejzávažnější úrovní, při shodě ten, který je nejdál za červenou mezí;
  - wearables: ✕.
- Tooltip: zdroj, datum a všechny hodnoty mimo meze.
- Klik: čtverec Aktuální otevře *Detail připravenosti*; úzké dlaždice jsou jen pro čtení. **⚠️ OVĚŘIT**, kam má vést klik na historický odběr.

**Pravidlo souhrnu** – `src/lib/readiness.ts`, **⚠️ OVĚŘIT** s klinikem.
- Počítají se **jen zdroje, které pacient má** (stejné jako řádky v tabulce).
- Pacient bez laboratoře nebo bez zařízení tedy kvůli nim není „Neúplné“. **⚠️ OVĚŘIT**, zda nemá být laboratoř pro chemoterapii vždy povinná (např. nastavením v monitoraci).

Pravidla se vyhodnocují v tomto pořadí:
1. Kterýkoli aktuální zdroj je červený → **Nepřipraveno**.
2. Některý zdroj je neaktuální nebo chybí vyplněný dotazník → **Neúplné**.
3. Kterýkoli zdroj je žlutý (dotazník žlutý nebo modrý) → **K posouzení**.
4. Jinak (všechny zdroje pacienta aktuální a zelené) → **Připraveno**.
- Aktuální znamená:
  - dotazník vyplněný v intervalu monitorace, nejméně však 7 dní;
  - laboratoř nejvýš 7 dní stará (návrh počítal s „3 dny před cyklem“ – cykly léčby zatím nejsou v datech);
  - wearables nejvýš 1 den.
- Úroveň dotazníku = pásmo, modré se počítá jako žluté.

**Meze laboratoře** (**⚠️ OVĚŘIT**; mezi hranicemi je žlutá)

| Parametr | Zkratka | Jednotka | V mezích | Červená |
| --- | --- | --- | --- | --- |
| Neutrofily | NEU | ×10⁹/l | ≥ 2,0 | < 1,5 |
| Trombocyty | PLT | ×10⁹/l | ≥ 150 | < 100 |
| Hemoglobin | HB | g/l | ≥ 100 | < 80 |
| Kreatinin | KREA | µmol/l | < 110 | ≥ 150 |
| Bilirubin | BILI | µmol/l | < 22 | ≥ 32 |

**Meze wearables** (denní souhrn, **⚠️ OVĚŘIT**)

| Údaj | Jednotka | V mezích | Červená |
| --- | --- | --- | --- |
| Teplota (nejvyšší za den) | °C | < 37,5 | ≥ 38,0 |
| Saturace O₂ (nejnižší) | % | ≥ 95 | < 92 |
| Klidový tep | /min | < 100 | ≥ 120 |
| Kroky: průměr 7 dní proti předchozím 14 dnům | % | pokles do 40 % | – (pokles o 40 % a víc je žlutý) |

**Detail připravenosti** (modal – otevře se klikem na čtverec Laboratoř nebo Wearables ve sloupci Aktuální)
- Hlavička: „Souhrn připravenosti — Jméno Příjmení“, pod tím „RČ 1 · monitorace · stav k 25.10.2026“ a zavírací křížek.
- Šedý box: velký barevný štítek připravenosti (16 px) a pod ním seznam hraničních hodnot (ikona zdroje + text, barva podle úrovně; nejdřív červené, pak žluté, pak neaktuální data). Vpravo je text pravidla a oken aktuálnosti.
- Karty mají v záhlaví ikonu zdroje a název.
- Karta **Dotazník**:
  - štítek stavu: V pořádku / K posouzení / Mimo mez / Neaktuální / Bez dat; vpravo datum a stáří (u neaktuálních červeně);
  - štítek pásma se skóre, důvod pásma a odkaz „Klinický report z 19.10. →“ (zavře detail a otevře report);
  - odpovědi za 3 a více bodů (nejzávažnější nahoře, body v závorce).
- Karty **Laboratoř** a **Wearables** jsou vedle sebe (na mobilu pod sebou).
  - Tabulka: Parametr · Hodnota (barva podle úrovně, jednotka šedě) · Mez („≥ 2,0 · červená < 1,5“) · Stav (tečka + V mezích / Hraniční / Mimo mez).
  - Wearables mají navíc řádek Kroky se změnou za 7 dní.
  - Neaktuální zdroj ukazuje poslední data se štítkem „Neaktuální“.
- Bez dat: „Pacient zatím nevyplnil žádný dotazník.“, „Žádný výsledek laboratoře.“, „Pacient nemá připojené zařízení.“
  - Zdroj, který pacient nemá, má šedý štítek **„Nesleduje se“** a do souhrnu se nepočítá.

**Demo data připravenosti**
- Laboratoř a wearables jsou smyšlené (`src/data/readinessSeed.ts`).
- Všechna demo data se při vytvoření posunou tak, aby „dnešek“ dema odpovídal skutečnému dni. Data jsou tak vždy aktuální.
- Verze úložiště je v6, takže starší lokální data se nahradí demem.
- Rodná čísla pacientů jsou **smyšlená, ale formálně platná** (ženy: měsíc +50, platné datum, 10 číslic dělitelných 11), např. Dvořáková 7061233652. Datum narození v kartě pacienta je dopočítané z rodného čísla.
- Stavy v demu:
  - Šťastná = Připraveno;
  - Dlouhá = K posouzení (pokles kroků);
  - Krokerová = Nepřipraveno (neutrofily, horečka);
  - Dvořáková = Nepřipraveno (trombocyty);
  - Kokošková = Neúplné (laboratoř před 24 dny);
  - ostatní = Neúplné (skončená monitorace / neaktuální dotazník nebo laboratoř, Plyšová bez vyplněného dotazníku).

**Panel nástrojů** (pravý sloupec, NOVÉ)
- Nahoře jsou záložky s ikonou (16 px) a názvem: **Filtr** (ikona trychtýře), **Řazení** (ikona šipek ↑↓) a **Zobrazení** (ikona sloupců, NOVÉ 2026-10-26).
  - Aktivní záložka je modrá a podtržená, neaktivní šedá. Přepíná se kliknutím, výchozí je Filtr.
  - Když se nastavení záložky liší od výchozího, je za jejím názvem malá modrá tečka.
- Panel je **škálovatelný**: další nástroje (např. Export, Sloupce) se přidají jako další záložka (`TOOLS` v `Dashboard.tsx`).
- Tlačítko dole v panelu („Uložit jako pohled“ / „Uložit změny filtru“) je vidět na všech záložkách.

**Záložka Zobrazení** (NOVÉ)
- *Časová osa* (přepínač, pod každou volbou šedý popis 12 px):
  - **Po týdnech** (výchozí) – „Dlaždice = týden, seskupené po měsících“;
  - **Po měsících** – „Sloupec = měsíc, všechny položky“;
  - **Po letech** – „Sloupec = rok, všechny položky“;
  - **Jen vyplněné** – „Bez prázdných období a bez nevyplněných dotazníků“.
- Odkaz „Obnovit výchozí zobrazení“ se zobrazí jen při změně.
- Poznámka: „Zobrazení se pamatuje v tomto prohlížeči a neukládá se do pohledu.“ **⚠️ OVĚŘIT**, jestli má být součástí pohledu.
- Do záložky lze později přidat další volby zobrazení (např. výběr zdrojů).

**Záložka Řazení**
- *Řadit podle* (přepínač):
  - **Naléhavosti** (výchozí): podle stavu posledního dotazníku po termínu, v pořadí červené → vyžádal kontrolu → žluté → N/A → zelené → jen budoucí termíny. Při shodě podle jména. **⚠️ OVĚŘIT**, zda nemá výchozí řazení vycházet ze Souhrnu.
  - **Jména**, **Rodného čísla**, **Posledního vyplnění**.
- *Pořadí* (přepínač) s popisky podle zvoleného řazení:
  - Naléhavost: „Nejnaléhavější nahoře / dole“;
  - Jméno: „A → Z / Z → A“;
  - Rodné číslo: „Vzestupně / Sestupně“;
  - Poslední vyplnění: „Nejnovější / Nejstarší nahoře“.
- Odkaz „Obnovit výchozí řazení“ se zobrazí jen při změně.
- Poznámka: „Řazení platí jen pro aktuální zobrazení a neukládá se do pohledu.“

**Záložka Filtr**
- Odkaz „Obnovit výchozí“ (v pohledu „Zahodit změny“) je vpravo nahoře, jen při změně.
- *Skóre* (zaškrtávací pole s barevnou tečkou): Zelené pásmo, Žluté pásmo, Červené pásmo, Vyžádal kontrolu, Nevyplněno.
  - Výchozí stav: zaškrtnuté Červené pásmo, Vyžádal kontrolu a Nevyplněno.
- *Datum vyplnění* (přepínač): Vše, Poslední týden, Posledních 10 dní, Poslední 2 týdny.
- **Logika Skóre (od 2026-10-26): pásmo = barva pruhu vlevo u jména pacienta**, tj. nejhorší výsledek z aktuálních zdrojů (dotazník, laboratoř, wearables):
  - Zelené / Žluté / Červené pásmo / Vyžádal kontrolu = pruh v této barvě;
  - **Nevyplněno** = šedý pruh, tj. pacient nemá žádný aktuální zdroj.
  - Dříve se pacient zobrazil, když měl kdykoli v historii aspoň jeden dotazník v pásmu – to už neplatí. **⚠️ OVĚŘIT** s produkcí, která filtruje jen podle dotazníků.
- *Datum vyplnění* se vyhodnocuje zvlášť: pacient má v časovém okně aspoň jeden dotazník (vyplněný, nebo nevyplněný po termínu). Budoucí termíny se nepočítají.
- Skupiny se kombinují A ZÁROVEŇ.

## Pohledy (podstránky Dashboardu) – NOVÉ

Pohled je **pojmenovaná kombinace filtrů Dashboardu**, kterou si uživatel uloží. Pohledy jsou osobní, každý uživatel má své. **⚠️ OVĚŘIT**, jestli je bude potřeba sdílet v rámci pracoviště.

- **Menu:** pohledy jsou v bočním menu pod položkou Dashboard. Jsou odsazené a mají svislou linku vlevo (styl podnavigace Filament).
  - Aktivní pohled má šedé pozadí a modrý text.
  - Poslední položka je šedé „+ Nový pohled“.
- **Vytvoření pohledu**, dva způsoby:
  1. „+ Nový pohled“ v menu → dialog *Nový pohled* (pole Název\*) → vytvoří pohled s výchozím filtrem a otevře ho.
  2. Na Dashboardu tlačítko **Uložit jako pohled** (dole v pravém panelu) → dialog s názvem → uloží aktuální filtr.
- **Stránka pohledu** (`/pohledy/:id`):
  - drobečková navigace Dashboard › Pohledy, nadpis = název pohledu;
  - vpravo nahoře tlačítka **Přejmenovat** (šedé) a **Smazat** (červené, s potvrzením);
  - obsah je stejný jako na Dashboardu: tabulka pacientů a panel filtrů.
- **Změna filtru v pohledu** se neukládá hned:
  - v hlavičce panelu se objeví odkaz „Zahodit změny“;
  - dole v panelu je tlačítko **Uložit změny filtru**, které je aktivní jen při změně;
  - bez změn tlačítko ukazuje „Filtr je uložen“.
- **Výchozí Dashboard** se nedá přepsat. Při změně filtru se objeví odkaz „Obnovit výchozí“.

### Záložka Filtr (rozšířená)

Pod původní skupiny Skóre a Datum vyplnění přibyla:

- **Monitorace**: zaškrtávací pole pro každou monitoraci.

Filtry Klasifikace a Tag byly z panelu **odebrány** (2026-10-14). Klasifikace a tag zůstávají u monitorace jako údaje, jen se podle nich nefiltruje.

Logika: uvnitř skupiny platí NEBO, mezi skupinami platí A ZÁROVEŇ. Prázdná skupina nefiltruje. Monitorace se bere z aktuální monitorace pacienta.

V tabulce pacientů je pod jménem šedě název monitorace pacienta. V hlavičce karty je počet pacientů („3 pacientů“). **Jde o novinku oproti produkci.**

## Monitorace (programy sledování) – NOVÉ

Monitorace je **šablona sledování**: definuje, komu (diagnózy), jak často a s jakými hranicemi pásem se dotazníky posílají. Pacientovi se monitorace přiřazuje v Kartotéce (karta Monitorace pacienta → pole *Monitorace*, nebo rychlou akcí „+ Monitorace“ v seznamu).

### Přehled (`/monitorace`)

- Drobečková navigace Monitorace › Přehled, nadpis „Monitorace“, vpravo **Vytvořit**.
- Hledání (název, tag, klasifikace, kód nebo název diagnózy).
- **Sloupce:**

| Sloupec | Obsah |
| --- | --- |
| Název | tučně, zalamuje se |
| Diagnózy | štítky s kódem MKN-10 (monospace); název diagnózy je v tooltipu |
| Tag | šedý štítek |
| Klasifikace | barevný štítek: nonMD šedá, MD modrá, research fialová, other oranžová |
| Frekvence | Denně / Každé 3 dny / Týdně / Každé 2 týdny / Měsíčně / Každé 3 měsíce / Každých N dní |
| Pásma (body) | tři štítky s tečkou: zelené `0–7`, žluté `8–14`, červené `15+` |
| Pacienti | počet pacientů s aktivní monitorací |
| akce | Upravit, Smazat (s potvrzením) |

- Klik na řádek otevře úpravu.
- Smazání monitorace **nemaže data pacientů**. Pacienti zůstanou bez monitorace a monitorace zmizí z filtrů pohledů.

### Vytvořit / upravit (`/monitorace/vytvorit`, `/monitorace/:id/upravit`)

Nadpis „Nová monitorace“ / „Upravit monitoraci“. Na úpravě je vpravo nahoře **Smazat**.

**Karta 1 (dva sloupce):**
- **Název\*** a **Tag**. Tag nabízí už použité tagy a má nápovědu „Krátký štítek pro filtrování…“ (⚠️ OVĚŘIT: filtr podle tagu byl z Dashboardu odebrán – upravit text nápovědy, nebo tag úplně zrušit?).
- **Diagnózy\*** přes celou šířku:
  - vybrané diagnózy jsou modré štítky „kód + název“ s ✕;
  - na konci je výběr „+ Přidat diagnózu (MKN-10)…“;
  - musí být vybrána aspoň jedna.
- **Klasifikace\***: čtyři přepínací tlačítka nonMD / MD / research / other. Pod nimi je vysvětlivka:
  - nonMD = mimo zdravotnický prostředek;
  - MD = zdravotnický prostředek;
  - research = výzkum / studie;
  - other = ostatní.
  - **⚠️ OVĚŘIT** význam zkratek.
- **Frekvence odesílání\***: výběr předvoleb, nebo „Vlastní interval…“ s polem „každých N dní“.

**Karta 2 – Rozsah pásem:**
- Tři dlaždice: Zelené od 0 do [X], Žluté od X+1 do [Y], Červené od Y+1 a více.
- Zadávají se jen **dvě hranice**, takže pásma se nepřekrývají a nemají mezery.
- Pod dlaždicemi je náhledový pruh 0–40 b.
- Validace:
  - žluté musí končit výš než zelené;
  - žluté musí končit pod maximem dotazníku (40 b).
- Poznámka: modré pásmo nezávisí na skóre.

Tlačítka: **Vytvořit/Uložit** a **Zrušit**.

### Napojení na pacienta

- Dialog *Nová monitorace / Upravit monitoraci* v Kartotéce má pole **Monitorace** (výběr, nebo „— bez monitorace —“).
- Dotazníky se naplánují podle frekvence zvolené monitorace. Bez monitorace se posílají každých 7 dní.
- Tabulka Monitorace pacienta má první sloupec **Monitorace**.

**⚠️ OVĚŘIT – rozsahy pásem se zatím nepoužívají pro barvu odznaků.** Barva se stále počítá podle pravidla „nejvyšší body jedné odpovědi“ (viz *Pravidla pásma*). Je potřeba rozhodnout, jestli má pásmo určovat celkové skóre podle rozsahů monitorace, maximum jedné odpovědi, nebo obojí (horší z obou).

## Klinický report (modal)

Otevírá se kliknutím na vyplněný odznak. Šířka je přibližně 768 px.

- **Hlavička**:
  - vlevo „Klinický report — Jméno Příjmení“ a pod tím „Datum odeslání: 12. 4. 2026 08:41“;
  - pod datem **kontakt na pacienta** (NOVÉ): ikona telefonu + číslo ve tvaru „+420 603 277 036“ a ikona obálky + e-mail. Text jde označit a zkopírovat, nejde o tlačítka. Chybí-li telefon, je tam šedé „Telefon nevyplněn“;
  - vpravo štítek pásma („Červené pásmo: 20 b“) a pod ním důvod;
  - ikona kopírování (zkopíruje report jako text do schránky) a zavírací ✕.
- **TREND KLINICKÉHO STAVU (VÝVOJ SKÓRE)**:
  - plošný graf (tyrkysová čára `#14b8a6`, jemná výplň);
  - body jsou obarvené podle pásma, aktuální dotazník má větší bod;
  - osa X ukazuje data ve stejném pořadí jako odznaky (nejnovější vlevo), osa Y má krok 4.
- **Odpovědi**: šedé karty s malým štítkem zdroje (monospace „TheraData“ / „PRO-CTCAE“), textem otázky a odpovědí vpravo.
  - Barva odpovědi podle bodů: 0 zelená, 1 žlutá, 2–3 oranžová, 4 červená.
  - **Řazení** (NOVÉ): od nejzávažnějších. Nadpis „ODPOVĚDI (OD NEJZÁVAŽNĚJŠÍCH)“; nahoře žádost o kontrolu („Ano“), pak 4 body, 3 body… Při shodě pořadí z dotazníku.
  - **Porovnání s předchozím dotazníkem** (NOVÉ): vpravo v nadpisu „Porovnání s dotazníkem z 30.3.“ (nebo „Předchozí dotazník není k dispozici“). Pod každou odpovědí malým písmem:
    - červeně „↑ horší · dříve: Mírná“;
    - zeleně „↓ lepší · dříve: …“;
    - šedě „beze změny“.
  - Předchozí = poslední dříve vyplněný dotazník téže monitorace.
- Zavírá se klávesou Esc, klikem mimo modal nebo na ✕.

## Vyplnění dotazníku (ambulance)

Otevírá se kliknutím na odznak „N/A“ nebo na budoucí termín. Je to **celoobrazovkový režim bez menu**, protože zařízení se podává pacientovi.

- **Hlavička**:
  - logo a odkaz „Zrušit“;
  - pod hlavičkou ukazatel průběhu podle počtu zodpovězených otázek.
- **Otázky** jsou karty „Otázka X z N“. Typy otázek:
  - škála 0–100 (posuvník),
  - jedna volba (velká tlačítka vhodná pro dotyk),
  - Ano/Ne (žádost o kontrolu).
- **Odeslání**:
  - Pokud nějaká odpověď chybí, stránka posune na první nezodpovězenou otázku a orámuje ji červeně.
  - Po odeslání se zobrazí „Děkujeme, dotazník byl odeslán. Nyní prosím vraťte zařízení zdravotnickému personálu.“ a tlačítko „Zpět do aplikace“.
- **⚠️ Návrh, v produkci neověřeno.** Otázky v replice jsou zástupné a úplný seznam je třeba doplnit z produkce.

## Kartotéka – přehled

- Drobečková navigace: Kartotéka › Přehled. Nadpis „Kartotéka“, vpravo tlačítko **Vytvořit**.
- V kartě je hledání vpravo nahoře a tabulka se sloupci Celé jméno (`Příjmení Jméno →`), Rodné číslo, **Aktivní plán**, **e-Skill** (NOVÉ) a rychlá akce. Celý řádek je klikací.
- **e-Skill**: poslední výsledek testu (skóre barvou úrovně + štítek Nízká / Střední / Vysoká), jinak „—“.
- **Rychlá akce „+ Monitorace“** (NOVÉ, modrý odkaz vpravo v řádku): otevře dialog *Nová monitorace — Příjmení Jméno* (stejný jako v kartě pacienta: kalendář, délka 1–6 týdnů, výběr monitorace). Po vytvoření se zobrazí notifikace „Monitorace vytvořena – Příjmení Jméno“ a sloupec Aktivní plán se aktualizuje. Kliknutí na odkaz neotevírá kartu pacienta.
- **Aktivní plán** ukazuje stav monitorace pacienta k dnešku:
  - 🟢 **Aktivní** + název monitorace + „do 11.11.2026“: monitorace je označená jako aktivní a dnešek je mezi startem a koncem;
  - 🔵 **Naplánováno** + název + „od …“: aktivní monitorace se startem v budoucnu;
  - ⚪ **Ukončeno** + název + datum konce, celé šedě: poslední monitorace už skončila nebo je vypnutá;
  - šedé „Bez plánu“: pacient nemá žádnou monitoraci.
- **⚠️ OVĚŘIT**, jestli má produkce brát jako aktivní jen přepínač „Aktivní“, nebo i datum konce. Replika vyžaduje obojí.
- Patička: „Zobrazuji X až Y z Z výsledků“, výběr „na stránku“ (výchozí 10) a stránkování.

## Kartotéka – vytvořit / upravit pacienta

- Nadpisy: **„Nový pacient“ / „Upravit pacienta“** (dříve „Vytvořit Kartotéka“ / „Upravit Kartotéka“). Drobečková navigace zůstává Kartotéka › Vytvořit / Upravit. Potvrzení smazání: „Smazat pacienta“.
- Formulář má dva sloupce:
  - Příjmení\* | Jméno\*
  - Rodné číslo\* | Datum narození
  - Telefonní číslo | E-mailová adresa\*
  - pod nimi nápověda „Zadejte číslo ve formátu 420777888999 (bez +, mezer nebo pomlček).“
- Validace:
  - povinná pole: Příjmení, Jméno, Rodné číslo, E-mailová adresa;
  - e-mail musí mít platný formát;
  - telefon musí mít 12 číslic;
  - **rodné číslo – měkká kontrola** (NOVÉ): po opuštění pole (u existujícího pacienta hned) se pod polem zobrazí oranžové upozornění s ikonou ⚠ a rámeček pole zoranžoví. **Uložení neblokuje** („Uložit lze i tak.“). Kontroluje se:
    - tvar 123456/7890 (9 nebo 10 číslic, lomítko volitelné);
    - platné datum narození v prvních 6 číslicích (měsíc +50 u žen, +20/+70 od roku 2004);
    - u 10místného RČ kontrolní číslice (dělitelnost 11; zbytek 10 → 0).
- Tlačítka:
  - na úpravě **Uložit** (primární) a **Zrušit**, vpravo nahoře červené **Smazat** s potvrzovacím dialogem;
  - na vytvoření navíc „Vytvořit a vytvořit další“.
- Po uložení se zobrazí notifikace vpravo nahoře („Uloženo“).

### Monitorace pacienta (pod formulářem, jen při úpravě)

- Hlavička karty: **„Monitorace pacienta“** (dříve „Monitorings“) a tlačítko **Vytvořit**. Potvrzení smazání: „Smazat monitoraci“.
- Sloupce: zaškrtávací pole, Start, Konec (`19.3.2026`), Aktivní (zelená ikona ✓ / červená ✕), Dotazníky (odznaky).
- Akce řádku (odkazy s ikonou):
  - **Vytvořit dotazník** přidá nevyplněný dotazník s dnešním termínem;
  - **Upravit** otevře modal;
  - **Smazat** (červeně) se ptá na potvrzení.
- Hromadné smazání: po zaškrtnutí řádků se objeví tlačítko „Smazat vybrané“.
- Dialog *Nová monitorace / Upravit monitoraci* (široký, max. 1024 px) nemá datumová pole s rozbalovacím kalendářem. Má:
  - **Vlevo vždy viditelný kalendář se dvěma měsíci vedle sebe** (začátek týdne v pondělí, české názvy):
    - šipkami se posouvá o měsíc, odkaz „Dnes“ skočí na aktuální měsíc;
    - dnešní den je podtržený;
    - 1. klik = **Start**, 2. klik na pozdější den = **Konec**, další klik začne nový výběr;
    - vybrané období je podbarvené, Start a Konec jsou modré čtverečky;
    - když je vybraný jen Start, ukazuje se při najetí myší náhled období;
    - nápověda dole vpravo říká, co kliknout.
  - **Vpravo:**
    - výběr **Monitorace**;
    - **Start\*** a **Konec\*** jako text (např. 7.10.2026);
    - **Délka od startu**: tlačítka 1 týden / 2 týdny / 3 týdny / 4 týdny / 5 týdnů / 6 týdnů, která nastaví Konec = Start + N týdnů. Aktivní volba je modrá i při ručním výběru, pokud délka odpovídá.
    - přepínač **Aktivní**;
    - při vytváření informace „Naplánuje se N dotazníků (týdně)“ podle frekvence zvolené monitorace.
  - Výchozí Start je dnešek.
  - Dotazníky se při vytvoření naplánují podle frekvence monitorace (bez ní každých 7 dní). **⚠️ OVĚŘIT** frekvenci a pravidla v produkci.
  - Na úzkém displeji jsou měsíce i panel pod sebou.

## Statistiky

**⚠️ Zástupná stránka** (chybí screenshot z produkce). Obsahuje 4 dlaždice (pacienti, aktivní monitorace, vyplněné dotazníky, míra vyplnění) a pruhový přehled dotazníků podle pásma.

## e-Skill (test digitální gramotnosti) – NOVÉ

Modul je převzatý z repozitáře `pskrobanek/digital_literacy` (Django aplikace „Therahub“). 1:1 jsou převzaté:
- otázky dotazníku a 9 úkolů testu;
- texty v češtině a angličtině;
- časový limit 2 minuty;
- výpočet skóre a katalog doporučených aplikací.

**Odstraněno**: registrace pacienta (jméno, datum narození, rodné číslo), heslo webu, souhlasy, přihlášení personálu a samoobsluha GDPR. Pacienta vybírá personál z Kartotéky.

### Přehled (`/e-skill`)

- Drobečková navigace e-Skill › Přehled, nadpis „e-Skill“, vpravo primární tlačítko **Test bez registrace**.
- Tabulka pacientů (stejný seznam jako Kartotéka). Sloupce:
  - Celé jméno, Rodné číslo;
  - **Poslední výsledek**: skóre barvou úrovně a štítek Nízká / Střední / Vysoká, klik otevře detail;
  - Datum;
  - Testů (počet);
  - tlačítko **▶ Zahájit test**.
- Hledání, „na stránku“ a stránkování jako v Kartotéce.

### Průběh testu (nové okno)

„Zahájit test“ i „Test bez registrace“ otevřou test v **novém okně** (popup 1100×850). Pokud prohlížeč okno zablokuje, test se otevře ve stejném okně. Okno testu nemá menu; v hlavičce je logo, „e-Skill“, jméno pacienta a přepínač jazyka (Čeština / English).

1. **Úvod**: „Test digitální gramotnosti“, popis, tlačítko **Začít**.
2. **Dotazník**, 4 otázky po jedné:
   - každá otázka je karta s velkými tlačítky voleb, pod ní ukazatel průběhu;
   - Q1 (zařízení) dovoluje víc voleb, volba „Žádné“ vylučuje ostatní;
   - tlačítko Další je aktivní až po odpovědi.
3. **Úvod testu**: popis a upozornění na limit 2 minuty, tlačítko **Začít test**.
4. **9 úkolů**:
   - zelené tlačítko START;
   - tlačítko „Pokračovat“;
   - modrý bod;
   - ikona e-mailu;
   - odkaz v textu;
   - „Kontakt“ v menu;
   - zavřít popup;
   - napsat slovo;
   - vybrat datum: **náhodný den za 1–6 týdnů od dneška** (NOVÉ, dříve pevně 15. 2. 2026), zobrazený česky „4. 11. 2026“ / anglicky „November 4, 2026“.
   
   Nahoře je pokyn, číslo úkolu a odpočet (posledních 30 s červeně), dole ukazatel průběhu. Správný klik se zvýrazní zeleně, chybný červeně a měří se vzdálenost chybného kliknutí od cíle. Po 2 minutách se test ukončí a nedokončené úkoly se počítají jako chybné.
5. **Výsledek**: velké skóre 0–100 barvou úrovně, štítek úrovně, „Děkujeme, test je dokončen.“ a 6 dlaždic (motorika, správné úkoly, rychlost, vzdálenost chybných kliknutí, čas psaní, přesnost psaní).
   - **U pacienta**: výsledek se uloží automaticky. Zobrazí se „Výsledek uložen do karty pacienta X“ a tlačítko **Zavřít**, které zavře okno.
   - **Bez registrace**: zobrazí se „Výsledek zatím není nikde uložen“ a tlačítka **Zavřít bez uložení** a **Přiřadit pacientovi**. Přiřazení otevře výběr pacienta z Kartotéky s hledáním; po kliknutí na pacienta se výsledek uloží.

Hlavní okno se po uložení aktualizuje samo, bez obnovení stránky.

**Varování při odchodu** (NOVÉ): během dotazníku a testu (od kliknutí na Začít až po výsledek) prohlížeč při zavření nebo obnovení okna zobrazí standardní dotaz „Opravdu chcete odejít? Provedené změny nemusí být uloženy.“ Na úvodní obrazovce a na výsledku se neptá.

### Karta pacienta

Pod tabulkou Monitorace pacienta je karta **e-Skill**:
- tlačítko **▶ Zahájit test**;
- tabulka výsledků se sloupci Datum, Digitální gramotnost, Motorika, Správné úkoly, Čas testu (s označením „(limit)“) a akcí Smazat.

Klik na řádek otevře **detail výsledku**:
- skóre a úroveň, motorické skóre;
- metriky testu;
- odpovědi dotazníku;
- **doporučené aplikace** pro úroveň pacienta (náročnější aplikace jsou vyřazené);
- vzorec výpočtu.

### Výpočet (převzato)

- **Motorika** = 65 % správné úkoly napoprvé + 15 % rychlost (strop 120 s) + 10 % přesnost kliknutí (strop 500 px) + 5 % rychlost psaní (strop 30 s) + 5 % přesnost psaní.
- **Digitální gramotnost** = motorika × šíře technologií (0,7 + 0,1 za telefon/tablet/počítač) × L faktor (Q2) × kvalita podpory (Q3) − penalizace dostupnosti pomoci (Q4), omezeno na 0–100.
- **Úroveň**: ≤ 33 Nízká, ≤ 66 Střední, jinak Vysoká.

**⚠️ OVĚŘIT:**
- Pacient na konci testu vidí své skóre. V originále byl výsledek „uzamčen“ rodným číslem.

## Otevřené otázky pro produkci

1. Má barvu pásma určovat rozsah skóre z monitorace, nebo současné pravidlo „max. body jedné odpovědi“, nebo obojí?
2. Jsou pohledy osobní, nebo sdílené pro pracoviště? Má si uživatel moci nastavit pohled jako svůj výchozí Dashboard?
3. Úplný seznam otázek dotazníku, jejich bodování a zdroje (TheraData / PRO-CTCAE).
4. Přesná pravidla pásem a priorita mezi modrým a červeným pásmem.
5. Logika filtru na Dashboardu: filtruje se podle nejnovějšího dotazníku, nebo podle kteréhokoli?
6. Frekvence plánovaných dotazníků v monitoraci.
7. Obsah stránky Statistiky.
8. Některá jména jsou v produkčních datech zadaná obráceně (Příjmení „Anna“, Jméno „Malá“). Replika to přebírá. Doporučení: v UI zdůraznit pořadí polí.
9. Meze laboratoře a wearables, okna aktuálnosti (vázat laboratoř na datum příštího cyklu léčby?) a pořadí v souhrnu (má „Neúplné“ přebíjet „K posouzení“?).
10. Odkud přijdou data laboratoře (LIS / nemocniční systém) a wearables (které zařízení, jak často), a co má otevřít klik na jejich odznak.
11. Které zdroje jsou pro připravenost povinné (např. laboratoř u chemoterapie)? Nastavovat to v monitoraci?

## Changelog

| Datum | Změna |
| --- | --- |
| 2026-10-26 | Filtr Skóre (Dashboard i pohledy) filtruje podle barvy pruhu u jména – nejhoršího výsledku z aktuálních zdrojů; „Nevyplněno“ = žádný aktuální zdroj. Datum vyplnění se vyhodnocuje samostatně. |
| 2026-10-26 | Dashboard: barevný pruh nejhoršího aktuálního výsledku přesunut na levou stranu buňky Pacient a zesílen na 9 px. Rodné číslo bez popisku „RČ“. Demo data: smyšlená platná rodná čísla a dopočítané datum narození (úložiště v6). |
| 2026-10-26 | Dashboard: barevná čára přesunuta na konec sloupce Pacient; za sloupcem Aktuální šedá čára. Ve sloupci Aktuální je vedle čtverce stáří dat („dnes“, „včera“, „před 3 dny“; neaktuální červeně). |
| 2026-10-26 | Dashboard: čára mezi sloupcem Aktuální a měsíci; v řádcích pacienta je barevná (3 px) podle nejhoršího výsledku z aktuálních zdrojů. |
| 2026-10-26 | Dashboard podle náčrtu: odebrán sloupec Souhrn i proužek řádku. Pacient = jméno tučně, RČ a podtržená monitorace (odkaz). Sloupec zdrojů bez nadpisu, mezi řádky zdrojů bez čar. Aktuální = čtverec 36 px, časová osa = úzké dlaždice 22 × 36 px; po týdnech seskupené po měsících („Říjen 2026“) s malou mezerou mezi měsíci, osa začíná minulým týdnem. Bez datumů pod dlaždicemi (jsou v tooltipu). Detail připravenosti se otevírá ze čtverce Laboratoř / Wearables. |
| 2026-10-26 | Dashboard a pohledy: odebráno podrobné zobrazení i přepínač Kondenzované / Podrobné. Jedno zobrazení se sloupcem Zdroj a řádkem za každý zdroj, který pacient má (1–3 řádky). Nové minimalistické ikony zdrojů místo emoji. Nižší řádky (odznaky 28 px). Nová záložka Zobrazení: časová osa po týdnech / měsících / letech / jen vyplněné. Souhrn: jen štítek (hraniční hodnoty v tooltipu a detailu); počítá jen zdroje, které pacient má. |
| 2026-10-26 | Dashboard a pohledy: v kondenzovaném zobrazení odebrán sloupec Zdroj (zůstává jen v podrobném). |
| 2026-10-26 | Dashboard a pohledy: odebrán sloupec Plánované (budoucí dotazníky jsou jen v kartě pacienta). Legenda ⓘ na Dashboardu bez odznaku „plánováno“. |
| 2026-10-26 | Souhrn: místo ikony semaforu barevný štítek připravenosti (✓ Připraveno / ! K posouzení / ✕ Nepřipraveno / ? Neúplné) v tabulce, v detailu i v legendě. |
| 2026-10-25 | Dashboard a pohledy: přepínač zobrazení Kondenzované / Podrobné. Nový sloupec Souhrn (semafor, v podrobném zobrazení i hraniční hodnoty) s detailem po kliku. Zdroje Laboratoř a Wearables, sloupec Aktuální a časová osa po týdnech (nahrazuje sloupce Poslední vyplněný a roky). Červený odznak laboratoře ukazuje hodnotu nejhoršího parametru. Proužek řádku má barvu souhrnu. Sloupce Pacient a Zdroj jsou ukotvené, Pacient má 208 px. Legenda ⓘ rozšířena (v kartě pacienta jen dotazník). Demo data: laboratoř a wearables, posun dat k dnešku, monitorace Prostata – kurativní RT každé 2 týdny (odpovídá datům Dlouhé). |
| 2026-10-14 | Dashboard a pohledy: nový sloupec „Zdroj“ za sloupcem Pacient, zatím jen typ „📋 Dotazník“. |
| 2026-10-14 | Filtr: odebrány skupiny Klasifikace a Tag. Ukázkový pohled „Studie – nevyplněné“ filtruje podle monitorace. |
| 2026-10-14 | Oprava: sloupec „Poslední vyplněný“ byl zbytečně široký kvůli dlouhému popisku – popisek zkrácen na „Poslední“, menší okraje. |
| 2026-10-14 | Sloupec „Poslední měsíc“ nahrazen sloupcem „Poslední vyplněný“ – vždy jen jeden, nejnověji vyplněný dotazník. |
| 2026-10-14 | Dashboard: sloupce skupin jen tak široké, jak je potřeba. Demo data: delší historie dotazníků u Dlouhé, Krokerové, Šťastné (od 2025) a nová monitorace u Kokoškové. |
| 2026-10-14 | Dashboard: rodné číslo pod jménem (sloupec „Pacient“), sloupec Plánované ukazuje jen nejbližší dotazník, zbytek po kliknutí na „+N“. |
| 2026-10-14 | Dashboard: dotazníky vždy v jednom řádku, při nedostatku místa vodorovný posuvník; jméno a RČ ukotvené vlevo. |
| 2026-10-14 | Dashboard: skupiny dotazníků jako pevné sloupce tabulky (Plánované / Poslední měsíc / roky) v zákrytu napříč pacienty, prázdné buňky s „—“. |
| 2026-10-14 | Odznaky dotazníků rozdělené do skupin: Plánované → Poslední měsíc → starší po letech. |
| 2026-10-14 | Dashboard: řazení přesunuto z lišty nad tabulkou do pravého panelu – záložky „Filtr“ a „Řazení“ (s ikonami), škálovatelné pro další nástroje. |
| 2026-10-14 | Dashboard: řazení (naléhavost, jméno, RČ, poslední vyplnění), legenda barev ⓘ, budoucí termíny odlišené od N/A. Klinický report: kontakt na pacienta, odpovědi od nejzávažnějších, porovnání s předchozím dotazníkem. Kartotéka: sloupec e-Skill, rychlá akce „+ Monitorace“. Pacient: nadpisy „Nový pacient / Upravit pacienta / Monitorace pacienta“, měkká kontrola RČ. e-Skill: varování při odchodu, datum úkolu 9 náhodně za 1–6 týdnů. Sjednocení češtiny („Pacienti“, „Monitorace pacienta“, „N/A“). |
| 2026-10-07 | Odznaky dotazníků: vždy čtverec 32 × 32 px, menší zaoblení (4 px), „N/A“ velkými písmeny. |
| 2026-10-07 | Kartotéka: sloupec „Aktivní plán“ (Aktivní / Naplánováno / Ukončeno / Bez plánu). |
| 2026-10-07 | Monitoring pacienta: místo datumových polí vždy viditelný dvouměsíční kalendář (klik Start → Konec) a tlačítka délky 1–6 týdnů. |
| 2026-10-07 | e-Skill: test digitální gramotnosti z repozitáře digital_literacy bez registrace – seznam pacientů se „Zahájit test“, test v novém okně, uložení do karty pacienta, test bez registrace s přiřazením výsledku. |
| 2026-10-07 | Monitorace (seznam + formulář: název, diagnózy, tag, klasifikace, frekvence, rozsahy pásem), přiřazení monitorace pacientovi, uživatelské pohledy pod Dashboardem, rozšířený filtr (monitorace, klasifikace, tag). |
| 2026-10-07 | První verze repliky podle screenshotů (Dashboard, Klinický report, Kartotéka, Monitorings, vyplnění dotazníku). |
