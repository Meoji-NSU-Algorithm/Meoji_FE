import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatDateRange } from '../../components'
import { CardHeartIcon } from '../../components/icons'
import { PhotoPlaceholder } from '../../components/PhotoPlaceholder'
import { useMonthlyTop } from '../../api/hooks'
import type { EventCard, MonthlyTopEvent } from '../../api/types'
import { HomeCard } from './HomeCard'
import { SectionState } from './SectionState'
import { useEventActions } from './useEventActions'
import { useTagCounts } from './useTagCounts'
import { REGIONS, TAG_PROMOS, dLabel, inRegion, isOnAnyDate, weekendTabs } from './utils'

/* 모바일 홈(Figma M1 721:2) 섹션들. 5열 줄은 옆으로 넘기는 150px 카드 줄로 바꾼다. */

interface ListState {
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const hideScrollbar = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

/** 섹션 머리 (721:171): 19px Black 제목 + 11px 설명 + 오른쪽 12px 링크.
 *  줄 높이는 Figma 그대로(설명 있으면 29, 없으면 26) 두고, 14px 링크의 누르는 영역만 ::after 로 위아래 15px 늘려 44px 로 맞춘다 */
function MHeader({ title, emphasis, hint, more = '전체보기 ›', to }: { title: string; emphasis?: string; hint?: string; more?: string | null; to?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex min-w-0 items-baseline gap-2">
        <span className="whitespace-nowrap text-[19px] font-black leading-[26px] tracking-[-0.4px] text-ink">
          {title}
          {emphasis && <em className="ml-2 not-italic text-brand">{emphasis}</em>}
        </span>
        {hint && <span className="truncate text-[11px] leading-[26px] text-ink-subtle">{hint}</span>}
      </h3>
      {more && to && (
        <Link
          to={to}
          className="relative shrink-0 text-[12px] leading-[14px] tracking-[-0.2px] text-ink after:absolute after:-inset-y-[15px] after:inset-x-0 after:content-['']"
        >
          {more}
        </Link>
      )}
    </div>
  )
}

/** 화면 끝까지 닿는 가로 스크롤 줄 (좌우 16px 안쪽 여백, 카드 사이 12px) */
function Row({ children, gap = 'gap-3' }: { children: ReactNode; gap?: string }) {
  return <div className={`-mx-4 flex ${gap} overflow-x-auto px-4 ${hideScrollbar}`}>{children}</div>
}

/** 32px 알약 칩 (721:300) */
function MChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex h-8 shrink-0 items-center rounded-pill border px-[13px] text-[13px] tracking-[-0.2px] after:absolute after:-inset-y-[6px] after:inset-x-0 after:content-[''] ${
        selected ? 'border-primary-border bg-primary-tint-strong font-bold text-primary' : 'border-line bg-surface text-ink-muted'
      }`}
    >
      {children}
    </button>
  )
}

/** M1 가로 줄 150px 카드 (721:182): 썸네일 204px, 모바일 치수 */
const M1_CARD = { size: 'mobile', thumbHeight: 204 } as const

function CardRow<T extends EventCard>({ events, render }: { events: T[]; render: (e: T, i: number) => ReactNode }) {
  return (
    <Row>
      {events.map((e, i) => (
        <div key={e.id} className="w-[150px] shrink-0">
          {render(e, i)}
        </div>
      ))}
    </Row>
  )
}

function MState({ state, isEmpty, emptyTitle, emptyDescription, children }: { state: ListState; isEmpty: boolean; emptyTitle: string; emptyDescription?: string; children: ReactNode }) {
  return (
    <SectionState
      isLoading={state.isLoading}
      isError={state.isError}
      isEmpty={isEmpty}
      onRetry={state.refetch}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      skeletonCount={2}
    >
      {children}
    </SectionState>
  )
}

export function MobilePopularSection() {
  const q = useMonthlyTop({ size: 5 })
  const events: MonthlyTopEvent[] = q.data?.events ?? []
  const month = q.data?.month ? Number(q.data.month.slice(-2)) : null
  return (
    <section className="px-4 pt-[30px]" aria-label="이번 달 인기 행사">
      <MHeader title="이번 달 인기 행사" hint={month ? `${month}월 조회수 기준` : undefined} to="/events?sort=popular" />
      <div className="pt-[14px]">
        <MState
          state={{ isLoading: q.isLoading, isError: q.isError, refetch: () => void q.refetch() }}
          isEmpty={events.length === 0}
          emptyTitle="이번 달 인기 행사가 아직 없어요"
        >
          <CardRow
            events={events.slice(0, 5)}
            render={(e, i) => <HomeCard {...M1_CARD} event={e} variant="ranked" rank={i + 1} viewCount={e.monthly_views} />}
          />
        </MState>
      </div>
    </section>
  )
}

export function MobileRegionSection({ events, state }: { events: EventCard[]; state: ListState }) {
  const [region, setRegion] = useState('전체')
  const filtered = useMemo(() => events.filter((e) => inRegion(e, region)).slice(0, 5), [events, region])
  return (
    <section className="px-4 pt-9" aria-label="지역별 행사">
      <MHeader title="지역별로 골라보는 행사" to="/events" />
      <div className="py-[14px]">
        <Row gap="gap-[6px]">
          {REGIONS.map((r) => (
            <MChip key={r.label} selected={region === r.label} onClick={() => setRegion(r.label)}>
              {r.label}
            </MChip>
          ))}
        </Row>
      </div>
      <MState
        state={state}
        isEmpty={filtered.length === 0}
        emptyTitle={region === '전체' ? '아직 등록된 행사가 없어요' : `${region} 지역의 행사가 아직 없어요`}
        emptyDescription="다른 지역을 선택해 보세요"
      >
        <CardRow events={filtered} render={(e) => <HomeCard {...M1_CARD} event={e} />} />
      </MState>
    </section>
  )
}

export function MobileUpcomingSection({ events, state, today }: { events: EventCard[]; state: ListState; today: string }) {
  const list = useMemo(() => events.filter((e) => e.start_date && e.start_date.slice(0, 10) >= today).slice(0, 5), [events, today])
  return (
    <section className="px-4 pt-9" aria-label="곧 시작해요">
      <MHeader title="곧 시작해요" hint="시작일이 가까운 순" to="/events?sort=dateAsc" />
      <div className="pt-[14px]">
        <MState state={state} isEmpty={list.length === 0} emptyTitle="곧 시작하는 행사가 없어요">
          <CardRow events={list} render={(e) => <HomeCard {...M1_CARD} event={e} badge={dLabel(e.start_date, today)} badgeTone="dark" />} />
        </MState>
      </div>
    </section>
  )
}

/** 무료 행사 카드 (721:497): 196px, 위 글 / 아래 150px 사진 */
function MobileFreeCard({ event }: { event: EventCard }) {
  const { openEvent, toggleLike, isLiked } = useEventActions()
  const liked = isLiked(event.id)
  const sub = [event.sido, formatDateRange(event.start_date, event.end_date)].filter(Boolean).join(' · ')
  return (
    <article className="relative flex w-[196px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-line-soft bg-surface pb-[18px]">
      <div className="px-[13px] pb-[10px] pt-3">
        <p className="text-[11px] font-bold leading-[13px] tracking-[-0.2px] text-primary">
          {['무료', event.category].filter(Boolean).join(' · ')}
        </p>
        <h4 className="line-clamp-2 pb-[2px] pt-1 text-[15px] font-black leading-5 tracking-[-0.2px] text-ink">
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
        <p className="truncate pt-[2px] text-[12px] leading-[18px] tracking-[-0.2px] text-ink-muted">{sub}</p>
      </div>
      <div className="relative mt-auto h-[150px] bg-surface-muted">
        {event.image_url ? (
          <img src={event.image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <PhotoPlaceholder title={event.title} category={event.category} sido={event.sido} />
        )}
        <span className="absolute bottom-[10px] left-[10px] flex h-5 items-center rounded-[5px] bg-ink/[0.72] px-[7px] text-[11px] font-bold tracking-[-0.2px] text-white">
          무료
        </span>
        <button
          type="button"
          aria-label={liked ? '찜 해제' : '찜하기'}
          aria-pressed={liked}
          onClick={() => toggleLike(event)}
          className={`absolute bottom-[9px] right-[9px] z-10 flex size-8 items-center justify-center rounded-full bg-white/95 after:absolute after:-inset-[6px] after:content-[''] ${liked ? 'text-primary' : 'text-ink'}`}
        >
          <CardHeartIcon filled={liked} />
        </button>
      </div>
    </article>
  )
}

export function MobileFreeSection({ events, state }: { events: EventCard[]; state: ListState }) {
  const list = useMemo(() => events.filter((e) => e.is_free).slice(0, 4), [events])
  return (
    <div className="pt-10">
      <section className="bg-primary-tint px-4 pb-[30px] pt-7" aria-label="무료 행사">
        <MHeader title="돈 안 드는 주말," emphasis="무료 행사" more="전체 ›" to="/events?is_free=true" />
        <div className="pt-[14px]">
          <MState state={state} isEmpty={list.length === 0} emptyTitle="무료 행사가 아직 없어요">
            <Row>
              {list.map((e) => (
                <MobileFreeCard key={e.id} event={e} />
              ))}
            </Row>
          </MState>
        </div>
      </section>
    </div>
  )
}

export function MobileWeekendSection({ events, state }: { events: EventCard[]; state: ListState }) {
  const [tabs] = useState(() => weekendTabs(new Date()))
  const [tab, setTab] = useState(tabs[0].key)
  const current = tabs.find((t) => t.key === tab) ?? tabs[0]
  const list = useMemo(() => events.filter((e) => isOnAnyDate(e, current.dates)).slice(0, 5), [events, current])
  return (
    <section className="px-4 pt-9" aria-label="이번 주말">
      <MHeader title="이번 주말 뭐 하지?" to="/events" />
      <div className="py-[14px]">
        <Row gap="gap-[6px]">
          {tabs.map((t) => (
            <MChip key={t.key} selected={t.key === current.key} onClick={() => setTab(t.key)}>
              {t.label}
            </MChip>
          ))}
        </Row>
      </div>
      <MState state={state} isEmpty={list.length === 0} emptyTitle="이 날짜에 열리는 행사가 없어요" emptyDescription="다른 날짜를 선택해 보세요">
        <CardRow events={list} render={(e) => <HomeCard {...M1_CARD} event={e} />} />
      </MState>
    </section>
  )
}

/** 태그 기획전 (721:650): 2열, 124px 카드 */
export function MobileTagSection() {
  const counts = useTagCounts(TAG_PROMOS.map((t) => t.tag))
  const visible = TAG_PROMOS.filter((t) => counts[t.tag] !== 0)
  if (visible.length === 0) return null
  return (
    <section className="px-4 pt-9" aria-label="태그로 찾는 기획전">
      <MHeader title="태그로 찾는 기획전" more={null} />
      <div className="grid grid-cols-2 gap-[10px] pt-[14px]">
        {visible.map((t) => (
          <Link
            key={t.tag}
            to={`/events?tag=${encodeURIComponent(t.tag)}`}
            className="promo-card flex h-[124px] flex-col rounded-lg px-[13px] text-white"
            style={{ background: t.gradient }}
          >
            <span className="relative z-[1] mt-3 self-start rounded-pill bg-white/[0.22] px-[9px] py-[3px] text-[11px] font-bold tracking-[-0.2px]">
              #{t.tag}
            </span>
            <span className="relative z-[1] mt-auto truncate text-[15px] font-black leading-5 tracking-[-0.3px]">{t.title}</span>
            <span className="relative z-[1] mb-[13px] pt-[3px] text-[11px] font-medium leading-5 tracking-[-0.3px] opacity-90">
              행사 모아보기 ›
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
