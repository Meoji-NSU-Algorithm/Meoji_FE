import { useMemo, useState } from 'react'
import { useAllEvents } from '../api/hooks'
import { CategoryStrip } from './home/CategoryStrip'
import { HeroCarousel } from './home/HeroCarousel'
import {
  FreeSection,
  LoginStrip,
  PopularSection,
  RegionSection,
  TagSection,
  UpcomingSection,
  WeekendSection,
} from './home/Sections'
import { isLongRunning, isUpcomingOrOngoing, ymd } from './home/utils'

export default function Home() {
  const [today] = useState(() => ymd(new Date()))
  // 비로그인 시 필터 파라미터는 BE가 401 → 필터 없는 목록을 전부(여러 페이지) 받아 클라이언트에서 가공한다.
  const list = useAllEvents('dateAsc')
  // 1년 내내 열리는 상시 행사가 지역·무료·주말 섹션을 채우지 않도록 뒤로 보낸다(상대 순서는 유지).
  const events = useMemo(() => {
    const all = list.data?.events ?? []
    return [...all.filter((e) => !isLongRunning(e)), ...all.filter(isLongRunning)]
  }, [list.data])
  const heroes = useMemo(
    () =>
      events
        .filter((e) => isUpcomingOrOngoing(e, today) && e.start_date && e.start_date.slice(0, 10) <= today)
        .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? '')),
    [events, today],
  )
  const heroList = heroes.length ? heroes : events.filter((e) => isUpcomingOrOngoing(e, today))
  const state = { isLoading: list.isLoading, isError: list.isError, refetch: () => void list.refetch() }

  return (
    <>
      <div className="mx-auto max-w-content px-6">
        <CategoryStrip />
        <HeroCarousel events={heroList} today={today} />
        <PopularSection />
        <LoginStrip />
        <RegionSection events={events} state={state} />
        <UpcomingSection events={events} state={state} today={today} />
      </div>
      <FreeSection events={events} state={state} />
      <div className="mx-auto max-w-content px-6">
        <WeekendSection events={events} state={state} />
        <TagSection events={events} />
      </div>
    </>
  )
}
