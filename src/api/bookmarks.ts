import { api } from './client'
import type { BookmarkItem, BookmarkList, EventCard } from './types'

export const listBookmarks = () => api.get<BookmarkList>('/bookmarks')
/** 새로 추가되면 201, 이미 있으면 200 */
export const addBookmark = (eventId: number) => api.post<unknown>('/bookmarks', { eventId })
export const removeBookmark = (eventId: number) => api.delete<unknown>(`/bookmarks/${eventId}`)

/** 찜 항목을 EventCard로 변환한다. 응답에 없는 필드는 null/0. */
export function bookmarkToCard(item: BookmarkItem): EventCard {
  return {
    id: item.id,
    title: item.title,
    category_id: null,
    category: null,
    sido_code: null,
    sido: null,
    start_date: item.startDate,
    end_date: item.endDate,
    venue_name: null,
    image_url: item.imageUrl,
    latitude: null,
    longitude: null,
    view_count: 0,
    price: null,
    is_free: item.priceType === 'FREE' ? true : item.priceType === 'PAID' ? false : null,
  }
}
