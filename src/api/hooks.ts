import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { addBookmark, listBookmarks, removeBookmark } from './bookmarks'
import { getDirections } from './directions'
import { getCategories, getEvent, getEvents, getMonthlyTop, getSidos } from './events'
import {
  createReview,
  deleteReview,
  getEventRating,
  getEventReviews,
  getMyReviews,
  updateReview,
  uploadReviewImage,
} from './reviews'
import { getConsents, saveConsents, withdrawAccount } from './users'
import type { BookmarkList, DirectionsQuery, EventCard, EventListParams, ReviewInput } from './types'

export const qk = {
  categories: ['categories'] as const,
  sidos: ['sidos'] as const,
  events: (p: EventListParams) => ['events', 'list', p] as const,
  monthlyTop: (month?: string, size?: number) => ['events', 'monthly-top', month ?? null, size ?? null] as const,
  event: (id: number) => ['events', 'detail', id] as const,
  eventReviews: (id: number) => ['reviews', 'event', id] as const,
  eventRating: (id: number) => ['reviews', 'event', id, 'rating'] as const,
  myReviews: ['reviews', 'my'] as const,
  bookmarks: (userId: number | undefined) => ['bookmarks', userId] as const,
  directions: (q: DirectionsQuery) => ['directions', q] as const,
  consents: (userId: number | undefined) => ['consents', userId] as const,
}

/** BE 상한: 목록 size<=100, monthly-top size<=20 */
const MAX_PAGE_SIZE = 100
const MAX_MONTHLY_TOP_SIZE = 20
const HOUR = 60 * 60 * 1000

export const useCategories = () => useQuery({ queryKey: qk.categories, queryFn: getCategories, staleTime: HOUR })
/** JWT 필요: 로그인 상태에서만 호출된다. */
export function useSidos() {
  const { isLoggedIn } = useAuth()
  return useQuery({ queryKey: qk.sidos, queryFn: getSidos, enabled: isLoggedIn, staleTime: HOUR })
}
export const useEvents = (params: EventListParams = {}, options: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: qk.events(params), queryFn: () => getEvents(params), placeholderData: keepPreviousData, ...options })
/**
 * 필터 없는 목록을 모든 페이지에 걸쳐 받아 합친다(홈 화면용, 최대 maxPages 페이지).
 * 한 번에 받을 수 있는 최대 size(100)를 넘는 행사도 홈의 섹션 분류에 포함하기 위함이다.
 */
export function useAllEvents(sort: EventListParams['sort'] = 'dateAsc', maxPages = 5) {
  return useQuery({
    queryKey: ['events', 'all', sort, maxPages] as const,
    queryFn: async () => {
      const events: EventCard[] = []
      let total = 0
      for (let page = 1; page <= maxPages; page++) {
        const res = await getEvents({ page, size: MAX_PAGE_SIZE, sort })
        total = res.total_count
        events.push(...res.events)
        if (res.events.length === 0 || events.length >= total) break
      }
      return { total_count: total, events }
    },
  })
}
export const useMonthlyTop = (params: { month?: string; size?: number } = {}) => {
  const size = params.size === undefined ? undefined : Math.min(params.size, MAX_MONTHLY_TOP_SIZE)
  return useQuery({ queryKey: qk.monthlyTop(params.month, size), queryFn: () => getMonthlyTop({ ...params, size }) })
}
/** JWT 필요 */
export function useEvent(id: number | undefined) {
  const { isLoggedIn } = useAuth()
  return useQuery({
    queryKey: qk.event(id ?? 0),
    queryFn: () => getEvent(id as number),
    enabled: id !== undefined && Number.isFinite(id) && isLoggedIn,
  })
}

export const useEventReviews = (eventId: number) =>
  useQuery({ queryKey: qk.eventReviews(eventId), queryFn: () => getEventReviews(eventId) })
export const useEventRating = (eventId: number) =>
  useQuery({ queryKey: qk.eventRating(eventId), queryFn: () => getEventRating(eventId) })
export function useMyReviews() {
  const { isLoggedIn } = useAuth()
  return useQuery({ queryKey: qk.myReviews, queryFn: getMyReviews, enabled: isLoggedIn })
}

function useInvalidateReviews() {
  const qc = useQueryClient()
  return (eventId?: number) => {
    void qc.invalidateQueries({ queryKey: ['reviews'] })
    if (eventId !== undefined) void qc.invalidateQueries({ queryKey: qk.event(eventId) })
    else void qc.invalidateQueries({ queryKey: ['events', 'detail'] })
  }
}
export function useCreateReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({ mutationFn: createReview, onSuccess: (r) => invalidate(r.event_id) })
}
export function useUpdateReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({
    mutationFn: (v: { id: number; eventId?: number } & ReviewInput) =>
      updateReview(v.id, { rating: v.rating, content: v.content, images: v.images }),
    onSuccess: (_r, v) => invalidate(v.eventId),
  })
}
export function useDeleteReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({
    mutationFn: (v: { id: number; eventId?: number }) => deleteReview(v.id),
    onSuccess: (_r, v) => invalidate(v.eventId),
  })
}

export function useUploadReviewImage() {
  return useMutation({ mutationFn: (file: File) => uploadReviewImage(file) })
}

// ---- 찜 ----
export function useBookmarks() {
  const { user } = useAuth()
  return useQuery({
    queryKey: qk.bookmarks(user?.id),
    queryFn: listBookmarks,
    enabled: !!user,
  })
}
export function useIsBookmarked(eventId: number) {
  const { data } = useBookmarks()
  return useMemo(() => new Set(data?.events.map((e) => e.id)), [data]).has(eventId)
}
/** 찜 토글(낙관적 업데이트). 호출 전 useRequireLogin 가드를 거칠 것. */
export function useToggleBookmark() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const key = qk.bookmarks(user?.id)
  return useMutation({
    mutationFn: async (v: { event: EventCard; bookmarked: boolean }) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      if (v.bookmarked) await removeBookmark(v.event.id)
      else await addBookmark(v.event.id)
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<BookmarkList>(key)
      if (prev) {
        const events = v.bookmarked
          ? prev.events.filter((e) => e.id !== v.event.id)
          : prev.events.some((e) => e.id === v.event.id)
            ? prev.events
            : [
                {
                  id: v.event.id,
                  title: v.event.title,
                  imageUrl: v.event.image_url,
                  startDate: v.event.start_date,
                  endDate: v.event.end_date,
                  priceType: (v.event.is_free === true ? 'FREE' : v.event.is_free === false ? 'PAID' : 'UNKNOWN') as
                    | 'FREE'
                    | 'PAID'
                    | 'UNKNOWN',
                },
                ...prev.events,
              ]
        qc.setQueryData<BookmarkList>(key, { totalCount: events.length, events })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

// ---- 길찾기 ----
export const useDirections = (q: DirectionsQuery | null) =>
  useQuery({
    queryKey: q ? qk.directions(q) : ['directions', null],
    queryFn: () => getDirections(q!),
    enabled: !!q,
    retry: false,
  })

// ---- 약관 / 탈퇴 ----
export function useConsents() {
  const { user } = useAuth()
  return useQuery({ queryKey: qk.consents(user?.id), queryFn: getConsents, enabled: !!user })
}
export function useSaveConsents() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveConsents,
    onSuccess: (data) => qc.setQueryData(qk.consents(user?.id), data),
  })
}
/** 성공 후 토큰/캐시 정리는 호출하는 쪽에서 한다. */
export function useWithdraw() {
  return useMutation({ mutationFn: withdrawAccount })
}
