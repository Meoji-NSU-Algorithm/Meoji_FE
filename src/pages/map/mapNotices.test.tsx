import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth'
import { tokenStorage } from '../../auth/tokenStorage'
import { ToastProvider } from '../../components'
import { ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import MapPage from '../MapPage'
import { resetGeocodeCache } from './geocode'

const loadKakaoMaps = vi.fn()
vi.mock('../../lib/kakaoMaps', () => ({ loadKakaoMaps: () => loadKakaoMaps() }))

function fakeKakao() {
  const bounds = { contain: () => true }
  class Map {
    getBounds() { return bounds }
    getLevel() { return 8 }
    setLevel() {}
    setBounds() {}
    panTo() {}
  }
  class Overlay {
    setMap() {}
    setZIndex() {}
    setPosition() {}
  }
  class Places {
    keywordSearch(_k: string, cb: (d: unknown[], s: string) => void) { cb([], 'ZERO_RESULT') }
  }
  return {
    maps: {
      Map,
      CustomOverlay: Overlay,
      LatLng: class {},
      LatLngBounds: class { extend() {} },
      event: { addListener: (_m: unknown, _e: string, fn: () => void) => fn() },
      services: { Places, Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' } },
    },
  }
}

const ev = (id: number) => ({
  id, title: `행사${id}`, category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: `장소${id}`, image_url: null, price: null, is_free: true,
})

function renderMap(total: number) {
  tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  server.use(
    http.get('*/api/users/me', () => ok({ id: 1, email: null, nickname: '민', profile_image: null })),
    http.get('*/api/events/sidos', () => ok([])),
    http.get('*/api/events', () => ok({ total_count: total, page: 1, size: 100, events: [ev(1), ev(2), ev(3)] })),
  )
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/map']}>
          <ToastProvider>
            <MapPage />
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('지도 안내 필', () => {
  beforeEach(() => {
    resetGeocodeCache()
    loadKakaoMaps.mockReset()
    loadKakaoMaps.mockResolvedValue(fakeKakao())
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
  })

  it('위치를 못 찾은 행사 개수는 굵게 보이고, total_count 가 100을 넘으면 두 번째 필이 아래에 뜬다', async () => {
    renderMap(150)
    const unlocated = await screen.findByTestId('map-unlocated-notice')
    expect(unlocated).toHaveTextContent('위치를 찾지 못한 행사 3개는 지도에 표시되지 않아요')
    expect(unlocated.querySelector('b')).toHaveTextContent('3개')
    const limit = await screen.findByTestId('map-limit-notice')
    expect(limit).toHaveTextContent('행사가 많아 100개까지만 보여요. 지도를 확대하거나 필터를 좁혀 보세요')
    expect(limit.querySelector('b')).toHaveTextContent('100개')
    expect(limit.parentElement).toBe(unlocated.parentElement)
  })

  it('total_count 가 100 이하면 두 번째 필은 없다', async () => {
    renderMap(100)
    await screen.findByTestId('map-unlocated-notice')
    expect(screen.queryByTestId('map-limit-notice')).not.toBeInTheDocument()
  })
})
