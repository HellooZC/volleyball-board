import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { isCustom, PEN_COLORS, TYPE_LABEL } from '../lib/model'
import type { Board } from '../lib/useBoard'
import { AttackerPicker, NoteBox, PenTools, PosTools, RotationPicker, TypeToggle, ViewToggle } from './Controls'
import { Court, type CourtView } from './Court'
import { HelpDialog } from './HelpDialog'
import { Icon } from './Icons'
import { SidePanel, type PanelTab } from './SidePanel'
import { SubPopover } from './SubPopover'

/** wide：平板横放 / 电脑；land：手机横屏（矮）；narrow：手机竖屏、平板竖放 */
type Layout = 'wide' | 'land' | 'narrow'
const WIDE = '(min-width: 1024px) and (min-height: 541px)'
const LAND = '(orientation: landscape) and (max-height: 540px)'
function useMedia(q: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(q)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(q).matches,
  )
}

const readPref = <T extends string>(k: string, fallback: T, ok: readonly T[]): T => {
  try {
    const v = localStorage.getItem(k) as T | null
    return v && ok.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}
const writePref = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* 忽略 */
  }
}

export type HeaderVariant = 'bar' | 'stack'

interface Props {
  board: Board
  /** 上方横条（bar）或手机横屏左栏（stack）的内容：对局是计分板，模板是队伍和模板选择 */
  renderHeader: (variant: HeaderVariant, ctx: { point: (won: boolean) => void; help: () => void }) => ReactNode
  /** 右侧面板有哪些分页 */
  tabs: PanelTab[]
  /** “记录”分页最上面的额外内容（例如结束比赛） */
  logExtra?: ReactNode
  /** 站位工具里的额外按钮（例如导入队形 / 存为模板） */
  formTools?: ReactNode
}

