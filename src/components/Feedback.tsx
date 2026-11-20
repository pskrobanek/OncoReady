// Okno „Zpětná vazba“: na počítači pevně dole v levém menu, na mobilu plovoucí tlačítko s panelem zespodu.
import { ChatBubbleLeftEllipsisIcon, CameraIcon, CheckCircleIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Button, cx, useToast } from './ui'

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
        <CheckCircleIcon className="h-9 w-9 text-emerald-500" />
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
        className="block w-full resize-y rounded-sm border-none bg-transparent px-3 py-2 text-sm text-gray-950 outline-none ring-1 ring-gray-950/15 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-primary-600"
      />
      {shot ? (
        <div className="flex items-center gap-2 rounded-sm p-1.5 pr-2 text-xs text-gray-700 ring-1 ring-gray-950/15">
          <img src={shot.url} alt="" className="h-8 w-12 shrink-0 rounded-sm object-cover object-top ring-1 ring-gray-950/10" />
          <span className="min-w-0 flex-1 truncate">Snímek obrazovky · {shot.page}</span>
          <button type="button" title="Odebrat snímek" onClick={() => setShot(null)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={capture}
          disabled={capturing}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-950/15 transition hover:bg-gray-950/5 disabled:cursor-wait disabled:text-gray-400"
        >
          <CameraIcon className="h-5 w-5 text-gray-500" />
          {capturing ? 'Pořizuji snímek…' : 'Pořídit snímek obrazovky'}
        </button>
      )}
      <button
        type="submit"
        disabled={!text.trim()}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-gray-950/5 disabled:text-gray-400"
      >
        <PaperAirplaneIcon className="h-4 w-4" />
        Odeslat
      </button>
    </form>
  )
}

const Heading = () => (
  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
    <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-400" />
    Zpětná vazba
  </h2>
)

/** Nenápadný blok dole v levém menu (od šířky 1024 px) – bez karty a pozadí, jen tenká čára nad ním. Nepřibírá se do snímku obrazovky. */
export function FeedbackSidebar() {
  return (
    <section data-feedback className="mt-auto flex flex-col gap-3 border-t border-gray-200 px-1 pt-5">
      <Heading />
      <FeedbackForm />
    </section>
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
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 hover:bg-primary-500"
        >
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
          Zpětná vazba
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-gray-950/50" onClick={() => setOpen(false)} />
          <section className={cx('fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-3 overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl')}>
            <div className="flex items-center justify-between">
              <Heading />
              <button type="button" title="Zavřít" onClick={() => setOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <FeedbackForm autoFocus />
          </section>
        </>
      )}
    </div>
  )
}
