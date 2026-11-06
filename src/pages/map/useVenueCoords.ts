import { useEffect, useMemo, useState } from 'react'
import type { EventCard } from '../../api/types'
import { geocodeKey, geocodeMany, getCachedCoord, type Coord } from './geocode'

export interface Located {
  event: EventCard
  coord: Coord
}

const hasCoord = (e: EventCard) => e.latitude != null && e.longitude != null

/** 카드의 latitude/longitude 를 그대로 쓰고, 좌표가 null 인 행사만 venue_name(+시도)을 지오코딩한다. 캐시된 값은 즉시 반영, 나머지는 순차 조회. */
export function useVenueCoords(kakao: any | null, events: EventCard[]) {
  const [version, setVersion] = useState(0)
  const [doneFor, setDoneFor] = useState<unknown>(null)

  const keyed = useMemo(
    () =>
      events
        .filter((e) => !hasCoord(e) && !!e.venue_name)
        .map((e) => ({ event: e, key: geocodeKey(e.venue_name!, e.sido) })),
    [events],
  )

  useEffect(() => {
    if (!kakao) return
    const signal = { cancelled: false }
    const missing = keyed.filter((k) => getCachedCoord(k.key) === undefined).map((k) => k.key)
    if (missing.length === 0) return
    let pendingFlush = false
    void geocodeMany(kakao, missing, () => {
      if (pendingFlush) return
      pendingFlush = true
      setTimeout(() => {
        pendingFlush = false
        if (!signal.cancelled) setVersion((v) => v + 1)
      }, 150)
    }, signal).then(() => {
      if (!signal.cancelled) {
        setVersion((v) => v + 1)
        setDoneFor(keyed)
      }
    })
    return () => {
      signal.cancelled = true
    }
  }, [kakao, keyed])

  const located = useMemo<Located[]>(
    () => {
      void version // 캐시가 채워질 때마다 다시 계산
      const direct = events.filter(hasCoord).map((event) => ({
        event,
        coord: { lat: event.latitude!, lng: event.longitude! },
      }))
      const geocoded = keyed.flatMap(({ event, key }) => {
        const c = getCachedCoord(key)
        return c ? [{ event, coord: c }] : []
      })
      // 입력 순서(정렬)를 유지한다
      const order = new Map(events.map((e, i) => [e.id, i]))
      return [...direct, ...geocoded].sort((a, b) => order.get(a.event.id)! - order.get(b.event.id)!)
    },
    [events, keyed, version],
  )
  const settled =
    !!kakao && (doneFor === keyed || keyed.every((k) => getCachedCoord(k.key) !== undefined))
  const unlocatedCount = settled ? events.length - located.length : 0
  return { located, settled, unlocatedCount }
}
