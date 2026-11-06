import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth'
import { tokenStorage } from '../../auth/tokenStorage'
import { ToastProvider } from '../../components'
import { ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import MapPage from '../MapPage'
import { geocodeKey, geocodeVenue, resetGeocodeCache } from './geocode'
import { markerLabel } from './mapFormat'

const loadKakaoMaps = vi.fn()
vi.mock('../../lib/kakaoMaps', () => ({ loadKakaoMaps: () => loadKakaoMaps() }))

function fakeKakao(places: Record<string, { x: string; y: string } | null> = {}, calls: string[] = []) {
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
    keywordSearch(key: string, cb: (d: unknown[], s: string) => void) {
      calls.push(key)
      const hit = places[key]
      if (hit) cb([hit], 'OK')
      else cb([], 'ZERO_RESULT')
    }
  }
  return {
    maps: {
      Map,
      CustomOverlay: Overlay,
      LatLng: class { a: number; b: number; constructor(a: number, b: number) { this.a = a; this.b = b } },
      LatLngBounds: class { extend() {} },
      event: { addListener: (_m: unknown, _e: string, fn: () => void) => fn() },
      services: { Places, Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' } },
    },
  }
}

describe('geocode', () => {
  beforeEach(() => resetGeocodeCache())

  it('장소명으로 좌표를 찾고 캐시해 두 번째는 검색하지 않는다', async () => {
    const calls: string[] = []
    const k = fakeKakao({ '충남 천안종합운동장': { x: '127.1', y: '36.8' } }, calls)
    const key = geocodeKey('천안종합운동장', '충남')
    expect(await geocodeVenue(k, key)).toEqual({ lat: 36.8, lng: 127.1 })
    expect(await geocodeVenue(k, key)).toEqual({ lat: 36.8, lng: 127.1 })
    expect(calls).toHaveLength(1)
    expect(localStorage.getItem('cheonanon.geocode.v1')).toContain('36.8')
  })

  it('결과가 없는 장소도 캐시한다', async () => {
    const calls: string[] = []
    const k = fakeKakao({}, calls)
    expect(await geocodeVenue(k, '없는곳')).toBeNull()
    expect(await geocodeVenue(k, '없는곳')).toBeNull()
    expect(calls).toHaveLength(1)
  })

  it('마커 라벨', () => {
    expect(markerLabel({ is_free: true, price: null })).toBe('무료')
    expect(markerLabel({ is_free: false, price: '15000' })).toBe('15,000원')
    expect(markerLabel({ is_free: false, price: null })).toBe('유료')
  })
})

const ev = (id: number, o: Record<string, unknown> = {}) => ({
  id, title: `행사${id}`, category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: `장소${id}`, image_url: null,
  price: null, is_free: true, ...o,
})

function renderMap(url = '/map') {
  tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  server.use(
    http.get('*/api/users/me', () => ok({ id: 1, email: null, nickname: '민', profile_image: null })),
    http.get('*/api/events/sidos', () => ok([])),
  )
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]}>
          <ToastProvider>
            <MapPage />
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('MapPage', () => {
  beforeEach(() => {
    resetGeocodeCache()
    loadKakaoMaps.mockReset()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
  })
  afterEach(() => vi.restoreAllMocks())

  it('SDK 로드에 실패하면 오류 상태와 다시 시도를 보여준다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 0, page: 1, size: 30, events: [] })))
    loadKakaoMaps.mockRejectedValueOnce(new Error('VITE_KAKAO_JS_KEY가 설정되지 않았습니다.'))
    renderMap()
    expect(await screen.findByText('지도를 불러오지 못했어요')).toBeInTheDocument()
    expect(screen.getByText('VITE_KAKAO_JS_KEY가 설정되지 않았습니다.')).toBeInTheDocument()
    loadKakaoMaps.mockResolvedValueOnce(fakeKakao())
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(screen.queryByText('지도를 불러오지 못했어요')).not.toBeInTheDocument())
  })

  it('좌표를 찾은 행사만 목록과 개수에 나온다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 2, page: 1, size: 30, events: [ev(1), ev(2)] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao({ '충남 장소1': { x: '127.1', y: '36.8' } }))
    renderMap()
    expect(await screen.findByText('행사1')).toBeInTheDocument()
    expect(screen.queryByText('행사2')).not.toBeInTheDocument()
    expect(await screen.findByText(/위치를 찾지 못한 행사 1개/)).toBeInTheDocument()
  })

  it('위치 권한이 거부되면 B5 안내를 보여주고 "지역으로 보기"로 닫는다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 30, events: [ev(1)] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao({ '충남 장소1': { x: '127.1', y: '36.8' } }))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) => err({ code: 1 }) },
    })
    renderMap()
    expect(await screen.findByText('위치 권한이 꺼져 있어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '지역으로 보기' }))
    expect(screen.queryByText('위치 권한이 꺼져 있어요')).not.toBeInTheDocument()
  })

  it('행사가 없으면 빈 상태', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 0, page: 1, size: 30, events: [] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao())
    renderMap('/map?is_free=true')
    expect(await screen.findByText('조건에 맞는 행사가 없어요')).toBeInTheDocument()
  })
})
