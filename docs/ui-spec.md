# OncoReady – specifikace UI

Specifikace popisuje UI repliky. Kde se replika liší od produkce nebo kde jde o předpoklad, je to označeno **⚠️ OVĚŘIT**.
Produkce běží na Laravel Filament, a proto replika přebírá jeho vzhled (komponenty, rozestupy, barvy).

## Globální layout

- **Horní lišta** (výška 64 px, bílá, spodní stín): vlevo logo OncoReady („Onco“ černě, „Ready“ primární modrou), vpravo kulatý avatar s iniciálou (černé pozadí, bílé písmeno).
- **Boční menu** (od šířky ≥ 1024 px), v tomto pořadí:
  - Dashboard (ikona domu);
  - pod ním odsazené **pohledy** uživatele a „+ Nový pohled“ (viz *Pohledy*);
  - **Šablony** (ikona schránky se seznamem; do 2026-10-26 „Monitorace“);
  - Kartotéka (ikona složek);
  - Statistiky (ikona sloupcového grafu);
  - **e-Skill** (ikona kurzoru).
  - Aktivní položka má světle šedé pozadí, text i ikona jsou v primární modré.
  - Neaktivní položka má šedou ikonu a tmavý text.
- **Obsah**: šedé pozadí (`gray-50`), bílé karty se zaoblením 12 px a jemným rámečkem.
- **Nadpis stránky**: 30 px, tučný. Nad ním drobečková navigace (šedá, oddělovač `›`).

### Zpětná vazba (NOVÉ 2026-11-19)

Okno pro připomínky testerů, dostupné na každé stránce s menu.
- **Počítač (≥ 1024 px)**: **nenápadný blok pevně dole v levém menu** – od 2026-11-20 bez karty a bez bílého pozadí (průhledný na šedém pozadí menu), oddělený jen tenkou šedou čárou nahoře. Je vidět bez klikání a bez posouvání.
  - **Ostré rohy**: textové pole i tlačítka mají zaoblení jen 2 px, bez stínů, rámeček tenký šedý.
  - Nadpis „Zpětná vazba“ tmavě šedý se šedou ikonou bubliny (14 px, tučně).
  - **Textové pole** (5 řádků, roztahovatelné; průhledné, při psaní bílé s modrým rámečkem), zástupný text „Co nefunguje, chybí nebo by šlo udělat lépe?“.
  - Průhledné tlačítko s tenkým rámečkem přes celou šířku **Pořídit snímek obrazovky** (ikona fotoaparátu).
    - Klik vyfotí aktuální stránku bez okna zpětné vazby (během focení text „Pořizuji snímek…“).
    - Místo tlačítka se pak ukáže příloha: náhled snímku, text „Snímek obrazovky · Dashboard“ (název stránky) a křížek na odebrání.
  - Modré tlačítko přes celou šířku **Odeslat** (ikona papírového letadla). Bez textu je neaktivní a nenápadně šedé (modré je až po napsání textu). Odeslat jde i zkratkou Ctrl+Enter (v okně se nezobrazuje).
  - Po odeslání: zelená ikona ✓, „Děkujeme, připomínka odeslána.“ a tlačítko **Napsat další**.
- **Mobil a tablet (< 1024 px)**: vpravo dole plovoucí modré tlačítko **Zpětná vazba**. Otevře stejný formulář v panelu zespodu (s ztmaveným pozadím a křížkem Zavřít).
- K připomínce se automaticky ukládá stránka (cesta), čas, autor (přihlášený uživatel) a snímek (JPEG, šířka nejvýš 1200 px).
- Typ připomínky (Chyba / Nápad / …) ani pomocné texty se nezobrazují – formulář je záměrně co nejjednodušší.
- **⚠️ OVĚŘIT**: kam mají připomínky v produkci chodit (e-mail, databáze, nástroj na úkoly). Replika je ukládá jen v prohlížeči (`feedback` v localStorage) a zatím je nikde nezobrazuje.
- Snímek pořizuje knihovna `html-to-image` (vykreslí stránku do obrázku bez dotazu na sdílení obrazovky). V produkci může IT zvolit jiné řešení.

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

Stránka má dvě části: vlevo **boxy s pacienty** pod sebou, vpravo samostatná karta s panelem nástrojů (záložky Filtr, Řazení a Zobrazení, šířka 288 px). Na menší obrazovce je panel pod boxy.

**Boxy** (od 2026-11-19; dříve jedna společná tabulka) – každý box je samostatná bílá karta (zaoblené rohy, jemný rámeček), mezi boxy je mezera 24 px:
1. **Pacienti** – nadpis, vpravo počet pacientů, pod ním hledání (jméno a rodné číslo) přes celou šířku.
   - **Hledání prohledává všechny pacienty** – při zadaném textu se filtry (Skóre, Datum vyplnění, Šablona) nepoužijí. Sestra tak najde i pacienta, kterého aktuální filtr skrývá.
2. **Boxy příznaků** (od 2026-11-20) – jeden box pro každý **příznak** ze šablon (tlačítka v boxu *Příznaky* šablony, viz *Šablony*), v pořadí podle šablon; výchozí **Čekárna** a **K aplikaci**.
   - **Které boxy jsou vidět, se volí v Zobrazení › Boxy příznaků** – tím se určuje, kolik boxů v hlavním okně je. Výchozí: všechny.
   - V boxu jsou pacienti s tímto **dnešním příznakem**, seřazení podle času označení (nejdéle čekající nahoře), **nezávisle na filtrech**; hledání je zužuje.
   - Box je vidět i prázdný: „Dnes zatím nikdo.“
   - Pacient z boxu zmizí, když dostane jiný příznak, když se příznak zruší, nebo další den.
   - Ikona v hlavičce boxu = **ikona příznaku** ze šablony (šedá, 20 px). Má-li příznak se stejným názvem v různých šablonách různé ikony, použije se z první šablony.
3. **Všichni pacienti** – celý seznam podle filtrů, řazení a seskupení z pravého panelu, dole výběr počtu na stránku.
   - **Pacient s příznakem je i tady** (je tedy vidět dvakrát: ve svém boxu a v seznamu). ⚠️ OVĚŘIT, zda to tak má zůstat.
   - Seskupení podle závažnosti / šablon (záložka *Zobrazení*) se zobrazuje jen uvnitř tohoto boxu jako světle šedé mezinadpisy.
   - Když filtru nikdo neodpovídá: „Žádní pacienti neodpovídají filtru“.

