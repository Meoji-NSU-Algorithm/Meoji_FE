export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
}
export interface ApiFailure {
  success: false
  code: string
  message: string
  errors?: Record<string, string[] | string>
}

export interface TokenPair {
  access_token: string
  refresh_token: string
}
export interface KakaoLoginResult extends TokenPair {
  is_new_user: boolean
}

export interface User {
  id: number
  email: string | null
  nickname: string
  profile_image: string | null
}

export interface Category {
  id: number
  name: string
  sort_order: number
}
export interface Sido {
  code: string
  name: string
  short_name: string
  sort_order: number
}

export interface EventCard {
  id: number
  title: string
  category_id: number | null
  category: string | null
  sido_code: string | null
  sido: string | null
  start_date: string | null
  end_date: string | null
  venue_name: string | null
  image_url: string | null
  latitude: number | null
  longitude: number | null
  view_count: number
  price: number | null
  is_free: boolean | null
  /** 목록·월간 인기 카드에만 있다(찜 목록에는 없음). 리뷰가 없으면 0 */
  average_rating?: number | null
  review_count?: number
}
export interface MonthlyTopEvent extends EventCard {
  monthly_views: number
}
export interface ReviewImage {
  key: string
  url: string
}
export interface ReviewAuthor {
  id: number
  nickname: string
  profile_image: string | null
}
export interface Review {
  id: number
  user_id: number
  author: ReviewAuthor
  images: ReviewImage[]
  event_id: number
  rating: number
  content: string
  created_at: string
  updated_at: string
}
export interface MyReview extends Review {
  event: { id: number; title: string; image_url: string | null; end_date: string | null }
}
export interface EventDetail extends EventCard {
  description: string | null
  address: string | null
  address_detail: string | null
  play_time: string | null
  fee_text: string | null
  organizer: string | null
  contact_phone: string | null
  homepage_url: string | null
  is_permanent: boolean
  reviews: Review[]
  review_count: number
  average_rating: number | null
}

export type EventSort = 'latest' | 'popular' | 'dateAsc'
/** 검색 파라미터(q~end_date)가 하나라도 있으면 BE가 JWT를 요구한다. */
export interface EventListParams {
  q?: string
  title?: string
  venue?: string
  tag?: string
  category_id?: number
  sido_code?: string
  is_free?: boolean
  start_date?: string
  end_date?: string
  page?: number
  size?: number
  sort?: EventSort
}
export interface EventListResult {
  total_count: number
  page: number
  size: number
  events: EventCard[]
}
export interface MonthlyTopResult {
  month: string
  events: MonthlyTopEvent[]
}
export interface RatingSummary {
  event_id?: number
  average_rating: number | null
  review_count: number
}
export interface ReviewInput {
  rating: number
  content: string
  /** 업로드 API가 돌려준 key 목록(최대 5). PUT에서는 기존 목록을 통째로 대체한다. */
  images?: string[]
}
export interface CreateReviewInput extends ReviewInput {
  event_id: number
}

// ---- 찜 (BE는 camelCase) ----
export interface BookmarkItem {
  id: number
  title: string
  imageUrl: string | null
  startDate: string | null
  endDate: string | null
  priceType: 'FREE' | 'PAID' | 'UNKNOWN'
}
export interface BookmarkList {
  totalCount: number
  events: BookmarkItem[]
}

// ---- 약관 ----
export interface Consents {
  terms_agreed_at: string | null
  privacy_agreed_at: string | null
  marketing_agreed: boolean
  marketing_agreed_at: string | null
}

// ---- 길찾기 (BE는 camelCase) ----
export type DirectionsMode = 'car' | 'transit' | 'walk'
export type DirectionsStepType = 'SUBWAY' | 'BUS' | 'WALK' | 'DRIVE' | 'OTHER'
export interface DirectionsStep {
  stepNumber: number
  type: DirectionsStepType | string
  instruction: string
  durationMinutes: number | null
  distanceMeters: number | null
  detail: string | Record<string, unknown> | null
}
export interface DirectionsQuery {
  eventId: number
  originLat: number
  originLng: number
  mode?: DirectionsMode
}
export interface DirectionsResult {
  eventId: number
  mode: DirectionsMode
  departureTime: string | null
  durationMinutes: number
  distanceMeters: number
  arrivalTime: string | null
  steps: DirectionsStep[]
}
