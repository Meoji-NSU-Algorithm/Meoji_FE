import type { Sido } from '../../api/types'

/** 지역으로 찾기 칸 (Figma M1-3 723:66 순서). 코드는 로그인 후 BE /events/sidos 에서 이름으로 찾아 쓴다. */
export const SEARCH_REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const

/** 짧은 이름(서울) → BE 시·도 코드. short_name 이 같거나 정식명이 그 이름으로 시작하면 같은 곳으로 본다 */
export function sidoCodeOf(label: string, sidos: Sido[] | undefined): string | undefined {
  return sidos?.find((s) => s.short_name === label || s.name === label)?.code
    ?? sidos?.find((s) => s.name.startsWith(label))?.code
}
