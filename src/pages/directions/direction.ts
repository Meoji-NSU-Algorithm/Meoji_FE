export type Turn = 'straight' | 'left' | 'right' | 'uturn'

const KEYWORDS: Array<{ re: RegExp; turn: Turn }> = [
  { re: /유턴|U\s?턴/i, turn: 'uturn' },
  { re: /좌회전|왼쪽|좌측/, turn: 'left' },
  { re: /우회전|오른쪽|우측/, turn: 'right' },
]

/** 안내문에서 가장 먼저 나오는 방향 키워드로 화살표 종류를 정한다. 키워드가 없으면 직진. */
export function turnOf(instruction: string | null | undefined): Turn {
  if (!instruction) return 'straight'
  let best: { index: number; turn: Turn } | null = null
  for (const { re, turn } of KEYWORDS) {
    const m = re.exec(instruction)
    if (m && (best === null || m.index < best.index)) best = { index: m.index, turn }
  }
  return best?.turn ?? 'straight'
}
