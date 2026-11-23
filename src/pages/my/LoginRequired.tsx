import { useEffect } from 'react'
import { EmptyState, Spinner } from '../../components'
import { useAuth, useRequireLogin } from '../../auth'

/** 마이 페이지 공통 가드. 비로그인이면 로그인 유도(A2)를 열고 안내 화면을 보여준다. */
export function LoginRequired({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, openLoginPrompt } = useAuth()
  const requireLogin = useRequireLogin()

  useEffect(() => {
    if (!isLoggedIn && !isLoading) requireLogin()
  }, [isLoggedIn, isLoading, requireLogin])

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    )
  }
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-content px-4 py-20 md:px-6">
        <EmptyState
          title="로그인이 필요해요"
          description="로그인하면 찜한 행사와 내가 쓴 리뷰를 볼 수 있어요"
          action={
            <button
              type="button"
              onClick={openLoginPrompt}
              className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white"
            >
              로그인하기
            </button>
          }
        />
      </div>
    )
  }
  return <>{children}</>
}
