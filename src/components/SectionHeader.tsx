import type { ReactNode } from 'react'

export interface SectionHeaderProps {
  title: ReactNode
  /** 제목 뒤 이탤릭 강조 문구. 예: "돈 안 드는 주말," + 무료 행사 */
  emphasis?: ReactNode
  /** 제목 옆 작은 설명. 예: "10월 조회수 기준" */
  hint?: ReactNode
  /** 오른쪽 링크 문구. 기본 "전체보기 ›". null 이면 숨김 */
  moreLabel?: string | null
  moreHref?: string
  onMore?: () => void
}

export function SectionHeader({
  title,
  emphasis,
  hint,
  moreLabel = '전체보기 ›',
  moreHref,
  onMore,
}: SectionHeaderProps) {
  const moreClass = 'text-[13px] leading-[19.5px] text-ink-muted'
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-[10px]">
        <span className="text-[21px] font-black leading-[31.5px] tracking-[-0.42px] text-ink">
          {title}
          {emphasis && <em className="ml-[10px] text-brand not-italic">{emphasis}</em>}
        </span>
        {hint && <span className="text-[12px] leading-[18px] tracking-[-0.42px] text-ink-subtle">{hint}</span>}
      </h3>
      {moreLabel &&
        (moreHref ? (
          <a href={moreHref} onClick={onMore} className={moreClass}>
            {moreLabel}
          </a>
        ) : (
          <button type="button" onClick={onMore} className={moreClass}>
            {moreLabel}
          </button>
        ))}
    </div>
  )
}
