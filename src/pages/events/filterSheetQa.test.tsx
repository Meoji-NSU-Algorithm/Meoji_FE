/**
 * QA: 필터 시트 임시 상태 vs 적용, 로그인 전 로그인 유도, 겹친 기간 시트, 열린 시트 + 뷰 폭 변경.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth'
import { tokenStorage } from '../../auth/tokenStorage'
import { ToastProvider } from '../../components'
import { ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import { setViewportWidth } from '../../test/viewport'
import Layout from '../../layout/Layout'
import EventList from '../EventList'

const card = (id: number) => ({
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
})

const spy = { url: '' }
function LocationSpy() {
  const loc = useLocation()
  useEffect(() => {
    spy.url = loc.pathname + loc.search
  }, [loc])
  return null
}

function renderList(url = '/events', loggedIn = true) {
  if (loggedIn) tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  else tokenStorage.clear()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[url]}>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="events" element={<><EventList /><LocationSpy /></>} />
              </Route>
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 24, 10))
  document.body.style.overflow = ''
  setViewportWidth(390)
  server.use(
    http.get('*/api/events/sidos', () => ok([{ code: '44', name: '충청남도', short_name: '충남', sort_order: 2 }])),
    http.get('*/api/events/categories', () => ok([{ id: 1, name: '축제', sort_order: 1 }, { id: 2, name: '공연', sort_order: 2 }])),
    http.get('*/api/events', () => ok({ total_count: 1, page: 1, size: 12, events: [card(1)] })),
  )
})
afterEach(() => {
  vi.useRealTimers()
  tokenStorage.clear()
})

describe('필터 시트 임시 상태 vs 적용', () => {
  it('고르고 닫으면(X) URL 그대로, 다시 열면 임시 값이 사라지고 URL 값으로 시작한다', async () => {
    renderList('/events?is_free=false')
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '필터 1개 적용됨' }))
    let sheet = await screen.findByRole('dialog', { name: '필터' })
    await userEvent.click(within(sheet).getByRole('button', { name: '공연' }))
    await userEvent.click(within(sheet).getByRole('button', { name: '무료' }))
    await userEvent.click(within(sheet).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog', { name: '필터' })).toBeNull()
    expect(spy.url).toBe('/events?is_free=false')

    await userEvent.click(screen.getByRole('button', { name: '필터 1개 적용됨' }))
    sheet = await screen.findByRole('dialog', { name: '필터' })
    expect(within(sheet).getByRole('button', { name: '유료', pressed: true })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: '공연', pressed: false })).toBeInTheDocument()
  })

  it('ESC·배경 클릭으로 닫아도 적용되지 않는다', async () => {
    renderList()
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '필터' }))
    let sheet = await screen.findByRole('dialog', { name: '필터' })
    await userEvent.click(within(sheet).getByRole('button', { name: '무료' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '필터' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: '요금' }))
    sheet = await screen.findByRole('dialog', { name: '필터' })
    await userEvent.click(within(sheet).getByRole('button', { name: '무료' }))
    fireEvent.mouseDown(screen.getByTestId('bottom-sheet-backdrop'))
    expect(screen.queryByRole('dialog', { name: '필터' })).toBeNull()
    expect(spy.url).toBe('/events')
  })

  it('적용하면 page 가 1로 돌아가고 tag·q·sort 는 유지된다', async () => {
    renderList('/events?q=불꽃&tag=야간&sort=popular&page=3')
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '필터 1개 적용됨' }))
    const sheet = await screen.findByRole('dialog', { name: '필터' })
    await userEvent.click(within(sheet).getByRole('button', { name: '무료' }))
    await userEvent.click(within(sheet).getByRole('button', { name: '적용하기' }))
    await waitFor(() => expect(spy.url).toContain('is_free=true'))
    const sp = Object.fromEntries(new URLSearchParams(spy.url.split('?')[1]))
    expect(sp).toEqual({ q: '불꽃', tag: '야간', sort: 'popular', is_free: 'true' })
  })
})

describe('로그인 전 필터', () => {
  it('필터 버튼·바로가기 칩을 누르면 시트 대신 로그인 유도 시트가 뜬다', async () => {
    renderList('/events', false)
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '필터' }))
    expect(screen.queryByRole('dialog', { name: '필터' })).toBeNull()
    expect(await screen.findByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument() // 모바일은 시트 모양
    await userEvent.click(screen.getByRole('button', { name: '다음에 할게요' }))
    await userEvent.click(screen.getByRole('button', { name: '기간' }))
    expect(screen.queryByRole('dialog', { name: '필터' })).toBeNull()
    expect(await screen.findByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
  })

  it('로그인 전에 필터 URL 로 들어오면 목록 대신 로그인 필요 상태', async () => {
    renderList('/events?is_free=true', false)
    expect(await screen.findByText('로그인이 필요해요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '로그인하기' }))
    expect(await screen.findByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
  })
})

describe('겹친 기간 시트 + 뷰 폭 변경', () => {
  async function openDatePicker() {
    renderList()
    await screen.findByRole('link', { name: '행사1' })
    await userEvent.click(screen.getByRole('button', { name: '기간' }))
    const sheet = await screen.findByRole('dialog', { name: '필터' })
    await userEvent.click(within(sheet).getByRole('button', { name: '무료' }))
    await userEvent.click(within(sheet).getByRole('button', { name: '시작일' }))
    await screen.findByRole('dialog', { name: '기간 선택' })
  }

  // 회귀 방지(QA 버그 수정됨): 예전엔 ESC 한 번에 '기간 선택'과 '필터' 시트가 함께 닫혀 필터 임시 선택(무료)을 잃는다.
  it('기간 선택 시트에서 ESC 를 누르면 기간 시트만 닫히고 필터 시트·임시 선택은 남는다', async () => {
    await openDatePicker()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '기간 선택' })).toBeNull()
    const sheet = screen.getByRole('dialog', { name: '필터' })
    expect(within(sheet).getByRole('button', { name: '무료', pressed: true })).toBeInTheDocument()
  })

  it('시트 두 개가 열린 채 390 → 1024 로 바뀌어도 크래시 없이 데스크톱 목록이 된다', async () => {
    await openDatePicker()
    setViewportWidth(1024)
    expect(screen.queryByRole('dialog', { name: '필터' })).toBeNull()
    expect(screen.queryByRole('dialog', { name: '기간 선택' })).toBeNull()
    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeInTheDocument()
  })

  // 회귀 방지(QA 버그 수정됨): 예전엔 위 상황에서 두 시트가 동시에 언마운트되며 body overflow 가 'hidden' 으로 남아 데스크톱 페이지가 스크롤되지 않는다.
  it('시트 두 개가 열린 채 390 → 1024 로 바뀌면 body 스크롤 잠금이 풀린다', async () => {
    await openDatePicker()
    setViewportWidth(1024)
    expect(document.body.style.overflow).toBe('')
  })
})
