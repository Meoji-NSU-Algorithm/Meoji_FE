import { describe, expect, it } from 'vitest'
import type { DirectionsStep } from '../../api/types'
import { parseTransitStep, shortLine } from './transit'

const st = (type: string, instruction: string, detail: DirectionsStep['detail'] = null): DirectionsStep => ({
  stepNumber: 1, type, instruction, durationMinutes: 5, distanceMeters: 100, detail,
})

describe('parseTransitStep', () => {
  it('버스 안내문에서 번호·승하차 정류장·경유 정류장 수를 뽑는다', () => {
    expect(parseTransitStep(st('BUS', '24번 버스 이용: 남서울대 승차 → 천안역 하차', '경유 정류장 정보 6개'))).toEqual({
      kind: 'bus', lines: '24', board: '남서울대', alight: '천안역', passStops: 6,
    })
  })

  it('승차만 있는 버스도 처리한다', () => {
    expect(parseTransitStep(st('BUS', '24, 100번 버스 이용: 남서울대 승차'))).toMatchObject({ lines: '24, 100', board: '남서울대', alight: null })
  })

  it('지하철 안내문에서 노선·하차역·방면을 뽑는다', () => {
    expect(parseTransitStep(st('SUBWAY', '지하철 1호선 탑승, 봉명역 하차 (신창 방면)', '출발역 2번 출구, 도착역 3번 출구'))).toEqual({
      kind: 'subway', line: '지하철 1호선', lineNo: '1호선', alight: '봉명', direction: '신창',
    })
  })

  it('방면이 없는 지하철도 처리한다', () => {
    expect(parseTransitStep(st('SUBWAY', '수도권 1호선 탑승'))).toMatchObject({ kind: 'subway', lineNo: '1호선', alight: null, direction: null })
  })

  it('도보 안내는 -> 로 나눈다', () => {
    expect(parseTransitStep(st('WALK', '정문에서 직진 → 우회전'))).toEqual({ kind: 'walk', guides: ['정문에서 직진', '우회전'] })
    expect(parseTransitStep(st('WALK', '도보 이동'))).toEqual({ kind: 'walk', guides: [] })
  })

  it('해석할 수 없는 문자열은 raw 로 돌려준다 (throw 없음)', () => {
    expect(parseTransitStep(st('BUS', '알 수 없는 안내'))).toEqual({ kind: 'raw' })
    expect(parseTransitStep(st('SUBWAY', '1호선 승차'))).toEqual({ kind: 'raw' })
    expect(parseTransitStep(st('OTHER', '이동'))).toEqual({ kind: 'raw' })
    expect(parseTransitStep(st('BUS', ''))).toEqual({ kind: 'raw' })
    expect(() => parseTransitStep({ ...st('BUS', 'x'), instruction: undefined as unknown as string, detail: { a: 1 } })).not.toThrow()
  })
})

describe('shortLine', () => {
  it('호선이 없으면 접두어만 걷어낸다', () => {
    expect(shortLine('지하철 신분당선')).toBe('신분당선')
    expect(shortLine('수도권 4호선')).toBe('4호선')
  })
})

describe('실제 BE 대중교통 응답(2026-11-21 점검)', () => {
  it('"7011번 버스 이용: 시청역1호선.서울시청 승차 → 합정한강아파트 하차"를 해석한다', () => {
    expect(parseTransitStep(st('BUS', '7011번 버스 이용: 시청역1호선.서울시청 승차 → 합정한강아파트 하차', '경유 정류장 정보 18개'))).toEqual({
      kind: 'bus', lines: '7011', board: '시청역1호선.서울시청', alight: '합정한강아파트', passStops: 18,
    })
  })

  it('도보 단계는 "→"로 나눠 안내 목록으로 만든다', () => {
    expect(parseTransitStep(st('WALK', '오른쪽의 공원으로 이동 → 오른쪽길로 21m 이동 → 왼쪽길로 40m 이동(세종대로)'))).toEqual({
      kind: 'walk', guides: ['오른쪽의 공원으로 이동', '오른쪽길로 21m 이동', '왼쪽길로 40m 이동(세종대로)'],
    })
  })
})
