/** 사진이 없을 때 쓰는 공통 자리표시 (Figma A4 · 카드/상세/목록 공통 규칙).
 *  분류 색 그라데이션 + 시·도 · 분류 + 제목. 분류가 없거나 모르는 값이면 축제 색. */
import { categoryGradient } from './categoryGradient'

export interface PhotoPlaceholderProps {
  title: string
  category?: string | null
  sido?: string | null
  /** card: 카드 사진 영역(기본), hero: 상세 히어로(큰 제목, 아래쪽 정렬), thumb: 작은 썸네일(글자 없음) */
  variant?: 'card' | 'hero' | 'thumb'
  /** hero 에서 제목 아래에 놓을 보조 줄 (예: 기간 · 장소) */
  subtitle?: string
  className?: string
}

const RING = 'pointer-events-none absolute rounded-full border-2 border-white/[0.22]'

export function PhotoPlaceholder({
  title,
  category,
  sido,
  variant = 'card',
  subtitle,
  className = '',
}: PhotoPlaceholderProps) {
  const label = [sido, category].filter(Boolean).join(' · ')

  if (variant === 'thumb') {
    return (
      <div
        data-testid="thumbnail-placeholder"
        aria-hidden
        className={`absolute inset-0 ${className}`}
        style={{ background: categoryGradient(category, 160) }}
      />
    )
  }

  if (variant === 'hero') {
    return (
      <div
        data-testid="thumbnail-placeholder"
        className={`absolute inset-0 flex flex-col justify-end gap-2 overflow-hidden px-10 py-9 text-white ${className}`}
        style={{ background: categoryGradient(category, 165) }}
      >
        <span className={`${RING} -top-[120px] right-[-80px] size-[364px]`} />
        <span className={`${RING} right-[140px] top-[60px] size-[224px]`} />
        {label && <p className="relative text-[12px] font-bold opacity-[0.92]">{label}</p>}
        <p className="relative text-[40px] font-black leading-[50px] tracking-[-0.8px]">{title}</p>
        {subtitle && <p className="relative text-[14px] opacity-[0.92]">{subtitle}</p>}
      </div>
    )
  }

  return (
    <div
      data-testid="thumbnail-placeholder"
      className={`absolute inset-0 flex flex-col gap-1 overflow-hidden p-4 text-white ${className}`}
      style={{ background: categoryGradient(category) }}
    >
      <span className={`${RING} left-[42%] top-[53%] aspect-square w-[85%]`} />
      {label && <p className="relative text-[12px] font-bold leading-[normal] opacity-[0.92]">{label}</p>}
      <p className="relative line-clamp-3 text-[19px] font-black leading-[23.75px] tracking-[-0.38px]">{title}</p>
    </div>
  )
}
