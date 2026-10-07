# OncoReady – MVP replika UI

Klikací replika systému OncoReady (theradata.health). Slouží k iteraci UI a jako **přesné zadání pro IT**.
Nejde o produkční aplikaci: nemá backend ani přihlášení a data jsou jen ukázková. Ukládají se do prohlížeče (localStorage).

## Spuštění

```bash
npm install
npm run dev        # http://localhost:5173
```

Další příkazy:

| Příkaz | Co dělá |
| --- | --- |
| `npm run build` | produkční build do `dist/` |
| `npm run build:single` | celá aplikace v **jediném souboru** `dist/index.html` (dá se poslat e-mailem nebo otevřít bez serveru) |
| `npm run typecheck` | kontrola typů |

Demo data obnovíte přes avatar **T** vpravo nahoře → **Obnovit demo data**.

## Co replika umí

- **Dashboard**: tabulka pacientů s odznaky dotazníků a filtrem podle pásma a data vyplnění.
  - Klik na vyplněný dotazník otevře **Klinický report** s trendem skóre a odpověďmi.
  - Klik na **n/a** otevře vyplnění dotazníku pacientem (např. na tabletu v ambulanci).
- **Pohledy**: podstránky Dashboardu s uloženou kombinací filtrů (vytvořit, přejmenovat, uložit změny, smazat).
- **Monitorace**: šablony sledování s diagnózami, tagem, klasifikací, frekvencí odesílání a rozsahy pásem.
- **Kartotéka**: seznam pacientů, vytvoření, úprava a smazání pacienta.
  - **Monitorings**: vytvoření, úprava a smazání monitorace, akce „Vytvořit dotazník“.
- **Statistiky**: zástupná stránka (produkční podobu zatím neznáme).
- **e-Skill**: test digitální gramotnosti (z repozitáře `digital_literacy`, bez registrace) – spuštění u pacienta v novém okně, uložení do karty, test bez registrace s možností přiřadit výsledek.

## Struktura

```
src/
  data/questionnaire.ts   otázky dotazníku a bodování (ZÁSTUPNÉ – doplnit z produkce)
  data/seed.ts            demo pacienti a dotazníky podle screenshotů
  lib/scoring.ts          pravidla pásem (zelené/žluté/červené/modré)
  lib/store.tsx           data + akce (localStorage)
  components/             layout, UI prvky ve stylu Filament, odznaky, klinický report
  pages/                  Dashboard, Kartotéka, formulář pacienta, vyplnění dotazníku, Statistiky
docs/ui-spec.md           specifikace UI pro IT
```

## Postup práce s IT

1. Úpravu UI udělat v replice (sám nebo s Claude), ideálně v samostatné větvi.
2. Popsat změnu v `docs/ui-spec.md`, v sekci dané obrazovky a v **Changelogu**.
3. IT pošlete odkaz na commit nebo pull request. Diff přesně ukazuje, co se změnilo, a screenshot nebo běžící replika ukazuje výsledek.
