import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import { useBookmarks, useMyReviews } from '../../api/hooks'
import { Avatar } from './Avatar'
import { LoginRequired } from './LoginRequired'

export type MyTab = 'bookmarks' | 'reviews'

function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const bookmarks = useBookmarks()
  const reviews = useMyReviews()
  if (!user) return null
  return (
    <section className="flex flex-wrap items-center gap-[18px] rounded-[20px] bg-surface-card p-6">
      <Avatar name={user.nickname} src={user.profile_image} size={72} />
      <div className="min-w-0">
        <p className="truncate text-[20px] font-black leading-[30px] text-ink">{user.nickname}</p>
        <p className="flex items-center gap-[6px] text-[13px] leading-[19.5px] text-ink-muted">
          <span className="size-4 rounded-md bg-kakao" aria-hidden />
          {user.email ?? '카카오 계정'}
        </p>
      </div>
      <dl className="flex gap-7 pl-6">
        <div className="text-center">
          <dd className="text-[20px] font-black leading-[30px] text-ink">{bookmarks.data?.totalCount ?? 0}</dd>
          <dt className="text-[12px] leading-[18px] text-ink-muted">찜한 행사</dt>
        </div>
        <div className="text-center">
          <dd className="text-[20px] font-black leading-[30px] text-ink">{reviews.data?.length ?? 0}</dd>
          <dt className="text-[12px] leading-[18px] text-ink-muted">작성한 리뷰</dt>
        </div>
      </dl>
      <div className="ml-auto flex gap-2">
        <Link
          to="/my/profile"
          className="flex h-11 items-center rounded-[12px] border border-line bg-surface px-[18px] text-[14px] font-bold text-ink"
        >
          프로필 보기
        </Link>
        <button
          type="button"
          onClick={() => void logout().then(() => navigate('/'))}
          className="h-11 rounded-[12px] bg-surface-muted px-[18px] text-[14px] font-bold text-ink"
        >
          로그아웃
        </button>
      </div>
    </section>
  )
}

/** E1/E3 공통: 제목 + 프로필 요약 + 탭 */
export function MyShell({ tab, children }: { tab: MyTab; children: React.ReactNode }) {
  const bookmarks = useBookmarks()
  const reviews = useMyReviews()
  const tabs: Array<{ key: MyTab; label: string; to: string; count?: number }> = [
    { key: 'bookmarks', label: '내 찜', to: '/my/bookmarks', count: bookmarks.data?.totalCount },
    { key: 'reviews', label: '내가 쓴 리뷰', to: '/my/reviews', count: reviews.data?.length },
  ]
  return (
    <div className="mx-auto max-w-content px-6 pb-10">
      <LoginRequired>
        <h1 className="pb-[18px] pt-9 text-[28px] font-black leading-[42px] tracking-[-0.56px] text-ink">
          마이페이지
        </h1>
        <Profile />
        <nav aria-label="마이페이지 탭" className="mt-8 flex gap-[26px] border-b border-line">
          {tabs.map((t) => {
            const active = t.key === tab
            return (
              <Link
                key={t.key}
                to={t.to}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px flex h-[49px] items-center gap-[6px] border-b-2 text-[16px] ${
                  active ? 'border-brand font-black text-ink' : 'border-transparent font-medium text-ink-subtle'
                }`}
              >
                {t.label}
                {t.count !== undefined && <span className="text-[13px]">{t.count}</span>}
              </Link>
            )
          })}
        </nav>
        {children}
        <div className="mt-12 border-t border-line pb-2 pt-5">
          <Link to="/my/withdraw" className="text-[13px] text-ink-subtle underline">
            회원 탈퇴
          </Link>
        </div>
      </LoginRequired>
    </div>
  )
}
