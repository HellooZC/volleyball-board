import { useMemo, useState } from 'react'
import { DEF_POS, formKey, type BoardState, type Form, type FormType, type Stroke, type XY } from './model'
import { useSaveStatus } from './store'

export type { SaveStatus } from './store'
export type BoardUpdate = (fn: (d: BoardState) => void) => void

/**
 * 战术板的操作。状态本身由外面提供（对局或队伍阵型），这里只负责“怎么改”。
 * @param mode match：有计分；template：只摆队伍的阵型
 *
 * 站位类型：recv（对方发球、我方接发球）和 def（我方发球）都存进队伍阵型，
 * 每个轮转各一个；对局会照发球方自动切换。
 */
export function useBoard(base: BoardState, update: BoardUpdate, mode: 'match' | 'template' = 'match') {
  const [typeState, setType] = useState<FormType>(() => (base.serving ? 'def' : 'recv'))
  // 发球方一变（本机计分、手动切换，或别的设备同步过来）就自动切换画面：对方发球 → 接发球阵型
  const [lastServing, setLastServing] = useState(base.serving)
  if (base.serving !== lastServing) {
    setLastServing(base.serving)
    setType(base.serving ? 'def' : 'recv')
  }
  const type: FormType = typeState
  const status = useSaveStatus()
  /** 每个阵形的移动历史（只在本次打开期间保留），用来“撤销移动” */
  const [moveHist, setMoveHist] = useState<Record<string, (Form['pos'] | undefined)[]>>({})
  const pushHist = (k: string, pos: Form['pos']) =>
    setMoveHist((h) => ({ ...h, [k]: [...(h[k] ?? []), structuredClone(pos)] }))

  /** 防守阵型：对方从几号位进攻（1–6） */
  const [atk, setAtk] = useState(4)
  const key = formKey(base.rot, type, atk)
  const s = base

  const actions = useMemo(() => {
    const form = (d: BoardState, k: string): Form => (d.forms[k] ??= {})
    const formUpdate = update
    return {
      setRot: (rot: number) => update((d) => void (d.rot = rot)),
      setType,
      setAtk,
      /** 点对方球员：切到“防守 · 对方从这个号位进攻” */
      pickAttacker: (p: number) => {
        setAtk(p)
        setType('atk')
      },

      /** 我方得分 / 对方得分；对方发球时我方得分要轮转 */
      point: (won: boolean) => {
        // 接发球的一方得分 = 抢回发球权，要轮转一位（双方同样规则）
        const rotated = won && !s.serving
        const oppRotated = !won && s.serving
        update((d) => {
          d.log.push({ won, rot: d.rot, oppRot: d.oppRot ?? 0, serving: d.serving, my: d.my, opp: d.opp })
          if (won) {
            d.my++
            if (!d.serving) {
              d.serving = true
              d.rot = (d.rot + 1) % 6
            }
          } else {
            d.opp++
            if (d.serving) {
              d.serving = false
              d.oppRot = ((d.oppRot ?? 0) + 1) % 6
            }
          }
        })
        setType(won ? 'def' : 'recv')
        return { rotated, oppRotated, rot: rotated ? (s.rot + 1) % 6 : s.rot, oppRot: oppRotated ? ((s.oppRot ?? 0) + 1) % 6 : (s.oppRot ?? 0) }
      },
      /** 手动调整对方轮转（开局时对齐对方实际站位） */
      setOppRot: (r: number) => update((d) => void (d.oppRot = ((r % 6) + 6) % 6)),
      undoPoint: () => {
        const last = s.log[s.log.length - 1]
        if (!last) return
        update((d) => {
          d.log.pop()
          d.rot = last.rot
          if (last.oppRot !== undefined) d.oppRot = last.oppRot
          d.serving = last.serving
          d.my = last.my
          d.opp = last.opp
        })
        setType(last.serving ? 'def' : 'recv')
      },
      toggleServe: () => {
        update((d) => void (d.serving = !d.serving))
        setType(s.serving ? 'recv' : 'def')
      },
      /** 这一局存进局分记录，比分归零 */
      newSet: () => {
        update((d) => {
          if (d.my || d.opp || d.log.length) (d.sets ??= []).push({ my: d.my, opp: d.opp, log: d.log })
          d.rot = 0
          d.oppRot = 0
          d.my = 0
          d.opp = 0
          d.serving = false
          d.log = []
        })
        setType('recv')
      },

      /** 拖完自动保存：第一次改动时把 6 个位置都写进去 */
      movePlayer: (p: number, xy: XY) => {
        pushHist(key, s.forms[key]?.pos)
        formUpdate((d) => {
          const f = form(d, key)
          const pos = (f.pos ??= {})
          for (let i = 1; i <= 6; i++) pos[i] ??= [...DEF_POS[type][i]] as XY
          pos[p] = xy
        })
      },
      undoMove: () => {
        const h = moveHist[key]
        if (!h?.length) return
        const prev = h[h.length - 1]
        setMoveHist((m) => ({ ...m, [key]: h.slice(0, -1) }))
        formUpdate((d) => {
          const f = form(d, key)
          if (prev) f.pos = prev
          else delete f.pos
        })
      },
      resetPos: () => {
        if (!s.forms[key]?.pos) return
        pushHist(key, s.forms[key]?.pos)
        formUpdate((d) => void delete form(d, key).pos)
      },
      moveOpp: (i: number, xy: XY) => update((d) => void (d.oppPos[i] = xy)),
      moveBall: (xy: XY) => update((d) => void (d.ball = xy)),

      addStroke: (st: Stroke) => formUpdate((d) => void (form(d, key).strokes ??= []).push(st)),
      undoStroke: () => formUpdate((d) => void form(d, key).strokes?.pop()),
      clearStrokes: () => formUpdate((d) => void (form(d, key).strokes = [])),
      /** 备注跟着轮转（存在接发球阵型里），我方发球时看到的也是同一则 */
      setNote: (note: string) => update((d) => void (form(d, formKey(d.rot, 'recv')).note = note)),
    }
  }, [update, key, type, s, moveHist])

  return {
    s,
    mode,
    type,
    key,
    atk,
    status,
    canUndoMove: !!moveHist[key]?.length,
    update,
    ...actions,
  }
}

export type Board = ReturnType<typeof useBoard>
