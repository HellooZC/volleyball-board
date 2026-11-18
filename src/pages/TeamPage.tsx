import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardScreen, type HeaderVariant } from '../components/BoardScreen'
import { ConfirmButton } from '../components/ConfirmButton'
import { Icon } from '../components/Icons'
import { Field, Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { useToast } from '../lib/useToast'
import { fresh, tplCount, uid, type BoardState, type Team, type Template, type XY } from '../lib/model'
import { go } from '../lib/router'
import { store, useDB } from '../lib/store'
import { useBoard } from '../lib/useBoard'
import { NotFound } from './NotFound'

export function TeamPage({ id, tplId }: { id: string; tplId?: string }) {
  const team = useDB().teams.find((t) => t.id === id)
  if (!team) return <NotFound text="找不到这支队伍，可能已经删除了。" />
  const tpl = team.templates.find((t) => t.id === tplId) ?? team.templates[0]
  if (!tpl) return <EnsureTemplate teamId={team.id} />
  return <TemplateBoard key={team.id + ':' + tpl.id} team={team} tpl={tpl} />
}

/** 队伍至少要有一套模板 */
function EnsureTemplate({ teamId }: { teamId: string }) {
  useEffect(() => {
    store.updateTeam(teamId, (t) => {
      if (!t.templates.length) t.templates.push({ id: uid(), name: '默认队形', forms: {}, updatedAt: Date.now() })
    })
  }, [teamId])
  return null
}

/** 模板编辑时，把“队伍 + 模板”拼成战术板状态；对手和球的位置只在画面上，不存 */
function derive(team: Team, tpl: Template | undefined, rot: number, extra: { oppPos: XY[]; ball: XY }): BoardState {
  return {
    ...fresh(),
    roster: team.roster,
    lineup: team.lineup,
    libero: team.libero,
    nextId: team.nextId,
    forms: tpl?.forms ?? {},
    rot,
    oppPos: extra.oppPos,
    ball: extra.ball,
  }
}

function TemplateBoard({ team, tpl }: { team: Team; tpl: Template }) {
  const [rot, setRot] = useState(0)
  const [extra, setExtra] = useState(() => {
    const f = fresh()
    return { oppPos: f.oppPos, ball: f.ball }
  })
  const live = useRef({ rot, extra })
  useEffect(() => {
    live.current = { rot, extra }
  }, [rot, extra])
  const [toast, flash] = useToast()

  const s = useMemo(() => derive(team, tpl, rot, extra), [team, tpl, rot, extra])

  const update = useCallback(
    (fn: (d: BoardState) => void) => {
      const cur = live.current
      // 先在副本上改，看改了什么：只换轮转或挪对手 / 球，就不用写进队伍
      const team0 = structuredClone(team)
      const tp0 = team0.templates.find((x) => x.id === tpl.id)
      const d = derive(team0, tp0, cur.rot, structuredClone(cur.extra))
      const before = JSON.stringify([d.roster, d.lineup, d.libero, d.nextId, d.forms])
      fn(d)
      if (d.rot !== cur.rot) setRot(d.rot)
      if (JSON.stringify([d.oppPos, d.ball]) !== JSON.stringify([cur.extra.oppPos, cur.extra.ball]))
        setExtra({ oppPos: d.oppPos, ball: d.ball })
      if (JSON.stringify([d.roster, d.lineup, d.libero, d.nextId, d.forms]) === before) return
      store.updateTeam(team.id, (t) => {
        t.roster = d.roster
        t.lineup = d.lineup
        t.libero = d.libero
        t.nextId = d.nextId
        const tp = t.templates.find((x) => x.id === tpl.id)
        if (tp) {
          tp.forms = d.forms
          tp.updatedAt = Date.now()
        }
      })
    },
    [team, tpl.id],
  )
  const board = useBoard(s, update, 'template')

  return (
    <>
      <BoardScreen
        board={board}
        tabs={['lineup', 'roster']}
        renderHeader={(variant, ctx) => <TeamBar variant={variant} team={team} tpl={tpl} onHelp={ctx.help} flash={flash} />}
      />
      <Toast toast={toast} />
    </>
  )
}

function TeamBar({
  variant,
  team,
  tpl,
  onHelp,
  flash,
}: {
  variant: HeaderVariant
  team: Team
  tpl: Template
  onHelp: () => void
  flash: (t: string) => void
}) {
  const [rename, setRename] = useState<null | 'team' | 'tpl'>(null)

  const addTpl = (copy: boolean) => {
    const n: Template = {
      id: uid(),
      name: copy ? `${tpl.name} 副本` : `队形 ${team.templates.length + 1}`,
      forms: copy ? structuredClone(tpl.forms) : {},
      updatedAt: Date.now(),
    }
    store.updateTeam(team.id, (t) => void t.templates.push(n))
    go.team(team.id, n.id)
    flash(copy ? `已复制成「${n.name}」` : `已新建「${n.name}」`)
  }
  const delTpl = () => {
    const rest = team.templates.filter((x) => x.id !== tpl.id)
    store.updateTeam(team.id, (t) => void (t.templates = t.templates.filter((x) => x.id !== tpl.id)))
    go.team(team.id, rest[0]?.id)
    flash(`已删除「${tpl.name}」`)
  }

  const picker = (
    <select
      className={'field min-w-0 font-bold' + (variant === 'stack' ? ' text-sm' : '')}
      aria-label="选择队形模板"
      value={tpl.id}
      onChange={(e) => go.team(team.id, e.target.value)}
    >
      {team.templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}（已摆 {tplCount(t.forms)}/12）
        </option>
      ))}
    </select>
  )
  const actions = (
    <>
      <button className="btn px-2" onClick={() => addTpl(false)} title="新建空白模板" aria-label="新建模板">
        <Icon name="plus" />
        <span className="max-xl:hidden">新建</span>
      </button>
      <button className="btn px-2" onClick={() => addTpl(true)} title="复制这套模板" aria-label="复制模板">
        <Icon name="copy" />
        <span className="max-xl:hidden">复制</span>
      </button>
      <button className="btn px-2" onClick={() => setRename('tpl')} title="模板改名" aria-label="模板改名">
        <Icon name="edit" />
        <span className="max-xl:hidden">改名</span>
      </button>
      {team.templates.length > 1 && (
        <ConfirmButton
          className="btn px-2"
          icon={<Icon name="trash" />}
          ariaLabel="删除模板"
          confirm="再点删除"
          onConfirm={delTpl}
        />
      )}
    </>
  )
  const title = (
    <button
      className="min-w-0 cursor-pointer rounded-md text-left leading-tight hover:underline focus-visible:outline-2 focus-visible:outline-accent"
      onClick={() => setRename('team')}
      title="队名改名"
    >
      <p className="truncate text-sm font-bold">{team.name}</p>
      <p className="truncate text-xs text-mute">{variant === 'stack' ? '队形模板' : '队形模板 · 拖完自动保存'}</p>
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
      open={rename !== null}
      title={rename === 'team' ? '队名' : '模板名称'}
      value={rename === 'team' ? team.name : tpl.name}
      onClose={() => setRename(null)}
      onSave={(v) =>
        store.updateTeam(team.id, (t) => {
          if (rename === 'team') t.name = v
          else {
            const x = t.templates.find((y) => y.id === tpl.id)
            if (x) x.name = v
          }
        })
      }
    />
  )

  if (variant === 'stack') {
    return (
      <section className="card flex flex-col gap-1.5 p-2" aria-label="队伍和模板">
        <div className="flex items-center gap-1.5">
          {back('size-8 min-h-8 p-0')}
          {title}
          <span className="ml-auto">{help('size-7 min-h-7 text-xs')}</span>
        </div>
        {picker}
        <div className="grid grid-cols-4 gap-1">{actions}</div>
        {dialog}
      </section>
    )
  }
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-3 py-2 lg:flex-nowrap lg:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-64 lg:flex-none">
        {back()}
        {title}
      </div>
      <div className="order-last flex w-full min-w-0 items-center gap-1.5 lg:order-none lg:w-auto lg:flex-1 lg:justify-center">
        <span className="label shrink-0 max-sm:hidden">模板</span>
        <div className="min-w-0 flex-1 lg:max-w-72">{picker}</div>
        {actions}
      </div>
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
