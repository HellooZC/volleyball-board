import { useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { clamp, onCourt, OPP_DEF, oppPosNo, posOf, ROLES, type CourtPlayer, type XY } from '../lib/model'
import type { Board } from '../lib/useBoard'

export type CourtView = 'full' | 'half'

const VIEWBOX: Record<CourtView, string> = {
  full: '0 0 360 700',
  half: '0 318 360 368',
}

type DragKind = 'pl' | 'opp' | 'ball'
interface Drag {
  kind: DragKind
  ref: number // 我方：场上位置；对手：序号
  dx: number
  dy: number
  sx: number
  sy: number
  moved: boolean
}

const textW = (s: string) => [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 10.5 : 6), 0)
const capture = (e: RPointerEvent<SVGSVGElement>) => {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    /* 指针已经结束时忽略 */
  }
}
const toPath = (pts: XY[]) => 'M' + pts.map((a) => a.map(Math.round).join(' ')).join('L')

interface Props {
  board: Board
  view: CourtView
  pen: boolean
  penColor: string
  selected: number | null
  onTapPlayer: (p: number, anchor: { x: number; y: number }) => void
}

export function Court({ board, view, pen, penColor, selected, onTapPlayer }: Props) {
  const { s, type } = board
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag | null>(null)
  const [dragXY, setDragXY] = useState<{ kind: DragKind; ref: number; xy: XY } | null>(null)
  const [live, setLive] = useState<XY[] | null>(null)

  const pt = (e: { clientX: number; clientY: number }): XY => {
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(svgRef.current!.getScreenCTM()!.inverse())
    return [q.x, q.y]
  }
  const toScreen = ([x, y]: XY) => {
    const svg = svgRef.current!
    const q = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!)
    const box = svg.parentElement!.getBoundingClientRect()
    return { x: q.x - box.left, y: q.y - box.top }
  }

  const players = onCourt(s)
  const xyFor = (kind: DragKind, ref: number, base: XY): XY =>
    dragXY && dragXY.kind === kind && dragXY.ref === ref ? dragXY.xy : base

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    const [x, y] = pt(e)
    if (pen) {
      setLive([[x, y]])
      capture(e)
      e.preventDefault()
      return
    }
    const g = (e.target as Element).closest<SVGGElement>('[data-kind]')
    if (!g) return
    const kind = g.dataset.kind as DragKind
    const ref = Number(g.dataset.ref)
    const base: XY =
      kind === 'pl' ? posOf(s, type, ref) : kind === 'opp' ? (s.oppPos[ref] ?? OPP_DEF[ref]) : s.ball
    drag.current = { kind, ref, dx: base[0] - x, dy: base[1] - y, sx: x, sy: y, moved: false }
    capture(e)
    e.preventDefault()
  }

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const [x, y] = pt(e)
    if (live) {
      const l = live[live.length - 1]
      if (Math.hypot(x - l[0], y - l[1]) > 3) setLive([...live, [x, y]])
      return
    }
    const d = drag.current
    if (!d) return
    if (!d.moved) {
      if (Math.hypot(x - d.sx, y - d.sy) < 5) return
      d.moved = true
    }
    let nx = x + d.dx
    let ny = y + d.dy
    if (d.kind === 'pl') {
      nx = clamp(nx, 20, 340)
      ny = clamp(ny, 360, 664)
    } else if (d.kind === 'opp') {
      nx = clamp(nx, 20, 340)
      ny = clamp(ny, 36, 340)
    } else {
      nx = clamp(nx, 16, 344)
      ny = clamp(ny, 20, 680)
    }
    setDragXY({ kind: d.kind, ref: d.ref, xy: [Math.round(nx), Math.round(ny)] })
  }

  const onUp = () => {
    if (live) {
      const pts = live.length > 1 ? live : [live[0], live[0]]
      board.addStroke({ c: penColor, d: toPath(pts) })
      setLive(null)
      return
    }
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved && dragXY) {
      if (d.kind === 'pl') board.movePlayer(d.ref, dragXY.xy)
      else if (d.kind === 'opp') board.moveOpp(d.ref, dragXY.xy)
      else board.moveBall(dragXY.xy)
    } else if (!d.moved && d.kind === 'pl') {
      onTapPlayer(d.ref, toScreen(posOf(s, type, d.ref)))
    }
    setDragXY(null)
  }

  const strokes = s.forms[board.key]?.strokes ?? []

  return (
    <svg
      ref={svgRef}
      viewBox={VIEWBOX[view]}
      className={'block h-full w-full touch-none select-none' + (pen ? ' pen cursor-crosshair' : '')}
      role="img"
      aria-label={view === 'full' ? '排球场全场，上半是对手半场，下半是我方半场' : '我方半场'}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <defs>
        <clipPath id="bc">
          <circle r="13" />
        </clipPath>
      </defs>
      <rect fill="var(--court-free)" x="-20" y="-20" width="400" height="740" />
      <rect fill="var(--court-opp)" x="20" y="30" width="320" height="320" />
      <rect fill="var(--court-me)" x="20" y="350" width="320" height="320" />
      <text x="30" y="52" fill="#fff" fillOpacity=".85" fontSize="13">
        对手半场
      </text>
      <g stroke="var(--court-line)" strokeWidth="2.5" fill="none">
        <rect x="20" y="30" width="320" height="640" />
        <line x1="20" y1="243" x2="340" y2="243" strokeDasharray="5 4" strokeWidth="1.5" />
        <line x1="20" y1="457" x2="340" y2="457" strokeDasharray="5 4" strokeWidth="1.5" />
      </g>
      <line x1="12" y1="350" x2="348" y2="350" stroke="var(--net)" strokeOpacity=".55" strokeWidth="7" strokeDasharray="2 2" />
      <line x1="12" y1="347" x2="348" y2="347" stroke="#fff" strokeWidth="2" />
      <rect x="8" y="336" width="6" height="28" rx="2" fill="#e5e7eb" stroke="var(--net)" strokeWidth="1" />
      <rect x="346" y="336" width="6" height="28" rx="2" fill="#e5e7eb" stroke="var(--net)" strokeWidth="1" />

      <g>
        {strokes.map((st, i) => (
          <path key={i} d={st.d} stroke={st.c} fill="none" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>

      <g>
        {/* 对方：圆圈里是开场顺序（第几个球员），小圆点是现在的位置；轮转时换到下一个位置 */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const p = oppPosNo(i, s.oppRot)
          return (
            <Tok
              key={i}
              kind="opp"
              refNo={p - 1}
              xy={xyFor('opp', p - 1, s.oppPos[p - 1] ?? OPP_DEF[p - 1])}
              dragging={dragXY?.kind === 'opp' && dragXY.ref === p - 1}
            >
              <circle r={16} fill="var(--opp-tok)" stroke="#fff" strokeWidth={2} strokeOpacity={0.8} />
              <text fontSize={13} fill="#fff" textAnchor="middle" dominantBaseline="central" fontWeight={700} pointerEvents="none">
                {i + 1}
              </text>
              <circle cx={13} cy={-13} r={7} fill="var(--badge)" stroke="#fff" strokeWidth={1.2} />
              <text x={13} y={-13} fontSize={8.5} fontWeight={700} fill="#fff" textAnchor="middle" dominantBaseline="central" pointerEvents="none">
                {p}
              </text>
            </Tok>
          )
        })}
      </g>

      <g>
        {players.map((o) => (
          <Tok
            key={o.pl.id}
            kind="pl"
            refNo={o.p}
            xy={xyFor('pl', o.p, posOf(s, type, o.p))}
            dragging={dragXY?.kind === 'pl' && dragXY.ref === o.p}
          >
            <PlayerMark o={o} selected={selected === o.p} />
          </Tok>
        ))}
      </g>

      <Tok kind="ball" refNo={0} xy={xyFor('ball', 0, s.ball)} dragging={dragXY?.kind === 'ball'}>
        <circle r={13} fill="#fbf8ef" />
        <g clipPath="url(#bc)">
          <path d="M-14 -14L14 -14L14 -3C7 -9 -7 -9 -14 -3Z" fill="#2f6fc5" />
          <path d="M-14 14L14 14L14 3C7 -3 -7 -3 -14 3Z" fill="#f1c40f" />
          <path d="M-5 -13C-10 -4 -10 4 -5 13M5 -13C10 -4 10 4 5 13" fill="none" stroke="#9a927f" strokeWidth={1.2} />
        </g>
        <circle r={13} fill="none" stroke="#6b6558" strokeWidth={1.5} />
      </Tok>

      {live && (
        <path d={toPath(live)} stroke={penColor} fill="none" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function Tok(props: { kind: DragKind; refNo: number; xy: XY; dragging: boolean; children: React.ReactNode }) {
  return (
    <g
      className={'tok' + (props.dragging ? ' dragging' : '')}
      data-kind={props.kind}
      data-ref={props.refNo}
      style={{ transform: `translate(${props.xy[0]}px,${props.xy[1]}px)` }}
    >
      {props.children}
    </g>
  )
}

function PlayerMark({ o, selected }: { o: CourtPlayer; selected: boolean }) {
  const { pl } = o
  const name = pl.name || ROLES[pl.role]
  const w = textW(name) + 12
  return (
    <>
      {selected && <circle r={23} fill="none" stroke="var(--accent)" strokeWidth={3} />}
      <circle r={18} fill={`var(--r-${pl.role})`} stroke="#fff" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1.5px 2px rgb(0 0 0 / .35))' }} />
      <text
        fontSize={15}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="central"
        fill={pl.role === 'L' ? '#0f172a' : '#fff'}
        pointerEvents="none"
      >
        {pl.no || pl.role}
      </text>
      <circle cx={-15} cy={-14} r={8} fill="var(--badge)" stroke="#fff" strokeWidth={1.5} />
      <text x={-15} y={-14} fontSize={9.5} fontWeight={700} fill="#fff" textAnchor="middle" dominantBaseline="central" pointerEvents="none">
        {o.p}
      </text>
      <rect x={-w / 2} y={22} width={w} height={16} rx={5} fill="var(--tag-bg)" />
      <text y={30.5} fontSize={10.5} fill="var(--tag-ink)" textAnchor="middle" dominantBaseline="central" pointerEvents="none">
        {name}
      </text>
    </>
  )
}
