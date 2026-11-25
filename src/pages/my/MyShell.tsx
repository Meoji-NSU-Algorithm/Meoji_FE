import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import { useBookmarks, useMyReviews } from '../../api/hooks'
import { useIsMobile } from '../../lib/useIsMobile'
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
    <section className="flex flex-wrap items-center gap-[18px] rounded-[20px] bg-surface-card p-5 md:p-6">
      <Avatar name={user.nickname} src={user.profile_image} size={72} />
      <div className="min-w-0">
        <p className="truncate text-[20px] font-black leading-[30px] text-ink">{user.nickname}</p>
        <p className="flex items-center gap-[6px] text-[13px] leading-[19.5px] text-ink-muted">
          <span className="size-4 rounded-md bg-kakao" aria-hidden />
          {user.email ?? '카카오 계정'}
        </p>
      </div>
      <dl className="flex gap-7 md:pl-6">
        <div className="text-center">
          <dd className="text-[20px] font-black leading-[30px] text-ink">{bookmarks.data?.totalCount ?? 0}</dd>
          <dt className="text-[12px] leading-[18px] text-ink-muted">찜한 행사</dt>
        </div>
        <div className="text-center">
          <dd className="text-[20px] font-black leading-[30px] text-ink">{reviews.data?.length ?? 0}</dd>
          <dt className="text-[12px] leading-[18px] text-ink-muted">작성한 리뷰</dt>
        </div>
      </dl>
      <div className="flex w-full gap-2 md:ml-auto md:w-auto">
        <Link
          to="/my/profile"
          className="flex h-11 flex-1 items-center justify-center rounded-[12px] border md:flex-none border-line bg-surface px-[18px] text-[14px] font-bold text-ink"
        >
          프로필 보기
        </Link>
        <button
          type="button"
          onClick={() => void logout().then(() => navigate('/'))}
          className="h-11 flex-1 rounded-[12px] bg-surface-muted px-[18px] md:flex-none text-[14px] font-bold text-ink"
        >
          로그아웃
        </button>
      </div>
    </section>
  )
}

const M_BTN = 'flex h-[38px] shrink-0 items-center rounded-[10px] px-3 text-[12.5px] font-bold tracking-[-0.2px] text-ink'

/** M7: 내 찜 탭의 프로필 요약 (아바타 56 + 이메일, 숫자 2칸 + 프로필 편집·로그아웃) */
function MobileProfileFull() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const bookmarks = useBookmarks()
  const reviews = useMyReviews()
  if (!user) return null
  return (
    <section className="rounded-[18px] bg-surface-sunken px-4 py-[18px]">
      <div className="flex items-center gap-[14px]">
        <Avatar name={user.nickname} src={user.profile_image} size={56} tone="mobile" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-black leading-6 tracking-[-0.2px] text-ink">{user.nickname}</p>
          <p className="flex items-center gap-[5px] pt-[2px] text-[12px] tracking-[-0.2px] text-ink-muted">
            <span className="size-3 shrink-0 rounded-full bg-kakao" aria-hidden />
            <span className="truncate">{user.email ?? '카카오 계정'}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-4">
        <dl className="contents">
          <div className="flex w-16 flex-col-reverse items-center gap-px tracking-[-0.2px]">
            <dt className="text-[11px] leading-[13px] text-ink-muted">찜한 행사</dt>
            <dd className="text-[18px] font-black leading-6 text-ink">{bookmarks.data?.totalCount ?? 0}</dd>
          </div>
          <div className="flex w-16 flex-col-reverse items-center gap-px tracking-[-0.2px]">
            <dt className="text-[11px] leading-[13px] text-ink-muted">작성한 리뷰</dt>
            <dd className="text-[18px] font-black leading-6 text-ink">{reviews.data?.length ?? 0}</dd>
          </div>
        </dl>
        <span className="flex-1" />
        <Link to="/my/profile" className={`${M_BTN} border border-line-strong bg-surface`}>
          프로필 편집
        </Link>
        <button
          type="button"
          onClick={() => void logout().then(() => navigate('/'))}
          className={`${M_BTN} bg-[#efecea]`}
        >
          로그아웃
        </button>
      </div>
    </section>
  )
}

