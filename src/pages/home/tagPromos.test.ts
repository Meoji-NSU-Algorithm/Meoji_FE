import { describe, expect, it } from 'vitest'
import { BE_TAG_DICTIONARY, TAG_PROMOS } from './utils'

describe('TAG_PROMOS', () => {
  it('BE 태그 사전 10개를 사전 순서 그대로 모두 나열한다 (Figma 3차 DR3)', () => {
    expect(TAG_PROMOS.map((p) => p.tag)).toEqual([...BE_TAG_DICTIONARY])
    expect(TAG_PROMOS).toHaveLength(10)
    expect(TAG_PROMOS[0]).toMatchObject({ tag: '불꽃놀이', title: '하늘을 수놓는 밤' })
  })

  it('카드는 146deg 그라데이션이다', () => {
    for (const p of TAG_PROMOS) expect(p.gradient).toMatch(/^linear-gradient\(146deg, #[0-9a-f]{6} 0%, #[0-9a-f]{6} 100%\)$/)
  })
})
