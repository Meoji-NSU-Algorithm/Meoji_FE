import type { EventCard } from '../../api/types'

export const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const day = (s: string | null) => (s ? s.slice(0, 10) : null)

/** 행사가 해당 날짜(YYYY-MM-DD)에 열리는가. 종료일이 없으면 시작일 하루. */
export function isOnDate(e: EventCard, date: string): boolean {
  const s = day(e.start_date)
  const en = day(e.end_date) ?? s
  if (!s || !en) return false
  return s <= date && date <= en
}
export function isOnAnyDate(e: EventCard, dates: string[]) {
  return dates.some((d) => isOnDate(e, d))
}
/** 90일을 넘게 이어지는 상시 행사(BE의 is_permanent 기준과 같다) */
export function isLongRunning(e: EventCard): boolean {
  const s = day(e.start_date)
  const en = day(e.end_date)
  if (!s || !en) return false
  return (new Date(en).getTime() - new Date(s).getTime()) / 86_400_000 > 90
}
/** 오늘 이후에도 계속되는(또는 아직 시작 전인) 행사 */
export function isUpcomingOrOngoing(e: EventCard, today: string) {
  const en = day(e.end_date) ?? day(e.start_date)
  return !!en && en >= today
}

/** 가장 가까운 토/일 (오늘이 주말이면 오늘 포함) */
export function nextWeekend(from: Date): { sat: Date; sun: Date } {
  const dow = from.getDay() // 0=일
  const toSat = dow === 0 ? -1 : 6 - dow // 일요일이면 어제 토요일(이미 지남)
  const sat = addDays(from, toSat)
  return { sat, sun: addDays(sat, 1) }
}

export const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

export interface WeekendTab {
  key: string
  label: string
  dates: string[]
}
/** 이번 주말 탭: 남은 토/일 + 다음 주말 */
export function weekendTabs(today: Date): WeekendTab[] {
  const { sat, sun } = nextWeekend(today)
  const t = ymd(today)
  const tabs: WeekendTab[] = []
  for (const d of [sat, sun]) {
    if (ymd(d) >= t) {
      tabs.push({
        key: ymd(d),
        label: `${d.getMonth() + 1}.${d.getDate()} ${WEEKDAY[d.getDay()]}`,
        dates: [ymd(d)],
      })
    }
  }
  const nSat = addDays(sat, 7)
  tabs.push({ key: 'next', label: '다음 주말', dates: [ymd(nSat), ymd(addDays(nSat, 1))] })
  return tabs
}

/** D-day 라벨. 오늘 시작이면 D-DAY, 이미 시작했으면 null */
export function dLabel(start: string | null, today: string): string | null {
  const s = day(start)
  if (!s || s < today) return null
  const diff = Math.round(
    (new Date(s + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000,
  )
  return diff === 0 ? 'D-DAY' : `D-${diff}`
}

/** 홈 지역 칩 (Figma 순서). 값은 BE의 sido(약칭 또는 정식명) 매칭에 쓴다. */
export const REGIONS: Array<{ label: string; aliases: string[] }> = [
  { label: '전체', aliases: [] },
  { label: '서울', aliases: ['서울', '서울특별시'] },
  { label: '부산', aliases: ['부산', '부산광역시'] },
  { label: '경기', aliases: ['경기', '경기도'] },
  { label: '강원', aliases: ['강원', '강원도', '강원특별자치도'] },
  { label: '충남', aliases: ['충남', '충청남도'] },
  { label: '충북', aliases: ['충북', '충청북도'] },
  { label: '경북', aliases: ['경북', '경상북도'] },
  { label: '경남', aliases: ['경남', '경상남도'] },
  { label: '전남', aliases: ['전남', '전라남도'] },
  { label: '전북', aliases: ['전북', '전라북도', '전북특별자치도'] },
  { label: '제주', aliases: ['제주', '제주특별자치도', '제주도'] },
]
export function inRegion(e: EventCard, label: string): boolean {
  if (label === '전체') return true
  const r = REGIONS.find((x) => x.label === label)
  return !!e.sido && !!r && r.aliases.includes(e.sido)
}

/** BE(Meoji_BE/app/domains/tour/sync_service.py TAG_KEYWORDS)가 만드는 태그 사전. BE와 항상 동기화할 것. */
export const BE_TAG_DICTIONARY = ['불꽃놀이', '푸드트럭', '야간', '체험', '가족', '공연', '전시', '음악', '꽃', '먹거리'] as const

/**
 * 태그 기획전 (Figma 3차 DR3·DR4). 태그 사전 10개를 사전 순서 그대로 모두 나열하고, 결과 0건인 태그만 숨긴다.
 * 카드는 그라데이션(146deg) + 흐린 빛 원 2개(index.css .promo-card).
 */
const promo = (tag: (typeof BE_TAG_DICTIONARY)[number], title: string, from: string, to: string) => ({
  tag,
  title,
  gradient: `linear-gradient(146deg, ${from} 0%, ${to} 100%)`,
})
export const TAG_PROMOS = [
  promo('불꽃놀이', '하늘을 수놓는 밤', '#1c2147', '#5b3c8c'),
  promo('푸드트럭', '먹으러 가는 축제', '#e8461c', '#f7a04b'),
  promo('야간', '퇴근 후 밤 나들이', '#3e1a57', '#c2457a'),
  promo('체험', '직접 해 보는 체험', '#d9483b', '#f59a8b'),
  promo('가족', '주말 가족 나들이', '#2f6fd8', '#8cc4f2'),
  promo('공연', '무대 앞에서 보내는 저녁', '#b9771a', '#f4cf6a'),
  promo('전시', '천천히 둘러보는 전시', '#2f2b2a', '#6b625e'),
  promo('음악', '음악이 흐르는 주말', '#0e6e6a', '#6ccbae'),
  promo('꽃', '꽃 보러 가는 길', '#d2416a', '#f6a7b8'),
  promo('먹거리', '지역 맛 따라 한 바퀴', '#2f5d34', '#a9cc6b'),
]

/** 카테고리 스트립 항목. categoryName 은 BE categories 의 name 과 매칭해 category_id 링크를 만든다. */
export const CATEGORY_NAMES = ['축제', '전시', '공연', '체험', '계절행사']
