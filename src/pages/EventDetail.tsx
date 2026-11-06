import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEvent, useIsBookmarked, useToggleBookmark } from '../api/hooks'
import { ApiError } from '../api/client'
import { useAuth, useRequireLogin } from '../auth'
import { EmptyState, ErrorState, Spinner, Tag, formatDateRange, formatPrice, useToast } from '../components'
import { HeartIcon } from '../components/icons'
import { MiniMap } from './detail/MiniMap'
import { ReviewSection } from './detail/ReviewSection'
import { ChevronLeftIcon, RouteIcon, ShareIcon } from './detail/icons'

function status(start: string | null, end: string | null, permanent: boolean) {
  if (permanent) return '상시'
  const today = new Date().toISOString().slice(0, 10)
  if (start && today < start) return '진행 예정'
  if (end && today > end) return '종료'
  return '진행 중'
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] border-b border-line py-[14px] text-[14px] leading-[21px]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  )
}

export default function EventDetail() {
  const params = useParams()
  const id = Number(params.id)
  const navigate = useNavigate()
  const toast = useToast()
  const { isLoggedIn, isLoading: authLoading, openLoginPrompt } = useAuth()
  const requireLogin = useRequireLogin()
  const { data: event, isLoading, error, refetch } = useEvent(id)
  const bookmarked = useIsBookmarked(id)
  const toggle = useToggleBookmark()

  useEffect(() => {
    if (!authLoading && !isLoggedIn) openLoginPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isLoggedIn])

  if (!Number.isFinite(id)) {
    return <ErrorState code="404" title="행사를 찾을 수 없어요" message="주소를 다시 확인해 주세요" />
  }
  if (authLoading) {
    return <div className="flex justify-center py-32"><Spinner /></div>
  }
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-content px-6 py-10">
        <EmptyState
          title="로그인하면 행사 상세를 볼 수 있어요"
          description="카카오로 간편하게 로그인하고 행사 정보와 리뷰를 확인해 보세요"
          action={
            <button type="button" onClick={openLoginPrompt} className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white">
              로그인하기
            </button>
          }
        />
      </div>
    )
  }
  if (error) {
    if (error instanceof ApiError && error.code === 'EVENT_NOT_FOUND') {
      return (
        <ErrorState
          code="404"
          title="행사를 찾을 수 없어요"
          message="삭제되었거나 잘못된 주소예요"
          actions={
            <Link to="/events" className="flex h-11 items-center rounded-card border border-line px-[18px] text-[14px] font-bold text-ink">
              행사 둘러보기
            </Link>
          }
        />
      )
    }
    return <ErrorState onRetry={() => void refetch()} message={error.message || undefined} />
  }
  if (isLoading || !event) {
    return <div className="flex justify-center py-32"><Spinner /></div>
  }

  const dates = formatDateRange(event.start_date, event.end_date)
  const price = event.is_free ? '무료' : formatPrice(event.price) || event.fee_text || '요금 정보 없음'
  const hero = event.image_url
  const address = [event.address, event.address_detail].filter(Boolean).join(' ')
  const canRoute = event.latitude != null && event.longitude != null

  const onBookmark = () =>
    requireLogin(() =>
      toggle.mutate(
        { event, bookmarked },
        {
          onSuccess: () =>
            toast.show(
              bookmarked
                ? { message: '찜을 해제했어요' }
                : { message: '찜 목록에 담았어요', actionLabel: '보러 가기', onAction: () => navigate('/my/bookmarks') },
            ),
        },
      ),
    )

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.show({ message: '링크를 복사했어요' })
    } catch {
      toast.show({ message: '링크를 복사하지 못했어요' })
    }
  }

  return (
    <div className="mx-auto max-w-content px-6">
      <div className="flex h-[57.5px] items-end pb-[14px]">
        <Link to="/events" className="inline-flex items-center gap-1 text-[13px] text-ink-muted">
          <ChevronLeftIcon /> 행사 목록으로
        </Link>
      </div>

      <div
        data-testid="detail-hero"
        className="relative h-[438px] overflow-hidden rounded-card bg-surface-muted"
        style={hero ? undefined : { backgroundImage: 'var(--gradient-festival)' }}
      >
        {hero ? (
          <img src={hero} alt={event.title} className="size-full object-cover" />
        ) : (
          <div className="absolute left-[14px] top-[46px] text-white" data-testid="hero-placeholder">
            {event.sido && <p className="font-display text-[10.5px] font-extrabold tracking-[1.05px] opacity-85">{event.sido}</p>}
            <p className="text-[17px] font-black leading-[20.74px] tracking-[-0.34px]">{event.title}</p>
          </div>
        )}
        {event.category && (
          <span className="absolute left-3 top-3 flex h-6 items-center rounded-[7px] bg-surface px-[9px] text-[12px] font-bold text-ink">
            {event.category}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="pt-[22px]">
            <div className="flex flex-wrap gap-[6px]">
              {event.category && <Tag tone="brand">{event.category}</Tag>}
              {event.sido && <Tag>{event.sido}</Tag>}
              <Tag>{status(event.start_date, event.end_date, event.is_permanent)}</Tag>
            </div>
            <h1 className="pt-2 text-[30px] font-black leading-[39px] tracking-[-0.6px] text-ink">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-[18px] pt-[10px] text-[14px] leading-[21px] text-ink-muted">
              {dates && <span>{dates}</span>}
              {event.venue_name && <span>{event.venue_name}</span>}
              {event.review_count > 0 && (
                <span>
                  <b className="text-ink">★ {(event.average_rating ?? 0).toFixed(1)}</b> ({event.review_count}개 리뷰)
                </span>
              )}
            </div>
          </div>

          <section className="pt-[38px]">
            <h2 className="text-[20px] font-black leading-[30px] text-ink">행사 소개</h2>
            <p className="whitespace-pre-line pt-[14px] text-[15px] leading-[27px] text-[#3a3633]">
              {event.description?.trim() || '등록된 행사 소개가 없어요.'}
            </p>
          </section>

          <section className="pt-[38px]">
            <h2 className="text-[20px] font-black leading-[30px] text-ink">행사 정보</h2>
            <dl className="mt-[14px] border-t border-ink">
              <InfoRow label="일시">{[dates, event.play_time].filter(Boolean).join(', ') || '-'}</InfoRow>
              <InfoRow label="장소">
                {[event.venue_name, address && `(${address})`].filter(Boolean).join(' ') || '-'}
              </InfoRow>
              <InfoRow label="요금">{event.fee_text || price}</InfoRow>
              {event.organizer && <InfoRow label="주최">{event.organizer}</InfoRow>}
              {event.contact_phone && <InfoRow label="문의">{event.contact_phone}</InfoRow>}
              {event.homepage_url && (
                <InfoRow label="홈페이지">
                  <a href={event.homepage_url} target="_blank" rel="noreferrer noopener" className="text-[#2563eb] underline break-all">
                    {event.homepage_url.replace(/^https?:\/\//, '')}
                  </a>
                </InfoRow>
              )}
            </dl>
          </section>
        </div>

        <aside className="mt-[22px] flex h-fit flex-col gap-3 rounded-[18px] border border-line p-5">
          <p className="flex items-end gap-2 text-[24px] font-black leading-[36px] text-ink">
            {price}
            {event.fee_text && event.is_free && <span className="pb-[2px] text-[13px] font-normal text-ink-muted">{event.fee_text}</span>}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBookmark}
              aria-pressed={bookmarked}
              disabled={toggle.isPending}
              className="flex h-11 flex-1 items-center justify-center gap-[6px] rounded-card border border-line bg-surface text-[14px] font-bold text-ink"
            >
              <HeartIcon size={18} filled={bookmarked} className={bookmarked ? 'text-brand' : undefined} />
              {bookmarked ? '찜 완료' : '찜하기'}
            </button>
            <button type="button" aria-label="공유" onClick={() => void onShare()} className="flex h-11 items-center justify-center rounded-card border border-line bg-surface px-[18px] text-ink">
              <ShareIcon size={18} />
            </button>
          </div>
          <MiniMap latitude={event.latitude} longitude={event.longitude} address={address || event.venue_name} />
          {canRoute ? (
            <Link to={`/events/${event.id}/directions`} className="flex h-11 items-center justify-center gap-[6px] rounded-card bg-primary text-[14px] font-bold text-white">
              <RouteIcon size={18} /> 길찾기
            </Link>
          ) : (
            <button type="button" disabled title="행사 위치 정보가 없어요" className="flex h-11 items-center justify-center gap-[6px] rounded-card bg-primary text-[14px] font-bold text-white opacity-50">
              <RouteIcon size={18} /> 길찾기
            </button>
          )}
        </aside>
      </div>

      <ReviewSection eventId={event.id} reviews={event.reviews ?? []} averageRating={event.average_rating} reviewCount={event.review_count} />
      <div className="h-20" />
    </div>
  )
}
