import { useCallback, useMemo } from 'react'
import { BoardScreen } from '../components/BoardScreen'
import { ConfirmButton } from '../components/ConfirmButton'
import { ScoreBar } from '../components/ScoreBar'
import { Toast } from '../components/Toast'
import { useToast } from '../lib/useToast'
import { setScore, type BoardState, type Match, type Team } from '../lib/model'
import { go } from '../lib/router'
import { getDB, store, useDB } from '../lib/store'
import { useBoard } from '../lib/useBoard'
import { NotFound } from './NotFound'

export function MatchPage({ id }: { id: string }) {
  const db = useDB()
  const m = db.matches.find((x) => x.id === id)
  if (!m) return <NotFound text="找不到这场对局，可能已经删除了。" />
  return <MatchBoard key={id} m={m} team={db.teams.find((t) => t.id === m.teamId)} />
}

/** 对局画面：比分、换人等记在对局里；阵型（接发球 / 我方发球）直接读写队伍的（队伍被删掉时才用对局自己的备份） */
function MatchBoard({ m, team }: { m: Match; team: Team | undefined }) {
  const s = useMemo<BoardState>(() => (team ? { ...m, forms: team.forms } : m), [m, team])
  const update = useCallback(
    (fn: (d: BoardState) => void) => {
      const cur = getDB()
      const m0 = cur.matches.find((x) => x.id === m.id)
      if (!m0) return
      const t0 = cur.teams.find((t) => t.id === m0.teamId)
      const d = structuredClone(t0 ? { ...m0, forms: t0.forms } : m0)
      const { forms: f0, ...rest0 } = d
      const before = [JSON.stringify(f0), JSON.stringify(rest0)]
      fn(d)
      const { forms, ...rest } = d
      // 只写有变的那一边，避免没改的资料也被标成“刚更新”
      if (t0 && JSON.stringify(forms) !== before[0]) store.updateTeam(t0.id, (t) => void (t.forms = forms))
      if (JSON.stringify(rest) !== before[1] || (!t0 && JSON.stringify(forms) !== before[0]))
        store.updateMatch(m.id, (x) => {
          Object.assign(x, rest)
          if (!t0) x.forms = forms
        })
    },
    [m.id],
  )
  const board = useBoard(s, update, 'match')
  const [toast, flash] = useToast()
  const [w, l] = setScore(m)
  const done = m.status === 'done'

  const endMatch = () => {
    board.newSet()
    store.updateMatch(m.id, (d) => void (d.status = 'done'))
    flash('比赛已结束，记录已保存')
  }

  const formTools = team ? (
    <p className="text-xs leading-snug text-mute">
      阵型存在「{team.name}」，在这里拖动也会改到队伍，下一场一样用。
      <button className="ml-1 cursor-pointer text-accent underline-offset-2 hover:underline" onClick={() => go.team(team.id)}>
        到队伍页
      </button>
    </p>
  ) : (
    <p className="text-xs text-mute">这场对局的队伍已删除，阵型只存在这场。</p>
  )

  const logExtra = (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-bg p-2">
      <div className="text-sm leading-tight">
        <p className="font-bold">
          局分 {w}:{l}
        </p>
        <p className="text-xs text-mute">{done ? '比赛已结束' : `第 ${(m.sets?.length ?? 0) + 1} 局进行中`}</p>
      </div>
      {done ? (
        <button className="btn" onClick={() => store.updateMatch(m.id, (d) => void (d.status = 'live'))}>
          继续比赛
        </button>
      ) : (
        <ConfirmButton label="结束比赛" confirm="再点确认结束" onConfirm={endMatch} />
      )}
    </div>
  )

  return (
    <>
      <BoardScreen
        board={board}
        tabs={['lineup', 'roster', 'log', 'overview']}
        formTools={formTools}
        logExtra={logExtra}
        renderHeader={(variant, ctx) => (
          <ScoreBar
            board={board}
            variant={variant}
            onPoint={ctx.point}
            onHelp={ctx.help}
            onBack={go.home}
            title={`${m.teamName} vs ${m.opponent}`}
            subtitle={done ? `已结束 · 局分 ${w}:${l}` : undefined}
          />
        )}
      />
      <Toast toast={toast} />
    </>
  )
}
