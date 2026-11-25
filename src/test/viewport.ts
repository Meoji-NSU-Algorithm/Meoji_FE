/**
 * jsdom 에는 matchMedia 가 없어서 setup.ts 에서 이 모의 구현을 깐다.
 * `(max-width: Npx)` / `(min-width: Npx)` 쿼리만 해석하고, 나머지는 false.
 *
 * 사용 예)
 *   import { setViewportWidth } from '../test/viewport'
 *   setViewportWidth(390)  // 모바일
 *   setViewportWidth(1024) // 데스크톱(기본값, 매 테스트 후 자동 복원)
 */
import { act } from '@testing-library/react'

export const DEFAULT_VIEWPORT_WIDTH = 1024

let width = DEFAULT_VIEWPORT_WIDTH
type Entry = { query: string; listeners: Set<(e: MediaQueryListEvent) => void>; last: boolean }
const entries = new Set<Entry>()

function evaluate(query: string, w: number) {
  const max = /\(max-width:\s*(\d+(?:\.\d+)?)px\)/.exec(query)
  const min = /\(min-width:\s*(\d+(?:\.\d+)?)px\)/.exec(query)
  if (!max && !min) return false
  if (max && w > Number(max[1])) return false
  if (min && w < Number(min[1])) return false
  return true
}

export function installMatchMedia() {
  window.matchMedia = (query: string): MediaQueryList => {
    // 구독자가 있는 동안만 entries 에 둔다(getSnapshot 이 매 렌더 matchMedia 를 불러도 쌓이지 않게)
    const entry: Entry = { query, listeners: new Set(), last: evaluate(query, width) }
    const add = (fn: (e: MediaQueryListEvent) => void) => {
      entry.last = evaluate(query, width)
      entry.listeners.add(fn)
      entries.add(entry)
    }
    const remove = (fn: (e: MediaQueryListEvent) => void) => {
      entry.listeners.delete(fn)
      if (entry.listeners.size === 0) entries.delete(entry)
    }
    return {
      get matches() {
        return evaluate(query, width)
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, fn: EventListenerOrEventListenerObject) => add(fn as (e: MediaQueryListEvent) => void),
      removeEventListener: (_: string, fn: EventListenerOrEventListenerObject) => remove(fn as (e: MediaQueryListEvent) => void),
      addListener: add,
      removeListener: remove,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }
}

/** 가짜 화면 폭을 바꾸고, 결과가 달라진 matchMedia 구독자에게 change 를 알린다 */
export function setViewportWidth(next: number) {
  width = next
  act(() => {
    for (const entry of entries) {
      const now = evaluate(entry.query, width)
      if (now === entry.last) continue
      entry.last = now
      for (const fn of entry.listeners) fn({ matches: now, media: entry.query } as MediaQueryListEvent)
    }
  })
}

export function resetViewport() {
  width = DEFAULT_VIEWPORT_WIDTH
  for (const entry of entries) entry.last = evaluate(entry.query, width)
}
