import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { AuthProvider, tokenStorage } from '../auth'
import { ToastProvider } from '../components'
import { ok } from '../mocks/handlers'
import { server } from '../mocks/server'
import { setViewportWidth } from '../test/viewport'
import KakaoCallback from './KakaoCallback'
import Login from './Login'
import Policy from './Policy'
import Terms from './Terms'

const auth: AuthContextValue = {
  user: null,
  isLoading: false,
  isLoggedIn: false,
  loginWithKakaoCode: vi.fn(() => new Promise<never>(() => {})),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoginPromptOpen: false,
  openLoginPrompt: vi.fn(),
  closeLoginPrompt: vi.fn(),
}

function withAuth(ui: React.ReactNode, entry = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[entry]}>
          <ToastProvider>{ui}</ToastProvider>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

beforeEach(() => setViewportWidth(390))
afterEach(() => tokenStorage.clear())

describe('M8 로그인 (390px)', () => {
  it('250px 콜라주 띠 + 닫기, 카드 안 카카오 버튼·둘러보기, 데스크톱 957px 장식은 그리지 않는다', async () => {
    server.use(
      http.get('*/api/events/sidos', () => ok([{ code: '11', name: '서울', short_name: '서울', sort_order: 1 }])),
      http.get('*/api/events/categories', () => ok([])),
      http.get('*/api/events', () => ok({ total_count: 1284, page: 1, size: 1, events: [] })),
    )
    const { container } = withAuth(<Login />)
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('오늘 행사 뭐지?고민될 땐 머지에서')
    expect(screen.getByRole('button', { name: '카카오로 시작하기' })).toHaveClass('h-[52px]')
    expect(screen.getByRole('link', { name: '로그인 없이 둘러보기 ›' })).toHaveAttribute('href', '/')
    expect(container.ownerDocument.querySelector('.w-\\[957px\\]')).toBeNull()
    expect(await screen.findByText('1,284')).toBeInTheDocument()
  })
})

describe('M8-2·M8-3 카카오 콜백 (390px)', () => {
  it('처리 중: 안내 카드(처음/다시 오셨다면)', () => {
    withAuth(<KakaoCallback />, '/auth/kakao/callback?code=abc')
    const status = screen.getByRole('status')
    expect(within(status).getByText('카카오 계정을 확인하고 있어요')).toBeInTheDocument()
    expect(within(status).getByText('약관 동의 화면으로')).toBeInTheDocument()
    expect(within(status).getByText('보던 화면으로 바로')).toBeInTheDocument()
  })
  it('실패: 둘러보기 / 카카오색 다시 로그인', () => {
    withAuth(<KakaoCallback />, '/auth/kakao/callback?error=access_denied')
    expect(screen.getByRole('heading', { name: '로그인을 완료하지 못했어요' })).toHaveClass('text-[20px]')
    expect(screen.getByRole('link', { name: '둘러보기' })).toHaveAttribute('href', '/')
    const retry = screen.getByRole('link', { name: '다시 로그인' })
    expect(retry).toHaveAttribute('href', '/auth/login')
    expect(retry).toHaveClass('bg-kakao')
  })
})

describe('M8-4 약관 동의 (390px)', () => {
  function setup() {
    tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    return render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/auth/terms']}>
            <ToastProvider>
              <Routes>
                <Route path="/" element={<div>홈 화면</div>} />
                <Route path="auth/login" element={<div>로그인 화면</div>} />
                <Route path="auth/terms" element={<Terms />} />
              </Routes>
            </ToastProvider>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )
  }

  it('네모 체크박스, 필수 둘이면 바닥 버튼이 켜진다', async () => {
    setup()
    const start = await screen.findByRole('button', { name: '동의하고 시작하기' })
    expect(start).toHaveClass('h-[50px]')
    expect(start).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /이용약관/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /개인정보/ }))
    expect(start).toBeEnabled()
  })

  it("'보기'는 모달 대신 전체 화면 본문을 덮고, 뒤로로 닫으면 체크가 남아 있다", async () => {
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: /이용약관/ }))
    await userEvent.click(screen.getByRole('button', { name: '이용약관 보기' }))
    const screenEl = screen.getByRole('dialog', { name: '이용약관' })
    expect(screenEl).toHaveClass('fixed', 'inset-0')
    expect(screen.queryByTestId('policy-modal-body')).toBeNull()
    await userEvent.click(within(screenEl).getByRole('button', { name: '뒤로' }))
    expect(screen.queryByRole('dialog', { name: '이용약관' })).toBeNull()
    expect(screen.getByRole('checkbox', { name: /이용약관/ })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('M12 약관 및 정책 (390px)', () => {
  it('반반 탭 + 시행일 + 접히는 목차 + 조항', () => {
    render(
      <MemoryRouter>
        <Policy policyKey="terms" />
      </MemoryRouter>,
    )
    const tabs = screen.getByRole('tablist', { name: '약관 종류' })
    expect(within(tabs).getByRole('tab', { name: '이용약관' })).toHaveAttribute('aria-selected', 'true')
    expect(within(tabs).getByRole('tab', { name: '개인정보처리방침' })).toHaveClass('flex-1')
    expect(screen.getByText('목차')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '제1조 (목적)' })).toHaveClass('text-[15px]')
    expect(screen.queryByRole('heading', { name: '약관 및 정책' })).toBeNull()
  })
})
