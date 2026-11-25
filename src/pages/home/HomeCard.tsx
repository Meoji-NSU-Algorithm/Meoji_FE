import { EventCard as Card } from '../../components'
import type { EventCardSize, EventCardVariant } from '../../components'
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
  /** 배지 모양. light: 데스크톱 흰 배지(기본), dark: 모바일 M1 어두운 배지(721:413) */
  badgeTone?: 'light' | 'dark'
  /** 모바일 카드 치수 (EventCard size) */
  size?: EventCardSize
  /** 썸네일 고정 높이(px). 배지 위치도 이 높이를 기준으로 잡는다 */
  thumbHeight?: number
}

/** EventCard + 로그인 가드 + 찜 토글을 묶은 홈 전용 카드 */
export function HomeCard({ event, variant, rank, badge, viewCount, badgeTone = 'light', size, thumbHeight }: Props) {
  const { openEvent, toggleLike, isLiked } = useEventActions()
  return (
    <div className="relative">
      <Card
        event={toCardData(event, { view_count: viewCount })}
        variant={variant}
        rank={rank}
        size={size}
        thumbHeight={thumbHeight}
        liked={isLiked(event.id)}
        href={`/events/${event.id}`}
        onClick={() => openEvent(event)}
        onToggleLike={() => toggleLike(event)}
      />
      {badge && (
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 ${thumbHeight != null ? '' : 'aspect-[219/292]'}`}
          style={thumbHeight != null ? { height: thumbHeight } : undefined}
        >
          {badgeTone === 'dark' ? (
            <span className="absolute bottom-[10px] left-[10px] flex h-5 items-center rounded-[5px] bg-ink/[0.72] px-[7px] text-[11px] font-bold tracking-[-0.2px] text-white">
              {badge}
            </span>
          ) : (
            <span className="absolute bottom-[10px] left-[10px] rounded-md bg-white/95 px-2 py-[2px] text-[12px] font-bold text-primary-ink">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
