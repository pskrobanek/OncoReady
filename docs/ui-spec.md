# OncoReady – specifikace UI

Specifikace popisuje UI repliky. Kde se replika liší od produkce nebo kde jde o předpoklad, je to označeno **⚠️ OVĚŘIT**.
Produkce běží na Laravel Filament, a proto replika přebírá jeho vzhled (komponenty, rozestupy, barvy).

## Globální layout

- **Horní lišta** (výška 64 px, bílá, spodní stín): vlevo logo OncoReady („Onco“ černě, „Ready“ primární modrou), vpravo kulatý avatar s iniciálou (černé pozadí, bílé písmeno).
- **Boční menu** (od šířky ≥ 1024 px): Dashboard (ikona domu), Kartotéka (ikona složek), Statistiky (ikona sloupcového grafu).
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
- Modal *Vytvořit Monitoring* obsahuje pole Start\*, Konec\* a přepínač Aktivní.
  - Při vytvoření se dotazníky naplánují **každých 7 dní** od začátku do konce. **⚠️ OVĚŘIT** frekvenci a pravidla v produkci.

## Statistiky

**⚠️ Zástupná stránka** (chybí screenshot z produkce). Obsahuje 4 dlaždice (pacienti, aktivní monitorace, vyplněné dotazníky, míra vyplnění) a pruhový přehled dotazníků podle pásma.

## Otevřené otázky pro produkci

1. Úplný seznam otázek dotazníku, jejich bodování a zdroje (TheraData / PRO-CTCAE).
2. Přesná pravidla pásem a priorita mezi modrým a červeným pásmem.
3. Logika filtru na Dashboardu: filtruje se podle nejnovějšího dotazníku, nebo podle kteréhokoli?
4. Frekvence plánovaných dotazníků v monitoraci.
5. Obsah stránky Statistiky.
6. Některá jména jsou v produkčních datech zadaná obráceně (Příjmení „Anna“, Jméno „Malá“). Replika to přebírá. Doporučení: v UI zdůraznit pořadí polí.

## Changelog

| Datum | Změna |
| --- | --- |
| 2026-10-07 | První verze repliky podle screenshotů (Dashboard, Klinický report, Kartotéka, Monitorings, vyplnění dotazníku). |
