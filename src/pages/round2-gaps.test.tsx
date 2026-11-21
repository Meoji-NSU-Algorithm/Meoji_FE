import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { errorMessage } from '../api/errors'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { AuthProvider, tokenStorage } from '../auth'
import { ToastProvider } from '../components'
import { categoryGradient } from '../components/categoryGradient'
import { directionsFixture, eventCardFixture, eventDetailFixture, fail, ok } from '../mocks/handlers'
import { server } from '../mocks/server'
import Directions from './Directions'
import EventList from './EventList'
import Home from './Home'

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

function geo() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (cb: (p: unknown) => void) => cb({ coords: { latitude: 36.9, longitude: 127.2 } }) },
  })
}

function renderDirections() {
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

const steps = (n: number, type = 'DRIVE') =>
  Array.from({ length: n }, (_, i) => ({
    stepNumber: i + 1, type, instruction: `${i + 1}번 안내`, durationMinutes: 1, distanceMeters: 100 * (i + 1), detail: null,
  }))

describe('길찾기 보강', () => {
  it('504 DIRECTIONS_API_TIMEOUT 은 지연 안내 문구와 다시 시도를 보여준다', async () => {
    geo()
    server.use(
      http.get('*/api/events/1', () => ok(eventDetailFixture({ id: 1 }))),
      http.get('*/api/directions/1', () => fail(504, 'DIRECTIONS_API_TIMEOUT')),
    )
    renderDirections()
    expect(await screen.findByTestId('directions-error')).toHaveTextContent('길찾기 서버가 잠시 응답하지 않아요')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('처음에는 눌린 탭(대중교통) 하나만 조회하고, 탭을 눌러야 그 수단을 조회한다', async () => {
    geo()
    const modes: Array<string | null> = []
    server.use(
      http.get('*/api/events/1', () => ok(eventDetailFixture({ id: 1 }))),
      http.get('*/api/directions/1', ({ request }) => {
        const m = new URL(request.url).searchParams.get('mode')
        modes.push(m)
        return ok(directionsFixture({ mode: m }))
      }),
    )
    renderDirections()
    await screen.findByTestId('route-summary')
    expect(modes).toEqual(['transit'])
    await userEvent.click(screen.getByRole('tab', { name: /자동차/ }))
    await waitFor(() => expect(modes).toEqual(['transit', 'car']))
  })

  it('단계가 많아도 접지 않고 모두 보여준다(목록 스크롤)', async () => {
    geo()
    for (const n of [5, 8]) {
      server.use(
        http.get('*/api/events/1', () => ok(eventDetailFixture({ id: 1 }))),
        http.get('*/api/directions/1', () => ok(directionsFixture({ mode: 'car', steps: steps(n) }))),
      )
      const { unmount } = renderDirections()
      await screen.findByTestId('route-summary')
      await userEvent.click(screen.getByRole('tab', { name: /자동차/ }))
      await waitFor(() => expect(screen.getAllByTestId('route-step').length).toBe(n))
      expect(screen.queryByRole('button', { name: /단계 보기/ })).not.toBeInTheDocument()
      unmount()
    }
  })

  it('대중교통 안내문을 해석하지 못하면 원문 그대로 보여준다', async () => {
    geo()
    server.use(
      http.get('*/api/events/1', () => ok(eventDetailFixture({ id: 1 }))),
      http.get('*/api/directions/1', () =>
        ok(directionsFixture({
          mode: 'transit',
          steps: [{ stepNumber: 1, type: 'BUS', instruction: '알 수 없는 형식의 안내문', durationMinutes: 3, distanceMeters: 500, detail: null }],
        })),
      ),
    )
    renderDirections()
    expect(await screen.findByText('알 수 없는 형식의 안내문')).toBeInTheDocument()
  })

  it('transit 응답의 path 가 [{type,coordinates}] 모양이어도 화면이 깨지지 않는다', async () => {
    geo()
    server.use(
      http.get('*/api/events/1', () => ok(eventDetailFixture({ id: 1 }))),
      http.get('*/api/directions/1', () =>
        ok(directionsFixture({
          mode: 'transit',
          path: [
            { type: 'WALK', coordinates: [[36.9, 127.2], [36.91, 127.21]] },
            { type: 'BUS', coordinates: [[36.91, 127.21], [36.8, 127.1]] },
          ],
        })),
      ),
    )
    renderDirections()
    expect(await screen.findByTestId('route-summary')).toBeInTheDocument()
  })
})

describe('에러 문구', () => {
  it('길찾기·리뷰 사진 코드를 문구로 바꾸고, 모르는 코드는 일반 문구를 쓴다', () => {
    expect(errorMessage('DIRECTIONS_API_TIMEOUT')).toContain('늦어지고')
    expect(errorMessage('DIRECTIONS_API_SOMETHING_NEW')).toContain('길찾기 서비스에 문제')
    expect(errorMessage('REVIEW_IMAGE_STORAGE_UNAVAILABLE')).toContain('이미지 저장소')
    expect(errorMessage('REVIEW_IMAGE_WHATEVER')).toContain('사진을 처리하지 못했어요')
    expect(errorMessage(new ApiError(413, 'X', 'x'))).toContain('너무 커요')
    expect(errorMessage(new ApiError(500, 'ZZZ', 'x'))).toContain('잠시 문제가 생겼어요')
    expect(errorMessage(undefined)).toContain('잠시 문제가 생겼어요')
  })
})

describe('categoryGradient (사진 없음 색)', () => {
  it('분류마다 다른 그라데이션, 없거나 모르는 분류는 축제 색', () => {
    const all = ['축제', '공연', '전시', '체험', '계절행사'].map((c) => categoryGradient(c))
    expect(new Set(all).size).toBe(5)
    for (const c of [null, undefined, '', '없는분류']) expect(categoryGradient(c)).toBe(categoryGradient('축제'))
    expect(categoryGradient('공연', 90)).toContain('90deg')
  })
})

describe('카드 찜 실패 되돌리기 (목록·홈)', () => {
  const wrap = (ui: React.ReactElement) => {
    tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/events']}>
            <ToastProvider>{ui}</ToastProvider>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )
  }

  it('목록 카드: 찜 추가가 실패하면 하트를 되돌리고 다시 시도하면 성공한다', async () => {
    let posts = 0
    server.use(
      http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [eventCardFixture({ id: 1, title: '행사1' })] })),
      http.get('*/api/bookmarks', () => ok({ totalCount: 0, events: [] })),
      http.post('*/api/bookmarks', () => (++posts === 1 ? fail(500, 'COMMON_INTERNAL_ERROR') : ok({ eventId: 1, isBookmarked: true }, 201))),
    )
    wrap(<EventList />)
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '찜하기' }))
    expect(await screen.findByText(/찜하지 못했어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '찜하기' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('찜 목록에 담았어요!')).toBeInTheDocument()
    expect(posts).toBe(2)
    tokenStorage.clear()
  })

  it('목록 카드: 찜 해제 실패는 하트를 유지하고, 성공하면 되돌리기가 나온다', async () => {
    let deletes = 0
    server.use(
      http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [eventCardFixture({ id: 1, title: '행사1' })] })),
      http.get('*/api/bookmarks', () =>
        ok({ totalCount: 1, events: [{ id: 1, title: '행사1', imageUrl: null, startDate: '2026-01-01', endDate: '2026-12-31', priceType: 'FREE' }] })),
      http.delete('*/api/bookmarks/1', () => (++deletes === 1 ? fail(500, 'COMMON_INTERNAL_ERROR') : ok({ eventId: 1, isBookmarked: false }))),
    )
    wrap(<EventList />)
    const heart = await screen.findByRole('button', { name: '찜 해제' })
    await userEvent.click(heart)
    expect(await screen.findByText(/찜을 해제하지 못했어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '찜 해제' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('찜을 해제했어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '되돌리기' })).toBeInTheDocument()
    tokenStorage.clear()
  })

  it('홈 카드: 찜 추가 실패 시 하트를 되돌리고 실패 토스트를 보여준다', async () => {
    server.use(
      http.get('*/api/events/monthly-top', () => ok({ month: '2099-01', events: [] })),
      http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 100, events: [eventCardFixture({ id: 2, title: '행사2' })] })),
      http.get('*/api/bookmarks', () => ok({ totalCount: 0, events: [] })),
      http.post('*/api/bookmarks', () => fail(500, 'COMMON_INTERNAL_ERROR')),
    )
    wrap(<Home />)
    await screen.findAllByText('행사2')
    const heart = screen.getAllByRole('button', { name: '찜하기' })[0]
    await userEvent.click(heart)
    expect(await screen.findByText(/찜하지 못했어요/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '찜하기' })[0]).toHaveAttribute('aria-pressed', 'false')
    tokenStorage.clear()
  })
})
