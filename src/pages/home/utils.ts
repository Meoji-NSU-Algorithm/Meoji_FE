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

/** 태그 기획전: BE 태그 사전 10개, 사전 순서 그대로 (A6). 클릭 시 /events?tag= 로 이동 */
export const TAG_PROMOS = [
  { tag: '불꽃놀이', title: '하늘을 수놓는 밤', gradient: 'linear-gradient(146deg,#1c2147 0%,#5b3c8c 100%)' },
  { tag: '푸드트럭', title: '먹으러 가는 축제', gradient: 'linear-gradient(146deg,#e8461c 0%,#f7a04b 100%)' },
  { tag: '야간', title: '퇴근 후 밤 나들이', gradient: 'linear-gradient(146deg,#3e1a57 0%,#c2457a 100%)' },
  { tag: '체험', title: '직접 해 보는 체험', gradient: 'linear-gradient(146deg,#d9483b 0%,#f59a8b 100%)' },
  { tag: '가족', title: '주말 가족 나들이', gradient: 'linear-gradient(146deg,#2f6fd8 0%,#8cc4f2 100%)' },
  { tag: '공연', title: '무대 앞에서 보내는 저녁', gradient: 'linear-gradient(146deg,#b9771a 0%,#f4cf6a 100%)' },
  { tag: '전시', title: '천천히 둘러보는 전시', gradient: 'linear-gradient(146deg,#2f2b2a 0%,#6b625e 100%)' },
  { tag: '음악', title: '음악이 흐르는 주말', gradient: 'linear-gradient(146deg,#0e6e6a 0%,#6ccbae 100%)' },
  { tag: '꽃', title: '꽃 보러 가는 길', gradient: 'linear-gradient(146deg,#d2416a 0%,#f6a7b8 100%)' },
  { tag: '먹거리', title: '지역 맛 따라 한 바퀴', gradient: 'linear-gradient(146deg,#2f5d34 0%,#a9cc6b 100%)' },
]

/** 카테고리 스트립 항목. categoryName 은 BE categories 의 name 과 매칭해 category_id 링크를 만든다. */
export const CATEGORY_NAMES = ['축제', '전시', '공연', '체험', '계절행사']