Vzhled boxů 2–3:
- hlavička boxu je klidná: šedá ikona (ikona příznaku / skupina osob), název 16 px tučně a šedě počet pacientů; **žádné barevné pruhy**;
- pod hlavičkou je tabulka se **stejnou hlavičkou sloupců v každém boxu** (Pacient, zdroj, Aktuální, Příznak, časová osa);
- **řádek pacienta vypadá ve všech boxech stejně** (pruh, zdroje, Aktuální, tlačítka, časová osa);
- sloupce mají pevné nejmenší šířky, takže **lícují pod sebou napříč boxy**; vodorovný posun časové osy je pro všechny boxy **společný**.

**Tabulka v boxu** (rozložení podle náčrtu 2026-10-26; sloupec Souhrn odebrán)
- **Řazení** a **časová osa** se nastavují v pravém panelu (viz *Panel nástrojů*).
- **Sloupce** (zleva): Pacient · zdroj (bez nadpisu) · Aktuální · **Příznak** · časová osa · prázdná výplň. Hlavička má jeden řádek, všechny nadpisy jsou stejné (14 px, tučně).
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
    1. jméno `Příjmení Jméno` tučně; **klik otevře *Souhrnný prescoring*** (od 2026-11-19; dříve odkaz na úpravu pacienta – ta je teď dostupná odkazem „Karta pacienta →“ v prescoringu);
    2. rodné číslo šedě, bez popisku „RČ“ (např. „7061233652“);
    3. po malé mezeře **název šablony podtržený** (odkaz na úpravu šablony; dlouhý název se zkrátí „…“).
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
  - Sloupec Aktuální odděluje od dalšího sloupce šedá svislá čára 1 px (v hlavičce i v řádcích).
- **Příznak** (od 2026-11-20; dříve „Další postup“; sloupec hned za Aktuální, oddělený šedou čarou i od měsíců) – tlačítka nastavují **příznak pacienta**:
  - jedna buňka přes všechny řádky pacienta, zarovnaná nahoru;
  - pod sebou **tlačítka ze šablony pacienta** (nastavují se v boxu *Příznaky* šablony), výchozí: **Čekárna** a **K aplikaci** (od 2026-11-19; dřívější „Ke kontrole sestrou / lékařem“ jsou zrušené a z uložených dat se odeberou);
  - **Čekárna**: zmáčkne sestra, pacient se objeví v boxu Čekárna (pokud je box zapnutý v Zobrazení), kde ho lékař hned najde;
  - **K aplikaci**: označí sestra nebo lékař; pacient tím z čekárny odejde;
  - tlačítko má vlevo **ikonu příznaku** (16 px, od 2026-11-20); nezvolené je bílé s šedým rámečkem a šedou ikonou (12 px tučně), **zvolené je modré s bílou ikonou** (dříve ✓) a pod tlačítky je šedě čas „od 8:34“;
  - pacient má vždy nejvýš jeden příznak: klik na jiné tlačítko ji změní, klik na zvolené ji zruší; notifikace „Čekárna – Příjmení Jméno“ / „Příznak zrušen – …“; tooltip zvoleného „Zrušit příznak“;
  - **příznak platí jen v den, kdy byl nastaven** – další den je pacient zase bez příznaku;
  - příznak se ukládá k monitoraci pacienta (tlačítko, popisek, čas); když tlačítko ze šablony později zmizí, zůstane u času jeho popisek;
  - pacient, jehož šablona nemá žádné příznaky, má v buňce šedou pomlčku (tooltip „Šablona nemá žádné příznaky“);
  - **⚠️ OVĚŘIT**: kdo smí který příznak nastavit (role sestra / lékař) – replika role nerozlišuje.
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
- Pacient bez laboratoře nebo bez zařízení tedy kvůli nim není „Neúplné“. **⚠️ OVĚŘIT**, zda nemá být laboratoř pro chemoterapii vždy povinná (např. nastavením v šabloně).

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

**Souhrnný prescoring** (modal – otevře se **klikem na jméno pacienta**, případně na čtverec Laboratoř nebo Wearables ve sloupci Aktuální; dříve „Detail připravenosti“)
- Hlavička: „Souhrnný prescoring k chemoterapii — Jméno Příjmení“, pod tím „RČ 1 · šablona · stav k 19.11.2026 · **Karta pacienta →**“ (odkaz na úpravu pacienta). Vpravo jsou **tlačítka značky** ze šablony (Čekárna, K aplikaci) – lékař tak může pacienta označit přímo z prescoringu – a zavírací křížek.
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
- Demo pacienti přidaní později (zatím Horáková, Veselý, Marková, Bartoš) se **jednou doplní i do dat uložených v prohlížeči**, včetně dotazníků, laboratoře a wearables. Kdo je smaže, tomu se už nevrátí.
- Rodná čísla pacientů jsou **smyšlená, ale formálně platná** (ženy: měsíc +50, platné datum, 10 číslic dělitelných 11), např. Dvořáková 7061233652. Datum narození v kartě pacienta je dopočítané z rodného čísla.
- Stavy v demu:
  - Šťastná = Připraveno;
  - **Horáková, Veselý, Marková, Bartoš = Připraveno** (NOVÉ 2026-11-19) – zelení pacienti, kteří mohou k aplikaci: dotazník dnes / včera v zeleném pásmu, čerstvá laboratoř v mezích, u Horákové a Bartoše i wearables bez odchylek. Šablony Prs, Prostata, Hlava a krk, Plíce. Na Dashboardu jsou vidět ve výchozím filtru (Vše);
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
- *Seskupit podle* (přepínač, NOVÉ 2026-10-26):
  - **Neseskupovat** (výchozí) – „Jeden seznam pacientů“;
  - **Závažnosti** – „Podle barvy pruhu u jména“: skupiny v pořadí Červené pásmo, Vyžádal kontrolu, Žluté pásmo, Nevyplněno (šedý pruh = nic aktuálního), Zelené pásmo; prázdné skupiny se nezobrazují;
  - **Šablony** – „Podle šablony monitorace pacienta“: skupiny podle názvu šablony abecedně, pacienti bez šablony na konci („Bez šablony“).
  - Skupiny jsou jen uvnitř boxu **Všichni pacienti**. Nadpis skupiny je řádek přes celou šířku tabulky (šedé pozadí, 14 px tučně, u závažnosti barevná tečka, za názvem šedě počet pacientů). Při vodorovném posunu zůstává vlevo.
  - Uvnitř skupiny platí zvolené řazení. Pořadí skupin je pevné (nemění se směrem řazení).
