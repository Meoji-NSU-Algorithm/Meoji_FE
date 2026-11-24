/** QA: 검색 화면 보강 — /search?q 초기값, 최근 검색 저장·중복·최대치·삭제·깨진 저장값, 데스크톱 리다이렉트 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider, consumeReturnTo, tokenStorage } from '../../auth'
import { ToastProvider } from '../../components'
import Layout from '../../layout/Layout'
import Search from '../Search'
import { setViewportWidth } from '../../test/viewport'
import { RECENT_KEY, RECENT_MAX, readRecent } from './recentSearches'

function Where() {
  const l = useLocation()
  return <div data-testid="where">{l.pathname + l.search}</div>
}

function setup(path = '/search', loggedIn = true) {
  if (loggedIn) tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
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
afterEach(() => tokenStorage.clear())
const stored = () => JSON.parse(localStorage.getItem(RECENT_KEY) ?? 'null')

describe('/search?q 초기값', () => {
  it('q 가 입력창에 미리 들어간다(앞뒤 공백 제거)', () => {
    setViewportWidth(390)
    setup('/search?q=%20%EB%B6%88%EA%BD%83%20')
    expect(screen.getByRole('searchbox', { name: '행사 검색' })).toHaveValue('불꽃')
  })

  it('q 가 없으면 빈 입력창', () => {
    setViewportWidth(390)
    setup('/search')
    expect(screen.getByRole('searchbox', { name: '행사 검색' })).toHaveValue('')
  })

  it('목록 검색창 링크(/search?q=)를 통해 들어와 그대로 제출하면 같은 q 로 돌아간다', async () => {
    setViewportWidth(390)
    setup('/search?q=%EB%B6%88%EA%BD%83')
    await userEvent.click(screen.getByRole('button', { name: '검색' }))
    expect(await screen.findByTestId('where')).toHaveTextContent('/events?q=%EB%B6%88%EA%BD%83')
  })
})

describe('최근 검색', () => {
  it('공백만 입력하면 저장·이동하지 않는다', async () => {
    setViewportWidth(390)
    setup()
    await userEvent.type(screen.getByRole('searchbox', { name: '행사 검색' }), '   {Enter}')
    expect(screen.queryByTestId('where')).toBeNull()
    expect(localStorage.getItem(RECENT_KEY)).toBeNull()
  })

  it('UI 로 같은 말을 다시 검색하면 중복 없이 맨 앞으로 온다', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['a', 'b', 'c']))
    setViewportWidth(390)
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'c' }))
    expect(stored()).toEqual(['c', 'a', 'b'])
  })

  it(`최대 ${RECENT_MAX}개: 꽉 찬 상태에서 새 검색어를 넣으면 가장 오래된 것이 빠진다`, async () => {
    const full = Array.from({ length: RECENT_MAX }, (_, i) => `q${i}`)
    localStorage.setItem(RECENT_KEY, JSON.stringify(full))
    setViewportWidth(390)
    setup()
    await userEvent.type(screen.getByRole('searchbox', { name: '행사 검색' }), '새말{Enter}')
    expect(stored()).toEqual(['새말', ...full.slice(0, RECENT_MAX - 1)])
  })

  it('로그인 전에도 최근 검색은 저장되고, 로그인 후 돌아갈 경로가 남는다', async () => {
    setViewportWidth(390)
    setup('/search', false)
    await userEvent.type(screen.getByRole('searchbox', { name: '행사 검색' }), '불꽃{Enter}')
    expect(await screen.findByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
    expect(stored()).toEqual(['불꽃'])
    expect(consumeReturnTo()).toBe('/events?q=%EB%B6%88%EA%BD%83')
  })

  it('저장값이 깨졌거나 배열이 아니거나 너무 많으면 안전하게 읽는다', () => {
    localStorage.setItem(RECENT_KEY, '{not json')
    expect(readRecent()).toEqual([])
    localStorage.setItem(RECENT_KEY, JSON.stringify({ a: 1 }))
    expect(readRecent()).toEqual([])
    localStorage.setItem(RECENT_KEY, JSON.stringify(['ok', 3, null, 'ok2']))
    expect(readRecent()).toEqual(['ok', 'ok2'])
    localStorage.setItem(RECENT_KEY, JSON.stringify(Array.from({ length: RECENT_MAX + 5 }, (_, i) => `x${i}`)))
    expect(readRecent()).toHaveLength(RECENT_MAX)
  })

  it('마지막 하나를 지우면 저장 키도 지워지고 섹션이 사라진다', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['하나']))
    setViewportWidth(390)
    setup()
    await userEvent.click(screen.getByRole('button', { name: '하나 삭제' }))
    expect(localStorage.getItem(RECENT_KEY)).toBeNull()
    expect(screen.queryByRole('region', { name: '최근 검색' })).toBeNull()
  })
})

describe('데스크톱 /search 리다이렉트', () => {
  it('q 없이 열면 /events 로', async () => {
    setViewportWidth(1024)
    setup('/search')
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/events$/)
  })

  it('768px 경계에서도 리다이렉트, 767px 은 검색 화면', async () => {
    setViewportWidth(767)
    const { unmount } = setup('/search?q=a')
    expect(screen.getByRole('searchbox', { name: '행사 검색' })).toBeInTheDocument()
    unmount()
    setViewportWidth(768)
    setup('/search?q=a')
    expect(await screen.findByTestId('where')).toHaveTextContent('/events?q=a')
  })

  it('검색 화면을 연 채 390 → 1024 로 바뀌면 입력 중인 값이 아니라 처음 q 로 /events 이동', async () => {
    setViewportWidth(390)
    setup('/search?q=a')
    await userEvent.type(screen.getByRole('searchbox', { name: '행사 검색' }), 'bc')
    setViewportWidth(1024)
    expect(await screen.findByTestId('where')).toHaveTextContent('/events?q=a')
  })
})
