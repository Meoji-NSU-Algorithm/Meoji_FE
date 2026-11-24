import { render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth'
import { tokenStorage } from '../../auth/tokenStorage'
import { ToastProvider } from '../../components'
import { fail, ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import { setViewportWidth } from '../../test/viewport'
import Calendar from '../Calendar'
import EventList from '../EventList'

const card = (id: number, o: Record<string, unknown> = {}) => ({
  id,
  title: `행사${id}`,
  category_id: 1,
  category: '축제',
  sido_code: '44',
  sido: '충남',
  start_date: '2026-10-22',
  end_date: '2026-10-26',
  venue_name: '천안종합운동장',
  image_url: null,
  price: null,
  is_free: true,
  ...o,
})

const spy = { url: '' }
function LocationSpy() {
  const loc = useLocation()
  useEffect(() => {
    spy.url = loc.pathname + loc.search
  }, [loc])
  return null
}

function renderPage(ui: React.ReactElement, url: string, loggedIn = true) {
  if (loggedIn) tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  else tokenStorage.clear()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]}>
          <ToastProvider>
            <Routes>
              <Route path="*" element={<>{ui}<LocationSpy /></>} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  // 날짜 선택은 오늘 이전이 막혀 있으므로 '오늘'을 2026-11-24 로 고정한다(타이머는 진짜 그대로).
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 24, 10))
  setViewportWidth(390)
  server.use(
    http.get('*/api/events/sidos', () =>
      ok([
        { code: '11', name: '서울특별시', short_name: '서울', sort_order: 1 },
        { code: '44', name: '충청남도', short_name: '충남', sort_order: 2 },
      ]),
    ),
    http.get('*/api/events/categories', () => ok([{ id: 1, name: '축제', sort_order: 1 }, { id: 2, name: '공연', sort_order: 2 }])),
  )
})
afterEach(() => vi.useRealTimers())