- *Boxy příznaků* (zaškrtávací pole, NOVÉ 2026-11-20): jeden řádek pro každý příznak ze šablon s ikonou (Čekárna, K aplikaci, …). Zaškrtnutý = příznak má v hlavním okně vlastní box nad boxem Všichni pacienti. Výchozí: všechny zaškrtnuté (nový příznak se zobrazí hned). Bez příznaků v šablonách: „Šablony nemají žádné příznaky.“
- Odkaz „Obnovit výchozí zobrazení“ (vrátí časovou osu, seskupení i boxy příznaků) se zobrazí jen při změně.
- Poznámka: „Zobrazení se pamatuje v tomto prohlížeči a neukládá se do pohledu.“ **⚠️ OVĚŘIT**, jestli má být součástí pohledu.
- Do záložky lze později přidat další volby zobrazení (např. výběr zdrojů).

**Záložka Řazení**
- *Řadit podle* (přepínač):
  - **Naléhavosti** (výchozí, od 2026-10-26): podle **barvy pruhu u jména** (nejhorší výsledek z aktuálních zdrojů) v pořadí červená → vyžádal kontrolu (modrá) → žlutá → nic aktuálního (šedá) → zelená. Při shodě podle jména. Dříve se řadilo podle posledního dotazníku po termínu.
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
- *Skóre* (zaškrtávací pole): **Vše** (NOVÉ 2026-11-20, bez tečky, první), pak s barevnou tečkou Zelené pásmo, Žluté pásmo, Červené pásmo, Vyžádal kontrolu, Nevyplněno.
  - **Vše** je zaškrtnuté, když jsou zaškrtnutá všechna pásma. Zaškrtnutí Vše zaškrtne všechna pásma, odškrtnutí všechna odškrtne (prázdná skupina nefiltruje, takže se ukážou všichni). Odškrtnutí kteréhokoli pásma odškrtne i Vše.
  - **Výchozí stav: Vše** (od 2026-11-20; dříve zaškrtnuté Červené pásmo, Vyžádal kontrolu a Nevyplněno). Platí i pro nový pohled.
- *Datum vyplnění* (přepínač): Vše, Poslední týden, Posledních 10 dní, Poslední 2 týdny.
- *Příznak* (zaškrtávací pole, NOVÉ 2026-11-20): každý příznak ze šablon (s šedou ikonou před názvem) a šedě **Bez příznaku**. Filtruje **Všichni pacienti** podle dnešního příznaku; nic nezaškrtnuto = nefiltruje. Ukládá se i do pohledu (starší pohledy dostanou prázdný výběr). Při hledání se nepoužije.
- *Šablona* (od 2026-10-26 **rozbalovací výběr více možností** místo zaškrtávacích polí, Filament Select multiple):
  - prázdné pole ukazuje šedě „Všechny šablony“ a nefiltruje;
  - klik do pole otevře seznam šablon; klik na šablonu ji přidá nebo odebere (vybraná je modře s ✓); seznam se zavře klikem mimo nebo klávesou Esc;
  - vybrané šablony jsou v poli jako modré štítky s křížkem (křížek šablonu odebere), při nedostatku místa se zalamují;
  - pacient se zobrazí, pokud jeho monitorace vychází z některé z vybraných šablon.
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

- **Šablona** (dříve „Monitorace“): rozbalovací výběr více šablon (viz *Záložka Filtr* na Dashboardu).

Filtry Klasifikace a Tag byly z panelu **odebrány** (2026-10-14). Klasifikace a tag zůstávají u šablony jako údaje, jen se podle nich nefiltruje.

Logika: uvnitř skupiny platí NEBO, mezi skupinami platí A ZÁROVEŇ. Prázdná skupina nefiltruje. Šablona se bere z aktuální monitorace pacienta.

V tabulce pacientů je pod jménem název šablony monitorace pacienta. V hlavičce karty je počet pacientů („3 pacientů“). **Jde o novinku oproti produkci.**

## Šablony (šablony monitorace) – NOVÉ

Stránka se do 2026-10-26 jmenovala „Monitorace“. **Názvosloví:**
- **Šablona** = program sledování: definuje, komu (diagnózy), jak často a s jakými hranicemi pásem se dotazníky posílají.
- **Monitorace** = konkrétní sledování pacienta podle šablony (start, konec, aktivní). Vytváří se v Kartotéce (karta Monitorace pacienta → pole *Šablona*, nebo rychlou akcí „+ Monitorace“ v seznamu). Tyto názvy zůstaly beze změny.

### Přehled (`/sablony`)

- Drobečková navigace Šablony › Přehled, nadpis „Šablony“, vpravo **Vytvořit**.
- Staré adresy `/monitorace…` přesměrují na `/sablony`.
- Hledání podle názvu (od 2026-11-20; dříve i tag, klasifikace a diagnózy).
- **Sloupce:**

| Sloupec | Obsah |
| --- | --- |
| Název | tučně, zalamuje se |
| Zdroje | pod sebou šedá ikona a název zdroje (Dotazník, Laboratoř, Wearables) |
| Frekvence | Popis frekvence, např. „Jednorázově“, „Každých 7 dní“, „Každé 2 týdny ve středu“, „Každý měsíc, 15. den“, „Každý rok v březnu“, „Vlastní (3 termíny)“. Pod ním šedě konec, pokud je nastavený: „celkem 10 dotazníků“ / „po dobu 3 měsíců“. |
| Pacienti | počet pacientů s aktivní monitorací podle této šablony (tooltip) |
| akce | Upravit, Smazat (s potvrzením) |

