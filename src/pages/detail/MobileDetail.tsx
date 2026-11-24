import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EventDetail } from '../../api/types'
import { MobileBottomBar, MobileHeaderActions, MobileHeaderTitle } from '../../components'
import { CalendarIcon, HeartIcon, MapPinIcon, PhotoIcon, ShareIcon, StarIcon } from '../../components/icons'
import { MiniMap } from './MiniMap'
import { ReviewSection } from './ReviewSection'
import { RouteIcon } from './icons'

interface Props {
  event: EventDetail
  status: string
  dates: string
  price: string
  address: string
  canRoute: boolean
  bookmarked: boolean
  bookmarkPending: boolean
  onBookmark: () => void
  onShare: () => void
}

function MobileTag({ brand, children }: { brand?: boolean; children: ReactNode }) {
  return (
    <span
      className={`flex h-[22px] items-center rounded-[5px] px-2 text-[11.5px] font-bold tracking-[-0.2px] ${
        brand ? 'bg-primary-tint-strong text-primary' : 'bg-surface-muted text-ink'
      }`}
    >
      {children}
    </span>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex border-b border-line py-[13px] text-[13.5px] leading-5 tracking-[-0.2px]">
      <dt className="w-16 shrink-0 text-ink-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-ink">{children}</dd>
    </div>
  )
}

/** 제목(h1)이 화면 위로 지나가면 '뒤로' 헤더 가운데를 로고 → 행사명으로 바꾼다 (Figma M5 로고, M5-2 행사명) */
function useScrolledPast() {
  const ref = useRef<HTMLHeadingElement>(null)
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      rootMargin: '-56px 0px 0px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, past] as const
}

/**
 * 모바일 행사 상세 (Figma M5 729:2, 사진 없음·리뷰 없음 S8 754:2).
 * 헤더는 Layout 의 '뒤로' 헤더(가운데 로고)에 공유 버튼만 꽂고, 찜·길찾기는 바닥 고정 바로 옮긴다.
 */
