import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import {
  MobileBottomBar,
  MobileHeaderActions,
  MobileHeaderTitle,
  ToastProvider,
  useToast,
} from '../components'
import { setViewportWidth } from '../test/viewport'
import Layout from './Layout'
import { getMobileRoute } from './mobileRoutes'

const auth = (loggedIn = true): AuthContextValue => ({
  user: loggedIn ? { id: 7, email: null, nickname: '민지', profile_image: null } : null,
  isLoading: false,
  isLoggedIn: loggedIn,
  loginWithKakaoCode: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoginPromptOpen: false,
  openLoginPrompt: vi.fn(),
  closeLoginPrompt: vi.fn(),
})

const grabbed: { api?: ReturnType<typeof useToast> } = {}
function ToastGrab() {
  const api = useToast()
  useEffect(() => {
    grabbed.api = api
  })
  return null
}

function renderAt(path: string, page: React.ReactNode = <div>본문</div>, loggedIn = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth(loggedIn)}>
        <ToastProvider>
          <ToastGrab />
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="*" element={page} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const tabBar = () => screen.queryByRole('navigation', { name: '하단 메뉴' })

describe('모바일 탭바 표시/숨김 (MOBILE_ROUTES)', () => {
  it.each(['/', '/events', '/map', '/calendar', '/my', '/my/bookmarks', '/my/reviews', '/없는-주소'])(
    '%s 에서는 탭바가 보인다',
    (path) => {
      setViewportWidth(390)
      renderAt(path)
      expect(tabBar()).toBeInTheDocument()
    },
  )

  it.each([
    '/events/12',
    '/events/12/directions',
    '/search',
    '/auth/login',
    '/auth/kakao/callback',
    '/auth/terms',
    '/my/profile',
    '/my/withdraw',
    '/my/withdraw/done',
    '/terms',
    '/privacy',
  ])('%s 에서는 탭바를 숨긴다', (path) => {
    setViewportWidth(390)
    renderAt(path)
    expect(tabBar()).not.toBeInTheDocument()
  })

  it('768px 이상에서는 탭바가 없고 기존 헤더 nav·푸터가 그대로다', () => {
    setViewportWidth(768)
    renderAt('/events')
    expect(tabBar()).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '주 메뉴' })).toBeInTheDocument()
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('getMobileRoute: 모르는 경로는 404 규칙(탭바 보임)', () => {
    expect(getMobileRoute('/nope')).toMatchObject({ tabBar: true, header: 'main' })
    expect(getMobileRoute('/events/3')).toMatchObject({ tabBar: false, header: 'back', title: 'logo' })
  })
})

describe('모바일 탭바 활성 탭', () => {
  it.each([
    ['/', '홈'],
    ['/events', '행사 목록'],
    ['/map', '지도'],
    ['/calendar', '캘린더'],
    ['/my', '마이'],
    ['/my/bookmarks', '마이'],
    ['/my/reviews', '마이'],
  ])('%s → %s', (path, label) => {
    setViewportWidth(390)
    renderAt(path)
    const current = within(tabBar()!)
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page')
    expect(current.map((a) => a.textContent)).toEqual([label])
  })

  it('404 에서는 어느 탭도 켜지지 않는다', () => {
    setViewportWidth(390)
    renderAt('/없는-주소')
    expect(within(tabBar()!).getAllByRole('link').some((a) => a.hasAttribute('aria-current'))).toBe(false)
  })
})

