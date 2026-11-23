import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/AuthContext'
import type { AuthContextValue } from '../../auth/AuthContext'
import { ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import { TagSection } from './Sections'
import { BE_TAG_DICTIONARY } from './utils'

const auth = (isLoggedIn: boolean): AuthContextValue => ({
  user: isLoggedIn ? { id: 7, email: null, nickname: '민지', profile_image: null } : null,
  isLoading: false,
  isLoggedIn,
  loginWithKakaoCode: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoginPromptOpen: false,
  openLoginPrompt: vi.fn(),
  closeLoginPrompt: vi.fn(),
})

function Where() {
  const l = useLocation()
  return <p data-testid="where">{l.pathname + l.search}</p>
}

function setup(isLoggedIn = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth(isLoggedIn)}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<TagSection />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const countsBy = (counts: Record<string, number>, seen?: string[]) =>
  http.get('*/api/events', ({ request }) => {
    const tag = new URL(request.url).searchParams.get('tag') ?? ''
    seen?.push(tag)
    return ok({ total_count: counts[tag] ?? 1, page: 1, size: 1, events: [] })
  })

describe('TagSection (태그로 찾는 기획전, Figma 3차 DR3·DR4)', () => {
  it('태그 사전 10개를 모두 사전 순서대로 5열 그리드에 나열한다', async () => {
    const seen: string[] = []
    server.use(countsBy({}, seen))
    setup()
    await waitFor(() => expect(seen).toHaveLength(10))
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.querySelector('span')?.textContent?.slice(1))).toEqual([...BE_TAG_DICTIONARY])
    expect(links[0]).toHaveTextContent('하늘을 수놓는 밤')
    expect(links[0].parentElement).toHaveClass('grid-cols-5')
    expect(links[0]).toHaveClass('promo-card', 'h-[168px]')
  })

  it('결과가 0건인 태그 카드만 숨기고 나머지는 순서를 지킨다', async () => {
    server.use(countsBy({ 불꽃놀이: 0, 전시: 0 }))
    setup()
    await waitFor(() => expect(screen.queryByText('#불꽃놀이')).not.toBeInTheDocument())
    expect(screen.queryByText('#전시')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(8)
    expect(screen.getAllByRole('link')[0]).toHaveTextContent('#푸드트럭')
  })

  it('건수를 못 받은 태그는 숨기지 않는다', async () => {
    server.use(http.get('*/api/events', () => new Response('x', { status: 500 })))
    setup()
    expect(await screen.findAllByRole('link')).toHaveLength(10)
    await new Promise((r) => setTimeout(r, 30))
    expect(screen.getAllByRole('link')).toHaveLength(10)
  })

  it('비로그인에게는 건수 요청을 보내지 않는다 (필터 목록은 401)', async () => {
    const seen: string[] = []
    server.use(countsBy({}, seen))
    setup(false)
    expect(screen.getAllByRole('link')).toHaveLength(10)
    await new Promise((r) => setTimeout(r, 30))
    expect(seen).toEqual([])
  })

  it('카드를 누르면 /events?tag= 로 이동한다', async () => {
    server.use(countsBy({}))
    setup()
    await userEvent.click(await screen.findByRole('link', { name: /#불꽃놀이/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('/events?tag=%EB%B6%88%EA%BD%83%EB%86%80%EC%9D%B4')
  })
})
