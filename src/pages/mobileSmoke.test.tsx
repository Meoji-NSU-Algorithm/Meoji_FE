/**
 * QA: 라우트별 스모크.
 *  - 1024px(데스크톱)에서 모든 라우트에 모바일 전용 요소(탭바·하단 고정 바·'뒤로' 헤더)가 없는지
 *  - 390px 에서 경로표대로 탭바/헤더가 나오는지 (실제 페이지 포함)
 *  - 모바일·데스크톱 트리가 동시에 마운트되어 API 를 두 번 부르지 않는지
 *  - 화면 폭이 390 ↔ 1024 로 바뀌어도 크래시가 없는지
 * 외부 호출 금지: 모든 요청은 MSW 로 받고, 처리 못 한 요청은 기록해 실패시킨다. 카카오 SDK 는 로드하지 않는다.
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../mocks/server'
import { bookmarkItemFixture, eventCardFixture, eventDetailFixture, fail, ok, reviewFixture } from '../mocks/handlers'
import App from '../App'
import { AuthProvider, tokenStorage } from '../auth'
import { ToastProvider } from '../components'
import { setViewportWidth } from '../test/viewport'

vi.mock('../lib/kakaoMaps', () => ({ loadKakaoMaps: () => new Promise(() => {}) }))

const calls = new Map<string, number>()
const unhandled: string[] = []
const urls: string[] = []
const hit = (key: string) => calls.set(key, (calls.get(key) ?? 0) + 1)

function mockApi() {
  server.use(
    http.get('*/api/users/me', () => (hit('me'), ok({ id: 1, email: 'a@b.c', nickname: '테스터', profile_image: null }))),
    http.get('*/api/users/me/consents', () =>
      ok({ terms_agreed_at: '2026-01-01', privacy_agreed_at: '2026-01-01', marketing_agreed: false, marketing_agreed_at: null }),
    ),
    http.get('*/api/events/categories', () => ok([{ id: 1, name: '공연', sort_order: 1 }])),
    http.get('*/api/events/sidos', () => ok([{ code: '44', name: '충청남도', short_name: '충남', sort_order: 1 }])),
    http.get('*/api/events/monthly-top', () => ok({ month: '2099-01', events: [] })),
    http.get('*/api/events/:id', ({ params }) => (hit(`event:${params.id}`), ok(eventDetailFixture({ id: Number(params.id) })))),
    http.get('*/api/events', ({ request }) => (hit('events'), urls.push(request.url), ok({ total_count: 1, page: 1, size: 12, events: [eventCardFixture()] }))),
    http.get('*/api/bookmarks', () => (hit('bookmarks'), ok({ totalCount: 1, events: [bookmarkItemFixture()] }))),
    http.get('*/api/reviews/my', () => (hit('myReviews'), ok([]))),
    http.get('*/api/reviews/event/:id/rating', () => ok({ average_rating: 4, review_count: 1 })),
    http.get('*/api/reviews/event/:id', ({ params }) => (hit(`reviews:${params.id}`), ok([reviewFixture()]))),
    http.get('*/api/directions/:id', () => (hit('directions'), fail(404, 'ROUTE_NOT_FOUND'))),
    http.post('*/api/auth/kakao', () => fail(400, 'BAD_CODE')),
    http.all('*', ({ request }) => {
      unhandled.push(`${request.method} ${request.url}`)
      return fail(599, 'UNHANDLED_IN_TEST')
    }),
  )
}

