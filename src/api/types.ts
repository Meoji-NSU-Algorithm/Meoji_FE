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
  price: string | number | null
  is_free: boolean
}
export interface MonthlyTopEvent extends EventCard {
  monthly_views: number
}
export interface Review {
  id: number
  user_id: number
  event_id: number
  rating: number
  content: string
  created_at: string
  updated_at: string
}
export interface EventDetail extends EventCard {
  description: string | null
  address: string | null
  address_detail: string | null
  play_time: string | null
  fee_text: string | null
  latitude: number | null
  longitude: number | null
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
}
export interface CreateReviewInput extends ReviewInput {
  event_id: number
}

// ---- 목업 전용 타입 ----
export interface DirectionsQuery {
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
}
export type TransitStepType = 'walk' | 'bus' | 'subway'
export interface TransitStep {
  type: TransitStepType
  /** 노선명 (예: "버스 400", "1호선"). 도보는 없음 */
  line?: string
  from: string
  to: string
  minutes: number
  distance_m: number
  /** 정류장/역 수 (대중교통만) */
  stops?: number
}
export interface DirectionsRoute {
  id: string
  total_minutes: number
  total_distance_m: number
  fare: number
  transfers: number
  steps: TransitStep[]
  /** 지도에 그릴 경로 좌표 [lat, lng] */
  path: Array<[number, number]>
}
export interface DirectionsResult {
  mock: true
  routes: DirectionsRoute[]
}
export interface ProfileUpdate {
  nickname?: string
  profile_image?: string | null
}
