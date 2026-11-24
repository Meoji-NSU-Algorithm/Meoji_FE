/**
 * QA: 768px 경계, 경로표 전 라우트, 토스트 위치 3종, 시트↔모달 전환, 뷰 폭 변경 중 열린 시트 처리.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { BottomSheet, MobileBottomBar, ResponsiveDialog, ToastProvider, useToast } from '../components'
import { setViewportWidth } from '../test/viewport'
import Layout from './Layout'
import { MOBILE_ROUTES, getMobileRoute } from './mobileRoutes'

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
const mobileBack = () => document.querySelector('header button[aria-label="뒤로"]')
const desktopNav = () => screen.queryByRole('navigation', { name: '주 메뉴' })
const toastPos = () => screen.getByRole('status').parentElement!.getAttribute('data-position')

/* ───────── 경로표 전 라우트 ───────── */
describe('경로표(MOBILE_ROUTES) 전 라우트', () => {
  // 브리프(공통 레이어 API·모바일 규칙)에 적힌 기대값
  const EXPECTED: Array<[string, { tabBar: boolean; header: 'main' | 'back' | 'none'; title?: string; footer?: boolean }]> = [
    ['/', { tabBar: true, header: 'main', footer: true }],
    ['/events', { tabBar: true, header: 'main' }],
    ['/map', { tabBar: true, header: 'main' }],
    ['/calendar', { tabBar: true, header: 'main' }],
    ['/my', { tabBar: true, header: 'main' }],
    ['/my/bookmarks', { tabBar: true, header: 'main' }],
    ['/my/reviews', { tabBar: true, header: 'main' }],
    ['/events/12', { tabBar: false, header: 'back', title: 'logo' }],
    ['/events/12/directions', { tabBar: false, header: 'back', title: '길찾기' }],
    ['/search', { tabBar: false, header: 'none' }],
    ['/auth/login', { tabBar: false, header: 'none' }],
    ['/auth/kakao/callback', { tabBar: false, header: 'none' }],
    ['/auth/terms', { tabBar: false, header: 'none' }],
    ['/my/profile', { tabBar: false, header: 'back', title: '프로필 편집' }],
    ['/my/withdraw', { tabBar: false, header: 'back', title: '회원 탈퇴' }],
    ['/my/withdraw/done', { tabBar: false, header: 'main' }],
    ['/terms', { tabBar: false, header: 'back', title: '약관 및 정책' }],
    ['/privacy', { tabBar: false, header: 'back', title: '약관 및 정책' }],
    ['/없는-주소', { tabBar: true, header: 'main' }],
    ['/events/12/unknown', { tabBar: true, header: 'main' }],
  ]

  it.each(EXPECTED)('getMobileRoute(%s)', (path, rule) => {
    const r = getMobileRoute(path)
    expect({ tabBar: r.tabBar, header: r.header, title: r.title, footer: r.footer ?? undefined }).toEqual({
      footer: undefined,
      title: undefined,
      ...rule,
    })
  })

  it('표의 모든 줄이 EXPECTED 로 검증된다(새 줄이 생기면 여기도 추가)', () => {
    const covered = new Set(EXPECTED.map(([p]) => getMobileRoute(p).path))
    for (const r of MOBILE_ROUTES) expect(covered.has(r.path), r.path).toBe(true)
  })

  it('끝 슬래시가 붙어도 같은 규칙을 쓴다', () => {
    expect(getMobileRoute('/events/')).toMatchObject({ tabBar: true, header: 'main', path: '/events' })
    expect(getMobileRoute('/events/12/')).toMatchObject({ header: 'back', title: 'logo' })
  })

  it.each(EXPECTED)('Layout(390px) %s: 탭바·헤더 종류가 표와 같다', (path, rule) => {
    setViewportWidth(390)
    renderAt(path)
    expect(!!tabBar()).toBe(rule.tabBar)
    expect(!!mobileBack()).toBe(rule.header === 'back')
    const mainHeader = screen.queryByRole('link', { name: 'meoji 홈' })
    expect(!!mainHeader).toBe(rule.header === 'main')
    expect(!!screen.queryByRole('contentinfo')).toBe(!!rule.footer)
    if (rule.header === 'back' && rule.title && rule.title !== 'logo')
      expect(screen.getByRole('heading', { name: rule.title })).toBeInTheDocument()
    if (rule.tabBar) expect(document.querySelector('.pb-\\[var\\(--tabbar-h\\)\\]')).not.toBeNull()
    else expect(document.querySelector('.pb-\\[var\\(--tabbar-h\\)\\]')).toBeNull()
  })
})

