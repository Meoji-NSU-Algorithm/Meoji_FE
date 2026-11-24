import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { BottomTabBar, Footer, Header, MobileBackHeader, MobileHeaderSlotProvider, MobileTitle, activeMobileTab, useMobileHeaderSlots } from '../components'
import { useIsMobile } from '../lib/useIsMobile'
import { useTabBarFlag } from '../lib/mobileChrome'
import { getMobileRoute } from './mobileRoutes'
import { consumePendingBookmark, useAuth } from '../auth'
import { useBookmarkToggle } from '../lib/useBookmarkToggle'
import type { EventCard } from '../api/types'
import { LoginPromptModal } from './LoginPromptModal'

function activeTab(pathname: string) {
  if (pathname === '/' || pathname === '/my/withdraw/done') return 'home'
  if (['/events', '/calendar', '/map'].some((p) => pathname.startsWith(p))) return 'events'
  if (pathname.startsWith('/my')) return 'mypage'
  return undefined
}

export default function Layout() {
  const { user, isLoggedIn, isLoginPromptOpen, closeLoginPrompt } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { toggle } = useBookmarkToggle()
  const isMobile = useIsMobile()
  const route = getMobileRoute(pathname)
  const showTabBar = isMobile && route.tabBar
  const slots = useMobileHeaderSlots()
  useTabBarFlag(showTabBar)

  // 비로그인 상태에서 누른 찜은 로그인 직후 한 번만 이어서 처리한다.
  useEffect(() => {
    if (!isLoggedIn || !user) return
    const pending = consumePendingBookmark<EventCard>()
    if (!pending) return
    toggle(pending, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id])

  const header = (
    <Header
      active={activeTab(pathname)}
      user={isLoggedIn && user ? { name: user.nickname, avatarUrl: user.profile_image ?? undefined } : null}
      onNavigate={navigate}
      onLoginClick={() => navigate('/auth/login')}
      searchValue={pathname === '/events' ? (params.get('q') ?? '') : undefined}
      onSearchSubmit={(q) => navigate(`/events?q=${encodeURIComponent(q)}`)}
      mobileBorder={pathname !== '/'}
    />
  )

  // 768px 이상은 기존과 똑같이: 헤더 + 본문 + 푸터. 모바일은 mobileRoutes 표대로 고른다.
  let top = header
  if (isMobile && route.header === 'none') top = <></>
  if (isMobile && route.header === 'back')
    top = (
      <MobileBackHeader
        title={
          <>
            <span ref={slots.setTitleEl} className="flex min-w-0 flex-1 items-center empty:hidden" />
            {!slots.titleOverridden && <MobileTitle title={route.title} />}
          </>
        }
        right={<span ref={slots.setRightEl} className="flex items-center" />}
      />
    )

  return (
    // 내용이 짧아도 푸터가 화면 바닥에 붙게 한다. 모바일 탭바가 있으면 그 높이만큼 바닥을 비운다
    <MobileHeaderSlotProvider value={slots.value}>
      <div className={`flex min-h-dvh flex-col ${showTabBar ? 'pb-[var(--tabbar-h)]' : ''}`}>
        {top}
        <main className="flex-1">
          <Outlet />
        </main>
        {(!isMobile || route.footer) && <Footer />}
        {showTabBar && <BottomTabBar active={activeMobileTab(pathname)} />}
        <LoginPromptModal open={isLoginPromptOpen} onClose={closeLoginPrompt} />
      </div>
    </MobileHeaderSlotProvider>
  )
}