- Klik na řádek otevře úpravu.
- Smazání šablony (potvrzení „Smazat šablonu“) **nemaže data pacientů**. Jejich monitorace zůstanou bez šablony a šablona zmizí z filtrů pohledů.

### Vytvořit / upravit (`/sablony/vytvorit`, `/sablony/:id/upravit`)

Nadpis „Nová šablona“ / „Upravit šablonu“, drobečková navigace Šablony › Vytvořit / Upravit. Na úpravě je vpravo nahoře **Smazat**.

Karty pod sebou (od 2026-11-20): **Název → Frekvence → Zdroje → Příznaky**. Karty Zařazení (diagnózy, klasifikace, tag) a Rozsah pásem jsou **z formuláře odebrané** (2026-11-20).

**Karta 1 – Název:** jen pole **Název\*** přes celou šířku.

**Karta 2 – Frekvence** (NOVÉ 2026-11-20; nahrazuje výběr „Frekvence odesílání“ s počtem dní):
- Nadpis „Frekvence“, popis „Jak často se pacientovi automaticky odešle dotazník.“
- ~~Zahájení monitorace~~ – **odebráno 2026-11-20** (v šabloně nedává smysl; začátek monitorace se volí u pacienta v kalendáři dialogu Nová monitorace).
- Tři přepínací tlačítka (vzhled jako Klasifikace) s vysvětlivkou pod nimi:
  - **Jednorázově** – „Jeden dotazník v den začátku monitorace.“ (⚠️ OVĚŘIT: v den začátku, nebo za zvolenou dobu?)
  - **Pravidelně** (výchozí) – „Dotazník se opakuje po zvoleném intervalu.“
  - **Vlastní** – „Termíny zadáte po řádcích – každý za určitou dobu od začátku monitorace.“
- **Pravidelně:**
  - **Opakovat každých** (od 2026-11-20 v jednom řádku): nejdřív **pole na číslo** (1–999, výchozí 1), hned za ním čtyři menší přepínací tlačítka jednotky a na konci šedě „(1–999)“.
    - Popisky tlačítek se skloňují podle čísla: 1 → den / týden / měsíc / rok, 2–4 → dny / týdny / měsíce / roky, 5+ → dní / týdnů / měsíců / let. Výchozí jednotka týden.
    - Na úzké obrazovce se tlačítka zalomí pod pole s číslem.
  - **Den**: jen interval (každých N dní; první dotazník N dní po začátku).
  - **Týden**: navíc **Den v týdnu** – první tlačítko **Od data zahájení** (od 2026-11-20; dotazník každých N týdnů ode dne zahájení, tj. ve stejný den v týdnu jako zahájení), za svislou čárkou 7 tlačítek Po Út St Čt Pá So Ne (jedno vybrané, výchozí Po). U dne v týdnu je první dotazník nejbližší zvolený den po zahájení, pak každých N týdnů. V seznamu šablon „Každé 2 týdny od zahájení“.
  - **Měsíc**: navíc **Den v měsíci** – výběr 1.–31. (výchozí 1.), nápověda „Když měsíc tolik dní nemá, dotazník se odešle poslední den měsíce.“
  - **Rok**: navíc **Měsíc** – výběr Leden–Prosinec (výchozí Leden), nápověda „Den v měsíci je stejný jako den začátku monitorace.“ (⚠️ OVĚŘIT, zda nemá jít vybrat i den.)
- **Vlastní:** seznam řádků „1. za **[číslo]** **[týden ▾]** od začátku monitorace 🗑“ – číslo 1–999, druh den / týden / měsíc / rok (skloňuje se podle čísla). Odkaz **+ Přidat termín** přidá řádek o 1 vyšší se stejným druhem. Při přepnutí na Vlastní je předvyplněný jeden řádek „za 1 týden“.
  - ⚠️ OVĚŘIT: každý řádek je doba **od začátku monitorace** (ne od předchozího dotazníku). Termíny se seřadí podle data, stejné termíny se sloučí.
- **Konec monitorace** (pod tenkou čárou):
  - jen u **Pravidelně** – přepínač (radio) **jen s textem**: **Nikdy** (výchozí) / **Počtem dotazníků** / **Dobou** (od 2026-11-20).
    - Pole se nabídnou až **pod zvolenou volbou** (odsazené pod text volby):
      - Počtem dotazníků: [číslo] dotazníků (výchozí 10);
      - Dobou: [číslo] [měsíce ▾] od začátku monitorace (výchozí 3 měsíce; den / týden / měsíc / rok).
  - u Jednorázově text „Monitorace končí jediným dotazníkem.“, u Vlastní „Monitorace končí posledním zadaným termínem.“ (⚠️ OVĚŘIT, zda má jít konec nastavit i tam.)
- **Náhled** (šedý rámeček dole): „Náhled – při začátku monitorace dnes (20.11.2026) přijdou dotazníky:“ a prvních 8 termínů jako štítky s datem. Při konci Nikdy na konci „… a dál až do konce monitorace pacienta“, při více termínech „… celkem N“.
- Validace: interval, počet dotazníků, doba a čísla v řádcích Vlastní musí být 1–999 („Zadejte číslo od 1 do 999.“); Vlastní musí mít aspoň jeden řádek („Přidejte alespoň jeden termín.“).

**Karta 3 – Zdroje** (NOVÉ 2026-11-20):
- Nadpis „Zdroje“, popis „Ze kterých zdrojů se u pacientů s touto šablonou počítá připravenost. Barva pacienta je nejhorší výsledek ze zvolených zdrojů.“
- Seznam zvolených zdrojů v rámečku, každý řádek: šedá ikona zdroje (stejná jako na Dashboardu), název, šedý popis a vpravo koš (Odebrat zdroj):
  - **Dotazník** – „Odpovědi pacienta – pásmo podle bodů. Termíny podle frekvence výše.“
  - **Laboratoř** – „Krevní obraz a biochemie (neutrofily, trombocyty, hemoglobin, kreatinin, bilirubin).“
  - **Wearables** – „Teplota, saturace, tep a kroky z chytrých hodinek nebo náramku.“