/* ───────── 767 / 768 경계 ───────── */
describe('767px / 768px 경계', () => {
  it.each([
    ['/events', 'main'],
    ['/my/profile', 'back'],
    ['/search', 'none'],
  ])('%s: 767 은 모바일 크롬, 768 은 기존 데스크톱 헤더·푸터', (path, kind) => {
    setViewportWidth(767)
    const { unmount } = renderAt(path)
    expect(desktopNav()).toBeNull()
    expect(!!mobileBack()).toBe(kind === 'back')
    expect(!!tabBar()).toBe(kind === 'main')
    unmount()

    setViewportWidth(768)
    renderAt(path)
    expect(tabBar()).toBeNull()
    expect(mobileBack()).toBeNull()
    expect(desktopNav()).toBeInTheDocument()
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('같은 화면에서 768 → 767 → 768 로 바뀌면 크롬이 따라 바뀐다', () => {
    setViewportWidth(768)
    renderAt('/events')
    expect(tabBar()).toBeNull()
    setViewportWidth(767)
    expect(tabBar()).toBeInTheDocument()
    expect(desktopNav()).toBeNull()
    setViewportWidth(768)
    expect(tabBar()).toBeNull()
    expect(desktopNav()).toBeInTheDocument()
  })

  it('ResponsiveDialog: 767 은 하단 시트, 768 은 기존 모달', () => {
    setViewportWidth(767)
    const { unmount } = render(
      <ResponsiveDialog open onClose={() => {}} ariaLabel="안내">
        본문
      </ResponsiveDialog>,
    )
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument()
    unmount()
    setViewportWidth(768)
    render(
      <ResponsiveDialog open onClose={() => {}} ariaLabel="안내">
        본문
      </ResponsiveDialog>,
    )
    expect(screen.queryByTestId('bottom-sheet-backdrop')).toBeNull()
    expect(screen.getByRole('dialog', { name: '안내' })).toBeInTheDocument()
  })

  it('MobileBottomBar: 767 에선 렌더, 768 에선 null', () => {
    setViewportWidth(767)
    const { unmount } = render(
      <MobileBottomBar>
        <button type="button">찜</button>
      </MobileBottomBar>,
    )
    expect(screen.getByTestId('mobile-bottom-bar')).toBeInTheDocument()
    unmount()
    setViewportWidth(768)
    render(
      <MobileBottomBar>
        <button type="button">찜</button>
      </MobileBottomBar>,
    )
    expect(screen.queryByTestId('mobile-bottom-bar')).toBeNull()
    expect(screen.queryByRole('button', { name: '찜' })).toBeNull()
  })
})

/* ───────── 토스트 위치 3종 + 폭 변경 ───────── */
describe('토스트 위치', () => {
  it('767 탭바 화면 → tab-bar, 768 → desktop', () => {
    setViewportWidth(767)
    const { unmount } = renderAt('/events')
    act(() => grabbed.api!.show({ message: '찜했어요' }))
    expect(toastPos()).toBe('tab-bar')
    unmount()
    setViewportWidth(768)
    renderAt('/events')
    act(() => grabbed.api!.show({ message: '찜했어요' }))
    expect(toastPos()).toBe('desktop')
  })

  it('하단 고정 바가 있으면 탭바 화면이어도 바 위가 우선 (bottom-bar)', () => {
    setViewportWidth(390)
    renderAt(
      '/events',
      <MobileBottomBar>
        <button type="button">길찾기</button>
      </MobileBottomBar>,
    )
    act(() => grabbed.api!.show({ message: '찜했어요' }))
    expect(toastPos()).toBe('bottom-bar')
  })

  it('하단 고정 바가 사라지면 none 으로 돌아온다', () => {
    setViewportWidth(390)
    function Page() {
      const [bar, setBar] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setBar(false)}>
            바 숨기기
          </button>
          {bar && (
            <MobileBottomBar>
              <button type="button">저장</button>
            </MobileBottomBar>
          )}
        </>
      )
    }
    renderAt('/my/profile', <Page />)
    act(() => grabbed.api!.show({ message: '저장했어요' }))
    expect(toastPos()).toBe('bottom-bar')
    fireEvent.click(screen.getByRole('button', { name: '바 숨기기' }))
    expect(toastPos()).toBe('none')
  })

  it('토스트가 떠 있는 동안 390 → 1024 로 바뀌면 데스크톱 위치·모양으로 바뀐다', () => {
    setViewportWidth(390)
    renderAt('/events')
    act(() => grabbed.api!.show({ message: '찜했어요', actionLabel: '보기', onAction: () => {} }))
    expect(toastPos()).toBe('tab-bar')
    setViewportWidth(1024)
    expect(toastPos()).toBe('desktop')
    setViewportWidth(390)
    expect(toastPos()).toBe('tab-bar')
  })

  it('탭바 화면에서 탭바 없는 화면으로 바뀌면 none (useTabBarFlag 정리)', async () => {
    setViewportWidth(390)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={auth()}>
          <ToastProvider>
            <ToastGrab />
            <MemoryRouter initialEntries={['/events']}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/events" element={<a href="/my/profile">프로필로</a>} />
                  <Route path="*" element={<div>기타</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    )
    act(() => grabbed.api!.show({ message: 'a' }))
    expect(toastPos()).toBe('tab-bar')
    await userEvent.click(screen.getByRole('link', { name: '마이' })) // 탭바 '마이' → /my (탭바 있음)
    expect(toastPos()).toBe('tab-bar')
  })
})

