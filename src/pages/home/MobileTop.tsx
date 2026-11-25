import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookmarks, useCategories } from '../../api/hooks'
import { useAuth } from '../../auth'
import { formatDateRange } from '../../components'
import { CalendarIcon, SearchIcon } from '../../components/icons'
import { PhotoPlaceholder } from '../../components/PhotoPlaceholder'
import type { EventCard } from '../../api/types'
import { useEventActions } from './useEventActions'
import { startKakaoLogin } from './kakaoLogin'
import { CATEGORY_NAMES, addDays, nextWeekend, ymd } from './utils'

/** 찜 항목(BookmarkItem: startDate/endDate)이 dates 중 하루라도 열리는가. 종료일이 없으면 시작일 하루 */
function onAnyDate(start: string | null, end: string | null, dates: string[]) {
  const s = start?.slice(0, 10)
  const e = end?.slice(0, 10) ?? s
  return !!s && !!e && dates.some((d) => s <= d && d <= e)
}
import all from './assets/cat-all.svg'
import festival from './assets/cat-festival.svg'
import exhibition from './assets/cat-exhibition.svg'
import performance from './assets/cat-performance.svg'
import experience from './assets/cat-experience.svg'
import season from './assets/cat-season.svg'
import weekend from './assets/cat-weekend.svg'

/* 모바일 홈(Figma M1 721:2 · M1-0 733:2) 윗부분: 검색창 → 카테고리 줄 → 안내 줄 → 히어로 */

/** 누르면 검색 화면(/search)으로 가는 가짜 검색창 (721:14) */
export function MobileSearchLink() {
  return (
    <div className="px-4">
      <Link
        to="/search"
        className="flex h-11 items-center gap-[10px] rounded-pill bg-surface-muted px-4 text-[14px] tracking-[-0.2px] text-ink"
      >
        <SearchIcon className="shrink-0 text-ink" />
        행사명, 장소, 태그로 검색
      </Link>
    </div>
  )
}

const ICONS: Record<string, string> = { 축제: festival, 전시: exhibition, 공연: performance, 체험: experience, 계절행사: season }

function CatItem({ label, icon, to }: { label: string; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to} className="flex w-[58px] shrink-0 flex-col items-center gap-[6px]">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-surface-warm">{icon}</span>
      <span className="whitespace-nowrap text-[11.5px] leading-[15px] tracking-[-0.2px] text-ink">{label}</span>
    </Link>
  )
}

const catImg = (src: string) => <img src={src} alt="" width={36} height={36} />

/** 0원 티켓 (데스크톱 CategoryStrip 의 FreeIcon 을 36px 로) */
function FreeIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 44 44" fill="none" aria-hidden>
      <rect x="5" y="12" width="34" height="20" rx="4" fill="#3fbf8a" transform="rotate(-8 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" transform="rotate(-8 22 22)">0원</text>
    </svg>
  )
}

/** 카테고리 줄 (721:20). 지도·캘린더는 탭바에 있어서 모바일 줄에서는 뺀다 */
export function MobileCategoryRow() {
  const { data: categories } = useCategories()
  const [now] = useState(() => new Date())
  const { sat, sun } = nextWeekend(now)
  const idOf = (name: string) => categories?.find((c) => c.name === name)?.id
  return (
    <nav
      aria-label="카테고리"
      className="flex gap-[6px] overflow-x-auto px-3 pb-1 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <CatItem label="전체" icon={catImg(all)} to="/events" />
      {CATEGORY_NAMES.map((name) => {
        const id = idOf(name)
        return <CatItem key={name} label={name} icon={catImg(ICONS[name])} to={id ? `/events?category_id=${id}` : '/events'} />
      })}
      <span className="flex shrink-0 self-start px-[2px] pt-[6px]" aria-hidden>
        <span className="h-10 w-px bg-line" />
      </span>
      <CatItem label="무료" icon={<FreeIcon />} to="/events?is_free=true" />
      <CatItem label="이번 주말" icon={catImg(weekend)} to={`/events?start_date=${ymd(sat)}&end_date=${ymd(sun)}`} />
    </nav>
  )
}

const stripIcon = (
  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-surface text-brand">
    <CalendarIcon size={16} />
  </span>
)

/** 오늘부터 이번 주 일요일까지의 날짜들 */
function thisWeekDates(today: Date): string[] {
  const left = today.getDay() === 0 ? 0 : 7 - today.getDay()
  return Array.from({ length: left + 1 }, (_, i) => ymd(addDays(today, i)))
}

/**
 * 히어로 위 안내 줄. 로그인 전(M1-0 733:114): 가입 유도 + 카카오로 시작.
 * 로그인 후(M1 721:137): 이번 주 찜한 행사 개수 + 캘린더 바로가기. 이번 주 찜이 없으면 그리지 않는다.
 */
