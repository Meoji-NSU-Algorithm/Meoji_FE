import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { consumeReturnTo, useAuth } from '../auth'
import { getConsents } from '../api/users'
import { useToast } from '../components'
import { AuthScreen, Wordmark, centerBg } from './home/AuthScreen'
import { WarningIcon } from './home/icons'

/**
 * 인가 코드는 1회용이다. StrictMode(개발)에서 effect가 두 번 돌아도 같은 코드로
 * 요청이 한 번만 나가도록 코드별 Promise를 모듈 단위로 공유한다.
 */
const inflight = new Map<string, Promise<{ needsTerms: boolean }>>()

/** 로그인 후 약관 동의 여부로 분기한다. 조회가 실패하면 is_new_user 값으로 대신 판단한다. */
async function login(code: string, loginWithKakaoCode: (c: string) => Promise<{ isNewUser: boolean }>) {
  const { isNewUser } = await loginWithKakaoCode(code)
  try {
    const consents = await getConsents()
    return { needsTerms: consents.terms_agreed_at === null }
  } catch {
    return { needsTerms: isNewUser }
  }
}

export default function KakaoCallback() {
  const [params] = useSearchParams()
  const code = params.get('code')
  const kakaoError = params.get('error')
  const { loginWithKakaoCode } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [failed, setFailed] = useState(!code || !!kakaoError)

  useEffect(() => {
    if (!code || kakaoError) return
    let active = true
    let p = inflight.get(code)
    if (!p) {
      p = login(code, loginWithKakaoCode)
      inflight.set(code, p)
    }
    p.then(
      ({ needsTerms }) => {
        if (!active) return
        if (needsTerms) {
          navigate('/auth/terms', { replace: true })
        } else {
          navigate(consumeReturnTo() || '/', { replace: true })
          toast.show({ message: '머지에 오신 걸 환영해요!' })
        }
      },
      () => {
        if (active) setFailed(true)
      },
    )
    return () => {
      active = false
    }
  }, [code, kakaoError, loginWithKakaoCode, navigate, toast])

  if (failed) {
    return (
      <AuthScreen className={centerBg}>
        <div className="flex min-h-full items-center justify-center px-6 py-10">
          <div className="flex w-[520px] max-w-full flex-col items-center">
            <Wordmark />
            <div className="mt-7 flex size-[72px] items-center justify-center rounded-xl bg-primary-tint text-brand">
              <WarningIcon />
            </div>
            <h1 className="pt-[18px] text-[22px] font-black leading-[33px] text-ink">로그인을 완료하지 못했어요</h1>
            <p className="pt-[6px] text-center text-[14px] leading-[22.4px] text-ink-muted">
              카카오 로그인을 취소했거나 시간이 오래 지났어요.
              <br />
              다시 시도하면 처음부터 진행돼요.
            </p>
            <div className="flex w-[360px] max-w-full gap-2 pt-[22px]">
              <Link
                to="/"
                className="flex h-11 flex-1 items-center justify-center rounded-card border border-line bg-surface text-[14px] font-bold text-ink"
              >
                둘러보기
              </Link>
              <Link
                to="/auth/login"
                className="flex h-11 flex-1 items-center justify-center rounded-card bg-primary text-[14px] font-bold text-white"
              >
                다시 로그인
              </Link>
            </div>
          </div>
        </div>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen className={centerBg}>
      <div className="flex min-h-full items-center justify-center px-6 py-10">
        <div role="status" className="flex w-[520px] max-w-full flex-col items-center">
          <Wordmark />
          <span className="mt-8 size-11 animate-spin rounded-full border-4 border-primary-tint border-t-brand" aria-hidden />
          <h1 className="pt-[22px] text-[22px] font-black leading-[33px] text-ink">카카오 계정을 확인하고 있어요</h1>
          <p className="pt-[6px] text-[14px] leading-[22.4px] text-ink-muted">잠시만 기다려 주세요. 곧 이어서 진행돼요.</p>
        </div>
      </div>
    </AuthScreen>
  )
}
