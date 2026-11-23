import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Chip, SectionHeader, formatDateRange } from '../../components'
import { CardHeartIcon } from '../../components/icons'
import { PhotoPlaceholder } from '../../components/PhotoPlaceholder'
import { useAuth } from '../../auth'
import { useMonthlyTop } from '../../api/hooks'
import type { EventCard } from '../../api/types'
import { HomeCard } from './HomeCard'
import { SectionState } from './SectionState'
import { useEventActions } from './useEventActions'
import { useTagCounts } from './useTagCounts'
import { startKakaoLogin } from './kakaoLogin'
import { KakaoIcon } from '../../components/icons'
import { REGIONS, TAG_PROMOS, dLabel, inRegion, isOnAnyDate, weekendTabs } from './utils'

interface ListState {
  isLoading: boolean
  isError: boolean
  refetch: () => void
}
const grid5 = 'grid grid-cols-2 gap-x-[14px] gap-y-6 md:grid-cols-5'

export function PopularSection() {
  const q = useMonthlyTop({ size: 5 })
  const events = q.data?.events ?? []
  const month = q.data?.month ? Number(q.data.month.slice(-2)) : null
  return (
    <section className="pt-10" aria-label="이번 달 인기 행사">
      <SectionHeader title="이번 달 인기 행사" hint={month ? `${month}월 조회수 기준` : undefined} moreHref="/events?sort=popular" />
      <div className="pt-[14px]">
        <SectionState
          isLoading={q.isLoading}
          isError={q.isError}
          isEmpty={events.length === 0}
          onRetry={() => void q.refetch()}
          emptyTitle="이번 달 인기 행사가 아직 없어요"
        >
          <div className={grid5}>
            {events.slice(0, 5).map((e, i) => (
              <HomeCard key={e.id} event={e} variant="ranked" rank={i + 1} viewCount={e.monthly_views} />
            ))}
          </div>
        </SectionState>
      </div>
    </section>
  )
}

export function LoginStrip() {
  const { isLoggedIn } = useAuth()
  if (isLoggedIn) return null
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-lg px-4 py-3 md:h-14 md:py-0 bg-surface-muted text-[13px] leading-[19.5px] text-ink-muted">
      <span>
        <b className="font-bold text-ink">로그인하고</b> 관심 행사를 찜해 보세요
      </span>
      <button
        type="button"
        onClick={startKakaoLogin}
        className="inline-flex h-[34px] items-center gap-[7px] rounded-pill bg-kakao px-4 text-[13px] font-bold text-kakao-ink"
      >
        <KakaoIcon />
        카카오로 시작하기
      </button>
    </div>
  )
}

export function RegionSection({ events, state }: { events: EventCard[]; state: ListState }) {
  const [region, setRegion] = useState('전체')
  const filtered = useMemo(() => events.filter((e) => inRegion(e, region)).slice(0, 5), [events, region])
  return (
    <section className="pt-10" aria-label="지역별 행사">
      <SectionHeader title="지역별로 골라보는 행사" moreHref="/events" />
      <div className="flex flex-wrap gap-[6px] pb-[14px] pt-[14px]">
        {REGIONS.map((r) => (
          <Chip key={r.label} selected={region === r.label} onClick={() => setRegion(r.label)}>
            {r.label}
          </Chip>
        ))}
      </div>
      <SectionState
        isLoading={state.isLoading}
        isError={state.isError}
        isEmpty={filtered.length === 0}
        onRetry={state.refetch}
        emptyTitle={region === '전체' ? '아직 등록된 행사가 없어요' : `${region} 지역의 행사가 아직 없어요`}
        emptyDescription="다른 지역을 선택해 보세요"
      >
        <div className={grid5}>
          {filtered.map((e) => (
            <HomeCard key={e.id} event={e} />
          ))}
        </div>
      </SectionState>
    </section>
  )
}

export function UpcomingSection({ events, state, today }: { events: EventCard[]; state: ListState; today: string }) {
  const list = useMemo(() => {
    const upcoming = events.filter((e) => e.start_date && e.start_date.slice(0, 10) >= today)
    return upcoming.slice(0, 5)
  }, [events, today])
  return (
    <section className="pt-10" aria-label="곧 시작해요">
      <SectionHeader title="곧 시작해요" hint="시작일이 가까운 순" moreHref="/events?sort=dateAsc" />
      <div className="pt-[14px]">
        <SectionState
          isLoading={state.isLoading}
          isError={state.isError}
          isEmpty={list.length === 0}
          onRetry={state.refetch}
          emptyTitle="곧 시작하는 행사가 없어요"
        >
          <div className={grid5}>
            {list.map((e) => (
              <HomeCard key={e.id} event={e} badge={dLabel(e.start_date, today)} />
            ))}
          </div>
        </SectionState>
      </div>
    </section>
  )
}

