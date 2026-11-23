import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { consumeReturnTo, useAuth } from '../auth'
import { useSaveConsents } from '../api/hooks'
import { useToast } from '../components'
import { CheckIcon } from '../components/icons'
import { MARKETING_POLICY, POLICIES, type Policy as PolicyData } from '../content/policies'
import { AuthScreen, centerBg } from './home/AuthScreen'
import { PolicyModal } from './Policy'
import { RefreshIcon, WarnIcon } from './detail/icons'

function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
        checked ? 'bg-brand text-white' : 'border-2 border-[#d5cfcb] bg-surface text-transparent'
      }`}
    >
      <CheckIcon size={14} />
    </span>
  )
}

/**
 * A7: 약관 동의. 로그인 직후 terms_agreed_at 이 null 이면 진입한다.
 * 모두 해제된 채로 시작하고, 필수 2개에 동의하면 시작 버튼이 켜진다. 마케팅 수신은 선택이다.
 * '보기'는 /terms·/privacy 와 같은 본문을 모달로 연다.
 */
export default function Terms() {
  const { isLoggedIn, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveConsents()
  const [service, setService] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [viewing, setViewing] = useState<PolicyData | null>(null)
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

  const row = (
    label: string,
    tag: string,
    tagClass: string,
    checked: boolean,
    onToggle: () => void,
    policy: PolicyData,
    desc?: string,
  ) => (
    <div className="flex items-center gap-3 px-[6px] py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`${tag} ${label}`}
        onClick={onToggle}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <Box checked={checked} />
        <span className="flex flex-col">
          <span className="text-[14px] leading-[21px] text-ink">
            <b className={`font-bold ${tagClass}`}>{tag}</b> {label}
          </span>
          {desc && <span className="text-[12px] leading-[18px] text-ink-subtle">{desc}</span>}
        </span>
      </button>
      <button
        type="button"
        aria-label={`${label} 보기`}
        onClick={() => setViewing(policy)}
        className="text-[12px] leading-[18px] text-ink-subtle underline"
      >
        보기
      </button>
    </div>
  )

  return (
    <AuthScreen className={centerBg}>
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-[413px] max-w-full rounded-[22px] border border-line bg-surface px-7 py-8">
          <h1 className="text-[22px] font-black leading-[1.35] text-ink">
            머지 이용을 위해
            <br />
            약관에 동의해 주세요
          </h1>
          <p className="pb-4 pt-1 text-[13px] leading-[19.5px] text-ink-muted">처음 한 번만 받아요</p>
          <button
            type="button"
            role="checkbox"
            aria-checked={all}
            onClick={toggleAll}
            className="flex w-full items-center gap-3 rounded-[14px] bg-surface-card p-4 text-left"
          >
            <Box checked={all} />
            <span className="text-[16px] font-black leading-6 text-ink">모두 동의하기</span>
          </button>
          {row('이용약관', '[필수]', 'text-primary-ink', service, () => setService(!service), POLICIES.terms)}
          {row('개인정보 수집·이용', '[필수]', 'text-primary-ink', privacy, () => setPrivacy(!privacy), POLICIES.privacy)}
          {row(
            '마케팅 정보 수신',
            '[선택]',
            'text-ink-subtle',
            marketing,
            () => setMarketing(!marketing),
            MARKETING_POLICY,
            '새 행사와 이벤트 소식을 받아요',
          )}
          {save.isError && (
            <div role="alert" className="mt-[10px] flex items-start gap-[10px] rounded-[12px] bg-primary-tint px-[14px] py-3 text-[13px] leading-[20.8px] text-[#8a2a0e]">
              <WarnIcon size={18} className="mt-px shrink-0 text-primary-ink" />
              <span>
                동의 내용을 저장하지 못했어요.
                <br />
                잠시 후 다시 시도해 주세요.
              </span>
            </div>
          )}
          <div className="pt-[14px]">
            <button
              type="button"
              disabled={!required || save.isPending}
              onClick={start}
              className="flex h-12 w-full items-center justify-center gap-[6px] rounded-[12px] bg-primary text-[14px] font-bold text-white disabled:bg-[#efe3de] disabled:text-[#9a7d72]"
            >
              {save.isError && <RefreshIcon size={16} />}
              {save.isError ? '다시 시도' : '동의하고 시작하기'}
            </button>
          </div>
          <p className="pt-3 text-center text-[12px] leading-[18px] text-ink-subtle">필수 항목 2개에 동의하면 버튼이 켜져요</p>
          <p className="pt-1 text-center text-[12px] leading-[18px] text-ink-subtle">선택 항목은 동의하지 않아도 이용할 수 있어요</p>
          <div className="pt-3 text-center">
            <button type="button" onClick={() => void cancel()} className="text-[12px] text-ink-muted underline">
              취소
            </button>
          </div>
        </div>
      </div>
      {viewing && <PolicyModal policy={viewing} onClose={() => setViewing(null)} />}
    </AuthScreen>
  )
}
