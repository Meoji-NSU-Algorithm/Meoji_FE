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
/** default: 데스크톱(기존) 치수, mobile: 모바일 Figma 카드 치수(M1 721:182 · M2 724:60) */
export type EventCardSize = 'default' | 'mobile'

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
  /** mobile 이면 모바일 Figma 치수(하트 32px·순위 68px·분류 알약 20px·본문 간격)를 쓴다.
   *  모바일 전용 화면에서만 지정한다(768px 이상 화면은 기본값 그대로). */
  size?: EventCardSize
  /** 썸네일 고정 높이(px). 지정하지 않으면 variant 비율(3:4 / 4:3)을 따른다.
   *  모바일: 홈 가로 줄 204, 목록 2열 216, 마이 찜 200, 캘린더 가로 줄 190 */
  thumbHeight?: number
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
  size = 'default',
  thumbHeight,
}: EventCardProps) {
  const m = size === 'mobile'
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
          thumbHeight != null ? '' : short ? 'aspect-[274/205.5]' : 'aspect-[219/292]'
        }`}
        style={thumbHeight != null ? { height: thumbHeight } : undefined}
        data-testid="event-card-thumb"
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
          <span
            className={`absolute left-3 top-3 flex items-center bg-surface font-bold text-ink ${
              m ? 'h-5 rounded-[5px] px-[7px] text-[11px] tracking-[-0.2px]' : 'h-6 rounded-[7px] px-[9px] text-[12px]'
            }`}
          >
            {event.category}
          </span>
        )}
        {variant === 'ranked' && rank != null && (
          <span
            aria-label={`${rank}위`}
            className={`pointer-events-none absolute font-black text-white ${
              m
                ? 'bottom-[-12px] left-[6px] font-sans text-[68px] leading-[68px] tracking-[-3px]'
                : 'bottom-[-6px] left-2 font-display text-[84px] leading-[84px] tracking-[-3.36px]'
            }`}
          >
            {rank}
          </span>
        )}
        <button
          type="button"
          aria-label={liked ? '찜 해제' : '찜하기'}
          aria-pressed={liked}
          onClick={() => onToggleLike?.(event, !liked)}
          className={`absolute z-10 flex items-center justify-center rounded-full ${
            m ? "bottom-[9px] right-[9px] size-8 bg-white/[0.94] after:absolute after:-inset-[6px] after:content-['']" : 'bottom-[10px] right-[10px] size-[34px] bg-white/95'
          } ${liked ? 'text-primary' : 'text-ink'}`}
        >
          <CardHeartIcon filled={liked} size={m ? 16 : undefined} />
        </button>
      </div>

      <div className={m ? 'pt-2 tracking-[-0.2px]' : 'mt-[9px]'}>
        <h4 className={`text-[14.5px] font-bold text-ink ${m ? 'leading-[20px]' : 'leading-[19.5px]'}`}>{titleEl}</h4>
        <p className={`truncate text-[12px] leading-[18px] text-ink-muted ${m ? 'pt-[2px]' : 'mt-[3px]'}`}>
          {[formatDateRange(event.start_date, event.end_date), bookmark ? '' : event.venue_name]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className={`flex flex-wrap items-center gap-x-[6px] gap-y-1 ${m ? 'min-h-[26px] pt-1' : 'pt-[5px]'}`}>
          <span
            className={`whitespace-nowrap ${m ? 'leading-[22px]' : 'leading-[21.75px]'} ${
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
            <span
              className={`whitespace-nowrap rounded-sm bg-surface-muted px-[6px] text-[11px] font-medium text-ink-muted ${
                m ? 'flex h-[19px] items-center' : 'py-px leading-[16.5px]'
              }`}
            >
              {meta}
            </span>
          )}
        </div>
        {!bookmark && (hasReviews || viewText) && (
          <p
            className={`flex flex-wrap items-center whitespace-nowrap text-[12px] leading-[18px] text-ink-muted ${
              m ? 'gap-[3px] pt-[2px]' : 'gap-[4px] pt-[4px]'
            }`}
          >
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
