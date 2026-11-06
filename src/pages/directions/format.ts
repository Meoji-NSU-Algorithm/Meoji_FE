import type { DirectionsStep, DirectionsStepType } from '../../api/types'

export function formatDuration(min: number) {
  const m = Math.round(min)
  if (m < 1) return '1분 미만'
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

export function formatDistance(m: number | null | undefined) {
  if (m == null) return ''
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`
}

/** ISO(오프셋 포함) 또는 yyyyMMddHHmm 문자열을 KST HH:mm 으로 바꾼다. 해석 불가면 null. */
export function formatKstTime(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^\d{12,14}$/.test(value)) return `${value.slice(8, 10)}:${value.slice(10, 12)}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('hour')}:${get('minute')}`
}

export const STEP_LABEL: Record<DirectionsStepType, string> = {
  SUBWAY: '지하철',
  BUS: '버스',
  WALK: '도보',
  DRIVE: '자동차',
  OTHER: '이동',
}

/** detail 은 문자열, {point,angle,turn,facility} 객체, null 어느 쪽이든 올 수 있다. */
export function detailText(detail: unknown): string | null {
  if (detail == null) return null
  if (typeof detail === 'string') return detail.trim() || null
  if (typeof detail === 'object') {
    const d = detail as Record<string, unknown>
    const parts = [d.point, d.turn, d.facility].filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    return parts.length ? parts.join(' · ') : null
  }
  return null
}

const addNullable = (a: number | null, b: number | null) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0))

/** 거리/시간이 모두 0 인 단계를 버리고, 직전 단계와 type·안내문이 같으면 합쳐서 stepNumber 를 다시 매긴다. */
export function compactSteps(steps: DirectionsStep[]): DirectionsStep[] {
  const out: DirectionsStep[] = []
  for (const s of steps) {
    if (!s.distanceMeters && !s.durationMinutes) continue
    const prev = out[out.length - 1]
    if (prev && prev.type === s.type && prev.instruction === s.instruction) {
      prev.distanceMeters = addNullable(prev.distanceMeters, s.distanceMeters)
      prev.durationMinutes = addNullable(prev.durationMinutes, s.durationMinutes)
    } else {
      out.push({ ...s })
    }
  }
  return out.map((s, i) => ({ ...s, stepNumber: i + 1 }))
}
