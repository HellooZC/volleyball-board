import { useSyncExternalStore } from 'react'
import { formCount, normalizeTeam, type DB, type Match, type Team } from './model'
import { getDB, onLocalCommit, store } from './store'

/**
 * Firebase 云端同步。
 *
 * - 没设定 VITE_FIREBASE_* 环境变量时完全不载入 Firebase，app 只存本机。
 * - 登录后：teams / matches 两个集合，每支队、每场对局各是一份文件（{ json, updatedAt, by }）。
 * - 谁的 updatedAt 比较新就用谁的；离线时改动先排队，连上网自动送出。
 */

const env = import.meta.env
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}
export const cloudEnabled = Object.values(config).every(Boolean)

export type CloudStatus = 'off' | 'loading' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'denied' | 'error'
interface CloudState {
  status: CloudStatus
  email: string | null
  message?: string
}

export const CLOUD_LABEL: Record<CloudStatus, string> = {
  off: '只存本机',
  loading: '连接中…',
  'signed-out': '未登录',
  syncing: '同步中…',
  synced: '已同步',
  offline: '离线，连网后自动同步',
  denied: '没有权限',
  error: '同步出错',
}

let state: CloudState = { status: cloudEnabled ? 'loading' : 'off', email: null }
const listeners = new Set<() => void>()
const set = (p: Partial<CloudState>) => {
  state = { ...state, ...p }
  listeners.forEach((l) => l())
}
export const useCloud = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    () => state,
  )

type Kind = 'teams' | 'matches'
type Item = Team | Match
const KINDS: Kind[] = ['teams', 'matches']

async function loadFirebase() {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  const app = initializeApp(config)
  const a = auth.initializeAuth(app, { persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence] })
  // 本机快取：离线也能读写，改动排队等连网
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
  })
  return { auth, fs, a, db }
}
let fb: Awaited<ReturnType<typeof loadFirebase>> | null = null

/** 云端现在（我们认为）有的版本：id → updatedAt */
const synced: Record<Kind, Map<string, number>> = { teams: new Map(), matches: new Map() }
const ready: Record<Kind, boolean> = { teams: false, matches: false }
let unsubs: (() => void)[] = []
let pushTimer: ReturnType<typeof setTimeout> | undefined
let pending = 0

const errCode = (e: unknown) => (e as { code?: string })?.code ?? ''
const fail = (e: unknown) => {
  const code = errCode(e)
  if (code === 'permission-denied')
    set({ status: 'denied', message: '这个账号没有权限读写资料。请管理员把你的邮箱加进 Firestore 规则的名单。' })
  else set({ status: 'error', message: String((e as Error)?.message ?? e) })
}

function parse(kind: Kind, data: unknown): Item | null {
  try {
    const o = JSON.parse((data as { json: string }).json)
    if (!o || typeof o.id !== 'string') return null
    return kind === 'teams' ? normalizeTeam(o) : o
  } catch {
    return null
  }
}

/** 新设备第一次登录：本机只有自动建的空白队伍时，直接用云端的，不要把空队伍传上去 */
function pristine(d: DB) {
  return (
    d.matches.length === 0 &&
    d.teams.length <= 1 &&
    d.teams.every((t) => t.name === '我的球队' && formCount(t.forms ?? {}) === 0)
  )
}

function startSync(email: string) {
  if (!fb) return
  const { fs, db } = fb
  for (const k of KINDS) {
    synced[k].clear()
    ready[k] = false
  }
  set({ status: navigator.onLine ? 'syncing' : 'offline', email, message: undefined })

  unsubs = KINDS.map((kind) =>
    fs.onSnapshot(
      fs.collection(db, kind),
      // 连快取→伺服器的状态变化也要通知，才知道什么时候真的同步好了
      { includeMetadataChanges: true },
      (snap) => {
        const local = getDB()
        let list = [...(local[kind] as Item[])]
        let changed = false

        if (!ready[kind]) {
          // 第一次合并一定要等伺服器的资料；只看本机快取（新设备是空的）会误以为云端没东西
          if (snap.metadata.fromCache) return
          changed = true
          // 第一次：云端和本机合并，比较新的留下；本机比较新或云端没有的，等一下推上去
          ready[kind] = true
          const remote = new Map<string, Item>()
          for (const d of snap.docs) {
            const it = parse(kind, d.data())
            if (it) remote.set(d.id, it)
          }
          if (kind === 'teams' && remote.size && pristine(local)) list = []
          const merged = list.map((l) => {
            const r = remote.get(l.id)
            return r && r.updatedAt > l.updatedAt ? r : l
          })
          for (const [id, r] of remote) if (!list.some((l) => l.id === id)) merged.push(r)
          for (const [id, r] of remote) synced[kind].set(id, r.updatedAt)
          list = merged
        } else {
          for (const ch of snap.docChanges()) {
            changed = true
            const id = ch.doc.id
            if (ch.type === 'removed') {
              synced[kind].delete(id)
              list = list.filter((x) => x.id !== id)
              continue
            }
            const r = parse(kind, ch.doc.data())
            if (!r) continue
            synced[kind].set(id, r.updatedAt)
            const i = list.findIndex((x) => x.id === id)
            if (i < 0) list.push(r)
            else if (r.updatedAt > list[i].updatedAt) list[i] = r
          }
        }

        if (changed) {
          const next = { ...getDB(), [kind]: list } as DB
          // 至少保留一支队（云端还没有队伍时）
          if (!(kind === 'teams' && next.teams.length === 0)) store.applyRemote(next)
        }
        if (ready.teams && ready.matches) schedulePush(0)
        if (!pending && state.status === 'syncing' && !snap.metadata.fromCache) set({ status: 'synced' })
      },
      fail,
    ),
  )
}

