import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { ok } from '../../mocks/handlers'
import { AuthProvider, consumeReturnTo, tokenStorage } from '../../auth'
import { ToastProvider } from '../../components'
import Layout from '../../layout/Layout'
import Search from '../Search'
import { setViewportWidth } from '../../test/viewport'
import { RECENT_KEY, RECENT_MAX, addRecentTo } from './recentSearches'

function Where() {
  const l = useLocation()
  return <div data-testid="where">{l.pathname + l.search}</div>
}

function setup(path = '/search') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<div>홈</div>} />
                <Route path="search" element={<Search />} />
                <Route path="events" element={<Where />} />
              </Route>
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const login = () => {
  tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  server.use(
    http.get('*/api/events/sidos', () =>
      ok([
        { code: '11', name: '서울특별시', short_name: '서울', sort_order: 1 },
        { code: '44', name: '충청남도', short_name: '충남', sort_order: 12 },
      ]),
    ),
  )
}

describe('검색 화면 M1-3 (390px)', () => {
  it('제출하면 최근 검색에 저장하고 /events?q= 로 간다', async () => {
    login()
    setViewportWidth(390)
    setup()
    const input = screen.getByRole('searchbox', { name: '행사 검색' })
    await userEvent.type(input, ' 불꽃 {Enter}')
    expect(await screen.findByTestId('where')).toHaveTextContent('/events?q=%EB%B6%88%EA%BD%83')
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['불꽃'])
    tokenStorage.clear()
  })

  it('최근 검색을 하나씩, 또는 전체 삭제한다', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['흥타령', '천안 공연', '무료 전시']))
    setViewportWidth(390)
    setup()
    const recent = screen.getByRole('region', { name: '최근 검색' })
    expect(within(recent).getByText('최근 검색은 이 기기에만 저장돼요.')).toBeInTheDocument()
    await userEvent.click(within(recent).getByRole('button', { name: '천안 공연 삭제' }))
    expect(within(recent).queryByText('천안 공연')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['흥타령', '무료 전시'])
    await userEvent.click(within(recent).getByRole('button', { name: '전체 삭제' }))
    expect(screen.queryByRole('region', { name: '최근 검색' })).not.toBeInTheDocument()
    expect(localStorage.getItem(RECENT_KEY)).toBeNull()
  })

  it('최근 검색은 중복을 맨 앞으로 모으고 최대 개수까지만 둔다', () => {
    let list: string[] = []
    for (let i = 0; i < RECENT_MAX + 3; i++) list = addRecentTo(list, `q${i}`)
    expect(list).toHaveLength(RECENT_MAX)
    expect(addRecentTo(list, `q${RECENT_MAX}`)[0]).toBe(`q${RECENT_MAX}`)
    expect(addRecentTo(list, `q${RECENT_MAX}`)).toHaveLength(RECENT_MAX)
  })

  it('태그를 누르면 /events?tag= 로, 지역을 누르면 /events?sido_code= 로 간다', async () => {
    login()
    setViewportWidth(390)
    setup()
    await userEvent.click(screen.getByRole('button', { name: '#야간' }))
    expect(await screen.findByTestId('where')).toHaveTextContent(`/events?tag=${encodeURIComponent('야간')}`)
    tokenStorage.clear()
  })

  it('지역 칸은 BE 시·도 코드로 바꿔 이동한다', async () => {
    login()
    setViewportWidth(390)
    setup()
    const regions = screen.getByRole('region', { name: '지역으로 찾기' })
    expect(within(regions).getAllByRole('button')).toHaveLength(17)
    const btn = within(regions).getByRole('button', { name: '충남' })
    await waitFor(() => expect(btn).toBeEnabled()) // 시·도 코드 응답 대기
    await userEvent.click(btn)
    expect(await screen.findByTestId('where')).toHaveTextContent('/events?sido_code=44')
    tokenStorage.clear()
  })

  it('로그인 전엔 결과로 가지 않고 로그인 시트를 띄우며, 돌아올 경로를 저장한다', async () => {
    setViewportWidth(390)
    setup()
    await userEvent.click(screen.getByRole('button', { name: '#꽃' }))
    expect(await screen.findByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
    expect(screen.queryByTestId('where')).not.toBeInTheDocument()
    expect(consumeReturnTo()).toBe(`/events?tag=${encodeURIComponent('꽃')}`)
  })

  it('768px 이상에서 /search 를 열면 q 를 들고 /events 로 바뀐다', async () => {
    login()
    setViewportWidth(1024)
    setup('/search?q=불꽃')
    expect(await screen.findByTestId('where')).toHaveTextContent('/events?q=%EB%B6%88%EA%BD%83')
    tokenStorage.clear()
  })
})