describe('EventList 모바일 (M2)', () => {
  it('검색창은 /search 링크이고 리스트·캘린더·지도 전환 탭은 없다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [card(1)] })))
    renderPage(<EventList />, '/events?q=흥타령')
    await screen.findByRole('link', { name: '행사1' })
    const search = screen.getByRole('link', { name: '행사 검색: 흥타령' })
    expect(search).toHaveAttribute('href', `/search?q=${encodeURIComponent('흥타령')}`)
    expect(screen.queryByRole('navigation', { name: '보기 방식' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '행사 목록' })).toBeInTheDocument()
  })

  it('적용된 필터는 칩으로 보이고 ✕ 로 해제한다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 96, page: 1, size: 12, events: [card(1)] })))
    renderPage(<EventList />, '/events?sido_code=44&is_free=true')
    await screen.findByRole('link', { name: '행사1' })
    expect(screen.getByRole('button', { name: '필터 2개 적용됨' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: '충남 필터 해제' }))
    await waitFor(() => expect(spy.url).toBe('/events?is_free=true'))
  })

  it('필터 시트: 고른 값은 적용하기 전까지 URL에 반영되지 않고, 적용하면 반영된다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [card(1)] })))
    renderPage(<EventList />, '/events')
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '필터' }))
    const sheet = await screen.findByRole('dialog', { name: '필터' })
    await userEvent.click(within(sheet).getByRole('button', { name: '공연' }))
    await userEvent.click(await within(sheet).findByRole('button', { name: '충남' }))
    await userEvent.click(within(sheet).getByRole('button', { name: '무료' }))
    expect(spy.url).toBe('/events')
    await userEvent.click(within(sheet).getByRole('button', { name: '적용하기' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '필터' })).not.toBeInTheDocument())
    const sp = new URLSearchParams(spy.url.split('?')[1])
    expect(Object.fromEntries(sp)).toEqual({ category_id: '2', sido_code: '44', is_free: 'true' })
  })

  it('필터 시트의 초기화는 시트 안 값만 비우고, 적용하면 URL 필터가 모두 지워진다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [card(1)] })))
    renderPage(<EventList />, '/events?category_id=1&is_free=false&sort=popular')
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '필터 2개 적용됨' }))
    const sheet = await screen.findByRole('dialog', { name: '필터' })
    expect(within(sheet).getByRole('button', { name: '유료', pressed: true })).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: '초기화' }))
    expect(within(sheet).getByRole('button', { name: '유료', pressed: false })).toBeInTheDocument()
    expect(spy.url).toContain('is_free=false')
    await userEvent.click(within(sheet).getByRole('button', { name: '적용하기' }))
    await waitFor(() => expect(spy.url).toBe('/events?sort=popular'))
  })

  it('S3 기간 선택: 시작일·종료일을 고르면 필터 시트에 들어가고, 적용하면 URL에 반영된다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [card(1)] })))
    renderPage(<EventList />, '/events')
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '기간' }))
    const sheet = await screen.findByRole('dialog', { name: '필터' })
    await userEvent.click(within(sheet).getByRole('button', { name: '시작일' }))
    const picker = await screen.findByRole('dialog', { name: '기간 선택' })
    expect(within(picker).getByRole('heading', { name: '2026년 11월' })).toBeInTheDocument()
    expect(within(picker).getByRole('button', { name: '11월 23일' })).toBeDisabled()
    await userEvent.click(within(picker).getByRole('button', { name: '11월 24일' }))
    await userEvent.click(within(picker).getByRole('button', { name: '11월 30일' }))
    await userEvent.click(within(picker).getByRole('button', { name: '11.24 – 11.30 선택' }))
    expect(screen.queryByRole('dialog', { name: '기간 선택' })).not.toBeInTheDocument()
    expect(within(sheet).getByText('11.24 (화)')).toBeInTheDocument()
    expect(within(sheet).getByText('11.30 (월)')).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: '적용하기' }))
    await waitFor(() => expect(spy.url).toBe('/events?start_date=2026-11-24&end_date=2026-11-30'))
    expect(screen.getByRole('button', { name: '11.24 – 11.30 필터 해제' })).toBeInTheDocument()
  })

  it('비로그인이면 필터 버튼이 시트 대신 로그인 유도를 띄운다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [card(1)] })))
    renderPage(<EventList />, '/events', false)
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '필터' }))
    expect(screen.queryByRole('dialog', { name: '필터' })).not.toBeInTheDocument()
  })

  it('S1 결과가 없으면 검색어로 빈 상태를 보여주고 필터 초기화를 누를 수 있다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 0, page: 1, size: 12, events: [] })))
    renderPage(<EventList />, '/events?q=구름빵 축제&sido_code=44')
    expect(await screen.findByText('‘구름빵 축제’ 검색 결과가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '정렬' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '필터 초기화' }))
    await waitFor(() => expect(spy.url).toBe('/events'))
  })

  it('S2 불러오기에 실패하면 필터 줄 없이 다시 시도를 보여준다', async () => {
    let n = 0
    server.use(
      http.get('*/api/events', () => {
        n++
        return n === 1 ? fail(500, 'COMMON_INTERNAL') : ok({ total_count: 1, page: 1, size: 12, events: [card(7)] })
      }),
    )
    renderPage(<EventList />, '/events')
    expect(await screen.findByRole('alert')).toHaveTextContent('행사를 불러오지 못했어요')
    expect(screen.queryByRole('group', { name: '필터' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('link', { name: '행사7' })).toBeInTheDocument()
  })
})

describe('Calendar 모바일 (M4·S6)', () => {
  const bookmarks = (events: unknown[]) =>
    server.use(
      http.get('*/api/bookmarks', () => ok({ totalCount: events.length, events })),
      http.get('*/api/users/me', () => ok({ id: 1, email: null, nickname: '민', profile_image: null })),
    )

  it('가로 스크롤 없는 월 그리드를 그리고, 날짜를 누르면 그날 찜한 행사만 보여준다', async () => {
    bookmarks([
      { id: 1, title: '흥타령춤축제', imageUrl: null, startDate: '2026-11-22', endDate: '2026-11-26', priceType: 'FREE' },
      { id: 2, title: '정기공연', imageUrl: null, startDate: '2026-11-30', endDate: '2026-11-30', priceType: 'PAID' },
    ])
    renderPage(<Calendar />, '/calendar')
    expect(await screen.findByRole('heading', { level: 2, name: '2026년 11월' })).toBeInTheDocument()
    expect(document.querySelector('.min-w-\\[760px\\]')).toBeNull()
    expect(await screen.findByText('11월에 찜한 행사')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '흥타령춤축제' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '정기공연' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '11월 30일' }))
    expect(screen.getByRole('heading', { name: '11월 30일 찜한 행사' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '흥타령춤축제' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '정기공연' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '11월 전체' }))
    expect(screen.getByText('11월에 찜한 행사')).toBeInTheDocument()
  })

  it('S6 이번 달 찜한 행사가 없으면 빈 상태와 행사 둘러보기를 보여준다', async () => {
    bookmarks([])
    renderPage(<Calendar />, '/calendar')
    expect(await screen.findByText('이번 달 찜한 행사가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '행사 둘러보기' })).toHaveAttribute('href', '/events')
  })
})
