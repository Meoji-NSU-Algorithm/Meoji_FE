import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { ToastProvider } from '../components'
import { fail, ok } from '../mocks/handlers'
import { server } from '../mocks/server'
import Directions from './Directions'

vi.mock('../lib/kakaoMaps', () => ({ loadKakaoMaps: () => Promise.reject(new Error('no sdk')) }))

const auth: AuthContextValue = {
  user: { id: 7, email: null, nickname: '민지', profile_image: null },
  isLoading: false,
  isLoggedIn: true,
  loginWithKakaoCode: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoginPromptOpen: false,
  openLoginPrompt: vi.fn(),
  closeLoginPrompt: vi.fn(),
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/events/1/directions']}>
            <Routes>
              <Route path="/events/:id/directions" element={<Directions />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const event = {
  id: 1, title: '흥타령춤축제', category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: '천안종합운동장', thumbnail_url: null,
  price: null, is_free: true, description: '', address: '천안시', address_detail: null, play_time: null,
  fee_text: null, image_url: null, latitude: 36.8, longitude: 127.1, organizer: null, contact_phone: null,
  homepage_url: null, is_permanent: false, review_count: 0, average_rating: null, reviews: [],
}

const result = (mode: string, over: Record<string, unknown> = {}) => ({
  eventId: 1, mode, departureTime: '2026-11-06T09:00:00+09:00', durationMinutes: 35, distanceMeters: 12000,
  arrivalTime: '2026-11-06T09:35:00+09:00',
  steps: [
    { stepNumber: 1, type: 'WALK', instruction: '정류장까지 걷기', durationMinutes: 5, distanceMeters: 300, detail: null },
    { stepNumber: 2, type: 'SUBWAY', instruction: '1호선 승차', durationMinutes: 25, distanceMeters: 11000, detail: '출발역 2번 출구' },
    { stepNumber: 3, type: 'WALK', instruction: '직진', durationMinutes: 1, distanceMeters: 50, detail: { point: '교차로', turn: '좌회전', facility: null } },
  ],
  ...over,
})

function geo(ok_: boolean) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (cb: (p: unknown) => void, err: (e: unknown) => void) =>
        ok_ ? cb({ coords: { latitude: 36.9, longitude: 127.2 } }) : err({ code: 1 }),
    },
  })
}

describe('Directions', () => {
  it('대중교통 경로의 요약과 단계를 보여준다', async () => {
    geo(true)
    const modes: Array<string | null> = []
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', ({ request }) => {
        const u = new URL(request.url)
        modes.push(u.searchParams.get('mode'))
        expect(u.searchParams.get('originLat')).toBe('36.9')
        return ok(result('transit'))
      }),
    )
    renderPage()
    expect(await screen.findByText('경로 안내')).toBeInTheDocument()
    expect(modes[0]).toBe('transit')
    const summary = screen.getByTestId('route-summary')
    expect(summary).toHaveTextContent('35분')
    expect(summary).toHaveTextContent('12.0km')
    expect(summary).toHaveTextContent('09:35')
    expect(screen.getAllByTestId('route-step')).toHaveLength(3)
    expect(screen.getByText('출발역 2번 출구')).toBeInTheDocument()
    expect(screen.getByText('교차로 · 좌회전')).toBeInTheDocument()
  })

  it('탭을 바꾸면 해당 mode 로 요청한다', async () => {
    geo(true)
    const modes: Array<string | null> = []
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', ({ request }) => {
        const m = new URL(request.url).searchParams.get('mode')
        modes.push(m)
        return ok(result(m ?? 'transit', { durationMinutes: m === 'car' ? 20 : m === 'walk' ? 150 : 35 }))
      }),
    )
    renderPage()
    await screen.findByText('경로 안내')
    await userEvent.click(screen.getByRole('tab', { name: /자동차/ }))
    await waitFor(() => expect(modes).toContain('car'))
    await waitFor(() => expect(screen.getByTestId('route-summary')).toHaveTextContent('20분'))
    await userEvent.click(screen.getByRole('tab', { name: /도보/ }))
    await waitFor(() => expect(modes).toContain('walk'))
    await waitFor(() => expect(screen.getByTestId('route-summary')).toHaveTextContent('2시간 30분'))
  })

  it('자동차 경로 단계가 5개를 넘으면 펼치기/접기 토글이 동작한다', async () => {
    geo(true)
    const many = Array.from({ length: 8 }, (_, i) => ({
      stepNumber: i + 1, type: 'DRIVE', instruction: `${i + 1}번 안내`, durationMinutes: 1, distanceMeters: 100 * (i + 1), detail: null,
    }))
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', ({ request }) => {
        const m = new URL(request.url).searchParams.get('mode') ?? 'transit'
        return ok(m === 'car' ? result('car', { steps: many }) : result(m))
      }),
    )
    renderPage()
    await screen.findByText('경로 안내')
    expect(screen.queryByRole('button', { name: /단계 보기/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /자동차/ }))
    const toggle = await screen.findByRole('button', { name: '전체 8단계 보기' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByTestId('route-step')).toHaveLength(5)
    await userEvent.click(toggle)
    expect(screen.getAllByTestId('route-step')).toHaveLength(8)
    const collapse = screen.getByRole('button', { name: '접기' })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(collapse)
    expect(screen.getAllByTestId('route-step')).toHaveLength(5)
  })

  it('ROUTE_NOT_FOUND 면 경로 없음 상태를 보여준다', async () => {
    geo(true)
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', () => fail(404, 'ROUTE_NOT_FOUND')),
    )
    renderPage()
    const noRoute = await screen.findByTestId('no-route')
    expect(noRoute).toBeInTheDocument()
    expect(screen.getByText('다른 이동 수단을 고르거나 출발지를 바꿔 보세요', { exact: true })).toBeInTheDocument()
    expect(noRoute).not.toHaveTextContent('이 조건으로 이용할 수 있는 경로를 찾지 못했어요')
  })

  it('길찾기 API 가 404 COMMON_NOT_FOUND 를 주면 크래시 없이 오류 상태를 보여준다', async () => {
    geo(true)
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', () => fail(404, 'COMMON_NOT_FOUND')),
    )
    renderPage()
    const error = await screen.findByTestId('directions-error')
    expect(error).toHaveTextContent('요청한 페이지를 찾을 수 없어요.')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.queryByTestId('no-route')).not.toBeInTheDocument()
  })

  it('DIRECTIONS_API_ERROR(502) 면 에러와 재시도를 보여주고 재시도하면 경로가 나온다', async () => {
    geo(true)
    let calls = 0
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', () => (++calls === 1 ? fail(502, 'DIRECTIONS_API_ERROR') : ok(result('transit')))),
    )
    renderPage()
    const box = await screen.findByTestId('directions-error')
    expect(box).toHaveTextContent('길찾기 서비스에 문제가 생겼어요')
    await userEvent.click(screen.getByRole('button', { name: /다시 시도|재시도/ }))
    expect(await screen.findByText('경로 안내')).toBeInTheDocument()
  })

  it('위치 권한이 없으면 출발지 선택(D2)이 열린다', async () => {
    geo(false)
    server.use(http.get('*/api/events/1', () => ok(event)))
    renderPage()
    expect(await screen.findByTestId('origin-picker')).toBeInTheDocument()
  })
})
