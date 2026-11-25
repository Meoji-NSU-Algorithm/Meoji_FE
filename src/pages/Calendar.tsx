import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBookmarks } from '../api/hooks'
import type { EventCard as EventCardT } from '../api/types'
import { bookmarkToCard } from '../api/bookmarks'
import { useAuth, useRequireLogin } from '../auth'
import { EventCard, Spinner } from '../components'
import {
  HeartOutlineIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchBigIcon,
  WifiOffIcon,
  ChevronLeft16Icon,
  ChevronRight16Icon,
  HeartLineIcon,
  RefreshIcon,
} from './events/icons'
import { MobileStatePanel, mobileOutlineBtn, mobilePrimaryBtn, primaryBtn, StatePanel } from './events/StatePanel'
import { toCardData } from './events/cardData'
import { buildMonth, eventRange, eventsInMonth, ymd } from './events/calendarGrid'
import { useIsMobile } from '../lib/useIsMobile'
import { useCardBookmarks } from './events/useCardBookmarks'
import { PageTitleBar } from './events/ViewTabs'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
// Figma B3 막대 색: 주황 / 초록 / 파랑 / 보라 (카테고리 id 순환)
const BAR_COLORS = [
  'bg-[#ffe7dd] text-[#b23a12]',
  'bg-[#e3f4ea] text-[#1d7048]',
  'bg-[#e3edff] text-[#2251b8]',
  'bg-[#f3e7fa] text-[#7a2e9e]',
]
const LANE_H = 24
// Figma M4 모바일 막대 색: 주황 / 초록 / 파랑 (+ 데스크톱 보라)
const M_BAR_COLORS = [
  'bg-[#ffe4da] text-primary-ink',
  'bg-[#e3f3ea] text-[#1f7a50]',
  'bg-[#e3ecfb] text-[#2f5fbf]',
  'bg-[#f3e7fa] text-[#7a2e9e]',
]
/** 모바일 칸에 보이는 막대 줄 수 (넘치면 '+N개 더') */
const M_LANES = 2
const dayIndex = (s: string) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000)

