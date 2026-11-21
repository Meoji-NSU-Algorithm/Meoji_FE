import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { consumeReturnTo, useAuth } from '../auth'
import { useSaveConsents } from '../api/hooks'
import { Modal, useToast } from '../components'
import { CheckIcon } from '../components/icons'
import { AuthScreen, centerBg } from './home/AuthScreen'
import { POLICIES } from './policy/content'

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
 * '보기'는 /terms·/privacy 페이지와 같은 본문을 모달로 연다.
 */
export default function Terms() {
  const { isLoggedIn, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveConsents()
  const [service, setService] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [viewing, setViewing] = useState<keyof typeof POLICIES | null>(null)
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

  const row = (tag: '필수' | '선택', label: string, doc: keyof typeof POLICIES, checked: boolean, onToggle: () => void, sub?: string) => (
    <div className="flex items-start gap-3 px-[6px] py-[14px]">
      <button type="button" role="checkbox" aria-checked={checked} onClick={onToggle} className="flex flex-1 items-start gap-3 text-left">
        <Box checked={checked} />
        <span className="leading-6">
          <span className="text-[15px] text-ink">
            <span className={tag === '필수' ? 'font-bold text-primary' : ''}>[{tag}]</span> {label}
          </span>
          {sub && <span className="block text-[12px] leading-[18px] text-ink-subtle">{sub}</span>}
        </span>
      </button>
      <button type="button" onClick={() => setViewing(doc)} className="text-[12px] leading-6 text-ink-subtle underline">
        보기
      </button>
    </div>
  )
  const doc = viewing && POLICIES[viewing]

  return (
    <AuthScreen className={centerBg}>
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-[460px] max-w-full rounded-[22px] border border-line bg-surface px-8 py-9">
          <h1 className="text-[24px] font-black leading-9 tracking-[-0.48px] text-ink">
            머지 이용을 위해
            <br />
            약관에 동의해 주세요
          </h1>
          <p className="pt-1 text-[14px] leading-[21px] text-ink-muted">처음 한 번만 받아요</p>
          <button
            type="button"
            role="checkbox"
            aria-checked={all}
            onClick={toggleAll}
            className="mt-6 flex w-full items-center gap-3 rounded-[14px] bg-surface-card p-4 text-left"
          >
            <Box checked={all} />
            <span className="text-[16px] font-black leading-6 text-ink">모두 동의하기</span>
          </button>
          {row('필수', '이용약관', 'terms', service, () => setService(!service))}
          {row('필수', '개인정보 수집·이용', 'privacy', privacy, () => setPrivacy(!privacy))}
          {row('선택', '마케팅 정보 수신', 'marketing', marketing, () => setMarketing(!marketing), '새 행사와 이벤트 소식을 받아요')}
          {save.isError && (
            <p role="alert" className="mt-3 rounded-[14px] bg-primary-tint px-4 py-3 text-[13px] leading-[1.6] text-primary-ink">
              동의 내용을 저장하지 못했어요.
              <br />
              잠시 후 다시 시도해 주세요.
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
              {save.isError ? '다시 시도' : '동의하고 시작하기'}
            </button>
          </div>
          <p className="pt-3 text-center text-[12px] leading-[1.6] text-ink-subtle">
            필수 항목 2개에 동의하면 버튼이 켜져요
            <br />
            선택 항목은 동의하지 않아도 이용할 수 있어요
          </p>
        </div>
      </div>
      <Modal open={doc !== null} onClose={() => setViewing(null)} ariaLabel={doc?.title}>
        {doc && (
          <>
            <h2 className="-mx-[26px] -mt-2 border-b border-line px-[26px] pb-4 text-[18px] font-bold text-ink">{doc.title}</h2>
            <div className="flex max-h-[300px] flex-col gap-4 overflow-y-auto py-4">
              {doc.articles.map((a) => (
                <section key={a.title}>
                  <h3 className="text-[14px] font-bold text-ink">{a.title}</h3>
                  <p className="pt-1 text-[13px] leading-[1.6] text-ink-muted">{a.body}</p>
                </section>
              ))}
            </div>
            <p className="border-t border-line pt-4 text-[12px] text-ink-subtle">시행일 {doc.effectiveDate}</p>
            <button type="button" onClick={() => setViewing(null)} className="mt-3 h-12 w-full rounded-card bg-primary text-[15px] font-bold text-white">
              확인
            </button>
          </>
        )}
      </Modal>
    </AuthScreen>
  )
}