- U zdroje **Dotazník** je pod popisem řádek „Dotazník: **název vybraného dotazníku**“ a vpravo tlačítko **Vybrat dotazník**, které otevře detail (viz *Detail zdroje Dotazník*). Výchozí dotazník: OncoReady – akutní toxicita.
- Pod seznamem bílá tlačítka **+ Laboratoř**, **+ Wearables**… pro zdroje, které ještě nejsou přidané (pořadí zdrojů je vždy Dotazník, Laboratoř, Wearables). Prázdný seznam: „Zatím žádný zdroj.“
- Nová šablona má předvyplněný jen **Dotazník**. Validace: aspoň jeden zdroj („Přidejte alespoň jeden zdroj.“).
- **Dopad na Dashboard:** u pacienta se zobrazují a do barvy pruhu počítají **jen zdroje z šablony jeho aktuální monitorace** (bez šablony všechny). Pacient, který zdroj ze šablony nemá vůbec (např. nemá hodinky), ho nevidí – ⚠️ OVĚŘIT: má se chybějící povinný zdroj ukazovat jako „bez dat“ (šedá → Neúplné)?
- ⚠️ OVĚŘIT: Frekvence se týká jen dotazníku – má se při odebrání Dotazníku skrýt / přesunout pod zdroj Dotazník?
- Návrhy dalších zdrojů (zatím neimplementováno, k diskusi): viz *Otevřené otázky*.

**Detail zdroje Dotazník** (NOVÉ 2026-11-20) – velké okno (max. šířka 1024 px) nad formulářem šablony, aby se neztratily neuložené změny šablony. Má tři pohledy:

1. **Výběr** – nadpis „Dotazník“, podnadpis „Vyberte předpřipravený dotazník, nebo založte vlastní s otázkami, odpověďmi, body a red flagy.“
   - **Předpřipravené** – karty ve dvou sloupcích: název, vydavatel · počet otázek, popis, odrážky se škálami, tlačítko **Vybrat** (vybraný: „✓ Vybráno“ a modrý rámeček karty).
     - **OncoReady – akutní toxicita** (11 otázek, výchozí) – má odkaz **Zobrazit otázky**.
     - **EORTC QLQ-C30** (30), **QLQ-BR45** (prs, 45), **QLQ-H&N43** (hlava a krk, 43), **QLQ-PR25** (prostata, 25), **QLQ-LC29** (plíce, 29), **PRO-CTCAE (výběr položek)** (NCI) – oranžový štítek **🔒 Licence**: znění je chráněné, otázky se nezobrazují a nejde je kopírovat; vloží se po získání licence. ⚠️ OVĚŘIT licence, oficiální české verze a bodování (EORTC se vyhodnocuje škálami 0–100, ne body a red flagy).
   - **Vlastní dotazníky** – vpravo tlačítko **+ Nový dotazník**. Seznam: název, „N otázek · max. X b · 🚩 Y red flag“, ikony Upravit a Smazat (s potvrzením) a **Vybrat**. Prázdný stav: „Zatím žádný vlastní dotazník. Založte nový, nebo zkopírujte předpřipravený (Zobrazit otázky → Duplikovat jako vlastní).“
   - Klik na **Vybrat** dotazník vybere pro šablonu a okno zavře.
2. **Náhled** předpřipraveného dotazníku (jen pro čtení) – odkaz „← Zpět na výběr“, název, „vydavatel · N otázek · max. X b · Y red flag“. Otázky v rámečcích, pod každou odpovědi „0 b Text“ a u varovných vpravo červeně „🚩 Red flag“. Dole **Vybrat** a **Duplikovat jako vlastní** (otevře editor s kopií „… (kopie)“).
   - U OncoReady jsou red flagem odpovědi za 4 body (odpovídá pravidlu červeného pásma).
3. **Editor vlastního dotazníku** – „Nový dotazník“ / „Upravit dotazník“, v podnadpisu živě „N otázek · max. X b · Y red flag“.
   - **Název\*** a **Popis** vedle sebe.
   - Otázky jako šedé karty: číslo, pole „Znění otázky“, koš (Odebrat otázku).
   - Pod otázkou tabulka odpovědí se sloupci **Odpověď** | **Body** (celé číslo 0–99) | **Red flag** | koš:
     - Red flag je přepínací tlačítko: vypnuté šedé „🏳 Ne“, zapnuté červené „🚩 Ano“.
     - **+ Přidat odpověď** (nová odpověď má body o 1 vyšší než pořadí).
   - Nová otázka má dvě prázdné odpovědi (0 b a 1 b). Pod otázkami čárkované tlačítko **+ Přidat otázku**.
   - Dole **Uložit a vybrat** (uloží dotazník, vybere ho pro šablonu a zavře okno) a **Zrušit** (zpět na výběr).
   - Validace (zobrazí se po prvním pokusu o uložení vedle tlačítek a přepočítává se živě; prázdná pole červeně): název, aspoň jedna otázka, znění všech otázek, aspoň dvě odpovědi u každé otázky, text všech odpovědí, body 0–99.
   - Vlastní dotazník se ukládá hned (nezávisle na uložení šablony) a je dostupný ve všech šablonách. Smazání vrátí šablony, které ho používaly, na výchozí dotazník.
- V seznamu šablon je u zdroje Dotazník šedě název dotazníku („Dotazník · Kontrola před chemo“).
- ⚠️ OVĚŘIT / zatím neimplementováno: vyplňování a vyhodnocení na Dashboardu stále používá výchozí dotazník OncoReady. Pro vlastní dotazníky navrhujeme: **red flag → červené pásmo**, jinak součet bodů do pásem (rozsahy pásem by se pak vrátily do detailu dotazníku). Detail pro Laboratoř (výběr parametrů a mezí) a Wearables zatím chybí.

**Odebrané z formuláře** (data u stávajících šablon zůstávají, nové šablony dostanou výchozí hodnoty):
- Diagnózy, Klasifikace a Tag.
- Rozsah pásem (barva odznaku se stejně počítá podle pravidla „max. body jedné odpovědi“).

