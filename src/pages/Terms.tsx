import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { consumeReturnTo, useAuth } from '../auth'
import { errorMessage } from '../api/errors'
import { useSaveConsents } from '../api/hooks'
import { useToast } from '../components'
import { CheckIcon } from '../components/icons'
import { AuthScreen, centerBg } from './home/AuthScreen'

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
        checked ? 'bg-brand text-white' : 'border border-ink-disabled text-transparent'
      }`}
    >
      <CheckIcon size={14} />
    </span>
  )
}

/**
 * A7: 약관 동의. 로그인 직후 terms_agreed_at 이 null 이면 진입한다.
 * 필수(서비스, 개인정보)에 모두 동의해야 시작할 수 있고, 마케팅 수신은 선택이다.
 * '보기' 상세 화면은 디자인과 문서가 없어 아직 연결하지 않았다.
 */
export default function Terms() {
  const { isLoggedIn, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveConsents()
  const [service, setService] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const required = service && privacy
  const all = required && marketing

  if (!isLoading && !isLoggedIn) return <Navigate to="/auth/login" replace />

  const toggleAll = () => {
    setService(!all)
    setPrivacy(!all)
    setMarketing(!all)
  }
  const start = () => {
    if (!required || save.isPending) return
    save.mutate(
      { terms: service, privacy, marketing },
      {
        onSuccess: () => {
          navigate(consumeReturnTo() || '/', { replace: true })
          toast.show({ message: '머지에 오신 걸 환영해요!' })
        },
      },
    )
  }
  const cancel = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const row = (label: string, checked: boolean, onToggle: () => void) => (
    <div className="flex items-center gap-3 px-4 py-[14px]">
      <button type="button" role="checkbox" aria-checked={checked} onClick={onToggle} className="flex flex-1 items-center gap-3 text-left">
        <Box checked={checked} />
        <span className="text-[14px] leading-[21px] text-ink">{label}</span>
      </button>
      <button type="button" className="text-[12px] leading-[18px] text-ink-subtle underline">
        보기
      </button>
    </div>
  )

  return (
    <AuthScreen className={centerBg}>
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-[460px] max-w-full rounded-[22px] border border-line bg-surface px-8 py-9">
          <h1 className="text-[24px] font-black leading-9 tracking-[-0.48px] text-ink">거의 다 됐어요!</h1>
          <p className="pt-1 text-[14px] leading-[21px] text-ink-muted">
            머지를 시작하려면 필수 약관에 동의해 주세요. 동의하지 않으면 서비스를 이용할 수 없어요.
          </p>
          <button
            type="button"
            role="checkbox"
            aria-checked={all}
            onClick={toggleAll}
            className="mt-6 flex w-full items-center gap-3 rounded-[14px] bg-surface-card p-4 text-left"
          >
            <Box checked={all} />
            <span className="text-[16px] font-black leading-6 text-ink">전체 동의</span>
          </button>
          {row('[필수] 서비스 이용약관 동의', service, () => setService(!service))}
          {row('[필수] 개인정보 수집 및 이용 동의', privacy, () => setPrivacy(!privacy))}
          {row('[선택] 마케팅 정보 수신 동의', marketing, () => setMarketing(!marketing))}
          {save.isError && (
            <p role="alert" className="pt-3 text-[13px] text-primary-ink">
              {errorMessage(save.error)}
            </p>
          )}
          <div className="flex gap-2 pt-[26px]">
            <button
              type="button"
              onClick={() => void cancel()}
              className="h-11 flex-1 rounded-card border border-line bg-surface text-[14px] font-bold text-ink"
            >
              취소
            </button>
            <button
              type="button"
              disabled={!required || save.isPending}
              onClick={start}
              className="h-11 flex-1 rounded-card bg-primary text-[14px] font-bold text-white disabled:opacity-40"
            >
              동의하고 시작하기
            </button>
          </div>
        </div>
      </div>
    </AuthScreen>
  )
}
