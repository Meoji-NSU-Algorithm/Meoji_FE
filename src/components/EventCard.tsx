import type { MouseEvent } from 'react'
import { CardHeartIcon, PhotoIcon, StarIcon } from './icons'
import { formatDateRange, formatPrice } from './eventFormat'

/** BE 카드 응답 형태 (+ 선택적 평점/리뷰 수/조회수) */
export interface EventCardData {
  id: number | string
  title: string
  category: string
  sido: string
  start_date: string
  end_date: string
  venue_name: string
  image_url?: string | null
  price?: string | number | null
  is_free: boolean
  rating?: number | null
  review_count?: number | null
  view_count?: number | null
}

export type EventCardVariant = 'standard' | 'ranked' | 'small'

export interface EventCardProps {
  event: EventCardData
  /** standard: 3:4 썸네일, ranked: 큰 순위 숫자(rank 필요), small: 4:3 썸네일 + 가격 배지 */
  variant?: EventCardVariant
  /** ranked 일 때 표시할 순위 */
  rank?: number
  liked?: boolean
  /** 하트 클릭. 카드 클릭은 발생하지 않는다 */
  onToggleLike?: (event: EventCardData, nextLiked: boolean) => void
  onClick?: (event: EventCardData) => void
  /** 지정하면 카드가 <a> 로 렌더된다 */
  href?: string
}

function compactCount(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')}만` : n.toLocaleString('ko-KR')
}

export function EventCard({
  event,
  variant = 'standard',
  rank,
  liked = false,
  onToggleLike,
  onClick,
  href,
}: EventCardProps) {
  const small = variant === 'small'
  const priceText = event.is_free ? '무료' : formatPrice(event.price)
  const meta = [event.sido, event.category].filter(Boolean).join(' · ')
  const hasRating = event.rating != null && event.rating > 0

  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      if (href) e.preventDefault()
      onClick(event)
    }
  }

  const stretch = "after:absolute after:inset-0 after:content-['']"
  const titleEl = href ? (
    <a href={href} onClick={handleClick} className={`${stretch} block truncate`}>
      {event.title}
    </a>
  ) : (
    <button type="button" onClick={handleClick} className={`${stretch} block w-full truncate text-left`}>
      {event.title}
    </button>
  )

  return (
    <article className="relative w-full" data-variant={variant}>
      <div
        className={`relative w-full overflow-hidden rounded-card bg-surface-muted ${
          small ? 'aspect-[274/205.5]' : 'aspect-[219/292]'
        }`}
      >
        {event.image_url ? (
          <img
            src={event.image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <ThumbnailPlaceholder title={event.title} category={event.category} />
        )}
        {variant === 'ranked' && rank != null && (
          <span
            aria-label={`${rank}위`}
            className="pointer-events-none absolute bottom-[-6px] left-2 font-display text-[84px] font-black leading-[84px] tracking-[-3.36px] text-white"
          >
            {rank}
          </span>
        )}
        {small && event.is_free && (
          <span className="absolute bottom-[10px] left-[10px] rounded-md bg-white/95 px-2 py-[2px] text-[12px] font-bold text-free">
            무료
          </span>
        )}
        <button
          type="button"
          aria-label={liked ? '찜 해제' : '찜하기'}
          aria-pressed={liked}
          onClick={() => onToggleLike?.(event, !liked)}
          className={`absolute bottom-[10px] right-[10px] z-10 flex size-[34px] items-center justify-center rounded-full bg-white/95 ${
            liked ? 'text-primary' : 'text-ink'
          }`}
        >
          <CardHeartIcon filled={liked} />
        </button>
      </div>

      <div className="mt-[9px]">
        <h4 className="text-[14.5px] font-bold leading-[19.5px] text-ink">{titleEl}</h4>
        <p className="mt-[3px] truncate text-[12px] leading-[18px] text-ink-muted">
          {[formatDateRange(event.start_date, event.end_date), event.venue_name]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {(!small || !event.is_free) && (
          <div className="flex items-center gap-[6px] pt-[5px]">
            {priceText && (
              <span
                className={`text-[14.5px] font-black leading-[21.75px] ${
                  event.is_free ? 'text-free' : 'text-ink'
                }`}
              >
                {priceText}
              </span>
            )}
            {meta && (
              <span className="rounded-sm bg-surface-muted px-[6px] py-px text-[11px] font-medium leading-[16.5px] text-ink-muted">
                {meta}
              </span>
            )}
          </div>
        )}
        {(hasRating || event.view_count != null) && (
          <p className="flex items-center gap-[3px] pt-[3px] text-[12px] leading-[18px] text-ink-muted">
            {hasRating && (
              <>
                <StarIcon className="text-star" />
                <b className="font-bold text-ink">{event.rating!.toFixed(1)}</b>
                {event.review_count != null && <span>({event.review_count.toLocaleString('ko-KR')})</span>}
              </>
            )}
            {event.view_count != null && (
              <span>
                {hasRating ? '· ' : ''}조회 {compactCount(event.view_count)}
              </span>
            )}
          </p>
        )}
      </div>
    </article>
  )
}

/** 썸네일이 없을 때: 그라데이션 + 영문 카테고리 느낌의 라벨 (A1 카드 스타일), 큰 이미지 영역은 '사진 없음' 아이콘 */
function ThumbnailPlaceholder({ title, category }: { title: string; category: string }) {
  return (
    <div
      data-testid="thumbnail-placeholder"
      className="absolute inset-0 text-white"
      style={{ background: 'var(--gradient-festival)' }}
    >
      <div className="absolute left-[14px] right-[14px] top-[15px]">
        {category && (
          <p className="text-[10.5px] font-extrabold uppercase leading-[12.8px] tracking-[1.05px] opacity-85 font-display">
            {category}
          </p>
        )}
        <p className="mt-1 line-clamp-2 text-[17px] font-black leading-[20.7px] tracking-[-0.34px]">
          {title}
        </p>
      </div>
      <PhotoIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40" />
    </div>
  )
}
