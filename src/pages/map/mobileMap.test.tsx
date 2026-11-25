import { render, screen, waitFor, within } from '@testing-library/react'
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
import { setViewportWidth } from '../../test/viewport'
import MapPage from '../MapPage'
import { resetGeocodeCache } from './geocode'

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

const places = { '충남 장소1': { x: '127.1', y: '36.8' }, '충남 장소2': { x: '127.2', y: '36.9' }, '충남 장소3': { x: '127.3', y: '36.7' } }

describe('MapPage 모바일 (M3·S4·S5)', () => {
  beforeEach(() => {
    setViewportWidth(390)
    resetGeocodeCache()
    loadKakaoMaps.mockReset()
    // 기본은 위치 허용(S4). S5 테스트만 거부로 덮어쓴다.
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 36.8, longitude: 127.1 } }) },
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('S4 처음: 지도 위 시트에 지도 영역 안 행사 목록을 보여주고, 필터 패널·확대 버튼은 없다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 2, page: 1, size: 100, events: [ev(1), ev(2)] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao(places))
    renderMap()
    const sheet = await screen.findByRole('region', { name: '행사 목록' })
    expect(await within(sheet).findByText('행사1')).toBeInTheDocument()
    expect(sheet).toHaveTextContent('지도 영역 안 2개 행사')
    expect(screen.queryByRole('region', { name: '필터' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '확대' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내 위치' })).toBeInTheDocument()
  })

  it('M3 행사를 고르면 선택 카드와 이 지역 다른 행사를 보여주고, ✕ 로 해제한다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 3, page: 1, size: 100, events: [ev(1), ev(2), ev(3, { is_free: false, price: 15000 })] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao(places))
    renderMap()
    const sheet = await screen.findByRole('region', { name: '행사 목록' })
    await userEvent.click(await within(sheet).findByRole('button', { name: /행사3/ }))
    const card = within(sheet).getByRole('group', { name: '선택한 행사' })
    expect(card).toHaveTextContent('선택한 행사 · 축제')
    expect(card).toHaveTextContent('행사3')
    expect(within(card).getByRole('link', { name: '상세 보기 ›' })).toHaveAttribute('href', '/events/3')
    expect(sheet).toHaveTextContent('이 지역 다른 행사 2')
    expect(within(sheet).queryByRole('button', { name: /행사3/ })).not.toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: '선택 해제' }))
    expect(within(sheet).queryByRole('group', { name: '선택한 행사' })).not.toBeInTheDocument()
    expect(sheet).toHaveTextContent('지도 영역 안 3개 행사')
  })

  it('S5 위치 권한이 꺼지면 안내 카드를 띄우고 시트를 접는다. "지역으로 보기"로 닫으면 다시 펼친다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 100, events: [ev(1)] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao(places))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) => err({ code: 1 }) },
    })
    renderMap()
    expect(await screen.findByRole('alertdialog', { name: '위치 권한이 꺼져 있어요' })).toBeInTheDocument()
    const sheet = screen.getByRole('region', { name: '행사 목록' })
    expect(sheet).toHaveAttribute('data-expanded', 'false')
    await waitFor(() => expect(sheet).toHaveTextContent('지도 영역 안 1개 행사위로 끌어 올리면 목록이 펼쳐져요'))
    await userEvent.click(screen.getByRole('button', { name: '지역으로 보기' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(sheet).toHaveAttribute('data-expanded', 'true')
  })

  it('손잡이를 눌러 시트를 접고 펼친다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 100, events: [ev(1)] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao(places))
    renderMap()
    const sheet = await screen.findByRole('region', { name: '행사 목록' })
    await within(sheet).findByText('행사1')
    await userEvent.click(within(sheet).getByRole('button', { name: '목록 접기' }))
    expect(within(sheet).queryByText('행사1')).not.toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: '목록 펼치기' }))
    expect(within(sheet).getByText('행사1')).toBeInTheDocument()
  })

  it('위치를 못 찾은 행사가 있으면 위쪽 안내 줄을 보여준다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 2, page: 1, size: 100, events: [ev(1), ev(9)] })))
    loadKakaoMaps.mockResolvedValue(fakeKakao(places))
    renderMap()
    await waitFor(() => expect(screen.getByTestId('map-unlocated-notice')).toHaveTextContent('위치를 찾지 못한 행사 1개는 지도에 없어요'))
  })
})
