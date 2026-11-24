import { useCallback, useState } from 'react'

/** 최근 검색어는 이 기기(localStorage)에만 둔다 (Figma M1-3 "최근 검색은 이 기기에만 저장돼요.") */
export const RECENT_KEY = 'meoji:recent-searches'
/** 보관 개수. Figma 에 정해진 수가 없어 10개로 둔다(디자인 질문으로 올림) */
export const RECENT_MAX = 10

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function write(list: string[]) {
  try {
    if (list.length) window.localStorage.setItem(RECENT_KEY, JSON.stringify(list))
    else window.localStorage.removeItem(RECENT_KEY)
  } catch {
    // 사생활 보호 모드 등 저장소를 못 쓰면 화면 상태만 바꾼다
  }
}

/** 같은 말은 맨 앞으로 옮기고, 오래된 것부터 RECENT_MAX 개 넘게는 버린다 */
export function addRecentTo(list: string[], q: string): string[] {
  const term = q.trim()
  if (!term) return list
  return [term, ...list.filter((v) => v !== term)].slice(0, RECENT_MAX)
}

export function useRecentSearches() {
  const [list, setList] = useState<string[]>(readRecent)
  const update = useCallback((next: (prev: string[]) => string[]) => {
    setList((prev) => {
      const v = next(prev)
      write(v)
      return v
    })
  }, [])
  return {
    list,
    add: useCallback((q: string) => update((p) => addRecentTo(p, q)), [update]),
    remove: useCallback((q: string) => update((p) => p.filter((v) => v !== q)), [update]),
    clear: useCallback(() => update(() => []), [update]),
  }
}
