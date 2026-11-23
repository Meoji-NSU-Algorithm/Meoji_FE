/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

class FakeMap {
  getLevel() { return 6 }
  setLevel() {}
  setBounds() {}
  setCenter() {}
  relayout() {}
  getBounds() { return { contain: () => true } }
}
const kakao = {
  maps: {
    Map: FakeMap,
    LatLng: class {},
    LatLngBounds: class { extend() {} },
    Marker: class {},
    CustomOverlay: class { setMap() {} },
    event: { addListener() {} },
  },
}
vi.mock('./lib/kakaoMaps', () => ({ loadKakaoMaps: () => Promise.resolve(kakao) }))

import { MapCanvas } from './pages/map/MapCanvas'
import { MiniMap } from './pages/detail/MiniMap'
import { RouteMap } from './pages/directions/RouteMap'
import { AvatarCropModal } from './pages/my/AvatarCropModal'
import layoutSrc from './layout/Layout.tsx?raw'
import notFoundSrc from './pages/NotFound.tsx?raw'
import toastSrc from './components/Toast.tsx?raw'
import stepsSrc from './pages/directions/RouteSteps.tsx?raw'

/** 확대된 페이지(html zoom) 안에서 외부 위젯이 쓰는 칸: absolute 래퍼 > app-unzoom 칸 */
function expectUnzoomed(el: HTMLElement) {
  expect(el).toHaveClass('app-unzoom', 'app-unzoom-fill')
  expect(el.parentElement).toHaveClass('absolute', 'inset-0')
  expect(el.parentElement).not.toHaveClass('app-unzoom')
}

describe('html zoom 보정', () => {
  // vitest 는 CSS 를 비워 버리므로 파일을 직접 읽는다
  const css = readFileSync('src/index.css', 'utf8')

  it('세 개의 zoom 미디어 쿼리가 모두 --app-zoom 을 같은 값으로 정한다', () => {
    for (const [min, z] of [['2400', '1.25'], ['3200', '1.5'], ['3600', '2']]) {
      const re = new RegExp(`@media \\(min-width: ${min}px\\) \\{\\s*html \\{ zoom: ${z}; --app-zoom: ${z}; \\}`)
      expect(css).toMatch(re)
    }
    expect(css).toMatch(/html \{ --app-zoom: 1; \}/)
  })

  it('.app-unzoom 은 배율의 역수로 되돌린다', () => {
    expect(css).toMatch(/\.app-unzoom \{ zoom: calc\(1 \/ var\(--app-zoom, 1\)\); \}/)
    expect(css).toMatch(/\.app-unzoom-fill \{[^}]*width: 100%;[^}]*height: 100%;/)
  })

  it('MapCanvas 지도 칸', async () => {
    render(<MapCanvas kakao={kakao} points={[]} selectedId={null} onSelect={() => {}} onVisibleChange={() => {}} fitKey="" />)
    expectUnzoomed(screen.getByTestId('kakao-map'))
  })

  it('MiniMap 지도 칸', async () => {
    render(<MiniMap latitude={36.8} longitude={127.1} />)
    expectUnzoomed(screen.getByTestId('mini-map'))
    await waitFor(() => {})
  })

  it('RouteMap 지도 칸', async () => {
    render(<RouteMap from={null} to={{ lat: 36.8, lng: 127.1, label: 'b' }} segments={[]} />)
    expectUnzoomed(screen.getByTestId('route-map'))
    await waitFor(() => {})
  })

  it('아바타 자르기 칸', () => {
    render(<AvatarCropModal src="blob:x" onCancel={() => {}} onApply={() => {}} />)
    const inner = screen.getByTestId('crop-unzoom')
    expect(inner).toHaveClass('app-unzoom', 'app-unzoom-fill')
    expect(inner.parentElement).toBe(screen.getByTestId('crop-unzoom-wrap'))
    expect(inner.querySelector('.reactEasyCrop_Container')).not.toBeNull()
  })

  it('뷰포트 단위는 배율로 나눠 쓴다', () => {
    expect(layoutSrc).toContain('min-h-[calc(100dvh/var(--app-zoom,1))]')
    expect(notFoundSrc).toContain('min-h-[calc(60vh/var(--app-zoom,1))]')
    expect(toastSrc).toContain('max-w-[calc(100vw/var(--app-zoom,1)-32px)]')
    expect(stepsSrc).toContain('max-h-[calc(60vh/var(--app-zoom,1))]')
  })
})
