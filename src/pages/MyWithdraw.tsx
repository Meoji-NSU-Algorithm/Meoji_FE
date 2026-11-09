import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { errorMessage } from '../api/errors'
import { useBookmarks, useMyReviews, useWithdraw } from '../api/hooks'
import { CheckIcon } from '../components/icons'
import { Avatar } from './my/Avatar'
import { LoginRequired } from './my/LoginRequired'

/** 사유는 UI에서만 고르며 서버로 보내지 않는다(BE에 필드가 없다). */
const REASONS = [
  '찾는 행사가 별로 없어요',
  '행사 정보가 정확하지 않아요',
  '사용하기 불편해요',
  '자주 사용하지 않아요',
  '기타',
]

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-[10px]">
      <span aria-hidden className="mt-[8px] size-[5px] shrink-0 rounded-full bg-brand" />
      <p className="flex-1 text-[13px] leading-[1.5] text-ink">{children}</p>
    </div>
  )
}

function Withdraw() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const bookmarks = useBookmarks()
  const reviews = useMyReviews()
  const withdraw = useWithdraw()
  const [reason, setReason] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  if (!user) return null

  const bookmarkCount = bookmarks.data?.totalCount ?? 0
  const reviewCount = reviews.data?.length ?? 0

  const submit = () => {
    if (!agreed || withdraw.isPending) return
    withdraw.mutate(undefined, {
      onSuccess: () => {
        // 토큰 정리(tokenStorage.clear, qc.clear)는 가드 밖의 완료 화면이 마운트된 뒤 거기서 한다.
        // 여기서 먼저 지우면 RequireLogin 이 홈으로 되돌려 보낸다.
        navigate('/my/withdraw/done', { replace: true, state: { withdrawn: true } })
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-[22px] border border-line bg-surface px-8 py-9">
      <h1 className="text-[24px] font-black leading-[1.5] text-ink">회원 탈퇴</h1>
      <p className="pt-1 text-[14px] leading-[1.5] text-ink-muted">탈퇴하기 전에 아래 내용을 꼭 확인해 주세요</p>

      <div className="mt-6 flex items-center gap-3 rounded-[14px] bg-surface-card px-4 py-[14px]">
        <Avatar name={user.nickname} src={user.profile_image} size={44} />
        <div className="min-w-0 leading-[1.5]">
          <p className="truncate text-[15px] font-bold text-ink">{user.nickname}</p>
          <p className="truncate text-[12px] text-ink-subtle">카카오 계정{user.email ? ` · ${user.email}` : ''}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-[10px] rounded-[14px] bg-primary-tint px-[18px] py-4">
        <p className="text-[14px] font-bold leading-[1.5] text-primary-ink">탈퇴하면 이렇게 돼요</p>
        <Bullet>찜한 행사 {bookmarkCount}개와 캘린더 일정이 모두 삭제돼요</Bullet>
        <Bullet>작성한 리뷰 {reviewCount}개가 삭제되며 다시 복구할 수 없어요</Bullet>
        <Bullet>카카오 계정 연결이 해제돼요. 언제든 다시 가입할 수 있어요</Bullet>
      </div>

      <fieldset className="flex flex-col gap-2 pt-[26px]">
        <legend className="flex gap-1 pb-2 text-[13px] leading-[1.5]">
          <span className="font-bold text-ink">떠나시는 이유를 알려 주세요</span>
          <span className="text-ink-subtle text-[12px]">(선택)</span>
        </legend>
        {REASONS.map((r) => {
          const on = reason === r
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setReason(r)}
              className={`flex h-[46px] items-center gap-[10px] rounded-[10px] border px-[14px] text-left text-[14px] leading-[1.5] ${
                on ? 'border-primary-border bg-primary-tint-strong font-bold text-primary-ink' : 'border-line bg-surface text-ink'
              }`}
            >
              <span
                aria-hidden
                className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border ${
                  on ? 'border-brand' : 'border-ink-disabled'
                }`}
              >
                {on && <span className="size-[10px] rounded-full bg-brand" />}
              </span>
              {r}
            </button>
          )
        })}
      </fieldset>

      <button
        type="button"
        role="checkbox"
        aria-checked={agreed}
        onClick={() => setAgreed((v) => !v)}
        className="mt-[22px] flex items-center gap-[10px] text-left"
      >
        <span
          aria-hidden
          className={`flex size-[22px] shrink-0 items-center justify-center rounded-md ${
            agreed ? 'bg-brand text-white' : 'border border-ink-disabled text-transparent'
          }`}
        >
          <CheckIcon size={16} />
        </span>
        <span className="text-[14px] font-medium leading-[1.5] text-ink">위 내용을 모두 확인했고, 탈퇴에 동의해요</span>
      </button>

      {withdraw.isError && (
        <p role="alert" className="pt-3 text-[13px] text-primary-ink">
          {errorMessage(withdraw.error)}
        </p>
      )}

      <div className="flex gap-2 pt-[26px]">
        <Link
          to="/my/profile"
          className="flex h-11 flex-1 items-center justify-center rounded-[12px] border border-line bg-surface text-[14px] font-bold text-ink"
        >
          취소
        </Link>
        <button
          type="button"
          disabled={!agreed || withdraw.isPending}
          onClick={submit}
          className="h-11 flex-1 rounded-[12px] bg-primary text-[14px] font-bold text-white disabled:opacity-40"
        >
          탈퇴하기
        </button>
      </div>
    </div>
  )
}

export default function MyWithdraw() {
  return (
    <div className="px-6 pb-5 pt-[60px]">
      <LoginRequired>
        <Withdraw />
      </LoginRequired>
    </div>
  )
}
