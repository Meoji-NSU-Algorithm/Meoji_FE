import type { EventCard } from '../../api/types'
import type { EventCardData } from '../../components'

/** BE 카드(null 허용)를 공통 EventCard 컴포넌트 입력으로 변환한다. */
export function toCardData(e: EventCard): EventCardData {
  return {
    id: e.id,
    title: e.title,
    category: e.category ?? '',
    sido: e.sido ?? '',
    start_date: e.start_date ?? '',
    end_date: e.end_date ?? '',
    venue_name: e.venue_name ?? '',
    image_url: e.image_url,
    price: e.price,
    is_free: e.is_free,
  }
}
