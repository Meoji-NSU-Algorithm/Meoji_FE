import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { tokenStorage } from '../auth'
import { CheckIcon } from '../components/icons'

/** E9: 탈퇴 완료. 이미 로그아웃된 상태에서 보이므로 RequireLogin 밖에 둔다. */
export default function MyWithdrawDone() {
  const withdrawn = (useLocation().state as { withdrawn?: boolean } | null)?.withdrawn === true
  const qc = useQueryClient()

  // 탈퇴 직후에만 로컬 토큰과 캐시를 정리한다(서버에서는 이미 탈퇴 처리됨).
  useEffect(() => {
    if (!withdrawn) return
    tokenStorage.clear()
    qc.clear()
  }, [withdrawn, qc])

  // 직접 주소로 들어온 경우에는 아무것도 하지 않고 홈으로 보낸다.
  if (!withdrawn) return <Navigate to="/" replace />
  return (
    <div className="px-6 pb-5 pt-[60px]">
      <div className="mx-auto flex w-full max-w-[460px] flex-col items-center rounded-[22px] border border-line bg-surface px-8 pb-10 pt-12">
        <span className="flex size-[72px] items-center justify-center rounded-[24px] bg-primary-tint text-brand">
          <CheckIcon size={36} />
        </span>
        <h1 className="pt-5 text-center text-[22px] font-black leading-[1.5] text-ink">탈퇴가 완료됐어요</h1>
        <p className="pt-2 text-center text-[14px] leading-[1.6] text-ink-muted">
          그동안 머지를 이용해 주셔서 감사해요.
          <br />
          보고 싶은 행사가 생기면 언제든 다시 찾아와 주세요.
        </p>
        <p className="mt-5 w-full rounded-[12px] bg-surface-card px-4 py-3 text-center text-[12px] leading-[1.5] text-ink-subtle">
          찜·리뷰 정보가 모두 삭제됐고, 카카오 계정 연결도 해제됐어요.
        </p>
        <Link
          to="/"
          className="mt-[26px] flex h-11 w-full items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white"
        >
          홈으로 가기
        </Link>
      </div>
    </div>
  )
}
