import type { DirectionsMode, DirectionsResult } from '../../api/types'

export type LatLngTuple = [number, number]
export interface RouteSegment {
  /** true 면 도보 구간(점선), false 면 실선. */
  walk: boolean
  points: LatLngTuple[]
  /** 'connector': 구간 사이를 잇는 짧은 도보 연결선, 'gap': 누락된 장거리(KTX 등) 구간을 잇는 직선. 없으면 원본 구간. */
  kind?: 'connector' | 'gap'
}

const isPoint = (p: unknown): p is LatLngTuple =>
  Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && Number.isFinite(p[0]) && Number.isFinite(p[1])

const toPoints = (raw: unknown): LatLngTuple[] => (Array.isArray(raw) ? raw.filter(isPoint).map((p) => [p[0], p[1]] as LatLngTuple) : [])

/**
 * path 를 지도용 구간 목록으로 바꾼다.
 * - 자동차·도보: [[lat,lng], ...] → 구간 1개 (도보 모드만 점선)
 * - 대중교통: [{type, coordinates: [[lat,lng], ...]}, ...] → 구간별로, type WALK 만 점선
 * 해석할 수 없는 값은 건너뛰고, 아무것도 없으면 빈 배열을 돌려준다.
 */
export function normalizePath(path: DirectionsResult['path'] | unknown, mode: DirectionsMode): RouteSegment[] {
  if (!Array.isArray(path) || path.length === 0) return []
  if (isPoint(path[0])) {
    const points = toPoints(path)
    return points.length >= 2 ? [{ walk: mode === 'walk', points }] : []
  }
  const out: RouteSegment[] = []
  for (const seg of path) {
    if (!seg || typeof seg !== 'object') continue
    const s = seg as { type?: unknown; coordinates?: unknown }
    const points = toPoints(s.coordinates)
    if (points.length >= 2) out.push({ walk: s.type === 'WALK', points })
  }
  return out
}

/** 경로선 레이어. z 가 클수록 위에 그려진다: 흰 테두리(낮음) 위에 브랜드 주황 본선(높음). */
export const ROUTE_LAYERS = [
  { id: 'outline', weight: 9, color: '#ffffff', z: 1 },
  { id: 'main', weight: 5, color: '#f0562c', z: 2 },
] as const

/** 구간별 레이어 스타일. 도보 구간의 본선만 점선. */
export function routeLayerStyle(layer: (typeof ROUTE_LAYERS)[number], walk: boolean, kind?: RouteSegment['kind']): 'solid' | 'shortdash' | 'longdash' {
  if (layer.id !== 'main') return 'solid'
  if (kind === 'gap') return 'longdash'
  return walk ? 'shortdash' : 'solid'
}

interface LatLng {
  lat: number
  lng: number
}

/** 두 좌표 사이 거리(m), haversine. */
export function haversineMeters(a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371008.8
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad
  const dLng = (b[1] - a[1]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

const MIN_GAP_M = 1
const GAP_M = 300

function connector(a: LatLngTuple, b: LatLngTuple): RouteSegment | null {
  const d = haversineMeters(a, b)
  if (!Number.isFinite(d) || d < MIN_GAP_M) return null
  return d >= GAP_M ? { walk: false, kind: 'gap', points: [a, b] } : { walk: true, kind: 'connector', points: [a, b] }
}

/**
 * 구간 사이·출발지/도착지와의 끊김을 연결선으로 메워 선이 이어지게 한다.
 * 1m 미만은 무시, 1~300m 는 도보 점선, 300m 이상(BE 가 빠뜨린 KTX 등)은 'gap' 직선.
 * 구간이 없으면 출발-도착 사이 가짜 직선을 만들지 않고 빈 배열을 돌려준다.
 */
export function bridgeSegments(segments: RouteSegment[], from: LatLng | null, to: LatLng): RouteSegment[] {
  const segs = Array.isArray(segments) ? segments.filter((s) => s && Array.isArray(s.points) && s.points.length > 0) : []
  if (segs.length === 0) return []
  const out: RouteSegment[] = []
  const push = (c: RouteSegment | null) => c && out.push(c)
  const ok = (p: LatLng | null): p is LatLng => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
  if (ok(from)) push(connector([from.lat, from.lng], segs[0].points[0]))
  segs.forEach((s, i) => {
    if (i > 0) push(connector(segs[i - 1].points[segs[i - 1].points.length - 1], s.points[0]))
    out.push(s)
  })
  if (ok(to)) push(connector(segs[segs.length - 1].points[segs[segs.length - 1].points.length - 1], [to.lat, to.lng]))
  return out
}