export function BoardScreen({ board, renderHeader, tabs, logExtra, formTools }: Props) {
  const isWide = useMedia(WIDE)
  const isLand = useMedia(LAND)
  const layout: Layout = isWide ? 'wide' : isLand ? 'land' : 'narrow'
  const wide = layout === 'wide'
  // 手机横屏高度太矮，全场会让圆圈太小，所以默认看半场；各自记住偏好
  const viewKey = layout === 'land' ? 'vb-view-land' : 'vb-view'
  const [views, setViews] = useState<Record<string, CourtView>>(() => ({
    'vb-view': readPref('vb-view', 'full', ['full', 'half'] as const),
    'vb-view-land': readPref('vb-view-land', 'half', ['full', 'half'] as const),
  }))
  const view = views[viewKey]
  const [tab, setTabRaw] = useState<PanelTab>(() => readPref('vb-tab', 'lineup', ['overview', 'lineup', 'roster', 'log', 'tools'] as const))
  const ctx = { point: (won: boolean) => point(won), help: () => setHelp(true) }
  const [pen, setPen] = useState(false)
  const [penColor, setPenColor] = useState(PEN_COLORS[0][0])
  const [sub, setSub] = useState<{ p: number; anchor: { x: number; y: number } } | null>(null)
  const [help, setHelp] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [toast, setToast] = useState<{ id: number; text: string; tone: 'win' | 'lose' } | null>(null)

  const setView = (v: CourtView) => {
    setViews((m) => ({ ...m, [viewKey]: v }))
    writePref(viewKey, v)
    setSub(null)
  }
  const setTab = (t: PanelTab) => {
    setTabRaw(t)
    writePref('vb-tab', t)
  }
  const closeSub = useCallback(() => setSub(null), [])

  const flash = (text: string, tone: 'win' | 'lose' = 'win') => setToast({ id: Date.now(), text, tone })
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const point = (won: boolean) => {
    const r = board.point(won)
    setSub(null)
    if (r.rotated) flash(`得分换发球 · 轮转到 ${r.rot + 1}`)
    else if (r.oppRotated) flash(`对方换发球 · 对方轮转到 ${r.oppRot + 1}`, 'lose')
  }

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input,select,textarea,dialog')) return
      const k = e.key.toLowerCase()
      if (/^[1-6]$/.test(k)) board.setRot(+k - 1)
      else if (k === 'r') board.setType('recv')
      else if (k === 'd') board.setType('def')
      else if (k === 'a' && board.mode === 'match') point(true)
      else if (k === 'l' && board.mode === 'match') point(false)
      else if (k === 'z' && board.mode === 'match') board.undoPoint()
      else if (k === 'p') setPen((v) => !v)
      else if (k === 'v') setView(view === 'full' ? 'half' : 'full')
      else if (k === 'escape') setPen(false)
      else return
      setSub(null)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  // 宽屏没有“站位”分页，切回场上
  const panelTab: PanelTab = (wide && tab === 'tools') || (tab !== 'tools' && !tabs.includes(tab)) ? tabs[0] : tab

  const custom = isCustom(board.s, board.key)
  const courtArea = (
    <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-[var(--court-free)] p-1.5" aria-label="球场">
      <Court
        board={board}
        view={view}
        pen={pen}
        penColor={penColor}
        selected={sub?.p ?? null}
        onTapPlayer={(p, anchor) => setSub({ p, anchor })}
      />
      <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-bg">
          轮转 {board.s.rot + 1} · {TYPE_LABEL[board.type]}
          {board.type === 'atk' && ` · 对方${board.atk}号位进攻`}
        </span>
        <span className="rounded-full bg-panel/85 px-2.5 py-1 text-xs text-mute">
          {custom ? '已摆阵型' : '还没摆，显示默认站位'}
        </span>
        {pen && <span className="animate-fade rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-ink">画笔中</span>}
        {board.mode === 'match' && (
          <span
            role="group"
            aria-label="对方轮转"
            className="pointer-events-auto flex basis-full items-center gap-1 self-start sm:basis-auto"
          >
            <span className="flex items-center gap-1 rounded-full bg-[var(--opp-tok)] py-0.5 pr-0.5 pl-2.5 text-xs font-bold text-white">
              对方轮转 {(board.s.oppRot ?? 0) + 1}
              <button
                className="grid size-6 cursor-pointer place-items-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-90"
                onClick={() => board.setOppRot((board.s.oppRot ?? 0) - 1)}
                aria-label="对方轮转减一"
              >
                ‹
              </button>
              <button
                className="grid size-6 cursor-pointer place-items-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-90"
                onClick={() => board.setOppRot((board.s.oppRot ?? 0) + 1)}
                aria-label="对方轮转加一"
              >
                ›
              </button>
            </span>
          </span>
        )}
      </div>
      {!wide && (
        <button
          className="btn absolute top-2 right-2 size-10 p-0 shadow-md"
          onClick={() => setView(view === 'full' ? 'half' : 'full')}
          aria-label={view === 'full' ? '只看我方半场' : '显示全场'}
        >
          <Icon name={view === 'full' ? 'expand' : 'shrink'} />
        </button>
      )}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className={
            'pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-fit animate-rise rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg ' +
            (toast.tone === 'win' ? 'bg-win' : 'bg-lose')
          }
        >
          {toast.text}
        </div>
      )}
      {sub && <SubPopover board={board} p={sub.p} anchor={sub.anchor} onClose={closeSub} />}
    </main>
  )

  // 切“接发球 / 我方发球”：对局会照发球方自动切，也可以手动切过去看
  const typeToggle = <TypeToggle board={board} />
  const penTools = <PenTools board={board} pen={pen} setPen={setPen} color={penColor} setColor={setPenColor} />
  const sheetEl = sheet && (
    <Sheet side={layout === 'land' ? 'right' : 'bottom'} onClose={() => setSheet(false)}>
      <SidePanel
        board={board}
        tabs={tabs}
        logExtra={logExtra}
        tab={panelTab}
        setTab={setTab}
        tools={
          <div className="flex flex-col gap-3">
            <AttackerPicker board={board} />
            <ViewToggle view={view} onChange={setView} />
            <PosTools board={board} />
            {formTools}
            {penTools}
            <div className="flex h-36 flex-col">
              <NoteBox board={board} />
            </div>
          </div>
        }
      />
    </Sheet>
  )
  const quickTools = (
    <>
      <button className="btn" aria-pressed={pen} onClick={() => setPen(!pen)}>
        <Icon name="pen" />
        画笔
      </button>
      <button className="btn" onClick={() => setSheet(true)}>
        <Icon name="panel" />
        更多
      </button>
    </>
  )

  if (layout === 'land') {
    return (
      <div className="grid h-dvh grid-cols-[clamp(9.5rem,24vw,12.5rem)_minmax(0,1fr)_clamp(9.5rem,24vw,12.5rem)] gap-2 py-[max(8px,env(safe-area-inset-top))] pr-[max(8px,env(safe-area-inset-right))] pb-[max(8px,env(safe-area-inset-bottom))] pl-[max(8px,env(safe-area-inset-left))]">
        <aside className="flex min-h-0 flex-col gap-2 overflow-y-auto" aria-label="比分">
          {renderHeader('stack', ctx)}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col">{courtArea}</div>
        <nav className="card flex max-h-full min-h-0 flex-col gap-2 self-start overflow-y-auto p-2" aria-label="轮转和工具">
          <RotationPicker board={board} />
          {typeToggle}
          <AttackerPicker board={board} hint={false} />
          <div className="grid grid-cols-2 gap-1.5 [&>button]:px-1">{quickTools}</div>
        </nav>
        {sheetEl}
        <HelpDialog open={help} onClose={() => setHelp(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {renderHeader('bar', ctx)}

      {wide ? (
        <div className="grid min-h-0 flex-1 grid-cols-[13.5rem_minmax(0,1fr)_19rem] gap-3 p-3 xl:grid-cols-[15rem_minmax(0,1fr)_24rem]">
          <aside className="flex min-h-0 animate-rise flex-col gap-3 overflow-y-auto" aria-label="轮转和站位工具">
            <Section title="轮转">
              <RotationPicker board={board} />
            </Section>
            <Section title={board.mode === 'match' ? '站位' : '阵型'}>
              {typeToggle}
              <AttackerPicker board={board} hint={false} />
              <ViewToggle view={view} onChange={setView} />
              <PosTools board={board} />
              {formTools}
            </Section>
            <Section title="画跑位">{penTools}</Section>
            <div className="card flex min-h-28 flex-1 flex-col p-2.5">
              <NoteBox board={board} />
            </div>
          </aside>

          {courtArea}

          <aside className="card min-h-0 animate-rise p-2.5" aria-label="队员和记录">
            <SidePanel board={board} tabs={tabs} logExtra={logExtra} tab={panelTab} setTab={setTab} />
          </aside>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col p-2">{courtArea}</div>
          <nav className="flex flex-col gap-2 border-t border-line bg-panel p-2" aria-label="轮转和工具">
            <RotationPicker board={board} cols={6} />
            <div className={'grid gap-2 ' + (typeToggle ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-2')}>
              {typeToggle}
              {quickTools}
            </div>
          </nav>
          {sheetEl}
        </>
      )}

      <HelpDialog open={help} onClose={() => setHelp(false)} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-2 p-2.5">
      <h2 className="label">{title}</h2>
      {children}
    </section>
  )
}

function Sheet({ side, onClose, children }: { side: 'bottom' | 'right'; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div
      className={'fixed inset-0 z-30 flex animate-fade bg-black/40 ' + (side === 'bottom' ? 'flex-col justify-end' : 'justify-end')}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="更多"
        className={
          'flex flex-col gap-2 bg-panel p-3 ' +
          (side === 'bottom'
            ? 'h-[75dvh] animate-rise rounded-t-2xl border-t border-line pb-[max(12px,env(safe-area-inset-bottom))]'
            : 'h-full w-[min(380px,60vw)] animate-slide-in border-l border-line pr-[max(12px,env(safe-area-inset-right))]')
        }
        onClick={(e) => e.stopPropagation()}
      >
        {side === 'bottom' && <span className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-line" />}
        <div className="min-h-0 flex-1">{children}</div>
        <button className="btn w-full" onClick={onClose}>
          收起
        </button>
      </div>
    </div>
  )
}
