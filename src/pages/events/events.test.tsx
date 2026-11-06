import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../auth'
import { tokenStorage } from '../../auth/tokenStorage'
import { ToastProvider } from '../../components'
import { fail, ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import Calendar from '../Calendar'
import EventList from '../EventList'
import { buildMonth, eventsInMonth } from './calendarGrid'
import { pageItems } from './pageItems'
import { hasLoginFilters, parseEventParams } from './useEventFilters'

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

function renderPage(ui: React.ReactElement, url: string, loggedIn = true) {
  if (loggedIn) tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  else tokenStorage.clear()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]}>
          <ToastProvider>{ui}</ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('parseEventParams', () => {
  it('유효한 값만 남기고 나머지는 버린다', () => {
    const p = parseEventParams(
      new URLSearchParams('q= 흥타령 &category_id=2&is_free=false&sort=bogus&page=0&size=500&start_date=2026-10-1&foo=1'),
    )
    expect(p).toEqual({ q: '흥타령', category_id: 2, is_free: false })
  })
  it('sort/page만 있으면 로그인 필터가 아니다', () => {
    expect(hasLoginFilters(parseEventParams(new URLSearchParams('sort=popular&page=2')))).toBe(false)
    expect(hasLoginFilters(parseEventParams(new URLSearchParams('sido_code=44')))).toBe(true)
  })
})

describe('pageItems', () => {
  it('많으면 생략 표시를 넣는다', () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageItems(1, 8)).toEqual([1, 2, 3, 4, 5, 'gap', 8])
    expect(pageItems(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12])
  })
})

describe('buildMonth', () => {
  it('여러 주에 걸친 행사를 주별 막대로 쪼갠다', () => {
    const e = card(1) as never
    const weeks = buildMonth(2026, 10, [e])
    expect(weeks).toHaveLength(5)
    expect(weeks[0].days[0].date).toBe('2026-09-27')
    const segs = weeks.flatMap((w, i) => w.segments.map((s) => ({ i, ...s })))
    expect(segs.map((s) => [s.i, s.startCol, s.endCol, s.startsHere, s.endsHere])).toEqual([
      [3, 4, 6, true, false],
      [4, 0, 1, false, true],
    ])
  })
  it('겹치는 행사는 다른 레인에 둔다', () => {
    const weeks = buildMonth(2026, 10, [card(1) as never, card(2, { start_date: '2026-10-23', end_date: '2026-10-23' }) as never])
    expect(weeks[3].segments.map((s) => s.lane).sort()).toEqual([0, 1])
    expect(eventsInMonth([card(3, { start_date: '2026-11-01', end_date: '2026-11-02' }) as never], 2026, 10)).toHaveLength(0)
  })
})

describe('EventList', () => {
  it('목록과 총 건수를 보여주고 필터를 쿼리로 보낸다', async () => {
    let url = ''
    server.use(
      http.get('*/api/events/sidos', () => ok([{ code: '44', name: '충청남도', short_name: '충남', sort_order: 1 }])),
      http.get('*/api/events', ({ request }) => {
        url = request.url
        return ok({ total_count: 96, page: 1, size: 12, events: [card(1), card(2)] })
      }),
    )
    renderPage(<EventList />, '/events?category_id=1&sido_code=44&is_free=true&sort=popular&page=2')
    expect(await screen.findByRole('link', { name: '행사1' })).toBeInTheDocument()
    expect(screen.getByText('96')).toBeInTheDocument()
    const sp = new URL(url).searchParams
    expect(Object.fromEntries(sp)).toMatchObject({ category_id: '1', sido_code: '44', is_free: 'true', sort: 'popular', page: '2' })
    const filters = screen.getByRole('region', { name: '필터' })
    expect(await within(filters).findByRole('button', { name: '충남', pressed: true })).toBeInTheDocument()
  })

  it('결과가 없으면 B2 빈 상태와 필터 초기화를 보여준다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 0, page: 1, size: 12, events: [] })))
    renderPage(<EventList />, '/events?q=구름빵')
    expect(await screen.findByText('‘구름빵’ 검색 결과가 없어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '필터 초기화' }))
    await waitFor(() => expect(screen.queryByText(/검색 결과가 없어요/)).not.toBeInTheDocument())
  })

  it('실패하면 B6 오류 상태에서 다시 시도할 수 있다', async () => {
    let n = 0
    server.use(
      http.get('*/api/events', () => {
        n++
        return n === 1 ? fail(500, 'COMMON_INTERNAL') : ok({ total_count: 1, page: 1, size: 12, events: [card(7)] })
      }),
    )
    renderPage(<EventList />, '/events')
    expect(await screen.findByText('행사를 불러오지 못했어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('link', { name: '행사7' })).toBeInTheDocument()
  })

  it('비로그인 + 필터면 요청을 보내지 않고 로그인 안내를 보여준다', async () => {
    let called = false
    server.use(http.get('*/api/events', () => { called = true; return ok({ total_count: 0, page: 1, size: 12, events: [] }) }))
    renderPage(<EventList />, '/events?q=축제', false)
    expect(await screen.findByText('로그인이 필요해요')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('비로그인에서 필터 없이는 목록이 보인다', async () => {
    server.use(http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [card(5)] })))
    renderPage(<EventList />, '/events', false)
    expect(await screen.findByRole('link', { name: '행사5' })).toBeInTheDocument()
  })
})

describe('Calendar', () => {
  it('찜한 행사를 월 그리드와 하단 목록에 보여준다', async () => {
    localStorage.setItem('cheonanon.mock.bookmarks.1', JSON.stringify([card(1, { title: '흥타령춤축제' })]))
    server.use(http.get('*/api/users/me', () => ok({ id: 1, email: null, nickname: '민', profile_image: null })))
    renderPage(<Calendar />, '/calendar')
    // 현재 월(테스트 실행 시점)과 무관하게 이전/다음 달 이동 후 10월로 맞춘다.
    const heading = await screen.findByRole('heading', { level: 2, name: /\d+년 \d+월/ })
    const m = /(\d+)년 (\d+)월/.exec(heading.textContent!)!
    const diff = (2026 - Number(m[1])) * 12 + (10 - Number(m[2]))
    for (let i = 0; i < Math.abs(diff); i++) {
      await userEvent.click(screen.getByRole('button', { name: diff > 0 ? '다음 달' : '이전 달' }))
    }
    expect(screen.getByRole('heading', { level: 2, name: '2026년 10월' })).toBeInTheDocument()
    expect((await screen.findAllByRole('link', { name: '흥타령춤축제' })).length).toBeGreaterThanOrEqual(3) // 막대 2주 + 카드
    expect(screen.getByText('10월에 찜한 행사')).toBeInTheDocument()
  })

  it('비로그인이면 로그인 안내', async () => {
    renderPage(<Calendar />, '/calendar', false)
    expect(await screen.findByText('로그인이 필요해요')).toBeInTheDocument()
  })
})