**Karta 4 – Příznaky** (NOVÉ 2026-11-20; nahrazuje dřívější kartu Další postup, bez volby Čekárna):
- Nadpis „Příznaky“, popis „Tlačítka, která se u pacientů s touto šablonou zobrazí na Dashboardu ve sloupci Příznak. Klik pacientovi nastaví příznak pro dnešní den. Podle příznaku lze filtrovat a každý příznak může mít na Dashboardu vlastní box (Zobrazení › Boxy příznaků).“
- Seznam: pořadové číslo, **tlačítko s ikonou** (36 × 36 px), textové pole „Název příznaku, např. K aplikaci“ a koš (Odebrat příznak). Pod ním **+ Přidat příznak** (nový příznak má ikonu Štítek).
- **Výběr ikony** (NOVÉ 2026-11-20): klik na tlačítko s ikonou otevře pod ním nabídku – mřížka 5 × 4 ikon (obrys 1,5 px), zvolená modře orámovaná, dole šedě název ikony; tooltip u každé ikony. Klik na ikonu ji vybere a nabídku zavře; zavře se i klikem mimo nebo Esc.
  - Ikony: Štítek, Čekání (hodiny), Pokračovat (šipka v kroužku), Hotovo, Zrušeno, Pozor, Riziko, Vlajka, Upozornění, Hvězda, Lékař / osoba, Telefonát, Konzultace, Laboratoř, Zdraví, Sledovat, Termín, Dokument, Domů, Doprava.
  - Výchozí: Čekárna = Čekání, K aplikaci = Pokračovat, ostatní Štítek (i u starších šablon bez zvolené ikony).
- Nová šablona má předvyplněné **Čekárna** a **K aplikaci**. Bez příznaků: „Šablona nemá žádné příznaky – sloupec Příznak bude u jejích pacientů prázdný.“
- Validace: „Vyplňte název příznaku, nebo ho odeberte.“; „Dva příznaky mají stejný název.“
- **Náhled** tlačítek tak, jak se zobrazí na Dashboardu (s ikonou).
- Příznaky se napříč šablonami spojují **podle názvu** – „K aplikaci“ ve dvou šablonách = jeden box a jedna volba ve filtru.

Tlačítka: **Vytvořit/Uložit** a **Zrušit**.

### Podstránky Šablon v menu (NOVÉ 2026-11-20)

- Když je otevřená sekce Šablony (`/sablony…`), v levém menu se pod položkou **Šablony** rozbalí podstránky (stejný styl jako pohledy pod Dashboardem): **Dotazníky** a **Laboratoř**.
- Na podstránce je zvýrazněná jen podstránka, ne položka Šablony. Na mobilu se v horní navigaci objeví „› Dotazníky“ a „› Laboratoř“.

### Dotazníky (`/sablony/dotazniky`, NOVÉ 2026-11-20)

- Drobečková navigace Šablony › Dotazníky › (záložka), nadpis „Dotazníky“, vpravo **Nový dotazník** (otevře editor vlastního dotazníku).
- **Vlevo box s menu** (bílá karta, šířka 224 px; na mobilu vodorovně nad obsahem), položky s počtem vpravo:
  - **Přehled** (`/sablony/dotazniky`) – tři karty Statické / Dynamické / Vlastní (počet + vysvětlení, klik otevře záložku) a tabulka všech dotazníků: Název (🔒 u licencovaných), Druh, Otázky, Red flagy (🚩 počet), Použito v šablonách.
  - **Statické** (`/staticke`) – „Pevná sada otázek ve stále stejném pořadí – pacient dostane všechny otázky.“ Karty: OncoReady – akutní toxicita, EORTC QLQ-C30, BR45, H&N43, PR25, LC29.
  - **Dynamické** (`/dynamicke`) – „Otázky se mění podle odpovědí nebo podle pacienta – větvení, adaptivní testování, výběr položek podle léčby.“ Karty: PRO-CTCAE (výběr položek; doplňující otázky jen u přítomného příznaku), EORTC CAT Core (adaptivní verze QLQ-C30). ⚠️ OVĚŘIT zařazení a licence.
  - **Vlastní** (`/vlastni`) – seznam vlastních dotazníků (Upravit, Smazat, „Použito v N šablonách“).
- Karty knihovny jsou stejné jako v okně výběru dotazníku v šabloně, jen místo **Vybrat** ukazují „Použito v N šablonách“ / „Nepoužito v žádné šabloně“. **Zobrazit otázky** otevře náhled (s **Duplikovat jako vlastní**).
- Editor vlastního dotazníku se otevírá v okně; tlačítko **Uložit** (bez výběru do šablony).
- V okně výběru dotazníku v šabloně jsou předpřipravené dotazníky rozdělené na **Statické** a **Dynamické** (s vysvětlením).
- ⚠️ OVĚŘIT: vlastní dotazník zatím nejde označit jako dynamický (podmíněné otázky).

### Laboratoř (`/sablony/laborator`, NOVÉ 2026-11-20)

- Drobečková navigace Šablony › Laboratoř, nadpis „Laboratoř“.
- Karta **Parametry a meze**: „Podle těchto mezí se barví zdroj Laboratoř u pacientů. Výsledek se počítá jako aktuální 7 dní od odběru. Barva laboratoře = nejhorší parametr.“
- Tabulka (jen pro čtení): Parametr, Zkratka, Jednotka, Žlutá (žlutá tečka, např. „< 2,0“), Červená (červená tečka, „< 1,5“) – neutrofily, trombocyty, hemoglobin, kreatinin, bilirubin.
- Dole: „⚠️ Meze jsou předpoklad pro prototyp – ověřit s klinikem. Úpravy mezí a výběr parametrů zatím nejsou.“

### Napojení na pacienta

- Dialog *Nová monitorace / Upravit monitoraci* v Kartotéce má pole **Šablona** (výběr, nebo „— bez šablony —“).
- Dotazníky se naplánují podle **frekvence a konce** zvolené šablony, nejpozději do konce monitorace pacienta (zvolené v kalendáři). Bez šablony se posílají každých 7 dní.
  - Text pod dialogem: „Naplánuje se N dotazníků (každé 2 týdny ve středu, celkem 10 dotazníků).“
- Šablony uložené před 2026-11-20 (jen počet dní) se převedou na **Pravidelně – každých N dní, konec Nikdy**.
- Pro stáří dotazníku na Dashboardu se z frekvence počítá přibližný interval ve dnech (týden = 7, měsíc = 30, rok = 365; Vlastní = nejkratší mezera mezi termíny; Jednorázově = 7).
- Tabulka Monitorace pacienta má první sloupec **Šablona**.

