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
| zelené pásmo | `#10b981` | odznak skóre |
| žluté pásmo | `#fbbf24` | odznak skóre |
| červené pásmo | `#dc2626` | odznak skóre, proužek řádku |
| vyžádal kontrolu | `#2563eb` | odznak skóre, proužek řádku |
| nevyplněno | `gray-100` pozadí, šedý text | odznak „n/a“ |

Primární modrá je odhadnutá ze screenshotu. **⚠️ OVĚŘIT** přesný HEX v produkčním Filament panelu (`->colors(['primary' => …])`).

## Odznak dotazníku (komponenta)

Používá se na Dashboardu i v tabulce Monitorings.

- Odznaky stojí v jedné řadě a **nejnovější termín je vlevo**.
- **Vyplněný dotazník**: barevný čtvereček s celkovým skóre (bílé tučné číslo), pod ním datum vyplnění ve formátu `12.4.` (10 px, šedá).
  - Kliknutím se otevře *Klinický report*.
- **Nevyplněný dotazník**: šedý odznak „n/a“, pod ním „-“.
  - Kliknutím se otevře *Vyplnění dotazníku*.

### Pravidla pásma (⚠️ OVĚŘIT – odvozeno ze screenshotů)

Pravidla se vyhodnocují v tomto pořadí:

1. Pacient odpověděl, že žádá kontrolu → **modré** („Vyžádal kontrolu“).
2. Alespoň jedna odpověď má 4 body → **červené** („Alespoň jedna odpověď dosáhla 4 bodů.“).
3. Alespoň jedna odpověď má 3 body → **žluté**.
4. Jinak → **zelené**.

Celkové skóre je součet bodů všech odpovědí. Pravidla jsou na jednom místě v `src/lib/scoring.ts`.

## Dashboard

Jedna karta má dvě části: vlevo tabulka „Patients Table“, vpravo panel „Filtrovat“ (šířka 288 px). Na menší obrazovce je panel pod tabulkou.

**Tabulka**
- Hledání vpravo nahoře hledá ve jméně a rodném čísle.
- Sloupce: Celé jméno (`Příjmení Jméno →`, odkaz na úpravu pacienta), Rodné číslo, Dotazníky.
- Řádky jsou seřazené abecedně podle jména.
- **Barevný proužek vlevo u řádku** (3 px) ukazuje stav *nejnovějšího* dotazníku: červený, modrý nebo žlutý. Když je nejnovější dotazník n/a, proužek se nezobrazí.
  - **⚠️ OVĚŘIT**, jestli se proužek zobrazuje i pro zelené pásmo.
- V patičce je uprostřed výběr „na stránku“ (výchozí 500).
- Zobrazuje se dotazník z aktivní monitorace pacienta. Pokud žádná aktivní není, zobrazí se poslední monitorace.

**Filtr**
- *Skóre* (zaškrtávací pole s barevnou tečkou): Zelené pásmo, Žluté pásmo, Červené pásmo, Vyžádal kontrolu, Nevyplněno.
  - Výchozí stav: zaškrtnuté Červené pásmo, Vyžádal kontrolu a Nevyplněno.
- *Datum vyplnění* (přepínač): Vše, Poslední týden, Posledních 10 dní, Poslední 2 týdny.
- Logika: pacient se zobrazí, pokud má **alespoň jeden** dotazník ve zaškrtnutém pásmu a ve zvoleném období. **⚠️ OVĚŘIT** logiku produkce.

## Pohledy (podstránky Dashboardu) – NOVÉ

Pohled je **pojmenovaná kombinace filtrů Dashboardu**, kterou si uživatel uloží. Pohledy jsou osobní, každý uživatel má své. **⚠️ OVĚŘIT**, jestli je bude potřeba sdílet v rámci pracoviště.

- **Menu:** pohledy jsou v bočním menu pod položkou Dashboard. Jsou odsazené a mají svislou linku vlevo (styl podnavigace Filament).
  - Aktivní pohled má šedé pozadí a modrý text.
  - Poslední položka je šedé „+ Nový pohled“.
- **Vytvoření pohledu**, dva způsoby:
  1. „+ Nový pohled“ v menu → dialog *Nový pohled* (pole Název\*) → vytvoří pohled s výchozím filtrem a otevře ho.
  2. Na Dashboardu tlačítko **Uložit jako pohled** (dole v panelu Filtrovat) → dialog s názvem → uloží aktuální filtr.
