import { useSyncExternalStore } from 'react'

/**
 * 用网址的 # 部分切换页面（#/、#/match/ID、#/team/ID）。
 * GitHub Pages 这类静态托管不支持其他路径，用 # 最省事。
 */
export type Route = { page: 'home' } | { page: 'match'; id: string } | { page: 'team'; id: string }

function parse(hash: string): Route {
  const [, page, id] = hash.replace(/^#/, '').split('/')
  if (page === 'match' && id) return { page: 'match', id }
  if (page === 'team' && id) return { page: 'team', id }
  return { page: 'home' }
}

const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parse(hash)
}

export const go = {
  home: () => void (location.hash = '#/'),
  match: (id: string) => void (location.hash = `#/match/${id}`),
  team: (id: string) => void (location.hash = `#/team/${id}`),
}