**⚠️ OVĚŘIT – rozsahy pásem se zatím nepoužívají pro barvu odznaků.** Barva se stále počítá podle pravidla „nejvyšší body jedné odpovědi“ (viz *Pravidla pásma*). Je potřeba rozhodnout, jestli má pásmo určovat celkové skóre podle rozsahů šablony, maximum jedné odpovědi, nebo obojí (horší z obou).

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
- **Rychlá akce „+ Monitorace“** (NOVÉ, modrý odkaz vpravo v řádku): otevře dialog *Nová monitorace — Příjmení Jméno* (stejný jako v kartě pacienta: kalendář, délka 1–6 týdnů, výběr šablony). Po vytvoření se zobrazí notifikace „Monitorace vytvořena – Příjmení Jméno“ a sloupec Aktivní plán se aktualizuje. Kliknutí na odkaz neotevírá kartu pacienta.
- **Aktivní plán** ukazuje stav monitorace pacienta k dnešku:
  - 🟢 **Aktivní** + název šablony + „do 11.11.2026“: monitorace je označená jako aktivní a dnešek je mezi startem a koncem;
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
    - výběr **Šablona**;
    - **Start\*** a **Konec\*** jako text (např. 7.10.2026);
    - **Délka od startu**: tlačítka 1 týden / 2 týdny / 3 týdny / 4 týdny / 5 týdnů / 6 týdnů, která nastaví Konec = Start + N týdnů. Aktivní volba je modrá i při ručním výběru, pokud délka odpovídá.
    - přepínač **Aktivní**;
    - při vytváření informace „Naplánuje se N dotazníků (týdně)“ podle frekvence zvolené šablony.
  - Výchozí Start je dnešek.
  - Dotazníky se při vytvoření naplánují podle frekvence šablony (bez ní každých 7 dní). **⚠️ OVĚŘIT** frekvenci a pravidla v produkci.
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
   - **Bez registrace**: zobrazí se „Test bez registrace – výsledek zatím není nikde uložen.“ a tři tlačítka (2026-10-30):
     - **Neukládat** (šedé): zavře okno, výsledek se zahodí (dříve „Zavřít bez uložení“);
     - **Nový pacient** (šedé): v kartě se otevře formulář „Nový pacient“ – Příjmení\*, Jméno\*, Rodné číslo\* (měkká kontrola jako v Kartotéce, uložit lze i s varováním), E-mailová adresa\*, Telefonní číslo. Tlačítka **Založit a uložit výsledek** a **Zpět**. Chyba u pole zmizí, jakmile ho uživatel opraví. Po uložení se pacient založí v Kartotéce, výsledek se uloží do jeho karty a zobrazí se „Nový pacient Příjmení Jméno byl založen v Kartotéce a výsledek je uložen v jeho kartě.“ + **Zavřít**;
     - **Přiřadit stávajícímu** (modré, primární): výběr pacienta z Kartotéky s hledáním („Přiřadit výsledek stávajícímu pacientovi“); po kliknutí na pacienta se výsledek uloží (dříve „Přiřadit pacientovi“).

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

1. Má barvu pásma určovat rozsah skóre ze šablony, nebo současné pravidlo „max. body jedné odpovědi“, nebo obojí?
2. Jsou pohledy osobní, nebo sdílené pro pracoviště? Má si uživatel moci nastavit pohled jako svůj výchozí Dashboard?
3. Úplný seznam otázek dotazníku, jejich bodování a zdroje (TheraData / PRO-CTCAE).
4. Přesná pravidla pásem a priorita mezi modrým a červeným pásmem.
5. Logika filtru na Dashboardu: filtruje se podle nejnovějšího dotazníku, nebo podle kteréhokoli?
6. Frekvence plánovaných dotazníků v šabloně – návrh v *Šablony › Karta 2 – Frekvence*; ověřit význam řádků Vlastní (od začátku vs. od předchozího) a zda konec platí i pro Jednorázově / Vlastní.
7. Obsah stránky Statistiky.
8. Některá jména jsou v produkčních datech zadaná obráceně (Příjmení „Anna“, Jméno „Malá“). Replika to přebírá. Doporučení: v UI zdůraznit pořadí polí.
9. Meze laboratoře a wearables, okna aktuálnosti (vázat laboratoř na datum příštího cyklu léčby?) a pořadí v souhrnu (má „Neúplné“ přebíjet „K posouzení“?).
10. Odkud přijdou data laboratoře (LIS / nemocniční systém) a wearables (které zařízení, jak často), a co má otevřít klik na jejich odznak.
11. Které zdroje jsou pro připravenost povinné (např. laboratoř u chemoterapie)? – v šabloně je teď box Zdroje; ověřit, zda chybějící zdroj ze šablony ukazovat jako „bez dat“.
12. Další možné zdroje do šablony (návrh 2026-11-20): **Vitální funkce v ambulanci** (TK, tep, teplota, hmotnost), **Hmotnost a nutriční screening** (úbytek hmotnosti, NRS 2002), **Výkonnostní stav ECOG / Karnofsky** (zadá lékař), **Hodnocení toxicity lékařem (CTCAE)**, **e-Skill / digitální gramotnost** (už je v aplikaci), **Telefonický kontakt sestry** (strukturovaný záznam), **Glykémie / domácí měření** (diabetici na kortikoidech).

## Changelog

