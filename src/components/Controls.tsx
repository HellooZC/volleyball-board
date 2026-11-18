import { formKey, isCustom, PEN_COLORS, rotStats, TYPE_LABEL, type FormType } from '../lib/model'
import type { Board } from '../lib/useBoard'
import type { CourtView } from './Court'
import { Icon } from './Icons'

/** 轮转选择：数字 + 一个点（这个轮转的接发球阵型摆好了没有）+ 本局在这个轮转的得失分 */
export function RotationPicker({ board, cols = 3 }: { board: Board; cols?: 3 | 6 }) {
  const { s } = board
  const stats = rotStats(s.log)
  return (
    <div role="group" aria-label="选择轮转" className={'grid gap-1.5 ' + (cols === 3 ? 'grid-cols-3' : 'grid-cols-6')}>
      {Array.from({ length: 6 }, (_, k) => {
        const r = isCustom(s, formKey(k, 'recv'))
        const st = stats[k]
        const active = k === s.rot
        return (
          <button
            key={k}
            className="btn h-auto min-h-14 flex-col gap-0.5 px-1 py-1.5"
            aria-pressed={active}
            onClick={() => board.setRot(k)}
            aria-label={`轮转${k + 1}，接发球阵型${r ? '已摆' : '未摆'}${board.mode === 'match' ? `，本局得${st.won}失${st.lost}` : ''}`}
            title={`轮转 ${k + 1}（快捷键 ${k + 1}）`}
          >
            <b className="text-xl leading-none">{k + 1}</b>
            <span className="flex gap-1" aria-hidden="true" title={r ? '接发球阵型已摆' : '接发球阵型未摆'}>
              <Dot on={r} />
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

function Dot({ on }: { on: boolean }) {
  return <i className={'block size-1.5 rounded-full border border-current ' + (on ? 'bg-current' : 'opacity-50')} />
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-line bg-bg p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          aria-pressed={v === value}
          onClick={() => onChange(v)}
          className="min-h-9 cursor-pointer rounded-md px-2 text-sm font-medium transition duration-150 select-none hover:bg-btn active:scale-95 aria-pressed:bg-accent aria-pressed:text-accent-ink focus-visible:outline-2 focus-visible:outline-accent"
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
      label="站位类型"
      value={board.type}
      onChange={board.setType}
      options={[
        ['recv', TYPE_LABEL.recv],
        ['def', TYPE_LABEL.def],
      ]}
    />
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
