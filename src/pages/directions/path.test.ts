import { describe, expect, it } from 'vitest'
import { normalizePath } from './path'

describe('normalizePath', () => {
  it('좌표 배열은 구간 1개로, 도보 모드만 점선', () => {
    const p = [[36.8, 127.1], [36.9, 127.2]]
    expect(normalizePath(p, 'car')).toEqual([{ walk: false, points: p }])
    expect(normalizePath(p, 'walk')[0].walk).toBe(true)
  })
  it('대중교통 구간 배열은 WALK 만 점선', () => {
    const r = normalizePath(
      [
        { type: 'WALK', coordinates: [[1, 2], [3, 4]] },
        { type: 'BUS', coordinates: [[3, 4], [5, 6]] },
        { type: 'SUBWAY', coordinates: [[7, 8]] },
      ],
      'transit',
    )
    expect(r.map((s) => s.walk)).toEqual([true, false])
  })
  it('이상한 값은 빈 배열', () => {
    expect(normalizePath(undefined, 'car')).toEqual([])
    expect(normalizePath([], 'car')).toEqual([])
    expect(normalizePath('x', 'car')).toEqual([])
    expect(normalizePath([null, { type: 'BUS' }], 'transit')).toEqual([])
    expect(normalizePath([[1, 'a']], 'car')).toEqual([])
  })
})

import { bridgeSegments, haversineMeters, type RouteSegment } from './path'

describe('bridgeSegments', () => {
  const seg = (walk: boolean, points: [number, number][]): RouteSegment => ({ walk, points })
  // 천안아산역 -> 서울역 (KTX 구간 누락)
  const cheonan: [number, number] = [36.7945, 127.1046]
  const seoul: [number, number] = [37.5547, 126.9707]
  it('haversine', () => {
    expect(haversineMeters(cheonan, seoul)).toBeGreaterThan(80000)
    expect(haversineMeters(cheonan, cheonan)).toBe(0)
  })
  it('끊김 없으면 그대로', () => {
    const s = [seg(true, [[36.8, 127.1], [36.8001, 127.1]]), seg(false, [[36.8001, 127.1], [36.81, 127.11]])]
    expect(bridgeSegments(s, { lat: 36.8, lng: 127.1 }, { lat: 36.81, lng: 127.11 })).toEqual(s)
  })
  it('작은 끊김은 도보 연결선', () => {
    const a = seg(false, [[36.8, 127.1], [36.8, 127.101]])
    const b = seg(false, [[36.8, 127.1013], [36.8, 127.11]])
    const r = bridgeSegments([a, b], null, { lat: 36.8, lng: 127.11 })
    expect(r).toHaveLength(3)
    expect(r[1]).toMatchObject({ walk: true, kind: 'connector' })
  })
  it('300m 이상은 gap 직선 (도시 간)', () => {
    const a = seg(false, [[36.8, 127.1], cheonan])
    const b = seg(false, [seoul, [37.56, 126.98]])
    const r = bridgeSegments([a, b], null, { lat: 37.56, lng: 126.98 })
    expect(r[1]).toEqual({ walk: false, kind: 'gap', points: [cheonan, seoul] })
  })
  it('출발지·도착지까지 잇는다', () => {
    const a = seg(false, [[36.8, 127.1], [36.81, 127.11]])
    const r = bridgeSegments([a], { lat: 36.8001, lng: 127.1 }, { lat: 36.8105, lng: 127.11 })
    expect(r).toHaveLength(3)
    expect(r[0].kind).toBe('connector')
    expect(r[2].points[1]).toEqual([36.8105, 127.11])
  })
  it('빈 구간·잘못된 입력은 []', () => {
    expect(bridgeSegments([], { lat: 1, lng: 1 }, { lat: 2, lng: 2 })).toEqual([])
    expect(bridgeSegments(undefined as unknown as RouteSegment[], null, { lat: 2, lng: 2 })).toEqual([])
  })
})