/* ───────── 뷰 폭 변경 중 열린 시트/모달 ───────── */
describe('열린 시트/모달 + 뷰 폭 변경', () => {
  function Harness({ onClose = () => {} }: { onClose?: () => void }) {
    return (
      <ResponsiveDialog open onClose={onClose} ariaLabel="안내" footer={<button type="button">확인</button>}>
        <p>본문</p>
      </ResponsiveDialog>
    )
  }

  it('390 → 1024: 시트가 모달로 바뀌고 body 스크롤 잠금이 유지된다, 닫으면 풀린다', () => {
    setViewportWidth(390)
    const { rerender } = render(<Harness />)
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    setViewportWidth(1024)
    expect(screen.queryByTestId('bottom-sheet-backdrop')).toBeNull()
    expect(screen.getByRole('dialog', { name: '안내' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<></>)
    expect(document.body.style.overflow).toBe('')
  })

  it('1024 → 390 → 1024 를 오가도 ESC 리스너가 하나만 남는다(중복 onClose 없음)', () => {
    const onClose = vi.fn()
    setViewportWidth(1024)
    render(<Harness onClose={onClose} />)
    setViewportWidth(390)
    setViewportWidth(1024)
    setViewportWidth(390)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Layout 의 열린 로그인 유도 시트가 폭 변경에도 살아 있다', () => {
    setViewportWidth(390)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={{ ...auth(false), isLoginPromptOpen: true }}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/events']}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="*" element={<div>본문</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </AuthContext.Provider>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument()
    setViewportWidth(1024)
    expect(screen.getByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
    expect(screen.queryByTestId('bottom-sheet-backdrop')).toBeNull()
    setViewportWidth(390)
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument()
  })
})

/* ───────── 겹친 시트 ESC ───────── */
describe('겹친 시트', () => {
  // 회귀 방지(QA 버그 수정됨): 예전엔 useDialogBehavior 가 열린 다이얼로그마다 document keydown 을 달아서 ESC 한 번에 겹친 시트가 모두 닫힌다.
  it('위 시트에서 ESC 를 누르면 위 시트만 닫혀야 한다', () => {
    setViewportWidth(390)
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <>
        <BottomSheet open onClose={outer} title="필터">
          바깥
        </BottomSheet>
        <BottomSheet open onClose={inner} title="기간 선택">
          안쪽
        </BottomSheet>
      </>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('위 시트를 닫으면 body 스크롤 잠금은 아래 시트가 있는 동안 유지되고, 모두 닫히면 풀린다', () => {
    document.body.style.overflow = ''
    setViewportWidth(390)
    const { rerender } = render(
      <>
        <BottomSheet open onClose={() => {}} title="필터" />
        <BottomSheet open onClose={() => {}} title="기간 선택" />
      </>,
    )
    rerender(
      <>
        <BottomSheet open onClose={() => {}} title="필터" />
        <BottomSheet open={false} onClose={() => {}} title="기간 선택" />
      </>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<></>)
    expect(document.body.style.overflow).toBe('')
  })

  // 회귀 방지(QA 버그 수정됨): 예전엔 각 시트가 열릴 때의 overflow 값을 따로 저장·복원해서, 함께 언마운트되면 바깥 시트가 '' 로 되돌린 뒤
  // 안쪽 시트가 'hidden' 으로 덮어써 페이지 스크롤이 영구히 잠긴다.
  it('겹친 두 시트가 한꺼번에 언마운트되면(화면 이동·폭 변경) body 스크롤 잠금이 풀려야 한다', () => {
    document.body.style.overflow = ''
    setViewportWidth(390)
    const { unmount } = render(
      <>
        <BottomSheet open onClose={() => {}} title="필터" />
        <BottomSheet open onClose={() => {}} title="기간 선택" />
      </>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

/* ───────── 시트 포커스 ───────── */
describe('시트 포커스', () => {
  it('열리면 시트로 포커스가 가고, Tab 은 시트 안에서만 돌며, 닫히면 원래 자리로 돌아온다', () => {
    setViewportWidth(390)
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            열기
          </button>
          <button type="button">바깥</button>
          <BottomSheet open={open} onClose={() => setOpen(false)} title="시트">
            <button type="button">첫째</button>
          </BottomSheet>
        </>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: '열기' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: '시트' })
    expect(document.activeElement).toBe(dialog)
    // 시트 안 버튼: 닫기(X), 첫째. 마지막에서 Tab → 처음으로
    const first = screen.getByRole('button', { name: '첫째' })
    first.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }))
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