function FreeCard({ event }: { event: EventCard }) {
  const { openEvent, toggleLike, isLiked } = useEventActions()
  const liked = isLiked(event.id)
  const sub = [event.sido, formatDateRange(event.start_date, event.end_date)].filter(Boolean).join(' · ')
  return (
    <article className="relative overflow-hidden rounded-[18px] border border-line bg-surface">
      <div className="px-[18px] pb-3 pt-[18px]">
        <p className="text-[11px] font-bold leading-[16.5px] text-primary-ink">
          {['무료', event.category].filter(Boolean).join(' · ')}
        </p>
        <h4 className="line-clamp-2 min-h-[46px] pt-[2px] text-[17px] font-black leading-[23px] tracking-[-0.34px] text-ink">
          <a
            href={`/events/${event.id}`}
            onClick={(e) => {
              e.preventDefault()
              openEvent(event)
            }}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </a>
        </h4>
        <p className="truncate text-[12px] leading-[18px] text-ink-muted">{sub}</p>
      </div>
      <div className="relative aspect-[274/205.5] bg-surface-muted">
        {event.image_url ? (
          <img src={event.image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <PhotoPlaceholder title={event.title} category={event.category} sido={event.sido} />
        )}
        <button
          type="button"
          aria-label={liked ? '찜 해제' : '찜하기'}
          aria-pressed={liked}
          onClick={() => toggleLike(event)}
          className={`absolute bottom-[10px] right-[10px] z-10 flex size-[34px] items-center justify-center rounded-full bg-white/95 ${liked ? 'text-primary' : 'text-ink'}`}
        >
          <CardHeartIcon filled={liked} />
        </button>
      </div>
    </article>
  )
}

export function FreeSection({ events, state }: { events: EventCard[]; state: ListState }) {
  const list = useMemo(() => events.filter((e) => e.is_free).slice(0, 4), [events])
  return (
    <section className="mt-12 bg-primary-tint py-10" aria-label="무료 행사">
      <div className="mx-auto max-w-content px-6">
        <SectionHeader title="돈 안 드는 주말," emphasis="무료 행사" moreLabel="무료 행사 전체 ›" moreHref="/events?is_free=true" />
        <div className="pt-[14px]">
          <SectionState
            isLoading={state.isLoading}
            isError={state.isError}
            isEmpty={list.length === 0}
            onRetry={state.refetch}
            emptyTitle="무료 행사가 아직 없어요"
            skeletonCount={4}
            cols={4}
          >
            <div className="grid grid-cols-2 gap-[14px] md:grid-cols-4">
              {list.map((e) => (
                <FreeCard key={e.id} event={e} />
              ))}
            </div>
          </SectionState>
        </div>
      </div>
    </section>
  )
}

export function WeekendSection({ events, state }: { events: EventCard[]; state: ListState }) {
  const [tabs] = useState(() => weekendTabs(new Date()))
  const [tab, setTab] = useState(tabs[0].key)
  const current = tabs.find((t) => t.key === tab) ?? tabs[0]
  const list = useMemo(() => events.filter((e) => isOnAnyDate(e, current.dates)).slice(0, 4), [events, current])
  return (
    <section className="pt-12" aria-label="이번 주말">
      <SectionHeader title="이번 주말 뭐 하지?" moreHref="/events" />
      <div className="flex flex-wrap gap-[6px] pb-[14px] pt-[14px]">
        {tabs.map((t) => (
          <Chip key={t.key} selected={t.key === current.key} onClick={() => setTab(t.key)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <SectionState
        isLoading={state.isLoading}
        isError={state.isError}
        isEmpty={list.length === 0}
        onRetry={state.refetch}
        emptyTitle="이 날짜에 열리는 행사가 없어요"
        emptyDescription="다른 날짜를 선택해 보세요"
        skeletonCount={4}
        cols={4}
      >
        <div className="grid grid-cols-2 gap-[14px] md:grid-cols-4">
          {list.map((e) => (
            <HomeCard key={e.id} event={e} variant="small" />
          ))}
        </div>
      </SectionState>
    </section>
  )
}

export function TagSection() {
  const navigate = useNavigate()
  const counts = useTagCounts(TAG_PROMOS.map((t) => t.tag))
  // 결과가 0건인 태그만 숨기고, 나머지는 사전 순서 그대로 왼쪽부터 채운다
  const visible = TAG_PROMOS.filter((t) => counts[t.tag] !== 0)
  if (visible.length === 0) return null
  return (
    <section className="pb-20 pt-12" aria-label="태그로 찾는 기획전">
      <SectionHeader title="태그로 찾는 기획전" moreLabel={null} />
      <div className="grid grid-cols-2 gap-[14px] pt-[14px] md:grid-cols-5">
        {visible.map((t) => (
          <Link
            key={t.tag}
            to={`/events?tag=${encodeURIComponent(t.tag)}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/events?tag=${encodeURIComponent(t.tag)}`)
            }}
            className="promo-card flex h-[168px] flex-col justify-end rounded-lg px-[18px] pb-4 text-white"
            style={{ background: t.gradient }}
          >
            <span className="absolute left-[18px] top-4 z-[1] rounded-pill bg-white/[0.22] px-[10px] py-1 text-[12px] font-bold leading-[14px]">#{t.tag}</span>
            <span className="relative z-[1] text-[18px] font-black leading-[23.4px] tracking-[-0.36px]">{t.title}</span>
            <span className="relative z-[1] pt-1 text-[12px] leading-[14px] opacity-90">행사 모아보기 ›</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
