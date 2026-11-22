import type { ReactNode } from 'react'
import { errorKind } from './errorKind'
import type { ErrorKind } from './errorKind'
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
        <span data-testid="empty-state-tile" className="mb-[10px] flex size-[84px] items-center justify-center rounded-[28px] bg-primary-tint text-brand">
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

const KIND_COPY: Record<ErrorKind, { title: string; lines: [string, string]; retry: string }> = {
  route: { title: '경로를 불러오지 못했어요', lines: ['길찾기 서버가 잠시 응답하지 않아요.', '잠시 후 다시 시도해 주세요.'], retry: '다시 시도' },
  server: { title: '잠시 문제가 생겼어요', lines: ['정보를 불러오지 못했어요.', '잠시 후 다시 접속해 주세요.'], retry: '새로고침' },
  offline: { title: '인터넷 연결을 확인해 주세요', lines: ['연결이 끊겨 정보를 불러오지 못했어요.', '연결되면 다시 시도해 주세요.'], retry: '다시 시도' },
}

const iconProps = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

function KindIcon({ kind, size }: { kind: ErrorKind; size: number }) {
  const p = { ...iconProps, width: size, height: size }
  if (kind === 'route')
    return (
      <svg {...p}>
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    )
  if (kind === 'server')
    return (
      <svg {...p}>
        <path d="m10.3 3.9-8.2 14A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.1l-8.2-14a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    )
  return (
    <svg {...p}>
      <path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M2 8.8a15 15 0 0 1 4.2-2.7M19 12.9a10 10 0 0 0-2-1.4M22 8.8a15 15 0 0 0-8.4-3.7M2 2l20 20" />
    </svg>
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
  /** 카드형(아이콘 타일 + 안내) 종류. 없으면 error 로 추정하고, 둘 다 없으면 기존 모양 */
  kind?: ErrorKind
  /** 발생한 오류. 네트워크/5xx/길찾기 오류면 카드형으로 보여 준다 */
  error?: unknown
  /** 페이지 전체가 아니라 일부 영역 안에 넣는 작은 크기 (카드형에서만) */
  compact?: boolean
  /** 404 전체 화면(F1)처럼 바깥에서 여백과 높이를 정할 때 자체 여백을 없앤다 */
  flush?: boolean
}

/** 오류/404 (F1 스타일), 또는 kind·error 가 있으면 실패·안내 카드 (C4) */
export function ErrorState({
  code,
  title,
  message,
  onRetry,
  retryLabel,
  actions,
  kind,
  error,
  compact = false,
  flush = false,
}: ErrorStateProps) {
  const k = code ? undefined : (kind ?? errorKind(error))
  if (k) {
    const copy = KIND_COPY[k]
    return (
      <div
        role="alert"
        data-testid="error-card"
        data-kind={k}
        className={`flex flex-col items-center gap-2 rounded-[18px] border border-[#ece7e3] bg-surface text-center ${compact ? 'px-4 py-6' : 'px-6 py-8'}`}
      >
        <span
          className={`mb-1 flex items-center justify-center bg-primary-tint text-primary ${compact ? 'size-[44px] rounded-[14px]' : 'size-[56px] rounded-[18px]'}`}
        >
          <KindIcon kind={k} size={compact ? 20 : 26} />
        </span>
        <h2 className={`${compact ? 'text-[14px]' : 'text-[16px]'} font-black text-ink`}>{title ?? copy.title}</h2>
        <p className="pb-[10px] text-[13px] leading-[20.8px] text-ink-muted">
          {message ?? (
            <>
              {copy.lines[0]}
              <br />
              {copy.lines[1]}
            </>
          )}
        </p>
        {(onRetry || actions) && (
          <div className="flex gap-2">
            {actions}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white"
              >
                {retryLabel ?? copy.retry}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }
  return (
    <div role="alert" className={`flex flex-col items-center text-center ${flush ? '' : 'px-6 py-20'}`}>
      {code && (
        <p className="font-display text-[150px] font-black leading-[150px] tracking-[-9px] text-brand">
          {code}
        </p>
      )}
      <h1 className="pt-[6px] text-[24px] font-black leading-[36px] text-ink">{title ?? '문제가 발생했어요'}</h1>
      <p className="pt-[6px] text-[14px] leading-[21px] text-ink-muted">{message ?? '잠시 후 다시 시도해 주세요'}</p>
      {(onRetry || actions) && (
        <div className="flex gap-2 pt-[22px]">
          {actions}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white"
            >
              {retryLabel ?? '다시 시도'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