- **Stránka pohledu** (`/pohledy/:id`):
  - drobečková navigace Dashboard › Pohledy, nadpis = název pohledu;
  - vpravo nahoře tlačítka **Přejmenovat** (šedé) a **Smazat** (červené, s potvrzením);
  - obsah je stejný jako na Dashboardu: tabulka pacientů a panel filtrů.
- **Změna filtru v pohledu** se neukládá hned:
  - v hlavičce panelu se objeví odkaz „Zahodit změny“;
  - dole v panelu je tlačítko **Uložit změny filtru**, které je aktivní jen při změně;
  - bez změn tlačítko ukazuje „Filtr je uložen“.
- **Výchozí Dashboard** se nedá přepsat. Při změně filtru se objeví odkaz „Obnovit výchozí“.

### Panel Filtrovat (rozšířený)

Pod původní skupiny Skóre a Datum vyplnění přibyly:

- **Monitorace**: zaškrtávací pole pro každou monitoraci.
- **Klasifikace**: zaškrtávací pole s barevným štítkem nonMD / MD / research / other.
- **Tag**: přepínací štítky, kde vybraný štítek je modrý.

Logika: uvnitř skupiny platí NEBO, mezi skupinami platí A ZÁROVEŇ. Prázdná skupina nefiltruje. Monitorace, klasifikace a tag se berou z aktuální monitorace pacienta.

V tabulce pacientů je pod jménem šedě název monitorace pacienta. V hlavičce karty je počet pacientů („3 pacientů“). **Jde o novinku oproti produkci.**

## Monitorace (programy sledování) – NOVÉ

Monitorace je **šablona sledování**: definuje, komu (diagnózy), jak často a s jakými hranicemi pásem se dotazníky posílají. Pacientovi se monitorace přiřazuje v Kartotéce (tabulka Monitorings → pole *Monitorace*).

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
- **Název\*** a **Tag**. Tag nabízí už použité tagy a má nápovědu „Krátký štítek pro filtrování…“.
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

- Dialog *Vytvořit/Upravit Monitoring* v Kartotéce má nově pole **Monitorace** (výběr, nebo „— bez monitorace —“).
- Dotazníky se naplánují podle frekvence zvolené monitorace. Bez monitorace se posílají každých 7 dní.
- Tabulka Monitorings u pacienta má nový první sloupec **Monitorace**.

**⚠️ OVĚŘIT – rozsahy pásem se zatím nepoužívají pro barvu odznaků.** Barva se stále počítá podle pravidla „nejvyšší body jedné odpovědi“ (viz *Pravidla pásma*). Je potřeba rozhodnout, jestli má pásmo určovat celkové skóre podle rozsahů monitorace, maximum jedné odpovědi, nebo obojí (horší z obou).

## Klinický report (modal)

Otevírá se kliknutím na vyplněný odznak. Šířka je přibližně 768 px.

- **Hlavička**:
  - vlevo „Klinický report — Jméno Příjmení“ a pod tím „Datum odeslání: 12. 4. 2026 08:41“;
  - vpravo štítek pásma („Červené pásmo: 20 b“) a pod ním důvod;
  - ikona kopírování (zkopíruje report jako text do schránky) a zavírací ✕.
- **TREND KLINICKÉHO STAVU (VÝVOJ SKÓRE)**:
  - plošný graf (tyrkysová čára `#14b8a6`, jemná výplň);
  - body jsou obarvené podle pásma, aktuální dotazník má větší bod;
  - osa X ukazuje data ve stejném pořadí jako odznaky (nejnovější vlevo), osa Y má krok 4.
- **Odpovědi**: šedé karty s malým štítkem zdroje (monospace „TheraData“ / „PRO-CTCAE“), textem otázky a odpovědí vpravo.
  - Barva odpovědi podle bodů: 0 zelená, 1 žlutá, 2–3 oranžová, 4 červená.
- Zavírá se klávesou Esc, klikem mimo modal nebo na ✕.

## Vyplnění dotazníku (ambulance)

Otevírá se kliknutím na odznak „n/a“. Je to **celoobrazovkový režim bez menu**, protože zařízení se podává pacientovi.

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
- V kartě je hledání vpravo nahoře a tabulka se sloupci Celé jméno (`Příjmení Jméno →`) a Rodné číslo. Celý řádek je klikací.
- Patička: „Zobrazuji X až Y z Z výsledků“, výběr „na stránku“ (výchozí 10) a stránkování.

