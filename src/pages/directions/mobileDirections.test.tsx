import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/AuthContext'
import type { AuthContextValue } from '../../auth/AuthContext'
import { ToastProvider } from '../../components'
import { fail, ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import { setViewportWidth } from '../../test/viewport'
import Directions from '../Directions'

vi.mock('../../lib/kakaoMaps', () => ({ loadKakaoMaps: () => Promise.reject(new Error('no sdk')) }))
const geo = vi.hoisted(() => ({ ok: true }))
vi.mock('./geocode', () => ({
  getCurrentPosition: () => (geo.ok ? Promise.resolve({ lat: 36.9, lng: 127.2 }) : Promise.reject(new Error('denied'))),
  searchPlaces: async () => [
    { name: '천안역', address: '충남 천안시 동남구 대흥로 239', lat: 36.81, lng: 127.14 },
    { name: '천안종합버스터미널', address: '충남 천안시 동남구 만남로 43', lat: 36.82, lng: 127.15 },
  ],
}))

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

const event = {
  id: 1, title: '흥타령춤축제', category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: '천안종합운동장',
  price: null, is_free: true, description: '', address: '천안시', address_detail: null, play_time: null,
  fee_text: null, image_url: null, latitude: 36.8, longitude: 127.1, organizer: null, contact_phone: null,
  homepage_url: null, is_permanent: false, review_count: 0, average_rating: null, reviews: [],
}

const transit = {
  eventId: 1, mode: 'transit', departureTime: '2026-11-06T09:00:00+09:00', durationMinutes: 27, distanceMeters: 7800,
  arrivalTime: '2026-11-06T09:27:00+09:00',
  steps: [
    { stepNumber: 1, type: 'WALK', instruction: '정류장까지 걷기', durationMinutes: 4, distanceMeters: 280, detail: null },
    { stepNumber: 2, type: 'BUS', instruction: '24번 버스 이용: 남서울대 승차 → 천안역 하차', durationMinutes: 12, distanceMeters: 5000, detail: '경유 정류장 정보 6개' },
  ],
}
const car = {
  ...transit, mode: 'car', durationMinutes: 16, distanceMeters: 9400,
  steps: Array.from({ length: 8 }, (_, i) => ({ stepNumber: i + 1, type: 'DRIVE', instruction: `${i + 1}번 안내`, durationMinutes: 1, distanceMeters: 100 * (i + 1), detail: null })),
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

describe('모바일 길찾기 (390px)', () => {
  beforeEach(() => {
    geo.ok = true
    setViewportWidth(390)
  })

  it('M6: 지도 아래 제목·출발/도착 카드·수단 탭·경로 카드, 범례와 데스크톱 뒤로 링크는 없다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', () => ok(transit)),
    )
    renderPage()
    expect(await screen.findByTestId('route-summary')).toHaveTextContent('27분')
    expect(screen.getByRole('heading', { level: 1, name: '흥타령춤축제 가는 길' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /대중교통/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('남서울대 승차')).toBeInTheDocument()
    expect(screen.getByTestId('route-end')).toHaveTextContent('천안종합운동장')
    expect(screen.queryByTestId('route-legend')).not.toBeInTheDocument()
    expect(screen.queryByText('행사 상세로 돌아가기')).not.toBeInTheDocument()
  })

  it('S15: 자동차 탭은 단계 5개만 보이고 "전체 N단계 보기"로 편다', async () => {
    const modes: string[] = []
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', ({ request }) => {
        const m = new URL(request.url).searchParams.get('mode') ?? 'transit'
        modes.push(m)
        return ok(m === 'car' ? car : transit)
      }),
    )
    renderPage()
    await screen.findByTestId('route-summary')
    await userEvent.click(screen.getByRole('tab', { name: /자동차/ }))
    await waitFor(() => expect(screen.getByTestId('route-summary')).toHaveTextContent('16분'))
    expect(modes).toContain('car')
    expect(screen.getAllByTestId('route-step')).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: /전체 8단계 보기/ }))
    expect(screen.getAllByTestId('route-step')).toHaveLength(8)
    await userEvent.click(screen.getByRole('button', { name: /접기/ }))
    expect(screen.getAllByTestId('route-step')).toHaveLength(5)
  })

  it('S13: 출발지 변경은 하단 시트로 열리고, 검색 결과를 고르면 그 출발지로 다시 조회한다', async () => {
    const origins: string[] = []
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', ({ request }) => {
        origins.push(new URL(request.url).searchParams.get('originLat') ?? '')
        return ok(transit)
      }),
    )
    renderPage()
    await screen.findByTestId('route-summary')
    await userEvent.click(screen.getByRole('button', { name: '출발지 변경' }))
    const sheet = screen.getByRole('dialog', { name: '출발지 변경' })
    expect(within(sheet).getByText('현재 위치로 설정')).toBeInTheDocument()
    await userEvent.type(within(sheet).getByLabelText('출발지 검색'), '천안{Enter}')
    const pick = await within(sheet).findByRole('button', { name: /천안종합버스터미널/ })
    await userEvent.click(pick)
    expect(screen.queryByRole('dialog', { name: '출발지 변경' })).not.toBeInTheDocument()
    await waitFor(() => expect(origins).toContain('36.82'))
    expect(screen.getAllByText('천안종합버스터미널').length).toBeGreaterThan(0)
  })

  it('S13: 시트의 취소로 닫는다. 위치 권한이 없으면 처음부터 시트가 열린다', async () => {
    geo.ok = false
    server.use(http.get('*/api/events/1', () => ok(event)))
    renderPage()
    const sheet = await screen.findByRole('dialog', { name: '출발지 변경' })
    expect(within(sheet).getByRole('status')).toHaveTextContent('현재 위치를 사용할 수 없어요')
    await userEvent.click(within(sheet).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog', { name: '출발지 변경' })).not.toBeInTheDocument()
  })

  it('S14: 도보 경로가 없으면 안내와 "대중교통으로 보기"를 보여 준다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(event)),
      http.get('*/api/directions/1', ({ request }) =>
        new URL(request.url).searchParams.get('mode') === 'walk' ? fail(404, 'ROUTE_NOT_FOUND') : ok(transit),
      ),
    )
    renderPage()
    await screen.findByTestId('route-summary')
    await userEvent.click(screen.getByRole('tab', { name: /도보/ }))
    const box = await screen.findByTestId('no-route')
    expect(box).toHaveTextContent('이 방법으로는 경로를 찾지 못했어요')
    await userEvent.click(within(box).getByRole('button', { name: '대중교통으로 보기' }))
    expect(screen.getByRole('tab', { name: /대중교통/ })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByTestId('route-summary')).toHaveTextContent('27분')
  })
})
