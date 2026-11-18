import { useState, type ReactNode } from 'react'
import {
  playerLabel,
  POSN,
  ROLE_ORDER,
  ROLES,
  rotStats,
  slotOf,
  type Rally,
  type Role,
} from '../lib/model'
import type { Board } from '../lib/useBoard'
import { Segmented } from './Controls'
import { RotationOverview } from './RotationOverview'
import { Icon } from './Icons'

export type PanelTab = 'overview' | 'lineup' | 'roster' | 'log' | 'tools'

export function SidePanel({
  board,
  tab,
  setTab,
  tools,
  tabs,
  logExtra,
}: {
  board: Board
  tab: PanelTab
  setTab: (t: PanelTab) => void
  tabs: PanelTab[]
  logExtra?: ReactNode
  /** 窄屏时多一个“站位”分页，放全场/半场、撤销移动、画笔颜色和备注 */
  tools?: React.ReactNode
}) {
  const LABEL: Record<PanelTab, string> = { tools: '站位', overview: '一览', lineup: '场上', roster: '名单', log: '记录' }
  const options: [PanelTab, string][] = tabs.map((k) => [k, LABEL[k]])
  if (tools) options.unshift(['tools', '站位'])
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Segmented<PanelTab> label="面板" value={tab} onChange={setTab} options={options} />
      <div key={tab} className="min-h-0 flex-1 animate-fade overflow-y-auto overscroll-contain pr-0.5">
        {tab === 'tools' && tools}
        {tab === 'overview' && <RotationOverview board={board} />}
        {tab === 'lineup' && <Lineup board={board} />}
        {tab === 'roster' && <Roster board={board} />}
        {tab === 'log' && <Log board={board} extra={logExtra} />}
      </div>
    </div>
  )
}

function Lineup({ board }: { board: Board }) {
  const { s, update } = board
  const free = s.roster.filter((pl) => !s.lineup.includes(pl.id))
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-mute">改的是轮转 {s.rot + 1} 的站位，其他轮转自动跟着转。自由人会在后排替换拦中。</p>
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
        {[1, 2, 3, 4, 5, 6].map((p) => {
          const idx = slotOf(s, p)
          return (
            <Row key={p} id={'lu' + p} label={`${p}号位 ${POSN[p]}`}>
              <select
                id={'lu' + p}
                className="field"
                value={s.lineup[idx]}
                onChange={(e) => {
                  const nid = e.target.value
                  update((d) => {
                    const old = d.lineup[idx]
                    const j = d.lineup.indexOf(nid)
                    if (j >= 0 && j !== idx) d.lineup[j] = old
                    else if (d.libero === nid) d.libero = old
                    d.lineup[idx] = nid
                  })
                }}
              >
                {s.roster.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {playerLabel(pl)}
                  </option>
                ))}
              </select>
            </Row>
          )
        })}
        <Row id="lu-lib" label="自由人">
          <select
            id="lu-lib"
            className="field"
            value={s.libero ?? ''}
            onChange={(e) => {
              const v = e.target.value || null
              update((d) => void (d.libero = v))
            }}
          >
            <option value="">不使用自由人</option>
            {free.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {playerLabel(pl)}
              </option>
            ))}
          </select>
        </Row>
      </div>
      <Legend />
    </div>
  )
}

function Row({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <>
      <label htmlFor={id} className="text-sm text-mute">
        {label}
      </label>
      {children}
    </>
  )
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-mute">
      {ROLE_ORDER.map((r) => (
        <span key={r} className="inline-flex items-center gap-1">
          <i className="block size-2.5 rounded-full" style={{ background: `var(--r-${r})` }} />
          {ROLES[r]}
        </span>
      ))}
    </div>
  )
}

