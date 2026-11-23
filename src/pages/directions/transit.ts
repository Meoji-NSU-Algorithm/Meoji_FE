import type { DirectionsStep } from '../../api/types'
import { detailText } from './format'

export type ParsedStep =
  | { kind: 'bus'; lines: string[]; board: string | null; alight: string | null; passStops: number | null }
  | { kind: 'subway'; line: string; lineNo: string; alight: string | null; direction: string | null }
  | { kind: 'walk'; guides: string[] }
  | { kind: 'raw' }

/** '24, 100, 200' 처럼 쉼표로 이어진 노선 문자열을 노선별 배열로 나눈다. */
export const splitLines = (raw: string) => raw.split(',').map((l) => l.trim()).filter(Boolean)

const clean = (s: string | undefined | null) => (s ?? '').trim() || null

/** 지하철 노선 이름에서 짧은 표기(예: '수도권 1호선' → '1호선')를 뽑는다. */
export function shortLine(name: string): string {
  const m = /[^\s,]*호선/.exec(name)
  if (m) return m[0]
  return name.replace(/^지하철\s*/, '').trim() || name
}

/**
 * BE 가 만든 대중교통 안내문(instruction)·detail 문자열을 구조화한다.
 * 형식이 맞지 않으면 { kind: 'raw' } 를 돌려주고 호출부는 원문을 그대로 보여준다. 절대 throw 하지 않는다.
 */
export function parseTransitStep(step: DirectionsStep): ParsedStep {
  try {
    const text = typeof step.instruction === 'string' ? step.instruction.trim() : ''
    const detail = detailText(step.detail) ?? ''
    if (!text) return { kind: 'raw' }

    if (step.type === 'BUS') {
      const m = /^(.+?)번 버스 이용(?:\s*:\s*(.*))?$/.exec(text)
      if (!m) return { kind: 'raw' }
      const rest = m[2] ?? ''
      const board = clean(/([^:→]+?)\s*승차/.exec(rest)?.[1])
      const alight = clean(/([^:→]+?)\s*하차/.exec(rest)?.[1])
      const stops = /경유 정류장 정보\s*(\d+)\s*개/.exec(detail)
      return { kind: 'bus', lines: splitLines(m[1]), board, alight, passStops: stops ? Number(stops[1]) : null }
    }

    if (step.type === 'SUBWAY') {
      const m = /^(.+?)\s*탑승(?:\s*,\s*(.+?)역?\s*하차)?(?:\s*\((.+?)\s*방면\))?\s*$/.exec(text)
      if (!m) return { kind: 'raw' }
      const line = m[1].trim()
      return { kind: 'subway', line, lineNo: shortLine(line), alight: clean(m[2]?.replace(/역$/, '')), direction: clean(m[3]) }
    }

    if (step.type === 'WALK') {
      const guides = text === '도보 이동' ? [] : text.split('→').map((g) => g.trim()).filter(Boolean)
      return { kind: 'walk', guides }
    }
  } catch {
    // 파싱 실패는 원문 표시로 대체한다.
  }
  return { kind: 'raw' }
}
