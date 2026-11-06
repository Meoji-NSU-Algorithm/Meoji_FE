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
import EventDetail from './EventDetail'
import Directions from './Directions'

vi.mock('../lib/kakaoMaps', () => ({ loadKakaoMaps: () => Promise.reject(new Error('no sdk')) }))

const openLoginPrompt = vi.fn()
function auth(loggedIn: boolean): AuthContextValue {
  return {
    user: loggedIn ? { id: 7, email: null, nickname: '민지', profile_image: null } : null,
    isLoading: false,
    isLoggedIn: loggedIn,
    loginWithKakaoCode: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isLoginPromptOpen: false,
    openLoginPrompt,
    closeLoginPrompt: vi.fn(),
  }
}

function renderAt(path: string, loggedIn = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth(loggedIn)}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/events/:id/directions" element={<Directions />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const baseEvent = {
  id: 1, title: '흥타령춤축제', category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: '천안종합운동장', image_url: null,
  price: null, is_free: true, description: '소개글', address: '천안시', address_detail: null, play_time: null,
  fee_text: null, latitude: 36.8, longitude: 127.1, organizer: null, contact_phone: null,
  homepage_url: null, is_permanent: false, review_count: 2, average_rating: 4.5,
  reviews: [
    { id: 1, user_id: 7, event_id: 1, rating: 4, content: '내 리뷰', created_at: '2026-10-23T00:00:00', updated_at: '' },
    { id: 2, user_id: 9, event_id: 1, rating: 5, content: '남의 리뷰', created_at: '2026-10-22T00:00:00', updated_at: '' },
    {
      id: 3, user_id: 10, event_id: 1, rating: 3, content: '작성자 있는 리뷰', created_at: '2026-10-21T00:00:00', updated_at: '',
      author: { id: 10, nickname: '하늘', profile_image: 'https://img.test/sky.png' },
    },
  ],
}

describe('EventDetail', () => {
  it('로그아웃 상태면 로그인 유도를 띄우고 플레이스홀더를 보여준다', async () => {
    renderAt('/events/1', false)
    expect(await screen.findByText('로그인하면 행사 상세를 볼 수 있어요')).toBeInTheDocument()
    expect(openLoginPrompt).toHaveBeenCalled()
  })

  it('EVENT_NOT_FOUND 는 404 를 보여준다', async () => {
    server.use(http.get('*/api/events/1', () => fail(404, 'EVENT_NOT_FOUND')))
    renderAt('/events/1')
    expect(await screen.findByText('행사를 찾을 수 없어요')).toBeInTheDocument()
  })

  it('작성자 정보가 있으면 닉네임과 프로필 사진을 보여준다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    expect(await screen.findByText('하늘')).toBeInTheDocument()
    const item = screen.getByText('작성자 있는 리뷰').closest('[data-testid="review-item"]')!
    expect(item.querySelector('img')).toHaveAttribute('src', 'https://img.test/sky.png')
  })

  it('내 리뷰만 수정/삭제 가능하고 작성자 정보가 없는 타인은 익명 라벨, 사진 추가는 비활성', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    expect(await screen.findByText('내 리뷰')).toBeInTheDocument()
    expect(screen.getByText('민지')).toBeInTheDocument()
    expect(screen.getByText('방문자')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '수정' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(1)
    await waitFor(() => expect(screen.getByTestId('mini-map-fallback')).toBeInTheDocument())
    // 내 리뷰가 있으면 작성 폼은 숨겨진다
    expect(screen.queryByRole('button', { name: '리뷰 등록' })).not.toBeInTheDocument()
  })

  it('삭제는 확인 모달을 거친다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(baseEvent)),
      http.delete('*/api/reviews/1', () => ok({})),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    expect(screen.getByRole('dialog', { name: '리뷰 삭제 확인' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: '삭제' }).at(-1)!)
    expect(await screen.findByText('리뷰를 삭제했어요')).toBeInTheDocument()
  })

  it('REVIEW_ALREADY_EXISTS 는 친절한 안내를 보여준다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok({ ...baseEvent, reviews: [], review_count: 0, average_rating: null })),
      http.post('*/api/reviews', () => fail(409, 'REVIEW_ALREADY_EXISTS')),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('radio', { name: '4점' }))
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 이 행사에 리뷰를 남기셨어요')
    expect(screen.getByRole('button', { name: /사진 추가/ })).toBeDisabled()
  })

  it('길찾기 링크는 directions 로 이동한다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    const link = await screen.findByRole('link', { name: /길찾기/ })
    expect(link).toHaveAttribute('href', '/events/1/directions')
  })
})

describe('Directions', () => {
  it('위치 권한이 없으면 출발지 변경(D2)이 열리고, 선택하면 경로를 보여준다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, err: (e: unknown) => void) => err({ code: 1 }) },
    })
    renderAt('/events/1/directions')
    expect(await screen.findByTestId('origin-picker')).toBeInTheDocument()
  })

  it('현재 위치가 있으면 모의 경로를 보여주고 도보 탭은 D3 를 보여준다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (cb: (p: unknown) => void) => cb({ coords: { latitude: 36.9, longitude: 127.2 } }) },
    })
    renderAt('/events/1/directions')
    expect(await screen.findByText('경로 안내')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /도보/ }))
    await waitFor(() => expect(screen.getByTestId('no-route')).toBeInTheDocument())
  })
})
