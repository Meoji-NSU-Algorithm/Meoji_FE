import { describe, expect, it } from 'vitest'
import { ROUTE_LAYERS, routeLayerStyle } from './path'

describe('ROUTE_LAYERS', () => {
  const outline = ROUTE_LAYERS.find((l) => l.color === '#ffffff')!
  const main = ROUTE_LAYERS.find((l) => l.color === '#f0562c')!
  it('주황 본선이 흰 테두리 위에 그려진다', () => {
    expect(outline).toBeDefined()
    expect(main).toBeDefined()
    expect(main.z).toBeGreaterThan(outline.z)
  })
  it('도보 구간의 본선만 점선', () => {
    expect(routeLayerStyle(main, true)).toBe('shortdash')
    expect(routeLayerStyle(main, false)).toBe('solid')
    expect(routeLayerStyle(outline, true)).toBe('solid')
  })
})
