import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardScreen, type HeaderVariant } from '../components/BoardScreen'
import { Icon } from '../components/Icons'
import { Field, Modal } from '../components/Modal'
import { formCount, fresh, type BoardState, type Team, type XY } from '../lib/model'
import { go } from '../lib/router'
import { getDB, store, useDB } from '../lib/store'
import { useBoard } from '../lib/useBoard'
import { NotFound } from './NotFound'

export function TeamPage({ id }: { id: string }) {
  const team = useDB().teams.find((t) => t.id === id)
  if (!team) return <NotFound text="找不到这支队伍，可能已经删除了。" />
  return <TeamBoard key={team.id} team={team} />
}

/** 队伍页：把队伍拼成战术板状态；对手和球的位置只在画面上，不存 */
function derive(team: Team, rot: number, extra: { oppPos: XY[]; ball: XY }): BoardState {
  return {
    ...fresh(),
    roster: team.roster,
    lineup: team.lineup,
    libero: team.libero,
    nextId: team.nextId,
    forms: team.forms,
    rot,
    oppPos: extra.oppPos,
    ball: extra.ball,
  }
}

function TeamBoard({ team }: { team: Team }) {
  const [rot, setRot] = useState(0)
  const [extra, setExtra] = useState(() => {
    const f = fresh()
    return { oppPos: f.oppPos, ball: f.ball }
  })
  const live = useRef({ rot, extra })
  useEffect(() => {
    live.current = { rot, extra }
  }, [rot, extra])

  const s = useMemo(() => derive(team, rot, extra), [team, rot, extra])

  const update = useCallback(
    (fn: (d: BoardState) => void) => {
      const cur = live.current
      const t0 = getDB().teams.find((t) => t.id === team.id)
      if (!t0) return
      // 先在副本上改，看改了什么：只换轮转或挪对手 / 球，就不用写进队伍
      const d = derive(structuredClone(t0), cur.rot, structuredClone(cur.extra))
      const pick = (x: BoardState) => JSON.stringify([x.roster, x.lineup, x.libero, x.nextId, x.forms])
      const before = pick(d)
      fn(d)
      if (d.rot !== cur.rot) {
        live.current = { ...live.current, rot: d.rot }
        setRot(d.rot)
      }
      if (JSON.stringify([d.oppPos, d.ball]) !== JSON.stringify([cur.extra.oppPos, cur.extra.ball]))
        setExtra({ oppPos: d.oppPos, ball: d.ball })
      if (pick(d) === before) return
      store.updateTeam(team.id, (t) => {
        t.roster = d.roster
        t.lineup = d.lineup
        t.libero = d.libero
        t.nextId = d.nextId
        t.forms = d.forms
      })
    },
    [team.id],
  )
  const board = useBoard(s, update, 'template')

  return (
    <BoardScreen
      board={board}
      tabs={['overview', 'lineup', 'roster']}
      renderHeader={(variant, ctx) => <TeamBar variant={variant} team={team} onHelp={ctx.help} />}
    />
  )
}

function TeamBar({ variant, team, onHelp }: { variant: HeaderVariant; team: Team; onHelp: () => void }) {
  const [rename, setRename] = useState(false)
  const nr = formCount(team.forms, 'recv')
  const nd = formCount(team.forms, 'def')
  const na = formCount(team.forms, 'atk')

  const title = (
    <button
      className="min-w-0 cursor-pointer rounded-md text-left leading-tight hover:underline focus-visible:outline-2 focus-visible:outline-accent"
      onClick={() => setRename(true)}
      title="队名改名"
    >
      <p className="truncate text-sm font-bold">{team.name}</p>
      <p className="truncate text-xs text-mute">
        接发球 {nr}/6 · 我方发球 {nd}/6 · 防守 {na}/36{variant === 'bar' ? ' · 拖完自动保存' : ''}
      </p>
    </button>
  )
  const back = (cls = '') => (
    <button className={'btn shrink-0 px-2 ' + cls} onClick={go.home} aria-label="回到主页">
      <Icon name="back" />
      {!cls.includes('size-') && <span className="hidden sm:inline">主页</span>}
    </button>
  )
  const help = (cls = 'size-10') => (
    <button className={'btn shrink-0 rounded-full p-0 ' + cls} onClick={onHelp} aria-label="使用说明">
      ?
    </button>
  )
  const dialog = (
    <RenameDialog
      open={rename}
      title="队名"
      value={team.name}
      onClose={() => setRename(false)}
      onSave={(v) => store.updateTeam(team.id, (t) => void (t.name = v))}
    />
  )
  const tip = <p className="text-xs leading-snug text-mute">每个轮转摆接发球、我方发球，和防守（点对方球员选进攻号位）阵型；对局会照发球方自动切换。</p>

  if (variant === 'stack') {
    return (
      <section className="card flex flex-col gap-1.5 p-2" aria-label="队伍">
        <div className="flex items-center gap-1.5">
          {back('size-8 min-h-8 p-0')}
          {title}
          <span className="ml-auto">{help('size-7 min-h-7 text-xs')}</span>
        </div>
        {tip}
        {dialog}
      </section>
    )
  }
  return (
    <header className="flex items-center gap-3 border-b border-line bg-panel px-3 py-2 lg:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {back()}
        {title}
      </div>
      <div className="hidden max-w-md lg:block">{tip}</div>
      <button className="btn shrink-0 px-2" onClick={() => setRename(true)}>
        <Icon name="edit" />
        <span className="max-sm:hidden">改队名</span>
      </button>
      {help()}
      {dialog}
    </header>
  )
}

function RenameDialog({
  open,
  title,
  value,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  value: string
  onClose: () => void
  onSave: (v: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={'修改' + title} width="w-[min(400px,calc(100vw-32px))]">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const v = String(new FormData(e.currentTarget).get('v') ?? '').trim()
          if (v) onSave(v)
          onClose()
        }}
      >
        <Field label={title}>
          <input name="v" className="field" defaultValue={value} maxLength={20} autoFocus required />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary">保存</button>
        </div>
      </form>
    </Modal>
  )
}