describe('모바일 헤더', () => {
  it('로그인 후: 로고 + 프로필 동그라미만 (nav·검색·캘린더 아이콘 없음)', () => {
    setViewportWidth(390)
    renderAt('/events')
    expect(screen.getByRole('link', { name: 'meoji 홈' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '민지 마이페이지' })).toHaveAttribute('href', '/my')
    expect(screen.queryByRole('navigation', { name: '주 메뉴' })).not.toBeInTheDocument()
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.queryByText('캘린더', { selector: 'header *' })).not.toBeInTheDocument()
  })

  it('로그인 전: 로그인 버튼', () => {
    setViewportWidth(390)
    renderAt('/', undefined, false)
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('푸터는 홈에서만', () => {
    setViewportWidth(390)
    const { unmount } = renderAt('/')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    unmount()
    renderAt('/events')
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })

  it("'뒤로' 화면은 기본 제목이 보이고, 페이지가 제목·오른쪽 액션을 바꿀 수 있다", () => {
    setViewportWidth(390)
    const { unmount } = renderAt('/my/profile')
    expect(screen.getByRole('button', { name: '뒤로' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '프로필 편집' })).toBeInTheDocument()
    unmount()

    renderAt(
      '/terms',
      <>
        <MobileHeaderTitle>이용약관</MobileHeaderTitle>
        <MobileHeaderActions>
          <button type="button">공유</button>
        </MobileHeaderActions>
      </>,
    )
    const header = screen.getByRole('button', { name: '뒤로' }).closest('header')!
    expect(within(header).getByRole('heading', { name: '이용약관' })).toBeInTheDocument()
    expect(within(header).queryByText('약관 및 정책')).not.toBeInTheDocument()
    expect(within(header).getByRole('button', { name: '공유' })).toBeInTheDocument()
  })

  it('데스크톱에서는 MobileHeaderTitle/Actions 가 아무것도 그리지 않는다', () => {
    renderAt(
      '/terms',
      <MobileHeaderActions>
        <button type="button">공유</button>
      </MobileHeaderActions>,
    )
    expect(screen.queryByRole('button', { name: '공유' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '뒤로' })).not.toBeInTheDocument()
  })

  it("'뒤로' 를 누르면 이전 화면으로", async () => {
    setViewportWidth(390)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={auth()}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/my', '/my/profile']} initialIndex={1}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/my" element={<div>마이 본문</div>} />
                  <Route path="/my/profile" element={<div>편집 본문</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }))
    // MemoryRouter 는 history.state 를 쓰지 않아 기록이 없다고 보고 홈으로 간다 — 이동 자체만 확인
    expect(screen.queryByText('편집 본문')).not.toBeInTheDocument()
  })
})

describe('토스트 위치', () => {
  const position = () => screen.getByRole('status').parentElement!.getAttribute('data-position')

  it('데스크톱은 기존 위치', () => {
    renderAt('/events')
    act(() => grabbed.api!.show({ message: '찜했어요' }))
    expect(position()).toBe('desktop')
    expect(screen.getByRole('status').parentElement).toHaveClass('bottom-8')
  })

  it('모바일 + 탭바: 탭바 위', () => {
    setViewportWidth(390)
    renderAt('/events')
    act(() => grabbed.api!.show({ message: '찜했어요' }))
    expect(position()).toBe('tab-bar')
    expect(screen.getByRole('status').parentElement).toHaveClass('bottom-[calc(var(--tabbar-h)+12px)]', 'inset-x-4')
  })

  it('모바일 + 탭바·버튼 없음: 바닥에서 28px', () => {
    setViewportWidth(390)
    renderAt('/my/profile')
    act(() => grabbed.api!.show({ message: '저장했어요' }))
    expect(position()).toBe('none')
    expect(screen.getByRole('status').parentElement).toHaveClass('bottom-[calc(var(--mobile-safe-bottom)+10px)]')
  })

  it('모바일 + 하단 고정 버튼: 버튼 바 위 12px', () => {
    setViewportWidth(390)
    renderAt(
      '/events/3',
      <MobileBottomBar>
        <button type="button">길찾기</button>
      </MobileBottomBar>,
    )
    act(() => grabbed.api!.show({ message: '찜했어요' }))
    expect(position()).toBe('bottom-bar')
    // jsdom 은 높이를 못 재서 Figma 기본 높이 89 + 12
    expect(screen.getByRole('status').parentElement).toHaveStyle({ bottom: '101px' })
  })
})