function todayStr(d = new Date()) {
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export default function Calendar() {
  const navigate = useNavigate()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const requireLogin = useRequireLogin()
  const bookmarks = useBookmarks()
  const { isLiked, toggle } = useCardBookmarks()
  const isMobile = useIsMobile()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [today] = useState(() => todayStr())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const move = (delta: number) => {
    setSelectedDate(null)
    setCursor(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  useEffect(() => {
    if (!authLoading && !isLoggedIn) requireLogin()
  }, [authLoading, isLoggedIn, requireLogin])

  const events = useMemo(() => (bookmarks.data?.events ?? []).map(bookmarkToCard), [bookmarks.data])
  const weeks = useMemo(() => buildMonth(cursor.year, cursor.month, events), [cursor, events])
  const monthEvents = useMemo(() => eventsInMonth(events, cursor.year, cursor.month), [events, cursor])

  const dayEvents = useMemo(() => {
    if (!selectedDate) return []
    const n = dayIndex(selectedDate)
    return events.filter((e) => {
      const r = eventRange(e)
      return r && r[0] <= n && r[1] >= n
    })
  }, [events, selectedDate])

  if (authLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    )
  }

  if (isMobile) {
    return (
      <MobileCalendar
        loggedIn={isLoggedIn}
        onLogin={() => requireLogin()}
        error={bookmarks.isError}
        onRetry={() => void bookmarks.refetch()}
        pending={bookmarks.isPending}
        cursor={cursor}
        move={move}
        today={today}
        weeks={weeks}
        monthEvents={monthEvents}
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate((cur) => (cur === d ? null : d))}
        dayEvents={dayEvents}
        renderCard={(e) => (
          <EventCard
            event={toCardData(e)}
            variant="bookmark"
            size="mobile"
            thumbHeight={190}
            href={`/events/${e.id}`}
            onClick={() => navigate(`/events/${e.id}`)}
            liked={isLiked(e.id)}
            onToggleLike={(_, next) => toggle(e, !next)}
          />
        )}
      />
    )
  }

  return (
    <div className="mx-auto max-w-content px-4 pb-12 md:px-6 md:pb-20">
      <PageTitleBar active="calendar" />
      {!isLoggedIn ? (
        <StatePanel
          role="status"
          icon={<HeartOutlineIcon size={26} />}
          title="로그인이 필요해요"
          message="찜한 행사를 캘린더에서 모아볼 수 있어요"
          action={
            <button type="button" className={primaryBtn} onClick={() => requireLogin()}>
              로그인하기
            </button>
          }
        />
      ) : bookmarks.isError ? (
        <StatePanel
          role="alert"
          icon={<WifiOffIcon />}
          title="찜한 행사를 불러오지 못했어요"
          message="잠시 후 다시 시도해 주세요"
          action={
            <button type="button" className={primaryBtn} onClick={() => void bookmarks.refetch()}>
              다시 시도
            </button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-[14px] pt-[6px]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => move(-1)}
                className="flex size-8 items-center justify-center rounded-lg border border-line text-ink"
              >
                <ChevronLeftIcon />
              </button>
              <h2 className="text-[20px] font-black leading-[30px] text-ink" aria-live="polite">
                {cursor.year}년 {cursor.month}월
              </h2>
              <button
                type="button"
                aria-label="다음 달"
                onClick={() => move(1)}
                className="flex size-8 items-center justify-center rounded-lg border border-line text-ink"
              >
                <ChevronRightIcon />
              </button>
            </div>
            <p className="flex items-center gap-[6px] text-[12px] leading-[18px] text-ink-muted">
              <HeartOutlineIcon size={15} className="text-primary-ink" />
              찜한 행사만 표시돼요. 목록에서 하트를 눌러 추가해 보세요.
            </p>
          </div>

          {/* 폰에서는 페이지 대신 달력만 가로 스크롤 */}
          <div className="overflow-x-auto overscroll-x-contain">
            <div role="grid" aria-label={`${cursor.year}년 ${cursor.month}월`} className="min-w-[760px] overflow-hidden rounded-lg border border-line">
              <div role="row" className="grid grid-cols-7 border-b border-line bg-surface-card">
                {WEEKDAYS.map((w, i) => (
                  <div key={w} role="columnheader" className={`p-[10px] text-center text-[12px] font-bold leading-[18px] ${i === 0 ? 'text-brand' : 'text-ink-muted'}`}>
                    {w}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  role="row"
                  className={`relative grid grid-cols-7 ${wi < weeks.length - 1 ? 'border-b border-line' : ''}`}
                  style={{ minHeight: Math.max(104, 30 + week.lanes * LANE_H + 8) }}
                >
                  {week.days.map((d, di) => (
                    <div
                      key={d.date}
                      role="gridcell"
                      className={`p-2 ${di < 6 ? 'border-r border-line' : ''} ${d.inMonth ? '' : 'bg-[#fcfbfa]'}`}
                    >
                      {d.date === today ? (
                        <span className="-ml-[3px] -mt-[3px] flex size-6 items-center justify-center rounded-[12px] bg-brand text-[12px] font-bold leading-[18px] text-white">
                          {d.day}
                        </span>
                      ) : (
                        <span className={`block text-[12px] font-bold leading-[18px] ${d.inMonth ? 'text-ink' : 'text-[#c9c3bf]'}`}>
                          {!d.inMonth && (d.day === 1 || (wi === 0 && di === 0)) ? `${Number(d.date.slice(5, 7))}월 ${d.day}` : d.day}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="pointer-events-none absolute inset-x-0 top-[30px] grid grid-cols-7 gap-y-[2px] px-2">
                    {week.segments.map((s) => (
                      <Link
                        key={`${s.event.id}-${wi}`}
                        to={`/events/${s.event.id}`}
                        title={s.event.title}
                        style={{ gridColumn: `${s.startCol + 1} / ${s.endCol + 2}`, gridRow: s.lane + 1 }}
                        className={`pointer-events-auto block h-[22px] truncate px-[7px] text-[11px] font-bold leading-[22px] ${
                          BAR_COLORS[(s.event.category_id ?? s.event.id) % BAR_COLORS.length]
                        } ${s.startsHere ? 'rounded-l-[6px]' : '-ml-2'} ${s.endsHere ? 'rounded-r-[6px]' : '-mr-2'}`}
                      >
                        {s.startsHere || s.startCol === 0 ? s.event.title : ''}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="pt-9">
            <h2 className="text-[21px] font-black leading-[31.5px] tracking-[-0.42px] text-ink">{cursor.month}월에 찜한 행사</h2>
            {bookmarks.isPending ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : monthEvents.length === 0 ? (
              <StatePanel
                icon={<SearchBigIcon />}
                title={events.length === 0 ? '아직 찜한 행사가 없어요' : `${cursor.month}월에 찜한 행사가 없어요`}
                message="행사 목록에서 하트를 눌러 추가해 보세요"
                action={
                  <Link to="/events" className={primaryBtn}>
                    행사 둘러보기
                  </Link>
                }
              />
            ) : (
              <ul className="grid grid-cols-2 gap-4 pt-[14px] md:grid-cols-3 lg:grid-cols-4">
                {monthEvents.map((e) => (
                  <li key={e.id}>
                    <EventCard
                      event={toCardData(e)}
                      variant="bookmark"
                      href={`/events/${e.id}`}
                      onClick={() => navigate(`/events/${e.id}`)}
                      liked={isLiked(e.id)}
                      onToggleLike={(_, next) => toggle(e, !next)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

type Weeks = ReturnType<typeof buildMonth>

/** M4 캘린더(모바일) · S6 찜 없음 */
function MobileCalendar({
  loggedIn,
  onLogin,
  error,
  onRetry,
  pending,
  cursor,
  move,
  today,
  weeks,
  monthEvents,
  selectedDate,
  onSelectDate,
  dayEvents,
  renderCard,
}: {
  loggedIn: boolean
  onLogin: () => void
  error: boolean
  onRetry: () => void
  pending: boolean
  cursor: { year: number; month: number }
  move: (delta: number) => void
  today: string
  weeks: Weeks
  monthEvents: EventCardT[]
  selectedDate: string | null
  onSelectDate: (d: string) => void
  dayEvents: EventCardT[]
  renderCard: (e: EventCardT) => React.ReactNode
}) {
  const title = <h1 className="px-4 pb-[14px] pt-5 text-[23px] font-black leading-7 tracking-[-0.6px] text-ink">캘린더</h1>
  if (!loggedIn || error) {
    return (
      <div className="pb-4">
        {title}
        {!loggedIn ? (
          <MobileStatePanel
            role="status"
            icon={<HeartLineIcon size={26} />}
            title="로그인이 필요해요"
            message="찜한 행사를 캘린더에서 모아볼 수 있어요"
            action={
              <button type="button" className={mobilePrimaryBtn} onClick={onLogin}>
                로그인하기
              </button>
            }
          />
        ) : (
          <MobileStatePanel
            role="alert"
            tone="muted"
            icon={<RefreshIcon />}
            title="찜한 행사를 불러오지 못했어요"
            message="잠시 후 다시 시도해 주세요"
            action={
              <button type="button" className={mobilePrimaryBtn} onClick={onRetry}>
                다시 시도
              </button>
            }
          />
        )}
      </div>
    )
  }

  const hasEvents = monthEvents.length > 0
  const rowH = hasEvents ? 72 : 52
  // 칸에 못 그린 막대(3번째 줄부터)를 날짜별로 센다
  const hidden = new Map<string, number>()
  for (const w of weeks)
    for (const s of w.segments) {
      if (s.lane < M_LANES) continue
      for (let c = s.startCol; c <= s.endCol; c++) {
        const d = w.days[c]
        if (d.inMonth) hidden.set(d.date, (hidden.get(d.date) ?? 0) + 1)
      }
    }
  const more = [...hidden].map(([d, n]) => `${Number(d.slice(8, 10))}일 +${n}개`).join(', ')
  const isThisMonth = today.startsWith(ymd(cursor.year, cursor.month, 1).slice(0, 7))
  const list = selectedDate ? dayEvents : monthEvents
  const navBtn = "relative flex size-8 items-center justify-center rounded-full border border-line-strong bg-surface text-ink after:absolute after:-inset-[7px] after:content-['']"

  return (
    <div className="pb-8">
      {title}
      <div className="flex items-center gap-2 px-4 pb-2 pt-[6px]">
        <button type="button" aria-label="이전 달" onClick={() => move(-1)} className={navBtn}>
          <ChevronLeft16Icon />
        </button>
        <h2 className="text-[19px] font-black leading-[23px] tracking-[-0.2px] text-ink" aria-live="polite">
          {cursor.year}년 {cursor.month}월
        </h2>
        <button type="button" aria-label="다음 달" onClick={() => move(1)} className={navBtn}>
          <ChevronRight16Icon />
        </button>
      </div>
      <p className="flex items-center gap-1 px-4 text-[11.5px] tracking-[-0.2px] text-ink-muted">
        <HeartLineIcon className="shrink-0 text-brand" />
        찜한 행사만 표시돼요. 목록에서 하트를 눌러 추가해 보세요.
      </p>

      <div className="px-4 pt-3">
        <div role="grid" aria-label={`${cursor.year}년 ${cursor.month}월`} className="overflow-hidden rounded-[14px] border border-line">
          <div role="row" className="grid grid-cols-7 border-b border-line bg-surface-card">
            {WEEKDAYS.map((w, i) => (
              <span
                key={w}
                role="columnheader"
                className={`flex h-[30px] items-center justify-center text-[11.5px] tracking-[-0.2px] ${i === 0 ? 'text-primary' : 'text-ink-muted'}`}
              >
                {w}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} role="row" className={`relative grid grid-cols-7 ${wi < weeks.length - 1 ? 'border-b border-line' : ''}`}>
              {week.days.map((d, di) => {
                const on = d.date === selectedDate
                return (
                  <div
                    key={d.date}
                    role="gridcell"
                    className={`${di < 6 ? 'border-r border-line-soft' : ''} ${on ? 'bg-primary-tint' : d.inMonth ? '' : 'bg-[#fcfbfa]'}`}
                    style={{ height: rowH }}
                  >
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${Number(d.date.slice(5, 7))}월 ${d.day}일`}
                      onClick={() => onSelectDate(d.date)}
                      className="relative block size-full text-left"
                    >
                      {d.date === today ? (
                        <span className="absolute left-[3px] top-[3px] flex size-5 items-center justify-center rounded-full bg-brand text-[11.5px] font-black tracking-[-0.2px] text-white">
                          {d.day}
                        </span>
                      ) : (
                        <span
                          className={`absolute left-[6px] top-[5px] text-[11.5px] tracking-[-0.2px] ${
                            d.inMonth ? 'font-bold text-ink' : 'font-medium text-ink-disabled'
                          }`}
                        >
                          {d.day}
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
              {week.segments
                .filter((s) => s.lane < M_LANES)
                .map((s) => (
                  <span
                    key={`${s.event.id}-${wi}`}
                    aria-hidden="true"
                    style={{
                      left: `calc(${(s.startCol / 7) * 100}% + 2px)`,
                      width: `calc(${((s.endCol - s.startCol + 1) / 7) * 100}% - 4px)`,
                      top: 24 + s.lane * 20,
                    }}
                    className={`pointer-events-none absolute h-[17px] truncate rounded-sm px-[5px] text-[11.5px] font-bold leading-[17px] tracking-[-0.2px] ${
                      M_BAR_COLORS[(s.event.category_id ?? s.event.id) % M_BAR_COLORS.length]
                    }`}
                  >
                    {s.event.title}
                  </span>
                ))}
            </div>
          ))}
        </div>
        {hasEvents && (
          <p className="pt-[6px] text-right text-[11px] tracking-[-0.2px] text-ink-subtle">
            {more ? `${more} 더 있어요 · ` : ''}날짜를 누르면 그날 행사를 볼 수 있어요
          </p>
        )}
      </div>

      {pending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !hasEvents ? (
        <MobileStatePanel
          className="pb-14 pt-[26px]"
          icon={<HeartLineIcon size={26} />}
          title={isThisMonth ? '이번 달 찜한 행사가 없어요' : `${cursor.month}월에 찜한 행사가 없어요`}
          message="목록에서 하트를 누르면 여기에 날짜별로 정리돼요"
          action={
            <Link to="/events" className={mobileOutlineBtn}>
              행사 둘러보기
            </Link>
          }
        />
      ) : (
        <section className="px-4 pt-[30px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-black leading-[26px] tracking-[-0.4px] text-ink">
              {selectedDate
                ? `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일 찜한 행사`
                : `${cursor.month}월에 찜한 행사`}
            </h2>
            {selectedDate && (
              <button type="button" onClick={() => onSelectDate(selectedDate)} className="flex h-9 items-center text-[13px] text-ink-subtle">
                {cursor.month}월 전체
              </button>
            )}
          </div>
          {list.length === 0 ? (
            <p className="py-10 text-center text-[13px] tracking-[-0.2px] text-ink-muted">이 날은 찜한 행사가 없어요</p>
          ) : (
            <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pt-[14px] [scrollbar-width:none]">
              {list.map((e) => (
                <li key={e.id} className="w-[150px] shrink-0">
                  {renderCard(e)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
