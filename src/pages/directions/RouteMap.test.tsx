import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const relayout = vi.fn()
const setBounds = vi.fn()
const polylines: any[] = []

vi.mock('../../lib/kakaoMaps', () => ({
  loadKakaoMaps: () =>
    Promise.resolve({
      maps: {
        LatLng: class { lat: number; lng: number; constructor(lat: number, lng: number) { this.lat = lat; this.lng = lng } },
        LatLngBounds: class { extend() {} },
        Map: class { relayout = relayout; setBounds = setBounds; setCenter() {}; getLevel() { return 6 }; setLevel() {} },
        CustomOverlay: class { setMap() {} },
        Polyline: class { constructor(o: any) { polylines.push(o) } setMap() {} },
      },
    }),
}))

import { RouteMap } from './RouteMap'

describe('RouteMap', () => {
  const cbs: Array<() => void> = []
  const disconnect = vi.fn()
  afterEach(() => { vi.unstubAllGlobals(); cbs.length = 0; polylines.length = 0; vi.clearAllMocks() })

  it('끊긴 구간은 gap 연결선으로 이어 그리고, ResizeObserver 시 relayout + 재맞춤', async () => {
    vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { cbs.push(cb) } observe() {} disconnect() { disconnect() } })
    vi.stubGlobal('requestAnimationFrame', (f: () => void) => { f(); return 1 })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const segments = [
      { walk: false, points: [[36.8, 127.1], [36.7945, 127.1046]] as [number, number][] },
      { walk: false, points: [[37.5547, 126.9707], [37.56, 126.98]] as [number, number][] },
    ]
    const { unmount } = render(<RouteMap from={{ lat: 36.8, lng: 127.1, label: 'a' }} to={{ lat: 37.56, lng: 126.98, label: 'b' }} segments={segments} />)
    await waitFor(() => expect(cbs.length).toBe(1))
    // 구간 2개 + gap 1개, 각각 2레이어
    expect(polylines).toHaveLength(6)
    expect(polylines.some((o) => o.strokeStyle === 'longdash')).toBe(true)
    relayout.mockClear(); setBounds.mockClear()
    cbs[0]()
    expect(relayout).toHaveBeenCalled()
    expect(setBounds).toHaveBeenCalled()
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