## Kartotéka – vytvořit / upravit pacienta

- Nadpisy jsou převzaté z produkce **„Vytvořit Kartotéka“ / „Upravit Kartotéka“**.
  - 💡 Doporučení pro IT: přejmenovat na „Nový pacient“ / „Upravit pacienta“.
- Formulář má dva sloupce:
  - Příjmení\* | Jméno\*
  - Rodné číslo\* | Datum narození
  - Telefonní číslo | E-mailová adresa\*
  - pod nimi nápověda „Zadejte číslo ve formátu 420777888999 (bez +, mezer nebo pomlček).“
- Validace:
  - povinná pole: Příjmení, Jméno, Rodné číslo, E-mailová adresa;
  - e-mail musí mít platný formát;
  - telefon musí mít 12 číslic.
- Tlačítka:
  - na úpravě **Uložit** (primární) a **Zrušit**, vpravo nahoře červené **Smazat** s potvrzovacím dialogem;
  - na vytvoření navíc „Vytvořit a vytvořit další“.
- Po uložení se zobrazí notifikace vpravo nahoře („Uloženo“).

### Monitorings (pod formulářem, jen při úpravě)

- Hlavička karty: „Monitorings“ a tlačítko **Vytvořit**.
- Sloupce: zaškrtávací pole, Start, Konec (`19.3.2026`), Aktivní (zelená ikona ✓ / červená ✕), Dotazníky (odznaky).
- Akce řádku (odkazy s ikonou):
  - **Vytvořit dotazník** přidá nevyplněný dotazník s dnešním termínem;
  - **Upravit** otevře modal;
  - **Smazat** (červeně) se ptá na potvrzení.
- Hromadné smazání: po zaškrtnutí řádků se objeví tlačítko „Smazat vybrané“.
- Dialog *Vytvořit/Upravit Monitoring* (široký, max. 1024 px) nemá datumová pole s rozbalovacím kalendářem. Má:
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
   - vybrat datum 15. 2. 2026.
   
   Nahoře je pokyn, číslo úkolu a odpočet (posledních 30 s červeně), dole ukazatel průběhu. Správný klik se zvýrazní zeleně, chybný červeně a měří se vzdálenost chybného kliknutí od cíle. Po 2 minutách se test ukončí a nedokončené úkoly se počítají jako chybné.
5. **Výsledek**: velké skóre 0–100 barvou úrovně, štítek úrovně, „Děkujeme, test je dokončen.“ a 6 dlaždic (motorika, správné úkoly, rychlost, vzdálenost chybných kliknutí, čas psaní, přesnost psaní).
   - **U pacienta**: výsledek se uloží automaticky. Zobrazí se „Výsledek uložen do karty pacienta X“ a tlačítko **Zavřít**, které zavře okno.
   - **Bez registrace**: zobrazí se „Výsledek zatím není nikde uložen“ a tlačítka **Zavřít bez uložení** a **Přiřadit pacientovi**. Přiřazení otevře výběr pacienta z Kartotéky s hledáním; po kliknutí na pacienta se výsledek uloží.

Hlavní okno se po uložení aktualizuje samo, bez obnovení stránky.

### Karta pacienta

Pod tabulkou Monitorings je nová karta **e-Skill**:
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
- Datum v úkolu 9 je pevně 15. 2. 2026 (jako v originále).
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

## Changelog

| Datum | Změna |
| --- | --- |
| 2026-10-07 | Monitoring pacienta: místo datumových polí vždy viditelný dvouměsíční kalendář (klik Start → Konec) a tlačítka délky 1–6 týdnů. |
| 2026-10-07 | e-Skill: test digitální gramotnosti z repozitáře digital_literacy bez registrace – seznam pacientů se „Zahájit test“, test v novém okně, uložení do karty pacienta, test bez registrace s přiřazením výsledku. |
| 2026-10-07 | Monitorace (seznam + formulář: název, diagnózy, tag, klasifikace, frekvence, rozsahy pásem), přiřazení monitorace pacientovi, uživatelské pohledy pod Dashboardem, rozšířený filtr (monitorace, klasifikace, tag). |
| 2026-10-07 | První verze repliky podle screenshotů (Dashboard, Klinický report, Kartotéka, Monitorings, vyplnění dotazníku). |
