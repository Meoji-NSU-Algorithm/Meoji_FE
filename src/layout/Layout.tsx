import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Footer, Header } from '../components'
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

  // 비로그인 상태에서 누른 찜은 로그인 직후 한 번만 이어서 처리한다.
  useEffect(() => {
    if (!isLoggedIn || !user) return
    const pending = consumePendingBookmark<EventCard>()
    if (!pending) return
    toggle(pending, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user?.id])

  return (
    <>
      <Header
        active={activeTab(pathname)}
        user={isLoggedIn && user ? { name: user.nickname, avatarUrl: user.profile_image ?? undefined } : null}
        onNavigate={navigate}
        onLoginClick={() => navigate('/auth/login')}
        searchValue={pathname === '/events' ? (params.get('q') ?? '') : undefined}
        onSearchSubmit={(q) => navigate(`/events?q=${encodeURIComponent(q)}`)}
      />
      <main>
        <Outlet />
      </main>
      <Footer />
      <LoginPromptModal open={isLoginPromptOpen} onClose={closeLoginPrompt} />
    </>
  )
}
