import type { ReactNode } from 'react'
import { EmptyState } from '../../components'

interface Props {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  onRetry?: () => void
  emptyTitle: string
  emptyDescription?: string
  /** 로딩 스켈레톤 개수/열 수 */
  skeletonCount?: number
  cols?: 4 | 5
  children: ReactNode
}

const colClass = { 4: 'grid-cols-2 md:grid-cols-4', 5: 'grid-cols-2 md:grid-cols-5' } as const

/** 섹션별 로딩/에러/빈 상태 공통 처리 */
export function SectionState({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  emptyTitle,
  emptyDescription,
  skeletonCount = 5,
  cols = 5,
  children,
}: Props) {
  if (isLoading) {
    return (
      <div role="status" aria-label="불러오는 중" className={`grid gap-[14px] ${colClass[cols]}`}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[219/292] rounded-card bg-surface-muted" />
            <div className="mt-[9px] h-[14px] w-3/4 rounded bg-surface-muted" />
            <div className="mt-2 h-[12px] w-1/2 rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-card bg-surface-muted py-10 text-center">
        <p className="text-[14px] font-bold text-ink">행사를 불러오지 못했어요</p>
        <p className="text-[12px] text-ink-muted">잠시 후 다시 시도해 주세요</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-9 rounded-card bg-primary px-4 text-[13px] font-bold text-white"
          >
            다시 시도
          </button>
        )}
      </div>
    )
  }
  if (isEmpty) return <EmptyState title={emptyTitle} description={emptyDescription} />
  return <>{children}</>
}
