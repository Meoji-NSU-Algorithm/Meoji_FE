import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { EventListParams, EventSort } from '../../api/types'

export const DEFAULT_SIZE = 12
const SORTS: EventSort[] = ['latest', 'popular', 'dateAsc']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const int = (v: string | null, min: number, max = Number.MAX_SAFE_INTEGER) => {
  if (v == null || !/^\d+$/.test(v)) return undefined
  const n = Number(v)
  return n >= min && n <= max ? n : undefined
}

/** URL 검색 파라미터를 EventListParams로 정리한다. 알 수 없는/잘못된 값은 버린다. */
export function parseEventParams(sp: URLSearchParams): EventListParams {
  const p: EventListParams = {}
  const q = sp.get('q')?.trim()
  if (q) p.q = q
  const tag = sp.get('tag')?.trim()
  if (tag) p.tag = tag
  const cat = int(sp.get('category_id'), 1)
  if (cat !== undefined) p.category_id = cat
  const sido = sp.get('sido_code')?.trim()
  if (sido) p.sido_code = sido
  const free = sp.get('is_free')
  if (free === 'true') p.is_free = true
  else if (free === 'false') p.is_free = false
  const s = sp.get('start_date')
  if (s && DATE_RE.test(s)) p.start_date = s
  const e = sp.get('end_date')
  if (e && DATE_RE.test(e)) p.end_date = e
  const sort = sp.get('sort') as EventSort | null
  if (sort && SORTS.includes(sort)) p.sort = sort
  const page = int(sp.get('page'), 1)
  if (page !== undefined) p.page = page
  const size = int(sp.get('size'), 1, 100)
  if (size !== undefined) p.size = size
  return p
}

/** BE가 JWT를 요구하는 검색 필터가 하나라도 있는지 (sort/page/size는 해당 없음) */
export function hasLoginFilters(p: EventListParams): boolean {
  return (
    p.q !== undefined ||
    p.tag !== undefined ||
    p.category_id !== undefined ||
    p.sido_code !== undefined ||
    p.is_free !== undefined ||
    p.start_date !== undefined ||
    p.end_date !== undefined
  )
}

export function serializeEventParams(p: EventListParams): URLSearchParams {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  return sp
}

/** 필터 상태를 URL 검색 파라미터에 보관한다. patch 값이 undefined면 해당 키를 지운다. */
export function useEventFilters(defaults: Partial<EventListParams> = {}) {
  const [sp, setSp] = useSearchParams()
  const params = useMemo(() => parseEventParams(sp), [sp])

  const patch = useCallback(
    (next: Partial<EventListParams>) => {
      const merged: EventListParams = { ...parseEventParams(sp), ...next }
      if (!('page' in next)) delete merged.page
      for (const k of Object.keys(merged) as Array<keyof EventListParams>) {
        if (merged[k] === undefined) delete merged[k]
      }
      if (merged.sort === 'latest') delete merged.sort
      setSp(serializeEventParams(merged))
    },
    [sp, setSp],
  )
  const reset = useCallback(() => setSp(new URLSearchParams()), [setSp])

  return { params: { ...defaults, ...params }, patch, reset }
}
