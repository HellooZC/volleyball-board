import { useEffect, useRef, useState } from 'react'
import type { Board, SaveStatus } from '../lib/useBoard'
import { CLOUD_LABEL, useCloud } from '../lib/cloud'
import { setScore } from '../lib/model'
import { Ball, Icon } from './Icons'

const STATUS: Record<SaveStatus, string> = { saved: '已自动保存', saving: '保存中…', failed: '保存失败' }

interface Props {
  board: Board
  onPoint: (won: boolean) => void
  onHelp: () => void
  /** bar：顶部横条；stack：手机横屏时放在左栏的竖排版本 */
  variant?: 'bar' | 'stack'
  /** 例：我的球队 vs A 校 */
  title: string
  /** 第二行文字；不给就显示“第 N 局 · 局分” */
  subtitle?: string
  onBack: () => void
}

export function ScoreBar({ board, onPoint, onHelp, variant = 'bar', title, subtitle, onBack }: Props) {
  const { s } = board
  const [confirm, setConfirm] = useState(false)
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])

  const newSet = () => {
    if (!confirm) {
      setConfirm(true)
      t.current = window.setTimeout(() => setConfirm(false), 3000)
      return
    }
    clearTimeout(t.current)
    setConfirm(false)
    board.newSet()
  }

  const winBtn = (cls: string) => (
    <button className={'btn btn-primary h-12 border-win bg-win text-base font-bold ' + cls} onClick={() => onPoint(true)} title="我方得分（快捷键 A）">
      我方 +1
    </button>
  )
  const loseBtn = (cls: string) => (
    <button className={'btn btn-primary h-12 border-lose bg-lose text-base font-bold ' + cls} onClick={() => onPoint(false)} title="对方得分（快捷键 L）">
      对方 +1
    </button>
  )
  const serveBtn = (cls: string) => (
    <button
      className={'btn shrink-0 gap-0 px-2 text-xs leading-tight whitespace-nowrap ' + cls}
      onClick={board.toggleServe}
      aria-label={'发球方：' + (s.serving ? '我方' : '对方') + '，点击切换'}
      title="发球方不对时点这里切换"
    >
      <span className="text-mute">发球</span>
      <span className="font-bold">{s.serving ? '我方' : '对方'}</span>
    </button>
  )
  const undoBtn = (cls = '') => (
    <button className={'btn ' + cls} onClick={board.undoPoint} disabled={!s.log.length} title="撤销上一分（快捷键 Z）">
      <Icon name="undo" />
      撤销
    </button>
  )
  const newSetBtn = (cls = '') => (
    <button className={'btn whitespace-nowrap ' + (confirm ? 'border-lose text-lose ' : '') + cls} onClick={newSet}>
      {confirm ? '再点确认' : '新一局'}
    </button>
  )
  const cloud = useCloud()
  const statusText = cloud.email ? CLOUD_LABEL[cloud.status] : STATUS[board.status]
  const bad = board.status === 'failed' || cloud.status === 'denied' || cloud.status === 'error'
  const [w, l] = setScore(s)
  const setNo = (s.sets?.length ?? 0) + 1
  const backBtn = (cls = '') => (
    <button className={'btn shrink-0 px-2 ' + cls} onClick={onBack} aria-label="回到主页">
      <Icon name="back" />
      {!cls.includes('size-') && <span className="hidden sm:inline">主页</span>}
    </button>
  )
  const info = (
    <div className="min-w-0 leading-tight">
      <p className="truncate text-sm font-bold">{title}</p>
      <p className="text-xs text-mute tabular-nums">
        {subtitle ?? `第 ${setNo} 局 · 局分 ${w}:${l}`}
      </p>
    </div>
  )
  const helpBtn = (cls = 'size-10') => (
    <button className={'btn shrink-0 rounded-full p-0 ' + cls} onClick={onHelp} aria-label="使用说明">
      ?
    </button>
  )

  if (variant === 'stack') {
    return (
      <section className="card flex flex-col gap-1.5 p-2" aria-label="比分">
        <div className="flex items-center gap-1.5">
          {backBtn('size-8 min-h-8 p-0')}
          {info}
          <span className="ml-auto">{helpBtn('size-7 min-h-7 text-xs')}</span>
        </div>
        <div className="flex items-center justify-around">
          <Side label="我方" n={s.my} serving={s.serving} />
          <span className="text-xl font-bold text-mute">:</span>
          <Side label="对方" n={s.opp} serving={!s.serving} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {winBtn('px-1')}
          {loseBtn('px-1')}
        </div>
        {serveBtn('min-h-9 gap-1')}
        <div className="grid grid-cols-2 gap-1.5">
          {undoBtn('px-1')}
          {newSetBtn('px-1')}
        </div>
      </section>
    )
  }

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-3 py-2 lg:flex-nowrap lg:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:mr-auto lg:max-w-64 lg:flex-none">
        {backBtn()}
        {info}
      </div>

      {/* 比分：左我方，右对方，中间是发球方。窄屏时排到第二行 */}
      <div className="order-last flex w-full min-w-0 items-center justify-center gap-1.5 sm:gap-2 lg:order-none lg:w-auto lg:gap-3">
        <Side label="我方" n={s.my} serving={s.serving} />
        {winBtn('min-w-0 flex-1 px-2 sm:min-w-28 sm:flex-none')}
        {serveBtn('h-12 flex-col')}
        {loseBtn('min-w-0 flex-1 px-2 sm:min-w-28 sm:flex-none')}
        <Side label="对方" n={s.opp} serving={!s.serving} />
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
        {undoBtn('max-sm:px-2')}
        {newSetBtn('max-sm:px-2')}
        <span
          role="status"
          className={'hidden max-w-28 text-right text-xs xl:inline ' + (bad ? 'text-lose' : 'text-mute')}
        >
          {statusText}
        </span>
        {helpBtn()}
      </div>
    </header>
  )
}

function Side({ label, n, serving }: { label: string; n: number; serving: boolean }) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center leading-none sm:w-14">
      <span className="flex h-4 items-center gap-1 text-xs text-mute">
        {label}
        {serving && <Ball className="size-3" />}
      </span>
      <span key={n} className="animate-rise text-4xl font-bold tabular-nums">
        {n}
      </span>
    </div>
  )
}
