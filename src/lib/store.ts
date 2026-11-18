import { useSyncExternalStore } from 'react'
import { adopt, adoptDB, migrateBoard, newTeam, type DB, type Match, type Team } from './model'

/**
 * 存储层。资料一律先存在这台设备（localStorage），打开就能用、离线也能用；
 * 登录 Firebase 后，cloud.ts 会订阅这里的改动推到云端，并把别人改的套回来。
 */
export interface StorageAdapter {
  load(): DB | null
  save(db: DB): Promise<void>
}

const KEY = 'volleyball-db-v3'
const OLD_KEYS = ['volleyball-board-v2', 'volleyball-board-v1']

export const localAdapter: StorageAdapter = {
  load() {
    try {
      const j = localStorage.getItem(KEY)
      if (j) return adoptDB(JSON.parse(j))
      for (const k of OLD_KEYS) {
        const old = localStorage.getItem(k)
        const s = old ? adopt(JSON.parse(old)) : null
        if (s) return migrateBoard(s)
      }
    } catch {
      /* 读不到就用新的 */
    }
    return null
  },
  async save(db) {
    localStorage.setItem(KEY, JSON.stringify(db))
  },
}

const adapter: StorageAdapter = localAdapter

export type SaveStatus = 'saved' | 'saving' | 'failed'

let db: DB = adapter.load() ?? { v: 3, teams: [newTeam('我的球队')], matches: [] }
let status: SaveStatus = 'saved'
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}

let timer: ReturnType<typeof setTimeout> | undefined
function schedule() {
  status = 'saving'
  clearTimeout(timer)
  timer = setTimeout(async () => {
    try {
      await adapter.save(db)
      status = 'saved'
    } catch {
      status = 'failed'
    }
    emit()
  }, 400)
}
// 关页面前把还没写进去的改动存掉
addEventListener('pagehide', () => {
  if (status === 'saving') {
    clearTimeout(timer)
    void adapter.save(db).catch(() => {})
  }
})

/** 本机改动的订阅者（云端同步用）；云端套回来的改动不通知，避免又推回去 */
const commitListeners = new Set<(db: DB) => void>()
export const onLocalCommit = (l: (db: DB) => void) => {
  commitListeners.add(l)
  return () => void commitListeners.delete(l)
}

function commit(next: DB, fromRemote = false) {
  db = next
  schedule()
  emit()
  if (!fromRemote) commitListeners.forEach((l) => l(db))
}

export const useDB = () => useSyncExternalStore(subscribe, () => db)
export const useSaveStatus = () => useSyncExternalStore(subscribe, () => status)
export const getDB = () => db

/** 只复制要改的那一项，其他保持原样（数据多时也快） */
function patch<T extends { id: string; updatedAt: number }>(list: T[], id: string, fn: (d: T) => void): T[] {
  return list.map((x) => {
    if (x.id !== id) return x
    const d = structuredClone(x)
    fn(d)
    d.updatedAt = Date.now()
    return d
  })
}

export const store = {
  updateMatch(id: string, fn: (m: Match) => void) {
    commit({ ...db, matches: patch(db.matches, id, fn) })
  },
  updateTeam(id: string, fn: (t: Team) => void) {
    commit({ ...db, teams: patch(db.teams, id, fn) })
  },
  addMatch(m: Match) {
    commit({ ...db, matches: [m, ...db.matches] })
  },
  addTeam(t: Team) {
    commit({ ...db, teams: [...db.teams, t] })
  },
  deleteMatch(id: string) {
    commit({ ...db, matches: db.matches.filter((m) => m.id !== id) })
  },
  /** 删队伍前，把它的阵型留一份在它的对局里（对局平常直接用队伍的阵型） */
  deleteTeam(id: string) {
    const team = db.teams.find((t) => t.id === id)
    const matches = db.matches.map((m) =>
      m.teamId === id && team ? { ...m, forms: structuredClone(team.forms), updatedAt: Date.now() } : m,
    )
    commit({ ...db, teams: db.teams.filter((t) => t.id !== id), matches })
  },
  replace(next: DB) {
    commit(next)
  },
  /** 云端来的资料：整份换掉（不会再推回云端） */
  applyRemote(next: DB) {
    commit(next, true)
  },
}
