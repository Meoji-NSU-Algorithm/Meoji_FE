import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { fail, ok } from '../mocks/handlers'
import { server } from '../mocks/server'
import Login from './Login'

const auth: AuthContextValue = {
  user: null,
  isLoading: false,
  isLoggedIn: false,
  loginWithKakaoCode: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoginPromptOpen: false,
  openLoginPrompt: vi.fn(),
  closeLoginPrompt: vi.fn(),
}

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const sido = (code: string) => ({ code, name: code, short_name: code, sort_order: 1 })

describe('로그인 화면 통계 (Figma 3차 DR8)', () => {
  it('공개 /events/sidos 의 개수를 \'전국 시·도\' 로 보여 준다', async () => {
    server.use(
      http.get('*/api/events/sidos', () => ok([sido('11'), sido('26'), sido('44')])),
      http.get('*/api/events/categories', () => ok([])),
      http.get('*/api/events', () => ok({ total_count: 1234, page: 1, size: 1, events: [] })),
    )
    setup()
    expect(await screen.findByText('전국 시·도')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('숫자를 받지 못한 통계 칸은 \'-\' 대신 칸째 숨긴다', async () => {
    server.use(
      http.get('*/api/events/sidos', () => fail(500, 'COMMON_INTERNAL_ERROR')),
      http.get('*/api/events/categories', () => ok([{ id: 1, name: '축제' }])),
      http.get('*/api/events', () => ok({ total_count: 7, page: 1, size: 1, events: [] })),
    )
    setup()
    expect(await screen.findByText('행사 분류')).toBeInTheDocument()
    expect(screen.queryByText('전국 시·도')).not.toBeInTheDocument()
    expect(screen.queryByText('-')).not.toBeInTheDocument()
  })
})