function stopSync() {
  unsubs.forEach((u) => u())
  unsubs = []
  clearTimeout(pushTimer)
  for (const k of KINDS) ready[k] = false
}

function schedulePush(delay = 800) {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(push, delay)
}

/** 把本机跟云端不一样的（新增、改过、删掉的）送上去 */
function push() {
  if (!fb || !state.email || !ready.teams || !ready.matches || state.status === 'denied') return
  const { fs, db } = fb
  const cur = getDB()
  const ops: Promise<void>[] = []
  for (const kind of KINDS) {
    const ids = new Set<string>()
    for (const it of cur[kind] as Item[]) {
      ids.add(it.id)
      if (synced[kind].get(it.id) === it.updatedAt) continue
      synced[kind].set(it.id, it.updatedAt)
      ops.push(fs.setDoc(fs.doc(db, kind, it.id), { json: JSON.stringify(it), updatedAt: it.updatedAt, by: state.email }))
    }
    for (const id of [...synced[kind].keys()]) {
      if (ids.has(id)) continue
      synced[kind].delete(id)
      ops.push(fs.deleteDoc(fs.doc(db, kind, id)))
    }
  }
  if (!ops.length) return
  pending++
  set({ status: navigator.onLine ? 'syncing' : 'offline' })
  Promise.all(ops)
    .then(() => {
      pending--
      if (!pending && state.status !== 'denied' && state.status !== 'error') set({ status: 'synced' })
    })
    .catch((e) => {
      pending--
      fail(e)
    })
}

/** 启动时呼叫一次 */
export async function initCloud() {
  if (!cloudEnabled) return
  try {
    fb = await loadFirebase()
  } catch (e) {
    set({ status: 'error', message: '无法载入 Firebase：' + String((e as Error)?.message ?? e) })
    return
  }
  fb.auth.onAuthStateChanged(fb.a, (user) => {
    stopSync()
    if (user) startSync(user.email ?? '')
    else set({ status: 'signed-out', email: null, message: undefined })
  })
  onLocalCommit(() => schedulePush())
  addEventListener('offline', () => state.email && set({ status: 'offline' }))
  addEventListener('online', () => {
    if (!state.email || !fb) return
    set({ status: 'syncing' })
    fb.fs.waitForPendingWrites(fb.db).then(() => !pending && set({ status: 'synced' }), fail)
  })
}

export async function signIn(email: string, password: string) {
  if (!fb) throw new Error('Firebase 还没载入')
  await fb.auth.signInWithEmailAndPassword(fb.a, email.trim(), password)
}
export async function signOutCloud() {
  if (fb) await fb.auth.signOut(fb.a)
}
export async function resetPassword(email: string) {
  if (!fb) throw new Error('Firebase 还没载入')
  await fb.auth.sendPasswordResetEmail(fb.a, email.trim())
}

export function authErrorText(e: unknown) {
  const code = errCode(e)
  const map: Record<string, string> = {
    'auth/invalid-credential': '邮箱或密码不对',
    'auth/wrong-password': '邮箱或密码不对',
    'auth/user-not-found': '邮箱或密码不对',
    'auth/invalid-email': '邮箱格式不对',
    'auth/missing-password': '请输入密码',
    'auth/user-disabled': '这个账号已被停用',
    'auth/too-many-requests': '尝试太多次，请过几分钟再试',
    'auth/network-request-failed': '网络连不上，请检查网络',
  }
  return map[code] ?? `登录失败（${code || String(e)}）`
}
