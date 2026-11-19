import { ATK_GRID, atkCountOf, formKey, isCustom, PEN_COLORS, rotStats, TYPE_LABEL, type FormType } from '../lib/model'
import type { Board } from '../lib/useBoard'
import type { CourtView } from './Court'
import { Icon } from './Icons'

/** 轮转选择：数字 + 三个点（接发球 / 我方发球 / 防守阵型摆了没有）+ 本局在这个轮转的得失分 */
export function RotationPicker({ board, cols = 3 }: { board: Board; cols?: 3 | 6 }) {
  const { s } = board
  const stats = rotStats(s.log)
  return (
    <div role="group" aria-label="选择轮转" className={'grid gap-1.5 ' + (cols === 3 ? 'grid-cols-3' : 'grid-cols-6')}>
      {Array.from({ length: 6 }, (_, k) => {
        const r = isCustom(s, formKey(k, 'recv'))
        const d = isCustom(s, formKey(k, 'def'))
        const a = atkCountOf(s.forms, k)
        const st = stats[k]
        const active = k === s.rot
        return (
          <button
            key={k}
            className="btn h-auto min-h-14 flex-col gap-0.5 px-1 py-1.5"
            aria-pressed={active}
            onClick={() => board.setRot(k)}
            aria-label={`轮转${k + 1}，接发球${r ? '已摆' : '未摆'}，我方发球${d ? '已摆' : '未摆'}，防守已摆${a}/6${board.mode === 'match' ? `，本局得${st.won}失${st.lost}` : ''}`}
            title={`轮转 ${k + 1}（快捷键 ${k + 1}）`}
          >
            <b className="text-xl leading-none">{k + 1}</b>
            <span
              className="flex gap-1"
              aria-hidden="true"
              title={`接发球${r ? '已摆' : '未摆'} · 我方发球${d ? '已摆' : '未摆'} · 防守 ${a}/6`}
            >
              <Dot on={r} />
              <Dot on={d} />
              <Dot on={a === 6} half={a > 0 && a < 6} />
            </span>
            {st.won + st.lost > 0 && (
              <span className={'text-[10px] leading-none tabular-nums ' + (active ? '' : 'text-mute')} aria-hidden="true">
                +{st.won} −{st.lost}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** 实心＝摆好；半满＝防守摆了一部分 */
function Dot({ on, half = false }: { on: boolean; half?: boolean }) {
  return (
    <i
      className={
        'block size-1.5 rounded-full border border-current ' +
        (on ? 'bg-current' : half ? 'bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]' : 'opacity-50')
      }
    />
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  compact = false,
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  label: string
  /** 选项多、空间窄时用小一号的字 */
  compact?: boolean
}) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-line bg-bg p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          aria-pressed={v === value}
          onClick={() => onChange(v)}
          className={
            (compact ? 'px-1 text-xs ' : 'px-2 text-sm ') +
            'min-h-9 cursor-pointer rounded-md font-medium whitespace-nowrap transition duration-150 select-none hover:bg-btn active:scale-95 aria-pressed:bg-accent aria-pressed:text-accent-ink focus-visible:outline-2 focus-visible:outline-accent'
          }
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function TypeToggle({ board }: { board: Board }) {
  return (
    <Segmented<FormType>
      compact
      label="站位类型"
      value={board.type}
      onChange={board.setType}
      options={[
        ['recv', TYPE_LABEL.recv],
        ['def', TYPE_LABEL.def],
        ['atk', TYPE_LABEL.atk],
      ]}
    />
  )
}

/** 防守阵型：选对方从几号位进攻（照我们看过去的位置排；也可以直接点球场上的对方球员） */
export function AttackerPicker({ board, hint = true }: { board: Board; hint?: boolean }) {
  if (board.type !== 'atk') return null
  return (
    <div className="flex animate-rise flex-col gap-1">
      <span className="label">对方从几号位进攻</span>
      <div role="group" aria-label="对方进攻号位" className="grid grid-cols-3 gap-1">
        {ATK_GRID.map((p) => {
          const done = isCustom(board.s, formKey(board.s.rot, 'atk', p))
          return (
            <button
              key={p}
              aria-pressed={board.atk === p}
              onClick={() => board.setAtk(p)}
              className="btn min-h-8 gap-1 px-1 text-xs aria-pressed:border-lose aria-pressed:bg-lose aria-pressed:text-white"
              title={done ? '这个号位的防守阵型已摆' : '还没摆，显示默认站位'}
            >
              {p}号位
              <i aria-hidden="true" className={'block size-1.5 rounded-full ' + (done ? 'bg-current' : 'border border-current opacity-50')} />
            </button>
          )
        })}
      </div>
      {hint && <span className="text-[11px] text-mute">也可以直接点球场上的对方球员。</span>}
    </div>
  )
}

export function ViewToggle({ view, onChange }: { view: CourtView; onChange: (v: CourtView) => void }) {
  return (
    <Segmented<CourtView>
      label="球场视图"
      value={view}
      onChange={onChange}
      options={[
        ['full', '全场'],
        ['half', '我方半场'],
      ]}
    />
  )
}

export function PosTools({ board }: { board: Board }) {
  const custom = isCustom(board.s, board.key)
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button className="btn px-1.5 whitespace-nowrap" onClick={board.undoMove} disabled={!board.canUndoMove} title="撤销上一次拖动">
        <Icon name="undo" />
        撤销移动
      </button>
      <button className="btn px-1.5 whitespace-nowrap" onClick={board.resetPos} disabled={!custom} title="把这个轮转的站位恢复成默认">
        <Icon name="reset" />
        恢复默认
      </button>
    </div>
  )
}

export function PenTools({
  board,
  pen,
  setPen,
  color,
  setColor,
}: {
  board: Board
  pen: boolean
  setPen: (v: boolean) => void
  color: string
  setColor: (c: string) => void
}) {
  const count = board.s.forms[board.key]?.strokes?.length ?? 0
  return (
    <div className="flex flex-col gap-1.5">
      <button className="btn w-full" aria-pressed={pen} onClick={() => setPen(!pen)} title="快捷键 P">
        <Icon name="pen" />
        {pen ? '画笔中（点此结束）' : '画笔'}
      </button>
      {pen && (
        <div className="flex animate-rise flex-col gap-1.5">
          <div role="group" aria-label="画笔颜色" className="flex justify-between gap-1">
            {PEN_COLORS.map(([c, n]) => (
              <button
                key={c}
                aria-label={n + '色'}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className="size-8 cursor-pointer rounded-full border-2 border-line transition active:scale-90 aria-pressed:border-ink aria-pressed:ring-2 aria-pressed:ring-panel aria-pressed:ring-inset focus-visible:outline-2 focus-visible:outline-accent"
              />
            ))}
          </div>
        </div>
      )}
      {(pen || count > 0) && (
        <div className="grid grid-cols-2 gap-1.5">
          <button className="btn" onClick={board.undoStroke} disabled={!count}>
            撤销笔画
          </button>
          <button className="btn" onClick={board.clearStrokes} disabled={!count}>
            清除笔画
          </button>
        </div>
      )}
    </div>
  )
}

export function NoteBox({ board }: { board: Board }) {
  const note = board.s.forms[formKey(board.s.rot, 'recv')]?.note ?? ''
  return (
    <label className="flex min-h-0 flex-1 flex-col gap-1">
      <span className="label">备注 · 轮转{board.s.rot + 1}</span>
      <textarea
        className="field min-h-16 flex-1 resize-none py-1.5 leading-snug"
        value={note}
        maxLength={200}
        placeholder="例如：3号注意吊球，自由人偏左"
        onChange={(e) => board.setNote(e.target.value)}
      />
    </label>
  )
}
