import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { ok } from '../../mocks/handlers'
import { AuthProvider, tokenStorage } from '../../auth'
import { ToastProvider } from '../../components'
import Layout from '../../layout/Layout'
import Home from '../Home'
import { setViewportWidth } from '../../test/viewport'
import { ymd } from './utils'

const today = ymd(new Date())
const ev = (id: number, over = {}) => ({
  id, title: `행사${id}`, category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2099-01-01', end_date: '2099-01-02', venue_name: '장소', image_url: null, price: null, is_free: true, ...over,
})

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="search" element={<div>검색 화면</div>} />
              </Route>
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const listHandlers = (bookmarks: unknown[] = []) => [
  http.get('*/api/events/monthly-top', () => ok({ month: '2099-10', events: [{ ...ev(1), monthly_views: 10 }] })),
  http.get('*/api/events', () =>
    ok({ total_count: 3, page: 1, size: 100, events: [ev(2), ev(3, { start_date: today, end_date: '2099-12-31', is_free: false })] }),
  ),
  http.get('*/api/bookmarks', () => ok({ totalCount: bookmarks.length, events: bookmarks })),
]

describe('모바일 홈 (390px)', () => {
  it('로그인 전(M1-0): 검색창·카테고리·가입 안내 줄·섹션들을 모바일 모양으로 그린다', async () => {
    setViewportWidth(390)
    server.use(...listHandlers())
    setup()
    expect(await screen.findByTestId('mobile-home')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /행사명, 장소, 태그로 검색/ })).toHaveAttribute('href', '/search')
    const nav = screen.getByRole('navigation', { name: '카테고리' })
    expect(within(nav).getByRole('link', { name: '무료' })).toHaveAttribute('href', '/events?is_free=true')
    // 지도·캘린더는 탭바에 있어 카테고리 줄에선 뺀다
    expect(within(nav).queryByText('지도로 보기')).not.toBeInTheDocument()
    expect(screen.getByText('보고 싶은 행사, 찜해 두면 캘린더에 쏙')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '카카오로 시작' })).toBeInTheDocument()
    for (const name of ['이번 달 인기 행사', '지역별 행사', '곧 시작해요', '무료 행사', '이번 주말', '태그로 찾는 기획전']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    // 섹션 카드는 150px 가로 스크롤 줄
    const popular = screen.getByRole('region', { name: '이번 달 인기 행사' })
    const title = await within(popular).findByRole('link', { name: '행사1' })
    expect(title.closest('.w-\\[150px\\]')).not.toBeNull()
    // 히어로는 "1 / N"
    expect(await screen.findByText(/^1 \/ \d$/)).toBeInTheDocument()
    // 데스크톱 전용 가입 배너·화살표는 없다
    expect(screen.queryByRole('button', { name: '다음 배너' })).not.toBeInTheDocument()
  })

  it('검색창을 누르면 /search 로 간다', async () => {
    setViewportWidth(390)
    server.use(...listHandlers())
    setup()
    await userEvent.click(await screen.findByRole('link', { name: /행사명, 장소, 태그로 검색/ }))
    expect(await screen.findByText('검색 화면')).toBeInTheDocument()
  })

  it('로그인 후(M1): 이번 주 찜한 행사 개수와 캘린더 바로가기를 보여준다', async () => {
    tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
    setViewportWidth(390)
    server.use(
      ...listHandlers([
        { id: 7, title: '가을 정기공연', imageUrl: null, startDate: today, endDate: today, priceType: 'FREE' },
        { id: 8, title: '먼 행사', imageUrl: null, startDate: '2099-01-01', endDate: '2099-01-02', priceType: 'FREE' },
      ]),
    )
    setup()
    const strip = await screen.findByRole('link', { name: /이번 주 찜한 행사 1개/ })
    expect(strip).toHaveAttribute('href', '/calendar')
    expect(within(strip).getByText(/가을 정기공연/)).toBeInTheDocument()
    expect(screen.queryByText('보고 싶은 행사, 찜해 두면 캘린더에 쏙')).not.toBeInTheDocument()
    tokenStorage.clear()
  })

  it('하트를 누르면 로그인 유도가 하단 시트로 열린다(M1-2)', async () => {
    setViewportWidth(390)
    server.use(...listHandlers())
    setup()
    const free = await screen.findByRole('region', { name: '무료 행사' })
    await userEvent.click((await within(free).findAllByRole('button', { name: '찜하기' }))[0])
    const dialog = await screen.findByRole('dialog', { name: '로그인 안내' })
    expect(screen.getByTestId('bottom-sheet-backdrop')).toContainElement(dialog)
    expect(within(dialog).getByText('방금 고른 행사')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: /로그인하면 이 행사를\s*바로 찜해 둘게요/ })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '다음에 할게요' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('768px 이상에선 기존 데스크톱 홈을 그린다', async () => {
    setViewportWidth(1024)
    server.use(...listHandlers())
    setup()
    await screen.findAllByText('행사2')
    expect(screen.queryByTestId('mobile-home')).not.toBeInTheDocument()
  })
})