| Datum | Změna |
| --- | --- |
| 2026-11-20 | Příznaky: **výběr ikony** u každého příznaku v šabloně (20 ikon); ikona se ukazuje na tlačítku ve sloupci Příznak (zvolené tlačítko místo ✓ bílou ikonou), v hlavičce boxu, ve filtru i v Zobrazení. |
| 2026-11-20 | **Příznaky**: v šabloně nová karta Příznaky (tlačítka, která pacientovi nastaví příznak); na Dashboardu sloupec **Příznak** (dříve Další postup), boxy pro každý příznak volitelné v **Zobrazení › Boxy příznaků**, nový filtr **Příznak** (včetně Bez příznaku, ukládá se do pohledu). |
| 2026-11-20 | Šablona: odebráno **Zahájení monitorace**. Menu: pod Šablonami podstránky **Dotazníky** a **Laboratoř**. Dotazníky: levý box s menu Přehled / Statické / Dynamické / Vlastní (nový druh dotazníku dynamický – PRO-CTCAE, EORTC CAT Core). Laboratoř: tabulka parametrů a mezí. |
| 2026-11-20 | Šablona › Frekvence: u týdne volba **Od data zahájení** (vedle dnů v týdnu); Konec monitorace má volby jen jako text a pole (počet / doba) se nabídnou až pod zvolenou volbou. |
| 2026-11-20 | Šablona › Zdroje › Dotazník: tlačítko **Vybrat dotazník** otevře detail – knihovna předpřipravených (OncoReady, EORTC QLQ-C30 / BR45 / H&N43 / PR25 / LC29, PRO-CTCAE – licencované jen jako metadata), náhled otázek, **vlastní dotazníky** s otázkami, odpověďmi, body a red flagem (nový, upravit, smazat, duplikovat). |
| 2026-11-20 | Šablona › Frekvence › Pravidelně: číslo a tlačítka jednotky (den / týden / měsíc / rok, skloňované podle čísla) v jednom řádku „Opakovat každých“. |
| 2026-11-20 | Šablona: z formuláře odebrány karty Zařazení (diagnózy, klasifikace, tag), Rozsah pásem a Další postup; nová karta **Zdroje** (Dotazník / Laboratoř / Wearables, přidat / odebrat). Dashboard počítá jen zdroje ze šablony pacienta. Seznam šablon: sloupce Název, Zdroje, Frekvence, Pacienti. |
| 2026-11-20 | Šablona › Frekvence: nová část **Zahájení monitorace** – Datum (kalendář) / Aktivovat ručně. Dialog Nová monitorace podle ní předvyplní Start, nebo vypne Aktivní. V seznamu šablon pod frekvencí „Zahájení …“. |
| 2026-11-20 | Šablona: první karta jen **Název**; nová karta **Frekvence** – Jednorázově / Pravidelně (den, týden + den v týdnu, měsíc + den v měsíci, rok + měsíc; interval 1–999) / Vlastní (řádky „za N jednotek od začátku“) a **Konec monitorace** (Nikdy / počtem dotazníků / dobou) s náhledem termínů. Diagnózy, Klasifikace a Tag v kartě Zařazení. Dotazníky monitorace se plánují podle nové frekvence. |
| 2026-11-20 | Zpětná vazba v levém menu je nenápadnější: bez karty a pozadí (jen čára nahoře), ostré rohy (2 px), bez stínů, šedý nadpis a ikona; Odeslat je bez textu šedé. |
| 2026-11-20 | Filtr Skóre: nová volba **Vše** nahoře, je výchozí (Dashboard i nový pohled) – na Dashboardu jsou tak vidět všichni pacienti včetně zelených a žlutých. |
| 2026-11-19 | Demo data: 4 noví zelení pacienti (Horáková, Veselý, Marková, Bartoš) – všechny aktuální zdroje v pořádku, mohou k aplikaci; doplní se i do uložených dat. |
| 2026-11-19 | Zrušena tlačítka a boxy **Ke kontrole sestrou** a **Ke kontrole lékařem** – odeberou se i ze šablon a značek uložených v prohlížeči (šablona bez tlačítek dostane výchozí Čekárna / K aplikaci). |
| 2026-11-19 | Dashboard: skupiny pacientů jsou **samostatné boxy s odstupem** – Pacienti (hledání), Čekárna, K aplikaci, Všichni pacienti; barevné nadpisové pruhy zrušeny. Boxy značek jsou vidět i prázdné, „Všichni pacienti“ obsahuje i pacienty se značkou. Panel nástrojů je samostatná karta vpravo. |
| 2026-11-19 | Dashboard: skupina Čekárna má výrazný modrý nadpisový pruh; nová skupina **K aplikaci** (a obecně skupina pro každou dnešní značku) s tmavě šedým pruhem; mezi skupinami šedá mezera. |
| 2026-11-19 | Dashboard: sekce **Čekárna** nahoře v tabulce Pacienti; tlačítka ze šablony nastavují značku pacienta platnou jen daný den (výchozí **Čekárna** a **K aplikaci**); v šabloně volba „Čekárna“ u tlačítka. Klik na jméno pacienta otevře **Souhrnný prescoring** (s tlačítky značky a odkazem na kartu pacienta). Hledání prohledává všechny pacienty bez ohledu na filtry. |
| 2026-11-19 | Nové okno **Zpětná vazba**: karta dole v levém menu (na mobilu plovoucí tlačítko a panel zespodu) s textovým polem, tlačítkem „Pořídit snímek obrazovky“ a „Odeslat“. Nová závislost `html-to-image` pro snímek obrazovky. |
| 2026-10-30 | e-Skill, test bez registrace: na konci tlačítka **Neukládat**, **Nový pacient** (založí pacienta přímo z výsledku) a **Přiřadit stávajícímu**. |
| 2026-10-29 | Dashboard: nový sloupec **Další postup** za sloupcem Aktuální s tlačítky ze šablony pacienta (výchozí „Ke kontrole sestrou“, „Ke kontrole lékařem“); volba se ukládá k monitoraci. Šablona: nová karta „Další postup“ pro nastavení tlačítek. |
| 2026-10-26 | Dashboard: hledání přes celou šířku části „Pacienti“. Filtr Šablona je rozbalovací výběr více možností se štítky (místo zaškrtávacích polí); nová komponenta `MultiSelect` v `ui.tsx`. |
| 2026-10-26 | „Monitorace“ (program sledování) přejmenována na **Šablony**: menu, stránka a formulář (`/sablony`, staré adresy přesměrují), filtr „Šablona“, seskupení „Šablony“, pole a sloupec „Šablona“ v monitoraci pacienta, odkaz pod jménem pacienta. Monitorace pacienta (konkrétní sledování) a rychlá akce „+ Monitorace“ zůstávají. |
| 2026-10-26 | Řazení podle naléhavosti podle barvy pruhu u jména. Záložka Zobrazení: nová volba „Seskupit podle“ – neseskupovat / závažnosti / monitorace. |
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
