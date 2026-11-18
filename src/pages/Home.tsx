import { useRef, useState } from 'react'
import { Segmented } from '../components/Controls'
import { CloudButton } from '../components/Cloud'
import { ConfirmButton } from '../components/ConfirmButton'
import { Ball, Icon } from '../components/Icons'
import { Field, Modal } from '../components/Modal'
import { Toast } from '../components/Toast'
import { useToast } from '../lib/useToast'
import { adoptDB, formCount, newMatch, newTeam, setScore, today, type DB, type Match, type Team } from '../lib/model'
import { go } from '../lib/router'
import { useCloud } from '../lib/cloud'
import { getDB, store, useDB } from '../lib/store'

type HomeTab = 'matches' | 'teams'

export function Home() {
  const db = useDB()
  const [tab, setTab] = useState<HomeTab>('matches')
  const [newOpen, setNewOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [toast, flash] = useToast()

  const matches = [...db.matches].sort((a, b) => b.updatedAt - a.updatedAt)

  const matchList = (
    <Panel
      title="对局记录"
      count={matches.length}
      action={
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <Icon name="plus" />
          新对局
        </button>
      }
    >
      {matches.length === 0 ? (
        <Empty text="还没有对局。开一场新对局，选好队伍就会自动带入它的队形。">
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <Icon name="plus" />
            开始第一场
          </button>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((m, i) => (
            <MatchItem key={m.id} m={m} i={i} />
          ))}
        </ul>
      )}
    </Panel>
  )

  const teamList = (
    <Panel
      title="队伍与队形"
      count={db.teams.length}
      action={
        <button className="btn" onClick={() => setTeamOpen(true)}>
          <Icon name="plus" />
          新队伍
        </button>
      }
    >
      <p className="-mt-1 mb-2 text-xs text-mute">每支队有 6 个轮转的接发球阵型；对局直接用队伍的阵型，改一次每场都用最新的。</p>
      <ul className="flex flex-col gap-2">
        {db.teams.map((t, i) => (
          <TeamItem key={t.id} t={t} i={i} canDelete={db.teams.length > 1} />
        ))}
      </ul>
    </Panel>
  )

  return (
    <div className="flex h-dvh flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-2.5">
        <Ball className="size-7" />
        <h1 className="mr-auto text-lg font-bold">战术板</h1>
        <CloudButton />
        <button className="btn" onClick={() => setBackupOpen(true)}>
          <Icon name="download" />
          <span className="max-sm:hidden">备份 / 还原</span>
          <span className="sr-only sm:hidden">备份</span>
        </button>
      </header>

      {/* 宽屏：对局和队伍并排；窄屏：用分页切换 */}
      <div className="hidden min-h-0 flex-1 gap-3 p-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {matchList}
        {teamList}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:hidden">
        <Segmented<HomeTab>
          label="主页分页"
          value={tab}
          onChange={setTab}
          options={[
            ['matches', `对局记录（${matches.length}）`],
            ['teams', `队伍与队形（${db.teams.length}）`],
          ]}
        />
        {tab === 'matches' ? matchList : teamList}
      </div>

      <NewMatchDialog open={newOpen} onClose={() => setNewOpen(false)} teams={db.teams} />
      <NewTeamDialog open={teamOpen} onClose={() => setTeamOpen(false)} />
      <BackupDialog open={backupOpen} onClose={() => setBackupOpen(false)} flash={flash} />
      <Toast toast={toast} />
    </div>
  )
}

function Panel({ title, count, action, children }: { title: string; count: number; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card flex min-h-0 flex-1 animate-rise flex-col" aria-label={title}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <h2 className="mr-auto text-base font-bold">
          {title} <span className="text-sm font-normal text-mute">{count}</span>
        </h2>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
    </section>
  )
}

function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-10 text-center">
      <p className="text-sm text-mute">{text}</p>
      {children}
    </div>
  )
}

function MatchItem({ m, i }: { m: Match; i: number }) {
  const [w, l] = setScore(m)
  const live = m.status === 'live'
  const hasCur = live && (m.my || m.opp || m.log.length)
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
      <div
        role="link"
        tabIndex={0}
        onClick={() => go.match(m.id)}
        onKeyDown={(e) => e.key === 'Enter' && go.match(m.id)}
        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-bg p-3 transition hover:border-accent active:scale-[.99] focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-panel py-1.5 leading-none">
          <span className="text-2xl font-bold tabular-nums">
            {w}:{l}
          </span>
          <span className="mt-1 text-[10px] text-mute">局分</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold group-hover:text-accent">
              {m.teamName} <span className="font-normal text-mute">vs</span> {m.opponent}
            </p>
            <span
              className={
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ' +
                (live ? 'bg-win text-white' : 'bg-line text-mute')
              }
            >
              {live ? '进行中' : '已结束'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-mute tabular-nums">
            {m.date}
            {(m.sets ?? []).map((st, k) => (
              <span key={k}>
                {' · '}
                <span className={st.my > st.opp ? 'text-win' : 'text-lose'}>
                  {st.my}:{st.opp}
                </span>
              </span>
            ))}
            {hasCur ? ` · 本局 ${m.my}:${m.opp}` : ''}
          </p>
        </div>
        <ConfirmButton
          className="btn size-10 shrink-0 p-0"
          icon={<Icon name="trash" />}
          ariaLabel={`删除对局 ${m.teamName} vs ${m.opponent}`}
          confirm="删除？"
          onConfirm={() => store.deleteMatch(m.id)}
        />
      </div>
    </li>
  )
}