/** M7-2: 내가 쓴 리뷰 탭의 짧은 프로필 요약 (아바타 48 + 숫자 한 줄 + 프로필 편집) */
function MobileProfileCompact() {
  const { user } = useAuth()
  const bookmarks = useBookmarks()
  const reviews = useMyReviews()
  if (!user) return null
  return (
    <section className="flex items-center gap-3 rounded-[18px] bg-surface-sunken p-4">
      <Avatar name={user.nickname} src={user.profile_image} size={48} tone="mobile" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-black leading-[22px] tracking-[-0.2px] text-ink">{user.nickname}</p>
        <p className="truncate pt-px text-[12px] tracking-[-0.2px] text-ink-muted">
          찜한 행사 {bookmarks.data?.totalCount ?? 0} · 작성한 리뷰 {reviews.data?.length ?? 0}
        </p>
      </div>
      <Link to="/my/profile" className={`${M_BTN} h-9 border border-line-strong bg-surface`}>
        프로필 편집
      </Link>
    </section>
  )
}

function MobileShell({ tab, tabs, children }: { tab: MyTab; tabs: TabItem[]; children: React.ReactNode }) {
  return (
    <div className="pb-6">
      <LoginRequired>
        <h1 className="px-4 pb-[14px] pt-5 text-[23px] font-black leading-7 tracking-[-0.6px] text-ink">마이페이지</h1>
        <div className="px-4">{tab === 'bookmarks' ? <MobileProfileFull /> : <MobileProfileCompact />}</div>
        <div className={`px-4 ${tab === 'bookmarks' ? 'pt-[22px]' : 'pt-[18px]'}`}>
          <nav aria-label="마이페이지 탭" className="flex gap-[22px] border-b border-line">
            {tabs.map((t) => {
              const active = t.key === tab
              return (
                <Link
                  key={t.key}
                  to={t.to}
                  aria-current={active ? 'page' : undefined}
                  className={`-mb-px flex h-[46px] items-center gap-[5px] border-b-2 text-[15px] tracking-[-0.2px] ${
                    active ? 'border-brand font-black text-ink' : 'border-transparent font-normal text-ink-subtle'
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && <span className="text-[12px] font-bold">{t.count}</span>}
                </Link>
              )
            })}
          </nav>
        </div>
        {children}
        <div className="px-4 pt-7">
          <div className="border-t border-line pt-4">
            <Link to="/my/withdraw" className="text-[12px] tracking-[-0.2px] text-ink-subtle underline">
              회원 탈퇴
            </Link>
          </div>
        </div>
      </LoginRequired>
    </div>
  )
}

type TabItem = { key: MyTab; label: string; to: string; count?: number }

/** E1/E3 공통: 제목 + 프로필 요약 + 탭 */
export function MyShell({ tab, children }: { tab: MyTab; children: React.ReactNode }) {
  const bookmarks = useBookmarks()
  const reviews = useMyReviews()
  const isMobile = useIsMobile()
  const tabs: TabItem[] = [
    { key: 'bookmarks', label: '내 찜', to: '/my/bookmarks', count: bookmarks.data?.totalCount },
    { key: 'reviews', label: '내가 쓴 리뷰', to: '/my/reviews', count: reviews.data?.length },
  ]
  if (isMobile) return <MobileShell tab={tab} tabs={tabs}>{children}</MobileShell>
  return (
    <div className="mx-auto max-w-content px-4 pb-10 md:px-6 md:pb-20">
      <LoginRequired>
        <h1 className="pb-[18px] pt-6 text-[24px] md:pt-9 md:text-[28px] font-black leading-[42px] tracking-[-0.56px] text-ink">
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
