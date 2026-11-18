import { useCallback, useState } from 'react'
import { BoardScreen } from '../components/BoardScreen'
import { ConfirmButton } from '../components/ConfirmButton'
import { ImportDialog, SaveTemplateDialog } from '../components/FormationDialog'
import { Icon } from '../components/Icons'
import { ScoreBar } from '../components/ScoreBar'
import { Toast } from '../components/Toast'
import { useToast } from '../lib/useToast'
import { setScore, type BoardState, type Match } from '../lib/model'
import { go } from '../lib/router'
import { store, useDB } from '../lib/store'
import { useBoard } from '../lib/useBoard'
import { NotFound } from './NotFound'

export function MatchPage({ id }: { id: string }) {
  const m = useDB().matches.find((x) => x.id === id)
  if (!m) return <NotFound text="找不到这场对局，可能已经删除了。" />
  return <MatchBoard key={id} m={m} />
}

function MatchBoard({ m }: { m: Match }) {
  const update = useCallback(
    (fn: (d: BoardState) => void) => store.updateMatch(m.id, fn as (d: Match) => void),
    [m.id],
  )
  const board = useBoard(m, update, 'match')
  const [importOpen, setImportOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [toast, flash] = useToast()
  const [w, l] = setScore(m)
  const done = m.status === 'done'

  const endMatch = () => {
    board.newSet()
    store.updateMatch(m.id, (d) => void (d.status = 'done'))
    flash('比赛已结束，记录已保存')
  }

  const formTools = (
    <div className="grid grid-cols-2 gap-1.5">
      <button className="btn px-1.5 whitespace-nowrap" onClick={() => setImportOpen(true)} title="从队伍的队形模板套用">
        <Icon name="import" />
        导入队形
      </button>
      <button className="btn px-1.5 whitespace-nowrap" onClick={() => setSaveOpen(true)} title="把现在的队形存回队伍">
        <Icon name="save" />
        存为模板
      </button>
    </div>
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
        tabs={['lineup', 'roster', 'log']}
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
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        preferTeamId={m.teamId}
        onImport={(tpl) => {
          board.replaceForms(tpl.forms)
          store.updateMatch(m.id, (d) => void (d.templateName = tpl.name))
          flash(`已导入「${tpl.name}」`)
        }}
      />
      <SaveTemplateDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        preferTeamId={m.teamId}
        forms={m.forms}
        onSaved={flash}
      />
      <Toast toast={toast} />
    </>
  )
}