function TeamItem({ t, i, canDelete }: { t: Team; i: number; canDelete: boolean }) {
  const n = formCount(t.forms)
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-bg p-3">
        <Icon name="team" className="size-5 shrink-0 text-mute" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{t.name}</p>
          <p className="text-xs text-mute">
            {t.roster.length} 名球员 · 接发球阵型 <span className={n === 6 ? 'text-win' : ''}>已摆 {n}/6</span>
          </p>
          {/* 6 个轮转的进度点 */}
          <span className="mt-1 flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <i
                key={k}
                className={'block h-1.5 w-4 rounded-full ' + (Object.keys(t.forms[`${k}-recv`]?.pos ?? {}).length ? 'bg-win' : 'bg-line')}
              />
            ))}
          </span>
        </div>
        <button className="btn" onClick={() => go.team(t.id)}>
          <Icon name="edit" />
          编辑阵型
        </button>
        {canDelete && (
          <ConfirmButton
            className="btn size-10 shrink-0 p-0"
            icon={<Icon name="trash" />}
            ariaLabel={`删除队伍 ${t.name}`}
            confirm="删除？"
            onConfirm={() => store.deleteTeam(t.id)}
          />
        )}
      </div>
    </li>
  )
}

function NewMatchDialog({ open, onClose, teams }: { open: boolean; onClose: () => void; teams: Team[] }) {
  const [teamId, setTeamId] = useState('')
  const team = teams.find((t) => t.id === teamId) ?? teams[0] ?? null
  const n = team ? formCount(team.forms) : 0

  return (
    <Modal open={open} onClose={onClose} title="新对局">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          const m = newMatch(team, String(f.get('opp') ?? ''))
          m.date = String(f.get('date') || today())
          store.addMatch(m)
          onClose()
          go.match(m.id)
        }}
      >
        <Field
          label="我方队伍"
          hint={
            team
              ? `会带入名单和首发；接发球阵型直接用这支队的（已摆 ${n}/6${n < 6 ? '，没摆的轮转用默认站位' : ''}）。`
              : undefined
          }
        >
          <select className="field" value={team?.id ?? ''} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_10rem] gap-3">
          <Field label="对手">
            <input name="opp" className="field" placeholder="例如：A 校" maxLength={20} autoFocus />
          </Field>
          <Field label="日期">
            <input name="date" type="date" className="field" defaultValue={today()} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" disabled={!team}>
            开始对局
          </button>
        </div>
      </form>
    </Modal>
  )
}

function NewTeamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="新队伍" width="w-[min(420px,calc(100vw-32px))]">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
          if (!name) return
          const t = newTeam(name)
          store.addTeam(t)
          onClose()
          go.team(t.id)
        }}
      >
        <Field label="队名" hint="建好后会进入阵型编辑：改名单，摆 6 个轮转的接发球阵型。">
          <input name="name" className="field" placeholder="例如：男排校队" maxLength={20} autoFocus required />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary">建立</button>
        </div>
      </form>
    </Modal>
  )
}

function BackupDialog({ open, onClose, flash }: { open: boolean; onClose: () => void; flash: (t: string) => void }) {
  const db = useDB()
  const cloud = useCloud()
  const fileRef = useRef<HTMLInputElement>(null)
  const size = new Blob([JSON.stringify(db)]).size
  const done = db.matches.filter((m) => m.status === 'done')

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getDB(), null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `战术板备份-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  /** 合并导入：同一笔（同 id）用文件里的覆盖，其他的加进来 */
  const importJson = async (f: File) => {
    try {
      const inc: DB | null = adoptDB(JSON.parse(await f.text()))
      if (!inc) throw new Error()
      const cur = getDB()
      const merge = <T extends { id: string }>(a: T[], b: T[]) => [...a.filter((x) => !b.some((y) => y.id === x.id)), ...b]
      store.replace({ v: 3, teams: merge(cur.teams, inc.teams), matches: merge(cur.matches, inc.matches) })
      flash(`已导入 ${inc.matches.length} 场对局、${inc.teams.length} 支队伍`)
      onClose()
    } catch {
      flash('文件格式不对，没有导入')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="备份 / 还原">
      <p className="text-sm text-mute">
        {cloud.email
          ? '资料已同步到云端。导出备份可以当作额外保险；导入后也会同步到云端（同一笔会被覆盖，其他保留）。'
          : '资料只存在这台设备的浏览器里。换设备或清浏览器前，先导出备份文件；在另一台设备“导入”就能带过去（同一笔会被覆盖，其他保留）。'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-primary" onClick={exportJson}>
          <Icon name="download" />
          导出备份
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" />
          导入备份
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importJson(f)
          e.target.value = ''
        }}
      />
      <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-bg p-3 text-sm">
        <div>
          <p>
            已用空间 <b className="tabular-nums">{(size / 1024).toFixed(0)} KB</b>
            <span className="text-mute"> / 约 5 MB</span>
          </p>
          <p className="text-xs text-mute">已结束的对局：{done.length} 场</p>
        </div>
        <ConfirmButton
          className="btn"
          label="清除已结束对局"
          confirm={`再点删除 ${done.length} 场`}
          onConfirm={() => {
            store.replace({ ...getDB(), matches: getDB().matches.filter((m) => m.status !== 'done') })
            flash(`已删除 ${done.length} 场已结束的对局`)
          }}
        />
      </div>
    </Modal>
  )
}
