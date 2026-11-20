// Okno „Zpětná vazba“: na počítači pevně dole v levém menu, na mobilu plovoucí tlačítko s panelem zespodu.
import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, cx, useToast } from './ui'

/** Moderní lineární ikony (zaoblené, tah 1,75 px) – vlastní SVG, bez další knihovny. */
const Svg = ({ className, children }: { className?: string; children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cx('shrink-0', className)} aria-hidden>
    {children}
  </svg>
)
/** Bublina zprávy s řádky textu. */
const IconMessage = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M7.5 18 4 21v-4.5A4 4 0 0 1 3 14V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H7.5Z" />
    <path d="M8 8.5h8M8 12h5" />
  </Svg>
)
/** Výřez obrazovky (rohy rámečku + objektiv). */
const IconCapture = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
/** Odeslat – šipka nahoru (jako v chatu). */
const IconSend = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)
const IconCheck = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </Svg>
)
const IconClose = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M7 7l10 10M17 7 7 17" />
  </Svg>
)

/** Čitelný název stránky podle cesty (ukládá se k připomínce a ukazuje u snímku). */
function pageLabel(path: string) {
  const first = path.split('/')[1] ?? ''
  const LABELS: Record<string, string> = {
    '': 'Dashboard',
    pohledy: 'Pohled',
    sablony: 'Šablony',
    kartoteka: 'Kartotéka',
    statistiky: 'Statistiky',
    'e-skill': 'e-Skill',
    vyplnit: 'Vyplnění dotazníku',
  }
  return LABELS[first] ?? path
}

/** Pořídí snímek stránky (bez okna zpětné vazby) jako zmenšený JPEG. */
async function captureScreen(): Promise<string> {
  const { toJpeg } = await import('html-to-image')
  const root = document.getElementById('root')!
  return toJpeg(root, {
    quality: 0.7,
    pixelRatio: Math.min(1, 1200 / root.scrollWidth), // šířka nejvýš 1200 px, ať se snímek vejde do úložiště
    backgroundColor: '#f9fafb',
    skipFonts: true,
    filter: (node) => !(node instanceof HTMLElement && node.dataset.feedback !== undefined),
  })
}

/** Formulář: textové pole, Pořídit snímek obrazovky, Odeslat; po odeslání poděkování. */
function FeedbackForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const { addFeedback } = useStore()
  const toast = useToast()
  const { pathname } = useLocation()
  const [text, setText] = useState('')
  const [shot, setShot] = useState<{ url: string; page: string } | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [sent, setSent] = useState(false)

  const capture = async () => {
    setCapturing(true)
    try {
      setShot({ url: await captureScreen(), page: pageLabel(pathname) })
    } catch {
      toast('Snímek obrazovky se nepodařilo pořídit')
    } finally {
      setCapturing(false)
    }
  }

  const send = () => {
    if (!text.trim()) return
    addFeedback({ text: text.trim(), page: pathname, createdAt: new Date().toISOString(), author: 'Testovací uživatel', screenshot: shot?.url ?? null })
    setText('')
    setShot(null)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center" aria-live="polite">
        <IconCheck className="h-9 w-9 text-emerald-500" />
        <p className="text-sm font-semibold text-gray-950">Děkujeme, připomínka odeslána.</p>
        <Button color="gray" onClick={() => setSent(false)}>
          Napsat další
        </Button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <label htmlFor="feedback-text" className="sr-only">
        Text připomínky
      </label>
      <textarea
        id="feedback-text"
        rows={5}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
        }}
        placeholder="Co nefunguje, chybí nebo by šlo udělat lépe?"
        className="block w-full resize-y rounded-md border-none bg-white/50 px-3 py-2 text-sm text-gray-950 outline-none ring-1 ring-gray-950/10 backdrop-blur-sm placeholder:text-gray-400 focus:bg-white/80 focus:ring-2 focus:ring-primary-600"
      />
      {shot ? (
        <div className="flex items-center gap-2 rounded-md bg-white/50 p-1.5 pr-2 text-xs text-gray-700 ring-1 ring-gray-950/10">
          <img src={shot.url} alt="" className="h-8 w-12 shrink-0 rounded-sm object-cover object-top ring-1 ring-gray-950/10" />
          <span className="min-w-0 flex-1 truncate">Snímek obrazovky · {shot.page}</span>
          <button type="button" title="Odebrat snímek" onClick={() => setShot(null)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={capture}
          disabled={capturing}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white/40 px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-950/10 transition hover:bg-white/70 disabled:cursor-wait disabled:text-gray-400"
        >
          <IconCapture className="h-5 w-5 text-gray-500" />
          {capturing ? 'Pořizuji snímek…' : 'Pořídit snímek obrazovky'}
        </button>
      )}
      <button
        type="submit"
        disabled={!text.trim()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-gray-950/5 disabled:text-gray-400"
      >
        <IconSend className="h-4 w-4" />
        Odeslat
      </button>
    </form>
  )
}

const Heading = () => (
  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
    <IconMessage className="h-5 w-5 text-gray-500" />
    Zpětná vazba
  </h2>
)

/**
 * Blok dole v levém menu (od šířky 1024 px) s efektem matného skla: průsvitná bílá karta s rozostřením pozadí
 * a jemnými barevnými skvrnami za ní (aby bylo sklo vidět). Nepřibírá se do snímku obrazovky.
 */
export function FeedbackSidebar() {
  return (
    <div data-feedback className="relative mt-auto">
      <span aria-hidden className="pointer-events-none absolute left-2 top-6 h-24 w-32 rounded-full bg-primary-400/45 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute bottom-10 right-1 h-24 w-28 rounded-full bg-sky-300/50 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 left-8 h-16 w-24 rounded-full bg-violet-300/35 blur-2xl" />
      <section className="relative flex flex-col gap-3 rounded-lg border border-white/80 bg-gradient-to-br from-white/60 via-white/35 to-white/20 p-4 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-gray-950/5 backdrop-blur-2xl backdrop-saturate-150">
        <Heading />
        <FeedbackForm />
      </section>
    </div>
  )
}

/** Mobil a tablet: plovoucí tlačítko vpravo dole, které otevře formulář v panelu zespodu. */
export function FeedbackMobile() {
  const [open, setOpen] = useState(false)
  return (
    <div data-feedback className="lg:hidden">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/40 bg-primary-600/85 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 backdrop-blur-xl hover:bg-primary-600"
        >
          <IconMessage className="h-5 w-5" />
          Zpětná vazba
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-gray-950/50" onClick={() => setOpen(false)} />
          <section className={cx('fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-2xl border-t border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur-xl')}>
            <div className="flex items-center justify-between">
              <Heading />
              <button type="button" title="Zavřít" onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
                <IconClose className="h-6 w-6" />
              </button>
            </div>
            <FeedbackForm autoFocus />
          </section>
        </>
      )}
    </div>
  )
}
