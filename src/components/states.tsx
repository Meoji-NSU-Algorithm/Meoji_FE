import type { ReactNode } from 'react'
import { PhotoIcon } from './icons'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  /** feature: 아이콘을 84px 연한 타일에 담고 제목을 크게 (E2 찜 빈 상태) */
  variant?: 'default' | 'feature'
}

/** 결과/목록이 비었을 때 (사진 없음 스타일: 회색 아이콘 + 작은 안내) */
export function EmptyState({ title, description, icon, action, variant = 'default' }: EmptyStateProps) {
  const feature = variant === 'feature'
  return (
    <div className="flex flex-col items-center gap-[6px] px-6 py-16 text-center">
      {feature ? (
        <span data-testid="empty-state-tile" className="mb-[10px] flex size-[84px] items-center justify-center rounded-[24px] bg-primary-tint text-primary">
          {icon ?? <PhotoIcon />}
        </span>
      ) : (
        <span className="text-ink-disabled">{icon ?? <PhotoIcon />}</span>
      )}
      <p className={feature ? 'text-[20px] font-bold leading-[30px] text-ink' : 'text-[14px] font-bold leading-[21px] text-ink'}>
        {title}
      </p>
      {description && <p className="text-[12px] leading-[18px] text-ink-muted">{description}</p>}
      {action && <div className="pt-4">{action}</div>}
    </div>
  )
}

export interface SpinnerProps {
  size?: number
  label?: string
}

export function Spinner({ size = 28, label = '불러오는 중' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin text-primary">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export interface ErrorStateProps {
  /** 큰 코드 (예: "404"). 없으면 생략 */
  code?: string
  title?: string
  message?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  /** 다시 시도 외 추가 버튼 (행사 둘러보기/홈으로 가기 등) */
  actions?: ReactNode
}

/** 오류/404 (F1 스타일) */
export function ErrorState({
  code,
  title = '문제가 발생했어요',
  message = '잠시 후 다시 시도해 주세요',
  onRetry,
  retryLabel = '다시 시도',
  actions,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-20 text-center">
      {code && (
        <p className="font-display text-[150px] font-black leading-[150px] tracking-[-9px] text-brand">
          {code}
        </p>
      )}
      <h1 className="pt-[6px] text-[24px] font-black leading-[36px] text-ink">{title}</h1>
      <p className="pt-[6px] text-[14px] leading-[21px] text-ink-muted">{message}</p>
      {(onRetry || actions) && (
        <div className="flex gap-2 pt-[22px]">
          {actions}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white"
            >
              {retryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
