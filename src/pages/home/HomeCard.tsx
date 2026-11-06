import { EventCard as Card } from '../../components'
import type { EventCardVariant } from '../../components'
import type { EventCard } from '../../api/types'
import { toCardData } from '../events/cardData'
import { useEventActions } from './useEventActions'

interface Props {
  event: EventCard
  variant?: EventCardVariant
  rank?: number
  /** 썸네일 왼쪽 아래 배지 (D-6 등) */
  badge?: string | null
  viewCount?: number
}

/** EventCard + 로그인 가드 + 찜 토글을 묶은 홈 전용 카드 */
export function HomeCard({ event, variant, rank, badge, viewCount }: Props) {
  const { openEvent, toggleLike, isLiked } = useEventActions()
  return (
    <div className="relative">
      <Card
        event={toCardData(event, { view_count: viewCount })}
        variant={variant}
        rank={rank}
        liked={isLiked(event.id)}
        href={`/events/${event.id}`}
        onClick={() => openEvent(event)}
        onToggleLike={() => toggleLike(event)}
      />
      {badge && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[219/292]">
          <span className="absolute bottom-[10px] left-[10px] rounded-md bg-white/95 px-2 py-[2px] text-[12px] font-bold text-primary-ink">
            {badge}
          </span>
        </div>
      )}
    </div>
  )
}
