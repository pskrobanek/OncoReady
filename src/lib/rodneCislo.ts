// Měkká kontrola rodného čísla – jen upozorní, uložení nikdy neblokuje.

/** Vrátí text upozornění, nebo null, pokud rodné číslo vypadá v pořádku. */
export function rodneCisloWarning(input: string): string | null {
  const v = input.trim()
  if (!v) return null
  const digits = v.replace('/', '')
  if (!/^\d{6}\/?\d{3,4}$/.test(v)) return 'Rodné číslo by mělo mít tvar 123456/7890 (9 nebo 10 číslic).'

  const yy = Number(digits.slice(0, 2))
  let mm = Number(digits.slice(2, 4))
  const dd = Number(digits.slice(4, 6))
  if (mm > 70) mm -= 70 // ženy od roku 2004 (+50 +20)
  else if (mm > 50) mm -= 50 // ženy
  else if (mm > 20) mm -= 20 // muži od roku 2004
  // 9místná RČ jsou jen do roku 1953, 10místná od 1954
  const year = digits.length === 9 ? 1900 + yy : yy >= 54 ? 1900 + yy : 2000 + yy
  const date = new Date(year, mm - 1, dd)
  if (mm < 1 || mm > 12 || date.getMonth() !== mm - 1 || date.getDate() !== dd)
    return 'Začátek rodného čísla neodpovídá platnému datu narození.'

  if (digits.length === 10) {
    const n = Number(digits.slice(0, 9))
    const check = Number(digits[9])
    const mod = n % 11
    // Kontrolní číslice: zbytek po dělení 11; zbytek 10 → 0 (výjimka pro RČ do roku 1985)
    if (!(mod === check || (mod === 10 && check === 0))) return 'Kontrolní číslice nesedí – zkontrolujte překlep.'
  }
  return null
}
