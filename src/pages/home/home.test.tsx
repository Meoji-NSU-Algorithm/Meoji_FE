import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { fail, ok } from '../../mocks/handlers'
import { AuthProvider } from '../../auth'
import { ToastProvider } from '../../components'
import Layout from '../../layout/Layout'
import Home from '../Home'
import KakaoCallback from '../KakaoCallback'
import Terms from '../Terms'
import { tokenStorage } from '../../auth'

const ev = (id: number, over = {}) => ({
  id, title: `행사${id}`, category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2099-01-01', end_date: '2099-01-02', venue_name: '장소', image_url: null, price: null, is_free: true, ...over,
})

function setup(path: string, strict = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const tree = (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="auth/kakao/callback" element={<KakaoCallback />} />
                <Route path="auth/terms" element={<Terms />} />
                <Route path="events/:id" element={<div>상세 화면</div>} />
              </Route>
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

describe('Home (비로그인)', () => {
  it('필터 없는 목록 하나로 섹션을 그리고, 하트를 누르면 로그인 유도 모달을 연다', async () => {
    const urls: string[] = []
    server.use(
      http.get('*/api/events/monthly-top', () => ok({ month: '2099-01', events: [{ ...ev(1), monthly_views: 10 }] })),
      http.get('*/api/events', ({ request }) => {
        urls.push(request.url)
        return ok({ total_count: 2, page: 1, size: 100, events: [ev(2), ev(3)] })
      }),
    )
    setup('/')
    await screen.findAllByText('행사2')
    expect(urls.length).toBe(1)
    const u = new URL(urls[0])
    expect([...u.searchParams.keys()].sort()).toEqual(['page', 'size', 'sort'])
    await userEvent.click(screen.getAllByRole('button', { name: '찜하기' })[0])
    expect(await screen.findByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /로그인하면 이 행사를\s*바로 찜해 둘게요/ })).toBeInTheDocument()
    expect(screen.getByText('방금 고른 행사')).toBeInTheDocument()
  })

  it('목록 호출이 실패하면 섹션에 에러와 다시 시도를 보여준다', async () => {
    server.use(
      http.get('*/api/events/monthly-top', () => ok({ month: '2099-01', events: [] })),
      http.get('*/api/events', () => fail(500, 'INTERNAL')),
    )
    setup('/')
    expect((await screen.findAllByText('행사를 불러오지 못했어요')).length).toBeGreaterThan(0)
  })
})

describe('KakaoCallback', () => {
  it('?error 이면 실패 화면을 보여준다', () => {
    setup('/auth/kakao/callback?error=access_denied')
    expect(screen.getByText('로그인을 완료하지 못했어요')).toBeInTheDocument()
  })

  it('StrictMode에서도 인가 코드를 한 번만 교환하고 신규 사용자는 약관으로 보낸다', async () => {
    let calls = 0
    server.use(
      http.post('*/api/auth/kakao', () => {
        calls += 1
        return ok({ access_token: 'a', refresh_token: 'r', is_new_user: true })
      }),
    )
    setup('/auth/kakao/callback?code=abc', true)
    expect(screen.getByText('카카오 계정을 확인하고 있어요')).toBeInTheDocument()
    expect(await screen.findByText('거의 다 됐어요!')).toBeInTheDocument()
    expect(calls).toBe(1)
    tokenStorage.clear()
  })

  it('교환 실패 시 실패 화면', async () => {
    server.use(http.post('*/api/auth/kakao', () => fail(401, 'KAKAO_TOKEN_REQUEST_FAILED')))
    setup('/auth/kakao/callback?code=bad')
    await waitFor(() => expect(screen.getByText('로그인을 완료하지 못했어요')).toBeInTheDocument())
  })
})