export function MobileDetail({ event, status, dates, price, address, canRoute, bookmarked, bookmarkPending, onBookmark, onShare }: Props) {
  const [titleRef, scrolledPast] = useScrolledPast()
  const hero = event.image_url
  const hasReviews = event.review_count > 0

  const categoryChip = event.category && (
    <span className="absolute left-[14px] top-[14px] z-10 flex h-5 items-center rounded-[5px] bg-surface px-[7px] text-[11px] font-bold tracking-[-0.2px] text-ink">
      {event.category}
    </span>
  )

  return (
    <div className="pb-6">
      <MobileHeaderActions>
        <button type="button" aria-label="공유" onClick={onShare} className="flex size-11 items-center justify-center rounded-full text-ink">
          <ShareIcon />
        </button>
      </MobileHeaderActions>
      {scrolledPast && <MobileHeaderTitle>{event.title}</MobileHeaderTitle>}

      <div className="px-4 pt-3">
        {hero ? (
          <div data-testid="detail-hero" className="relative h-[230px] overflow-hidden rounded-[14px] bg-surface-muted">
            <img src={hero} alt={event.title} className="size-full object-cover" />
            {categoryChip}
          </div>
        ) : (
          <div
            data-testid="detail-hero"
            className="relative flex h-[230px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[14px] bg-[#f3f0ee] text-[#b5ada8]"
          >
            <PhotoIcon size={34} />
            <p className="text-[12px] tracking-[-0.2px]">등록된 사진이 없어요</p>
            {categoryChip}
          </div>
        )}
      </div>

      <div className="px-4 pt-[18px]">
        <div className="flex flex-wrap gap-[5px]">
          {event.category && <MobileTag brand>{event.category}</MobileTag>}
          {event.sido && <MobileTag>{event.sido}</MobileTag>}
          <MobileTag>{status}</MobileTag>
        </div>
        <h1 ref={titleRef} className="pt-[10px] text-[23px] font-black leading-[31px] tracking-[-0.6px] text-ink">
          {event.title}
        </h1>
        <div className="flex flex-col gap-[2px] pt-2 text-[12.5px] leading-5 tracking-[-0.2px] text-ink-muted">
          {dates && (
            <span className="flex items-center gap-[5px]">
              <CalendarIcon size={14} className="shrink-0" /> {dates}
            </span>
          )}
          {event.venue_name && (
            <span className="flex items-center gap-[5px]">
              <MapPinIcon size={14} className="shrink-0" /> {event.venue_name}
            </span>
          )}
          {hasReviews ? (
            <a href="#reviews" className="flex items-center gap-[5px]">
              <StarIcon size={14} className="shrink-0 text-star" />
              <b className="text-ink">{(event.average_rating ?? 0).toFixed(1)}</b> ({event.review_count}개 리뷰)
            </a>
          ) : (
            <span className="flex items-center gap-[5px] text-ink-subtle">
              <StarIcon size={14} className="shrink-0 text-star-empty" />
              <b>-</b> 아직 리뷰가 없어요
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-[18px]">
        <div className="rounded-lg border border-line p-[14px]">
          <p className="flex items-baseline gap-[6px] tracking-[-0.2px]">
            <span className="text-[19px] font-black text-ink">{price}</span>
            {event.fee_text && event.is_free && <span className="text-[11.5px] text-ink-muted">{event.fee_text}</span>}
          </p>
          <div className="pt-3">
            <MiniMap latitude={event.latitude} longitude={event.longitude} address={address || event.venue_name} compact />
          </div>
        </div>
      </div>

      <section className="px-4 pt-[30px]">
        <h2 className="text-[18px] font-black tracking-[-0.3px] text-ink">행사 소개</h2>
        <p className="whitespace-pre-line pt-3 text-[14px] leading-6 tracking-[-0.2px] text-[#3e3633]">
          {event.description?.trim() || '등록된 행사 소개가 없어요.'}
        </p>
      </section>

      <section className="px-4 pt-[30px]">
        <h2 className="border-b-2 border-ink pb-[10px] text-[18px] font-black tracking-[-0.3px] text-ink">행사 정보</h2>
        <dl>
          <InfoRow label="일시">{[dates, event.play_time].filter(Boolean).join(', ') || '-'}</InfoRow>
          <InfoRow label="장소">{[event.venue_name, address && `(${address})`].filter(Boolean).join(' ') || '-'}</InfoRow>
          <InfoRow label="요금">{event.fee_text || price}</InfoRow>
          {event.organizer && <InfoRow label="주최">{event.organizer}</InfoRow>}
          {event.contact_phone && (
            <InfoRow label="문의">
              <a href={`tel:${event.contact_phone.replace(/[^\d+]/g, '')}`} className="underline">
                {event.contact_phone}
              </a>
            </InfoRow>
          )}
          {event.homepage_url && (
            <InfoRow label="홈페이지">
              <a href={event.homepage_url} target="_blank" rel="noreferrer noopener" className="break-all text-[#2f5fbf] underline">
                {event.homepage_url.replace(/^https?:\/\//, '')}
              </a>
            </InfoRow>
          )}
        </dl>
      </section>

      <ReviewSection eventId={event.id} eventTitle={event.title} reviews={event.reviews ?? []} averageRating={event.average_rating} reviewCount={event.review_count} />

      <MobileBottomBar>
        <button
          type="button"
          onClick={onBookmark}
          aria-pressed={bookmarked}
          disabled={bookmarkPending}
          className="flex h-[50px] w-[116px] shrink-0 items-center justify-center gap-[5px] rounded-[12px] border border-line-strong bg-surface px-4 text-[15px] font-bold text-ink"
        >
          <HeartIcon size={18} filled={bookmarked} className={bookmarked ? 'text-brand' : undefined} />
          {bookmarked ? '찜 완료' : '찜하기'}
        </button>
        {canRoute ? (
          <Link
            to={`/events/${event.id}/directions`}
            className="flex h-[50px] min-w-0 flex-1 items-center justify-center gap-[6px] rounded-[12px] bg-primary px-4 text-[15px] font-bold tracking-[-0.2px] text-white"
          >
            <RouteIcon size={18} /> 길찾기
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="행사 위치 정보가 없어요"
            className="flex h-[50px] min-w-0 flex-1 items-center justify-center gap-[6px] rounded-[12px] bg-primary px-4 text-[15px] font-bold tracking-[-0.2px] text-white opacity-50"
          >
            <RouteIcon size={18} /> 길찾기
          </button>
        )}
      </MobileBottomBar>
    </div>
  )
}
