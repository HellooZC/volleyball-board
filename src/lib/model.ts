export type Role = 'OH' | 'OP' | 'S' | 'MB' | 'L'
export type FormType = 'recv' | 'def'
export type XY = [number, number]

export interface Player {
  id: string
  no: string
  name: string
  role: Role
}

export interface Stroke {
  c: string
  d: string
}

/** 一个“轮转 + 站位类型”的阵形 */
export interface Form {
  pos?: Partial<Record<number, XY>>
  strokes?: Stroke[]
  note?: string
}

/** 一分的记录；保存得分前的状态，方便撤销 */
export interface Rally {
  won: boolean
  rot: number
  /** 得分前对方的轮转（旧记录没有） */
  oppRot?: number
  serving: boolean
  my: number
  opp: number
}

/** 打完的一局 */
export interface SetRecord {
  my: number
  opp: number
  log: Rally[]
}

export interface BoardState {
  v: 2
  roster: Player[]
  lineup: string[]
  libero: string | null
  rot: number
  serving: boolean
  my: number
  opp: number
  forms: Record<string, Form>
  /** 对方各场上位置（1–6 号位，依序存）的坐标；对方轮转时球员换到下一个位置 */
  oppPos: XY[]
  /** 对方的轮转 0–5（旧资料没有，当 0） */
  oppRot?: number
  ball: XY
  nextId: number
  log: Rally[]
  /** 已经打完的局（对局才有） */
  sets?: SetRecord[]
}

/** 一套队形模板：6 个轮转 × 接发球 / 防守 的站位、画线和备注 */
export interface Template {
  id: string
  name: string
  forms: Record<string, Form>
  updatedAt: number
}

/** 我方的一支队伍 */
export interface Team {
  id: string
  name: string
  roster: Player[]
  lineup: string[]
  libero: string | null
  nextId: number
  templates: Template[]
  updatedAt: number
}

/** 一场对局 = 战术板状态 + 对阵资料 */
export interface Match extends BoardState {
  id: string
  teamId: string | null
  teamName: string
  opponent: string
  date: string
  status: 'live' | 'done'
  templateName?: string
  createdAt: number
  updatedAt: number
}

export interface DB {
  v: 3
  teams: Team[]
  matches: Match[]
}

export const ROLES: Record<Role, string> = { OH: '大炮', OP: '举对', S: '举球', MB: '拦中', L: '自由人' }
export const ROLE_ORDER: Role[] = ['S', 'OH', 'OP', 'MB', 'L']
export const POSN: Record<number, string> = { 1: '右后', 2: '右前', 3: '中前', 4: '左前', 5: '左后', 6: '中后' }
export const TYPE_LABEL: Record<FormType, string> = { recv: '接发球', def: '防守' }

export const DEF_POS: Record<FormType, Record<number, XY>> = {
  recv: { 1: [285, 575], 2: [285, 425], 3: [180, 425], 4: [75, 425], 5: [75, 575], 6: [180, 595] },
  def: { 1: [285, 625], 2: [285, 395], 3: [180, 395], 4: [75, 395], 5: [75, 625], 6: [180, 640] },
}
/** 旧版对手默认位置（只用来辨认旧资料） */
const OPP0: XY[] = [[180, 60], [60, 140], [300, 140], [75, 300], [180, 310], [285, 300]]
/** 对方 1–6 号位的默认坐标：我方接发球站位隔着网镜射过去（对方的右边是我们看过去的左边） */
export const OPP_DEF: XY[] = [1, 2, 3, 4, 5, 6].map((p) => [360 - DEF_POS.recv[p][0], 700 - DEF_POS.recv[p][1]] as XY)
const isOldOpp = (pos: XY[] | undefined) => JSON.stringify(pos) === JSON.stringify(OPP0)
/** 对方第 i 个球员（照开场顺序）现在在几号位 */
export const oppPosNo = (i: number, oppRot = 0) => ((((i - oppRot) % 6) + 6) % 6) + 1
export const PEN_COLORS: [string, string][] = [
  ['#ffffff', '白'],
  ['#e5484d', '红'],
  ['#f5c518', '黄'],
  ['#3b82f6', '蓝'],
  ['#1b1b1b', '黑'],
]

export function fresh(): BoardState {
  const R: [number, string, Role][] = [
    [1, '球员1', 'S'], [2, '球员2', 'OH'], [3, '球员3', 'MB'], [4, '球员4', 'OP'], [5, '球员5', 'OH'], [6, '球员6', 'MB'],
    [7, '球员7', 'L'], [8, '球员8', 'OH'], [9, '球员9', 'S'], [10, '球员10', 'MB'], [11, '球员11', 'OP'], [12, '球员12', 'OH'],
  ]
  return {
    v: 2,
    roster: R.map(([no, name, role], i) => ({ id: 'p' + (i + 1), no: String(no), name, role })),
    lineup: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    libero: 'p7',
    rot: 0,
    serving: false,
    my: 0,
    opp: 0,
    forms: {},
    oppPos: OPP_DEF.map((a) => [...a] as XY),
    oppRot: 0,
    ball: [180, 505],
    nextId: 13,
    log: [],
  }
}

