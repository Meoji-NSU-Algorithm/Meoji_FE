// 테스트 전용 MSW 핸들러. 앱 런타임에서는 사용하지 않는다.
import { http, HttpResponse } from 'msw'

export const ok = <T,>(data: T, status = 200) =>
  HttpResponse.json({ success: true, message: 'ok', data }, { status })
export const fail = (status: number, code: string, message = code, errors?: Record<string, string[]>) =>
  HttpResponse.json({ success: false, code, message, ...(errors ? { errors } : {}) }, { status })

export const eventCardFixture = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: '테스트 행사',
  category_id: 1,
  category: '공연',
  sido_code: '44',
  sido: '충남',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  venue_name: '천안시민회관',
  image_url: 'https://example.com/a.jpg',
  latitude: 36.8,
  longitude: 127.1,
  view_count: 10,
  average_rating: 0,
  review_count: 0,
  price: null,
  is_free: null,
  ...over,
})

/** BE EventDetailSchema(= EventCardSchema + 상세 필드 + reviews/review_count/average_rating). snake_case */
export const eventDetailFixture = (over: Record<string, unknown> = {}) => ({
  ...eventCardFixture(),
  description: '소개',
  address: '충남 천안시',
  address_detail: null,
  play_time: null,
  fee_text: null,
  organizer: null,
  contact_phone: null,
  homepage_url: null,
  is_permanent: false,
  reviews: [],
  review_count: 0,
  average_rating: 0,
  ...over,
})

/** BE ReviewResponseSchema. snake_case, images 는 {key,url}, 시각은 UTC ISO 문자열 */
export const reviewFixture = (over: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 1,
  event_id: 1,
  rating: 4.5,
  content: '좋았어요',
  author: { id: 1, nickname: '테스터', profile_image: null },
  images: [],
  created_at: '2026-11-20T01:00:00+00:00',
  updated_at: '2026-11-20T01:00:00+00:00',
  ...over,
})

/** BE BookmarkEventSchema. camelCase */
export const bookmarkItemFixture = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: '테스트 행사',
  imageUrl: null,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  priceType: 'UNKNOWN',
  ...over,
})

/** BE directions 응답. camelCase. path: car/walk 는 [[lat,lng]], transit 은 [{type,coordinates}] */
export const directionsFixture = (over: Record<string, unknown> = {}) => ({
  eventId: 1,
  mode: 'car',
  departureTime: '2026-11-20T09:00:00+09:00',
  durationMinutes: 20,
  distanceMeters: 12000,
  arrivalTime: '2026-11-20T09:20:00+09:00',
  path: [[36.8, 127.1], [36.81, 127.11]],
  steps: [{ stepNumber: 1, type: 'DRIVE', instruction: '직진', durationMinutes: 20, distanceMeters: 12000, detail: null }],
  ...over,
})

export const handlers = [
  http.get('*/api/events/categories', () => ok([{ id: 1, name: '공연', sort_order: 1 }])),
  http.get('*/api/users/me', () => ok({ id: 1, email: 'a@b.c', nickname: '테스터', profile_image: null })),
]
