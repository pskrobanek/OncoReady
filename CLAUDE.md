# OncoReady – MVP replika UI

Klikací replika produkčního systému OncoReady (Laravel Filament) pro iteraci UI a zadání pro IT.
React + Vite + Tailwind 3, bez backendu, data v localStorage.

- UI piš česky a ve stylu Filament (viz `src/components/ui.tsx`), nepřidávej nové knihovny bez důvodu.
- Každou změnu UI zapiš do `docs/ui-spec.md` (sekce obrazovky + Changelog). Předpoklady označ „⚠️ OVĚŘIT“.
- Pravidla pásem: `src/lib/scoring.ts`; otázky: `src/data/questionnaire.ts`; demo data: `src/data/seed.ts`.
- Před commitem: `npm run typecheck && npm run build`.
- Žádná skutečná data pacientů.
