import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBookmarks } from '../api/hooks'
import { bookmarkToCard } from '../api/bookmarks'
import { useAuth, useRequireLogin } from '../auth'
import { EventCard, Spinner } from '../components'
import { HeartOutlineIcon, ChevronLeftIcon, ChevronRightIcon, SearchBigIcon, WifiOffIcon } from './events/icons'
import { primaryBtn, StatePanel } from './events/StatePanel'
import { toCardData } from './events/cardData'
import { buildMonth, eventsInMonth, ymd } from './events/calendarGrid'
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

function todayStr(d = new Date()) {
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export default function Calendar() {
  const navigate = useNavigate()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const requireLogin = useRequireLogin()
  const bookmarks = useBookmarks()
  const { isLiked, toggle } = useCardBookmarks()

  const [today] = useState(() => todayStr())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })

  useEffect(() => {
    if (!authLoading && !isLoggedIn) requireLogin()
  }, [authLoading, isLoggedIn, requireLogin])

  const events = useMemo(() => (bookmarks.data?.events ?? []).map(bookmarkToCard), [bookmarks.data])
  const weeks = useMemo(() => buildMonth(cursor.year, cursor.month, events), [cursor, events])
  const monthEvents = useMemo(() => eventsInMonth(events, cursor.year, cursor.month), [events, cursor])

  if (authLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-content px-6 pb-12">
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
          <div className="flex items-center justify-between pb-[14px] pt-[6px]">
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

          <div className="overflow-x-auto">
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
                  style={{ minHeight: Math.max(104, 34 + week.lanes * LANE_H + 8) }}
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
                        <span className={`text-[12px] font-bold leading-[18px] ${d.inMonth ? 'text-ink' : 'text-[#c9c3bf]'}`}>
                          {!d.inMonth && (d.day === 1 || (wi === 0 && di === 0)) ? `${Number(d.date.slice(5, 7))}월 ${d.day}` : d.day}
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="pointer-events-none absolute inset-x-0 top-[34px] grid grid-cols-7 gap-y-[2px] px-2">
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
                      variant="small"
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
