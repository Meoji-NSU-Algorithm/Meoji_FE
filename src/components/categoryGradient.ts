/** 분류별 사진 없음 그라데이션 (Figma A4 분류별 색) */
const GRADIENTS: Record<string, [string, string]> = {
  축제: ['#e8461c', '#f7a04b'],
  공연: ['#b9771a', '#f4cf6a'],
  전시: ['#2f2b2a', '#6b625e'],
  체험: ['#d9483b', '#f59a8b'],
  계절행사: ['#b5541b', '#e8a15a'],
}

/** 분류명 -> 그라데이션 CSS. 분류가 없으면 축제 색 */
export function categoryGradient(category?: string | null, angle = 154): string {
  const [from, to] = GRADIENTS[category ?? ''] ?? GRADIENTS['축제']
  return `linear-gradient(${angle}deg, ${from} 8.5%, ${to} 91.5%)`
}
