import type { EventCard } from '../../api/types'
import { MobileCategoryRow, MobileHero, MobileNoticeStrip, MobileSearchLink } from './MobileTop'
import {
  MobileFreeSection,
  MobilePopularSection,
  MobileRegionSection,
  MobileTagSection,
  MobileUpcomingSection,
  MobileWeekendSection,
} from './MobileSections'

interface Props {
  events: EventCard[]
  heroes: EventCard[]
  today: string
  state: { isLoading: boolean; isError: boolean; refetch: () => void }
}

/** 모바일 홈 (Figma M1 721:2 로그인 후 · M1-0 733:2 로그인 전). 헤더·탭바·푸터는 Layout 이 그린다. */
export function MobileHome({ events, heroes, today, state }: Props) {
  return (
    <div data-testid="mobile-home">
      <MobileSearchLink />
      <MobileCategoryRow />
      <MobileNoticeStrip />
      <MobileHero events={heroes} today={today} />
      <MobilePopularSection />
      <MobileRegionSection events={events} state={state} />
      <MobileUpcomingSection events={events} state={state} today={today} />
      <MobileFreeSection events={events} state={state} />
      <MobileWeekendSection events={events} state={state} />
      <MobileTagSection />
    </div>
  )
}
