import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { CloseIcon } from '../components/icons'
import { POLICIES, POLICY_EFFECTIVE_DATE, type Policy as PolicyData, type PolicyKey } from '../content/policies'

/** 약관 조항 목록. /terms, /privacy 페이지와 A7 모달이 같이 쓴다. */
export function PolicyArticles({ policy, compact = false }: { policy: PolicyData; compact?: boolean }) {
  return (
    <>
      {policy.articles.map((a) => (
        <section key={a.id} id={a.id} className={compact ? 'pb-[10px]' : 'pb-[22px]'}>
          <h3 className={compact ? 'text-[14px] font-bold leading-[23.8px] text-ink' : 'text-[16px] font-black text-ink'}>
            {a.title}
          </h3>
          {a.paragraphs.map((p, i) => (
            <p
              key={i}
              className={
                compact
                  ? 'text-[13px] leading-[22.1px] text-ink-muted'
                  : 'pt-[6px] text-[14px] leading-[25.2px] text-ink-subtle'
              }
            >
              {p}
            </p>
          ))}
        </section>
      ))}
    </>
  )
}

/** A7 '보기' 모달. 본문만 안에서 스크롤된다. */
export function PolicyModal({ policy, onClose }: { policy: PolicyData; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(42,35,32,0.48)] px-[22px] py-7"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={policy.title}
        className="flex max-h-full min-h-0 w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] bg-surface"
      >
        <div className="flex items-center border-b border-line px-5 py-[18px]">
          <h2 className="flex-1 text-[17px] font-bold text-ink">{policy.title}</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-[10px] text-ink-muted"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="min-h-[200px] flex-1 overflow-y-auto px-5 py-[18px]" data-testid="policy-modal-body">
          <PolicyArticles policy={policy} compact />
        </div>
        <div className="flex flex-col gap-2 border-t border-line px-5 pb-[18px] pt-[14px]">
          <p className="text-[12px] text-ink-subtle">시행일 {POLICY_EFFECTIVE_DATE}</p>
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-[12px] bg-primary text-[14px] font-bold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** B3: /terms, /privacy 공용 페이지. 로그인 없이 볼 수 있다. */
export default function Policy({ policyKey }: { policyKey: PolicyKey }) {
  const policy = POLICIES[policyKey]
  const [activeId, setActiveId] = useState<string | null>(null)
  const current = activeId && policy.articles.some((a) => a.id === activeId) ? activeId : policy.articles[0].id
  const go = (id: string) => {
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto w-full max-w-content px-6 pb-14 pt-10">
      <h1 className="text-[30px] font-black tracking-[-0.6px] text-ink">약관 및 정책</h1>
      <div className="flex items-center gap-[6px] pt-6" role="tablist" aria-label="약관 종류">
        {(Object.values(POLICIES)).map((p) => {
          const on = p.key === policyKey
          return (
            <Link
              key={p.key}
              to={p.path}
              role="tab"
              aria-selected={on}
              className={`flex h-11 items-center rounded-full px-[18px] text-[14px] font-bold ${
                on ? 'bg-ink text-white' : 'text-ink-muted'
              }`}
            >
              {p.title}
            </Link>
          )
        })}
        <p className="ml-auto text-[13px] text-ink-muted">시행일 {POLICY_EFFECTIVE_DATE}</p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-10 border-t border-line pt-7 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="조항 목차" className="flex flex-col md:sticky md:top-6 md:self-start">
          {policy.articles.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => go(a.id)}
              className={`rounded-lg px-[10px] py-[7px] text-left text-[13px] ${
                a.id === current ? 'bg-primary-tint font-bold text-primary-ink' : 'text-ink-muted'
              }`}
            >
              {a.label}
            </button>
          ))}
        </nav>
        <article className="max-w-[640px]">
          <PolicyArticles policy={policy} />
        </article>
      </div>
    </div>
  )
}