function Roster({ board }: { board: Board }) {
  const { s, update } = board
  const [focusId, setFocusId] = useState<string | null>(null)

  const add = () => {
    const id = 'p' + s.nextId
    setFocusId(id)
    update((d) => {
      d.roster.push({ id, no: '', name: '新球员', role: 'OH' })
      d.nextId++
    })
  }
  const setP = (id: string, patch: Partial<{ no: string; name: string; role: Role }>) =>
    update((d) => {
      const pl = d.roster.find((x) => x.id === id)
      if (pl) Object.assign(pl, patch)
    })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[3rem_minmax(0,1fr)_5.5rem_2.5rem] gap-1.5 text-xs text-mute">
        <span>号码</span>
        <span>名字</span>
        <span>位置</span>
      </div>
      {s.roster.map((pl) => {
        const used = s.lineup.includes(pl.id) || s.libero === pl.id
        return (
          <div key={pl.id} className="grid grid-cols-[3rem_minmax(0,1fr)_5.5rem_2.5rem] gap-1.5">
            <input
              className="field text-center"
              value={pl.no}
              maxLength={3}
              inputMode="numeric"
              aria-label="号码"
              onChange={(e) => setP(pl.id, { no: e.target.value.trim() })}
            />
            <input
              className="field"
              value={pl.name}
              maxLength={8}
              aria-label="名字"
              autoFocus={focusId === pl.id}
              onFocus={(e) => {
                if (focusId === pl.id) {
                  e.target.select()
                  setFocusId(null)
                }
              }}
              onChange={(e) => setP(pl.id, { name: e.target.value })}
            />
            <select className="field px-1" value={pl.role} aria-label="位置" onChange={(e) => setP(pl.id, { role: e.target.value as Role })}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLES[r]}
                </option>
              ))}
            </select>
            <button
              className="btn px-0"
              disabled={used}
              aria-label={'删除 ' + (pl.name || '球员')}
              title={used ? '上场中的球员不能删除' : '删除'}
              onClick={() => update((d) => void (d.roster = d.roster.filter((x) => x.id !== pl.id)))}
            >
              <Icon name="trash" />
            </button>
          </div>
        )
      })}
      <button className="btn mt-1 w-full" onClick={add}>
        <Icon name="plus" />
        添加球员
      </button>

    </div>
  )
}

function Log({ board, extra }: { board: Board; extra?: ReactNode }) {
  const { s } = board
  const sets = s.sets ?? []
  // -1 = 正在打的这一局；其他 = 已打完的第几局；-2 = 整场合计
  const [pick, setPick] = useState(-1)
  const cur = pick === -1 || pick >= sets.length
  const log: Rally[] = pick === -2 ? [...sets.flatMap((x) => x.log), ...s.log] : cur ? s.log : sets[pick].log

  return (
    <div className="flex flex-col gap-3">
      {extra}
      {sets.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="选择局">
          {sets.map((st, i) => (
            <Chip key={i} on={pick === i} onClick={() => setPick(i)}>
              第{i + 1}局{' '}
              <b className={st.my > st.opp ? 'text-win' : 'text-lose'}>
                {st.my}:{st.opp}
              </b>
            </Chip>
          ))}
          <Chip on={cur && pick !== -2} onClick={() => setPick(-1)}>
            第{sets.length + 1}局 {s.my}:{s.opp}
          </Chip>
          <Chip on={pick === -2} onClick={() => setPick(-2)}>
            整场合计
          </Chip>
        </div>
      )}
      <SetDetail log={log} empty={cur ? '还没有记录。点上方“我方 +1 / 对方 +1”就会记下来。' : '这一局没有记录。'} />
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className="min-h-8 cursor-pointer rounded-full border border-line px-2.5 text-xs transition active:scale-95 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink aria-pressed:[&_b]:text-accent-ink"
    >
      {children}
    </button>
  )
}

/** 一局（或整场）的轮转得失分 + 每一分 */
export function SetDetail({ log, empty }: { log: Rally[]; empty: string }) {
  const stats = rotStats(log)
  const rows = log.map((r) => ({ ...r, after: r.won ? [r.my + 1, r.opp] : [r.my, r.opp + 1] })).reverse()
  const worst = stats.reduce((w, st, i) => (st.lost - st.won > stats[w].lost - stats[w].won ? i : w), 0)
  const worstDiff = stats[worst].lost - stats[worst].won

  return (
    <>
      <div>
        <p className="label mb-1.5">各轮转得失分</p>
        <div className="grid grid-cols-6 gap-1 text-center text-xs">
          {stats.map((st, i) => (
            <div
              key={i}
              className={'rounded-md border px-0.5 py-1 ' + (worstDiff > 0 && i === worst ? 'border-lose' : 'border-line')}
            >
              <div className="font-bold">{i + 1}</div>
              <div className="text-win tabular-nums">+{st.won}</div>
              <div className="text-lose tabular-nums">−{st.lost}</div>
            </div>
          ))}
        </div>
        {worstDiff > 0 && <p className="mt-1.5 text-xs text-lose">轮转 {worst + 1} 失分最多，可以重点看这个站位。</p>}
      </div>

      <div>
        <p className="label mb-1.5">每一分（最新在上）</p>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-mute">{empty}</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {rows.map((r, i) => (
              <li
                key={rows.length - i}
                className="grid grid-cols-[2rem_3.5rem_1fr_auto] items-center gap-2 rounded-md bg-bg px-2 py-1.5 text-sm"
              >
                <span className="text-xs text-mute tabular-nums">#{rows.length - i}</span>
                <span className="font-bold tabular-nums">
                  {r.after[0]}:{r.after[1]}
                </span>
                <span className={r.won ? 'text-win' : 'text-lose'}>{r.won ? '得分' : '失分'}</span>
                <span className="text-xs text-mute">
                  轮转{r.rot + 1} · {r.serving ? '我发' : '对发'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