export function MobileNoticeStrip() {
  const { isLoggedIn } = useAuth()
  const bookmarks = useBookmarks()
  const [today] = useState(() => new Date())
  const week = useMemo(() => {
    const dates = thisWeekDates(today)
    return (bookmarks.data?.events ?? [])
      .filter((e) => onAnyDate(e.startDate, e.endDate, dates))
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
  }, [bookmarks.data, today])

  if (!isLoggedIn) {
    return (
      <div className="px-4 pt-4">
        <div className="flex min-h-[60px] items-center gap-[10px] rounded-[14px] bg-primary-tint py-[10px] pl-[14px] pr-3">
          {stripIcon}
          <span className="min-w-0 flex-1">
            <b className="block text-[13px] font-bold leading-[18px] tracking-[-0.2px] text-ink">
              보고 싶은 행사, 찜해 두면 캘린더에 쏙
            </b>
            <span className="block text-[11.5px] leading-[18px] tracking-[-0.2px] text-ink-muted">
              로그인하고 관심 행사를 찜해 보세요
            </span>
          </span>
          <button
            type="button"
            onClick={startKakaoLogin}
            className="relative flex h-8 shrink-0 items-center rounded-pill bg-kakao px-[11px] text-[12px] font-bold tracking-[-0.2px] text-kakao-ink after:absolute after:-inset-y-[6px] after:inset-x-0 after:content-['']"
          >
            카카오로 시작
          </button>
        </div>
      </div>
    )
  }
  if (week.length === 0) return null
  const first = week[0]
  const sub = [formatDateRange(first.startDate, null), week.map((e) => e.title).join(' · ')].filter(Boolean).join(' ')
  return (
    <div className="px-4 pt-4">
      <Link to="/calendar" className="flex h-[52px] items-center gap-[10px] rounded-[14px] bg-primary-tint px-[14px]">
        {stripIcon}
        <span className="min-w-0 flex-1">
          <b className="block text-[13px] font-bold leading-[18px] tracking-[-0.2px] text-ink">
            이번 주 찜한 행사 {week.length}개
          </b>
          <span className="block truncate text-[11.5px] leading-[18px] tracking-[-0.2px] text-ink-muted">{sub}</span>
        </span>
        <span className="shrink-0 text-[12px] font-bold tracking-[-0.2px] text-primary">캘린더 ›</span>
      </Link>
    </div>
  )
}

function HeroSlide({ event, today, onOpen }: { event: EventCard; today: string; onOpen: () => void }) {
  const daysLeft = event.end_date
    ? (new Date(event.end_date.slice(0, 10)).getTime() - new Date(today).getTime()) / 86400000
    : null
  const ending = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
  const meta = [formatDateRange(event.start_date, event.end_date), event.venue_name, event.is_free ? '무료' : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative h-[196px] w-full shrink-0 snap-start overflow-hidden rounded-lg text-left text-white"
    >
      {event.image_url ? (
        <>
          <img src={event.image_url} alt="" className="absolute inset-0 size-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-b from-black/0 from-40% to-black/45" aria-hidden />
        </>
      ) : (
        <span className="absolute inset-0" aria-hidden>
          <PhotoPlaceholder title="" category={event.category} variant="thumb" />
        </span>
      )}
      <span className="absolute left-5 right-5 top-[77px] flex flex-col">
        <span className="text-[11px] font-bold tracking-[-0.2px] opacity-90">
          {ending ? '이번 주말' : '진행 중'}
          {event.sido ? ` · ${event.sido}` : ''}
        </span>
        <span className="line-clamp-2 pt-2 text-[21px] font-black leading-[28px] tracking-[-0.5px]">
          {event.title}
          {ending && (
            <>
              <br />
              마지막 주말이에요
            </>
          )}
        </span>
        <span className="truncate pt-2 text-[11.5px] tracking-[-0.2px] opacity-90">{meta}</span>
      </span>
    </button>
  )
}

/** 히어로 배너 (721:153). 한 장씩 옆으로 넘기고 오른쪽 위에 "1 / 3" */
export function MobileHero({ events, today }: { events: EventCard[]; today: string }) {
  const { openEvent } = useEventActions()
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const slides = events.slice(0, 3)
  if (slides.length === 0) return null
  return (
    <div className="px-4 pt-[14px]">
      <div className="relative">
        <div
          ref={ref}
          aria-label="추천 행사"
          onScroll={(e) => {
            const el = e.currentTarget
            if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth))
          }}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((s) => (
            <HeroSlide key={s.id} event={s} today={today} onOpen={() => openEvent(s)} />
          ))}
        </div>
        <span className="pointer-events-none absolute right-[14px] top-[14px] flex h-[22px] items-center rounded-pill bg-black/[0.28] px-[9px] text-[11px] font-bold tracking-[-0.2px] text-white">
          {Math.min(index, slides.length - 1) + 1} / {slides.length}
        </span>
      </div>
    </div>
  )
}
