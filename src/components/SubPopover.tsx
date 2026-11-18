import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { onCourt, playerLabel, ROLES } from '../lib/model'
import type { Board } from '../lib/useBoard'
import { Icon } from './Icons'

/** 点我方队员后，在队员旁边弹出换人选单，不用再往下滚 */
export function SubPopover({
  board,
  p,
  anchor,
  onClose,
}: {
  board: Board
  p: number
  anchor: { x: number; y: number }
  onClose: () => void
}) {
  const { s, update } = board
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const o = onCourt(s).find((x) => x.p === p)

  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const gap = 30
    let left = anchor.x + gap
    if (left + w > box.clientWidth - 8) left = anchor.x - gap - w
    left = Math.max(8, Math.min(left, box.clientWidth - w - 8))
    const top = Math.max(8, Math.min(anchor.y - h / 2, box.clientHeight - h - 8))
    setPos({ left, top })
  }, [anchor, p])

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    addEventListener('keydown', key)
    addEventListener('pointerdown', down, true)
    return () => {
      removeEventListener('keydown', key)
      removeEventListener('pointerdown', down, true)
    }
  }, [onClose])

  if (!o) return null
  const cands = s.roster.filter((pl) => !s.lineup.includes(pl.id) && pl.id !== s.libero)
  const pick = (id: string | null) => {
    update((d) => {
      if (o.lib) d.libero = id
      else if (id) d.lineup[o.slot] = id
    })
    onClose()
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={o.lib ? '自由人换人' : `${p}号位换人`}
      className="card absolute z-20 flex max-h-[calc(100%-16px)] w-60 animate-rise flex-col gap-2 p-2.5 shadow-xl"
      style={pos ?? { left: -9999, top: 0 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{o.lib ? '自由人换人' : `${p}号位换人`}</p>
          <p className="text-xs text-mute">现在：{o.pl.name || ROLES[o.pl.role]}</p>
        </div>
        <button className="btn size-8 min-h-8 p-0" onClick={onClose} aria-label="关闭">
          <Icon name="close" />
        </button>
      </div>
      {cands.length ? (
        <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {cands.map((pl) => (
            <button key={pl.id} className="btn justify-start" onClick={() => pick(pl.id)}>
              <i className="block size-2.5 shrink-0 rounded-full" style={{ background: `var(--r-${pl.role})` }} />
              <span className="truncate">{playerLabel(pl)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-mute">替补名单是空的，先在“名单”里添加球员。</p>
      )}
      {o.lib && (
        <button className="btn" onClick={() => pick(null)}>
          不使用自由人
        </button>
      )}
    </div>
  )
}
