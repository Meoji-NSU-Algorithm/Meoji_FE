import { describe, expect, it } from 'vitest'
import { BE_TAG_DICTIONARY, TAG_PROMOS } from './utils'

describe('TAG_PROMOS', () => {
  it('모든 태그가 BE 태그 사전에 있다', () => {
    for (const p of TAG_PROMOS) expect(BE_TAG_DICTIONARY as readonly string[]).toContain(p.tag)
  })
})
