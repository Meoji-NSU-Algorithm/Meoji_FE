import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Footer, Header, useToast } from '../components'
import { consumePendingBookmark, useAuth } from '../auth'
import { useToggleBookmark } from '../api/hooks'
import { errorMessage } from '../api/errors'
import type { EventCard } from '../api/types'
import { LoginPromptModal } from './LoginPromptModal'

function activeTab(pathname: string) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/events')) return 'events'
  if (pathname.startsWith('/my')) return 'mypage'
  return undefined
}

export default function Layout() {
  const { user, isLoggedIn, isLoginPromptOpen, closeLoginPrompt } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const toast = useToast()
  const toggle = useToggleBookmark()

  // 비로그인 상태에서 누른 찜은 로그인 직후 한 번만 이어서 처리한다.
  useEffect(() => {
    if (!isLoggedIn || !user) return
    const pending = consumePendingBookmark<EventCard>()
    if (!pending) return
    toggle.mutate(
      { event: pending, bookmarked: false },
      {
        onSuccess: () => toast.show({ message: '찜한 행사에 담았어요' }),
        onError: (err) => toast.show({ message: errorMessage(err) }),
      },
    )
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