/** 接受新版和原版（v1）的数据 */
export function adopt(o: unknown): BoardState | null {
  if (!o || typeof o !== 'object') return null
  const s = o as Partial<BoardState>
  if (!Array.isArray(s.roster) || !Array.isArray(s.lineup) || s.lineup.length !== 6) return null
  if (!s.lineup.every((id) => s.roster!.some((p) => p.id === id))) return null
  const base = fresh()
  const out = { ...base, ...s, v: 2, forms: s.forms ?? {}, log: Array.isArray(s.log) ? s.log : [] } as BoardState
  if (isOldOpp(out.oppPos)) out.oppPos = base.oppPos
  return out
}

export const formKey = (rot: number, type: FormType) => `${rot}-${type}`
export const slotOf = (s: BoardState, p: number) => (p - 1 + s.rot) % 6
export const byId = (s: BoardState, id: string | null) => s.roster.find((p) => p.id === id)
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
export const playerLabel = (pl: Player) => (pl.no ? pl.no + ' ' : '') + (pl.name || '未命名') + ' · ' + ROLES[pl.role]

export interface CourtPlayer {
  /** 场上位置 1–6 */
  p: number
  pl: Player
  /** 是否是自由人替换上来的 */
  lib: boolean
  slot: number
}

export function onCourt(s: BoardState): CourtPlayer[] {
  const out: CourtPlayer[] = []
  for (let p = 1; p <= 6; p++) {
    const slot = slotOf(s, p)
    let pl = byId(s, s.lineup[slot])
    if (!pl) continue
    let lib = false
    if (s.libero && !s.lineup.includes(s.libero) && pl.role === 'MB' && (p === 1 || p === 5 || p === 6)) {
      const l = byId(s, s.libero)
      if (l) {
        pl = l
        lib = true
      }
    }
    out.push({ p, pl, lib, slot })
  }
  return out
}

export function posOf(s: BoardState, type: FormType, p: number): XY {
  return s.forms[formKey(s.rot, type)]?.pos?.[p] ?? DEF_POS[type][p]
}

export function isCustom(s: BoardState, key: string) {
  const pos = s.forms[key]?.pos
  return !!pos && Object.keys(pos).length > 0
}

/** 按轮转统计得失分 */
export function rotStats(log: Rally[]) {
  const out = Array.from({ length: 6 }, () => ({ won: 0, lost: 0 }))
  for (const r of log) out[r.rot][r.won ? 'won' : 'lost']++
  return out
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 局分：赢了几局、输了几局（只算打完的局） */
export function setScore(m: Pick<BoardState, 'sets'>) {
  let w = 0
  let l = 0
  for (const st of m.sets ?? []) {
    if (st.my > st.opp) w++
    else if (st.opp > st.my) l++
  }
  return [w, l] as const
}

export function newTeam(name: string): Team {
  const base = fresh()
  return {
    id: uid(),
    name,
    roster: base.roster,
    lineup: base.lineup,
    libero: base.libero,
    nextId: base.nextId,
    templates: [{ id: uid(), name: '默认队形', forms: {}, updatedAt: Date.now() }],
    updatedAt: Date.now(),
  }
}

export function newMatch(team: Team | null, opponent: string, tpl: Template | null): Match {
  const base = fresh()
  const now = Date.now()
  return {
    ...base,
    ...(team && {
      roster: structuredClone(team.roster),
      lineup: [...team.lineup],
      libero: team.libero,
      nextId: team.nextId,
    }),
    forms: tpl ? structuredClone(tpl.forms) : {},
    sets: [],
    id: uid(),
    teamId: team?.id ?? null,
    teamName: team?.name ?? '我方',
    opponent: opponent.trim() || '对手',
    date: today(),
    status: 'live',
    templateName: tpl?.name,
    createdAt: now,
    updatedAt: now,
  }
}

/** 旧版（只有一份战术板）的数据转成：一支队伍 + 一套模板 + （有比分时）一场对局 */
export function migrateBoard(s: BoardState): DB {
  const team = newTeam('我的球队')
  team.roster = structuredClone(s.roster)
  team.lineup = [...s.lineup]
  team.libero = s.libero
  team.nextId = s.nextId
  team.templates[0].forms = structuredClone(s.forms)
  const matches: Match[] = []
  if (s.my || s.opp || s.log.length) {
    const m = newMatch(team, '对手', team.templates[0])
    Object.assign(m, { rot: s.rot, serving: s.serving, my: s.my, opp: s.opp, log: s.log, oppPos: s.oppPos, ball: s.ball })
    m.teamName = team.name
    matches.push(m)
  }
  return { v: 3, teams: [team], matches }
}

export function adoptDB(o: unknown): DB | null {
  if (!o || typeof o !== 'object') return null
  const d = o as Partial<DB>
  if (d.v === 3 && Array.isArray(d.teams) && Array.isArray(d.matches)) {
    for (const m of d.matches) if (isOldOpp(m.oppPos)) m.oppPos = OPP_DEF.map((a) => [...a] as XY)
    return d as DB
  }
  // 也接受旧版单一战术板（含原版数据库存的 {json: "..."}）
  const raw = typeof (o as { json?: unknown }).json === 'string' ? JSON.parse((o as { json: string }).json) : o
  const s = adopt(raw)
  return s ? migrateBoard(s) : null
}

/** 这套队形摆过几个站位（6 轮转 × 接发球 / 防守 = 12） */
export function tplCount(forms: Record<string, Form>) {
  let n = 0
  for (let r = 0; r < 6; r++) for (const t of ['recv', 'def']) if (Object.keys(forms[`${r}-${t}`]?.pos ?? {}).length) n++
  return n
}

