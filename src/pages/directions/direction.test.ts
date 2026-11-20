import { describe, expect, it } from 'vitest'
import { turnOf } from './direction'

describe('turnOf', () => {
  it.each([
    ['성환 방향으로 우회전', 'right'],
    ['두정역 사거리에서 좌회전', 'left'],
    ['천안대로 진입 후 직진', 'straight'],
    ['600m 앞에서 유턴', 'uturn'],
    ['정류장 방향 오른쪽길로 100m 이동', 'right'],
    ['운동장 정문 방향 왼쪽길로 이동', 'left'],
    ['좌회전 후 우회전', 'left'],
    ['우회전 후 좌회전', 'right'],
    ['알 수 없는 안내', 'straight'],
    // 실제 BE(카카오 자동차) 안내문
    ['양재 방면으로 오른쪽 방향', 'right'],
    ['서울 방면으로 왼쪽 방향', 'left'],
    ['염곡사거리 성남 방면으로 유턴', 'uturn'],
    ['12시 방향', 'straight'],
    ['톨게이트 진입', 'straight'],
    ['출발지', 'straight'],
    ['', 'straight'],
  ])('%s → %s', (text, turn) => {
    expect(turnOf(text)).toBe(turn)
  })
  it('null/undefined 도 직진', () => {
    expect(turnOf(null)).toBe('straight')
    expect(turnOf(undefined)).toBe('straight')
  })
})
