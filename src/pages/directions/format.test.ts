import { describe, expect, it } from 'vitest'
import type { DirectionsStep } from '../../api/types'
import { compactSteps } from './format'

const st = (n: number, instruction: string, d: number | null, t: number | null, type = 'DRIVE'): DirectionsStep => ({
  stepNumber: n, type, instruction, distanceMeters: d, durationMinutes: t, detail: null,
})

describe('compactSteps', () => {
  it('거리와 시간이 모두 0/null 인 단계를 버린다', () => {
    const r = compactSteps([st(1, '출발', 0, 0), st(2, '직진', 100, 1), st(3, '좌회전', null, null), st(4, '우회전', 0, 2)])
    expect(r.map((s) => s.instruction)).toEqual(['직진', '우회전'])
  })

  it('type 과 안내문이 같으면 이전 단계에 합친다 (null 안전)', () => {
    const r = compactSteps([st(1, '직진', 100, 1), st(2, '직진', 50, null), st(3, '직진', null, 2), st(4, '좌회전', 10, 1)])
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({ instruction: '직진', distanceMeters: 150, durationMinutes: 3 })
  })

  it('type 이 다르면 합치지 않고 stepNumber 를 다시 매긴다', () => {
    const r = compactSteps([st(5, '직진', 10, 1, 'WALK'), st(9, '직진', 10, 1, 'DRIVE')])
    expect(r.map((s) => s.stepNumber)).toEqual([1, 2])
  })

  it('입력을 변경하지 않는다', () => {
    const a = [st(1, '직진', 100, 1), st(2, '직진', 50, 1)]
    compactSteps(a)
    expect(a[0].distanceMeters).toBe(100)
  })
})
