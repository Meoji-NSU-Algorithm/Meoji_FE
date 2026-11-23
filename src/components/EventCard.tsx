import type { MouseEvent } from 'react'
import { CardHeartIcon, EyeIcon, StarIcon } from './icons'
import { formatDateRange, formatViewCount, priceLabel } from './eventFormat'
import { PhotoPlaceholder } from './PhotoPlaceholder'

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
  is_free?: boolean | null
  rating?: number | null
  review_count?: number | null
  view_count?: number | null
}

export type EventCardVariant = 'standard' | 'ranked' | 'small' | 'bookmark'

export interface EventCardProps {
  event: EventCardData
  /** standard: 3:4 썸네일, ranked: 큰 순위 숫자(rank 필요), small: 4:3 썸네일,
   *  bookmark: 찜 카드(4:3, 제목·기간·무료/유료/가격 정보 없음만) */
  variant?: EventCardVariant
  /** ranked 일 때 표시할 순위 */
  rank?: number
  liked?: boolean
  /** 하트 클릭. 카드 클릭은 발생하지 않는다 */
  onToggleLike?: (event: EventCardData, nextLiked: boolean) => void
  onClick?: (event: EventCardData) => void
  /** 지정하면 카드가 <a> 로 렌더된다 */
  href?: string
  /** 사진 왼쪽 위에 분류 알약을 띄운다 (B1 목록). 분류가 없으면 그리지 않는다 */
  categoryPill?: boolean
}

export function EventCard({
  event,
  variant = 'standard',
  rank,
  liked = false,
  onToggleLike,
  onClick,
  href,
  categoryPill = false,
}: EventCardProps) {
  const bookmark = variant === 'bookmark'
  const short = variant === 'small' || bookmark
  // 찜 카드는 금액이 없어 무료/유료/가격 정보 없음만 쓴다
  const { text: priceText, tone } = bookmark
    ? event.is_free
      ? { text: '무료', tone: 'free' as const }
      : event.is_free === false
        ? { text: '유료', tone: 'paid' as const }
        : { text: '가격 정보 없음', tone: 'unknown' as const }
    : priceLabel(event.price, event.is_free)
  const meta = [event.sido, event.category].filter(Boolean).join(' · ')
  const hasReviews = event.rating != null && (event.review_count ?? 0) > 0
  const viewText = formatViewCount(event.view_count)

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
          short ? 'aspect-[274/205.5]' : 'aspect-[219/292]'
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
          <PhotoPlaceholder title={event.title} category={event.category} sido={event.sido} />
        )}
        {categoryPill && event.category && (
          <span className="absolute left-3 top-3 flex h-6 items-center rounded-[7px] bg-surface px-[9px] text-[12px] font-bold text-ink">
            {event.category}
          </span>
        )}
        {variant === 'ranked' && rank != null && (
          <span
            aria-label={`${rank}위`}
            className="pointer-events-none absolute bottom-[-6px] left-2 font-display text-[84px] font-black leading-[84px] tracking-[-3.36px] text-white"
          >
            {rank}
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
          {[formatDateRange(event.start_date, event.end_date), bookmark ? '' : event.venue_name]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="flex flex-wrap items-center gap-x-[6px] gap-y-1 pt-[5px]">
          <span
            className={`whitespace-nowrap leading-[21.75px] ${
              tone === 'free'
                ? 'text-[14.5px] font-black text-free'
                : tone === 'unknown'
                  ? 'text-[13px] font-bold text-ink-subtle'
                  : 'text-[14.5px] font-black text-ink'
            }`}
          >
            {priceText}
          </span>
          {!bookmark && meta && (
            <span className="whitespace-nowrap rounded-sm bg-surface-muted px-[6px] py-px text-[11px] font-medium leading-[16.5px] text-ink-muted">
              {meta}
            </span>
          )}
        </div>
        {!bookmark && (hasReviews || viewText) && (
          <p className="flex flex-wrap items-center gap-[4px] whitespace-nowrap pt-[4px] text-[12px] leading-[18px] text-ink-muted">
            {hasReviews ? (
              <>
                <StarIcon className="text-star" />
                <b className="font-bold text-ink">{event.rating!.toFixed(1)}</b>
                <span>({event.review_count!.toLocaleString('ko-KR')})</span>
                {viewText && <span>· 조회 {viewText}</span>}
              </>
            ) : (
              <>
                <EyeIcon className="shrink-0" />
                <span>조회 {viewText}</span>
              </>
            )}
          </p>
        )}
      </div>
    </article>
  )
}
