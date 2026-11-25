import { ymd } from './calendarGrid'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function todayYmd(d = new Date()) {
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}
/** '2026-11-24' → '11.24' */
export const shortDate = (s: string) => `${Number(s.slice(5, 7))}.${Number(s.slice(8, 10))}`
/** '2026-11-24' → '11.24 (화)' */
export function shortDateDow(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return `${shortDate(s)} (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`
}
