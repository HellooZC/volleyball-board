import { useMemo, useState } from 'react'
import { DEF_POS, formKey, type BoardState, type Form, type FormType, type Stroke, type XY } from './model'
import { useSaveStatus } from './store'

export type { SaveStatus } from './store'
export type BoardUpdate = (fn: (d: BoardState) => void) => void

/**
 * 战术板的操作。状态本身由外面提供（对局或队形模板），这里只负责“怎么改”。
 * @param mode match：有计分；template：只摆队形
 */
export function useBoard(s: BoardState, update: BoardUpdate, mode: 'match' | 'template' = 'match') {
  const [type, setType] = useState<FormType>(() => (s.serving ? 'def' : 'recv'))
  const status = useSaveStatus()
  /** 每个阵形的移动历史（只在本次打开期间保留），用来“撤销移动” */
  const [moveHist, setMoveHist] = useState<Record<string, (Form['pos'] | undefined)[]>>({})
  const pushHist = (k: string, pos: Form['pos']) =>
    setMoveHist((h) => ({ ...h, [k]: [...(h[k] ?? []), structuredClone(pos)] }))

  const key = formKey(s.rot, type)

  const actions = useMemo(() => {
    const form = (d: BoardState, k: string): Form => (d.forms[k] ??= {})
    return {
      setRot: (rot: number) => update((d) => void (d.rot = rot)),
      setType,

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
        update((d) => {
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
        update((d) => {
          const f = form(d, key)
          if (prev) f.pos = prev
          else delete f.pos
        })
      },
      resetPos: () => {
        if (!s.forms[key]?.pos) return
        pushHist(key, s.forms[key]?.pos)
        update((d) => void delete form(d, key).pos)
      },
      moveOpp: (i: number, xy: XY) => update((d) => void (d.oppPos[i] = xy)),
      moveBall: (xy: XY) => update((d) => void (d.ball = xy)),

      addStroke: (st: Stroke) => update((d) => void (form(d, key).strokes ??= []).push(st)),
      undoStroke: () => update((d) => void form(d, key).strokes?.pop()),
      clearStrokes: () => update((d) => void (form(d, key).strokes = [])),
      setNote: (note: string) => update((d) => void (form(d, key).note = note)),

      /** 整套队形换掉（导入模板时用） */
      replaceForms: (forms: Record<string, Form>) => {
        setMoveHist({})
        update((d) => void (d.forms = structuredClone(forms)))
      },
    }
  }, [update, key, type, s, moveHist])

  return {
    s,
    mode,
    type,
    key,
    status,
    canUndoMove: !!moveHist[key]?.length,
    update,
    ...actions,
  }
}

export type Board = ReturnType<typeof useBoard>