function renderAt(path: string, loggedIn = true) {
  if (loggedIn) tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  else tokenStorage.clear()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const tabBar = () => screen.queryByRole('navigation', { name: '하단 메뉴' })
const bottomBar = () => screen.queryByTestId('mobile-bottom-bar')
// 데스크톱 화면에도 '뒤로' 글자 버튼(MyProfile 등)이 있으므로 모바일 헤더의 아이콘 버튼(aria-label)만 본다
const backBtn = () => document.querySelector('header button[aria-label="뒤로"]')

/** 페이지 lazy 로드 + 첫 요청이 끝날 때까지 기다린다 */
async function settle() {
  await waitFor(() => expect(document.querySelector('main')?.childElementCount ?? 0).toBeGreaterThan(0), { timeout: 3000 }).catch(() => {})
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
}

const ALL_ROUTES = [
  '/',
  '/search',
  '/events',
  '/events/1',
  '/events/1/directions',
  '/calendar',
  '/map',
  '/my',
  '/my/bookmarks',
  '/my/reviews',
  '/my/profile',
  '/my/withdraw',
  '/my/withdraw/done',
  '/auth/login',
  '/auth/kakao/callback',
  '/auth/terms',
  '/terms',
  '/privacy',
  '/없는-주소',
]

beforeEach(() => {
  calls.clear()
  unhandled.length = 0
  urls.length = 0
  mockApi()
})
afterEach(() => {
  tokenStorage.clear()
  expect(unhandled, '처리 안 된(외부로 나갈 뻔한) 요청').toEqual([])
})

describe('데스크톱 1024px: 모바일 요소가 하나도 렌더되지 않는다', () => {
  it.each(ALL_ROUTES)('%s', async (path) => {
    renderAt(path)
    await settle()
    expect(tabBar()).toBeNull()
    expect(bottomBar()).toBeNull()
    expect(backBtn()).toBeNull()
    expect(document.querySelector('[data-testid="bottom-sheet-backdrop"]')).toBeNull()
  })
})

describe('767px / 768px 경계 (실제 페이지)', () => {
  it.each([
    ['/events', true, false],
    ['/my', true, false],
    ['/events/1', false, true],
    ['/my/profile', false, true],
    ['/terms', false, true],
  ])('%s: 767px 에서 탭바=%s, 뒤로=%s / 768px 에선 둘 다 없음', async (path, tab, back) => {
    setViewportWidth(767)
    const { unmount } = renderAt(path)
    await settle()
    expect(!!tabBar()).toBe(tab)
    expect(!!backBtn()).toBe(back)
    unmount()
    setViewportWidth(768)
    renderAt(path)
    await settle()
    expect(tabBar()).toBeNull()
    expect(backBtn()).toBeNull()
  })

  it('/events/1 상세: 767px 에선 하단 고정 바, 768px 에선 없음', async () => {
    setViewportWidth(767)
    const { unmount } = renderAt('/events/1')
    expect(await screen.findByTestId('mobile-bottom-bar')).toBeInTheDocument()
    unmount()
    setViewportWidth(768)
    renderAt('/events/1')
    await settle()
    expect(bottomBar()).toBeNull()
  })
})

describe('모바일·데스크톱 트리 중복 마운트 → API 중복 호출 없음', () => {
  const quiet = async (key: string) => {
    await waitFor(() => expect(calls.get(key) ?? 0).toBeGreaterThan(0), { timeout: 3000 })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300))
    })
  }

  // 앞 테스트의 늦은 요청이 섞이지 않게 테스트마다 다른 행사 id 를 쓴다
  it.each([[390, 101], [1024, 102]])('%ipx /events/:id: 상세·리뷰를 한 번씩만 부른다', async (w, id) => {
    setViewportWidth(w)
    renderAt(`/events/${id}`)
    await quiet(`event:${id}`)
    expect(calls.get(`event:${id}`)).toBe(1)
    expect(calls.get(`reviews:${id}`) ?? 0).toBeLessThanOrEqual(1)
  })

  it.each([390, 1024])('%ipx /events: 목록을 한 번만 부른다', async (w) => {
    setViewportWidth(w)
    renderAt('/events')
    await quiet('events')
    expect(urls, urls.join('\n')).toHaveLength(1)
  })

  it('390 → 1024 로 바뀌어도 같은 쿼리를 다시 부르지 않는다(캐시 재사용)', async () => {
    setViewportWidth(390)
    renderAt('/events/103')
    await quiet('event:103')
    setViewportWidth(1024)
    await quiet('event:103')
    expect(calls.get('event:103')).toBe(1)
  })
})

describe('뷰 폭 변경(390 ↔ 1024) 시 크래시 없음', () => {
  it.each(ALL_ROUTES)('%s', async (path) => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => {
      errors.push(a)
    })
    setViewportWidth(390)
    renderAt(path)
    await settle()
    setViewportWidth(1024)
    await settle()
    expect(tabBar()).toBeNull()
    expect(bottomBar()).toBeNull()
    setViewportWidth(390)
    await settle()
    setViewportWidth(1024)
    await settle()
    // 잔여 body 스크롤 잠금이 없어야 한다(열린 시트가 없으면)
    if (!document.querySelector('[role="dialog"]')) expect(document.body.style.overflow).toBe('')
    spy.mockRestore()
    const reactErrors = errors.filter((a) => /error boundary|Rendered (more|fewer) hooks|Maximum update depth|Cannot update a component/i.test(String((a as unknown[])[0])))
    expect(reactErrors).toEqual([])
  })
})
