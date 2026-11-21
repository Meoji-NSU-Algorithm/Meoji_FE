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

/** 사진 없는 행사의 분류 색 그라데이션 (A4). 분류가 없거나 모르는 값이면 축제 색 */
const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  축제: ['#e8461c', '#f7a04b'],
  공연: ['#b9771a', '#f4cf6a'],
  전시: ['#2f2b2a', '#6b625e'],
  체험: ['#d9483b', '#f59a8b'],
  계절행사: ['#b5541b', '#e8a15a'],
}
export function categoryGradient(category?: string | null): string {
  const [a, b] = CATEGORY_GRADIENTS[category ?? ''] ?? CATEGORY_GRADIENTS['축제']
  return `linear-gradient(154deg, ${a} 8.5%, ${b} 91.5%)`
}
