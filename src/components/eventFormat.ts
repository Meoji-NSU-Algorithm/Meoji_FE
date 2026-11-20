const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function parse(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return { m, d, w: WEEKDAYS[new Date(y, m - 1, d).getDay()] }
}

/** "2026-10-22","2026-10-26" -> "10.22(목) – 10.26(월)". 하루짜리는 "10.22(목)" */
export function formatDateRange(start?: string | null, end?: string | null): string {
  const s = start ? parse(start) : null
  const e = end ? parse(end) : null
  if (!s) return ''
  const a = `${s.m}.${s.d}(${s.w})`
  if (!e || (e.m === s.m && e.d === s.d)) return a
  return `${a} – ${e.m}.${e.d}(${e.w})`
}

/** BE price(문자열/숫자) 를 화면 문자열로. 숫자면 "5,000원" */
export function formatPrice(price?: string | number | null): string {
  if (price == null || price === '') return ''
  if (typeof price === 'number') return `${price.toLocaleString('ko-KR')}원`
  return /^\d+$/.test(price) ? `${Number(price).toLocaleString('ko-KR')}원` : price
}

/** 조회수 -> "3.2만"(1만 이상) / "9,620". 0·없음은 빈 문자열(줄을 숨긴다) */
export function formatViewCount(n?: number | null): string {
  if (n == null || !(n > 0)) return ''
  return n >= 10000
    ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')}만`
    : n.toLocaleString('ko-KR')
}

export type PriceTone = 'free' | 'paid' | 'unknown'
/** is_free true -> 무료, 금액 > 0 -> "15,000원", 그 외 -> 가격 정보 없음 */
export function priceLabel(
  price?: string | number | null,
  isFree?: boolean | null,
): { text: string; tone: PriceTone } {
  if (isFree) return { text: '무료', tone: 'free' }
  const n = typeof price === 'string' && /^\d+$/.test(price) ? Number(price) : price
  if (typeof n === 'number') return n > 0 ? { text: formatPrice(n), tone: 'paid' } : { text: '가격 정보 없음', tone: 'unknown' }
  if (typeof n === 'string' && n.trim()) return { text: n, tone: 'paid' }
  return { text: '가격 정보 없음', tone: 'unknown' }
}
