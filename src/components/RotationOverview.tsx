import { DEF_POS, formKey, isCustom, onCourt, type BoardState } from '../lib/model'
import type { Board } from '../lib/useBoard'

/** 六个轮转一览：每个轮转的接发球阵型画成小球场，点一个就切过去 */
export function RotationOverview({ board }: { board: Board }) {
  const { s } = board
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-mute">6 个轮转的接发球阵型。点一个切过去编辑；没摆的轮转显示默认站位。</p>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <MiniCourt
            key={k}
            s={s}
            rot={k}
            active={k === s.rot && board.type === 'recv'}
            onClick={() => {
              board.setRot(k)
              board.setType('recv')
            }}
          />
        ))}
      </div>
    </div>
  )
}

function MiniCourt({ s, rot, active, onClick }: { s: BoardState; rot: number; active: boolean; onClick: () => void }) {
  const key = formKey(rot, 'recv')
  const form = s.forms[key]
  const custom = isCustom(s, key)
  const players = onCourt({ ...s, rot })
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`轮转${rot + 1}，${custom ? '已摆' : '未摆'}${form?.note ? '，备注：' + form.note : ''}`}
      className="group flex cursor-pointer flex-col gap-1 rounded-lg border border-line bg-bg p-1 text-left transition hover:border-accent active:scale-[.97] aria-pressed:border-accent aria-pressed:ring-2 aria-pressed:ring-accent/40 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <svg viewBox="12 338 336 340" className="block w-full rounded-md bg-[var(--court-free)]" aria-hidden="true">
        <rect x="20" y="350" width="320" height="320" fill="var(--court-me)" stroke="var(--court-line)" strokeWidth="4" />
        <line x1="20" y1="457" x2="340" y2="457" stroke="var(--court-line)" strokeWidth="3" strokeDasharray="10 8" />
        <line x1="12" y1="348" x2="348" y2="348" stroke="var(--net)" strokeOpacity=".6" strokeWidth="8" />
        {form?.strokes?.map((st, i) => (
          <path key={i} d={st.d} stroke={st.c} fill="none" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {players.map((o) => {
          const [x, y] = form?.pos?.[o.p] ?? DEF_POS.recv[o.p]
          return (
            <g key={o.pl.id} transform={`translate(${x},${y})`}>
              <circle r={26} fill={`var(--r-${o.pl.role})`} stroke="#fff" strokeWidth={4} />
              <text
                fontSize={26}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
                fill={o.pl.role === 'L' ? '#0f172a' : '#fff'}
              >
                {o.pl.no || o.pl.role}
              </text>
            </g>
          )
        })}
      </svg>
      <span className="flex items-center justify-between gap-1 px-0.5 text-xs">
        <b>轮转 {rot + 1}</b>
        <span className={custom ? 'text-win' : 'text-mute'}>{custom ? '已摆' : '未摆'}</span>
      </span>
      {form?.note && <span className="line-clamp-2 px-0.5 text-[11px] leading-tight text-mute">{form.note}</span>}
    </button>
  )
}
