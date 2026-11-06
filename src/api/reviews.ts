import { api } from './client'
import type { CreateReviewInput, RatingSummary, Review, ReviewImage, ReviewInput } from './types'

export const createReview = (input: CreateReviewInput) => api.post<Review>('/reviews', input)
export const getEventReviews = (eventId: number) => api.get<Review[]>(`/reviews/event/${eventId}`)
export const getEventRating = (eventId: number) => api.get<RatingSummary>(`/reviews/event/${eventId}/rating`)
export const getMyReviews = () => api.get<Review[]>('/reviews/my')
export const updateReview = (id: number, input: ReviewInput) => api.put<Review>(`/reviews/${id}`, input)
export const deleteReview = (id: number) => api.delete<unknown>(`/reviews/${id}`)
/** BE가 webp로 변환해 저장하고 {key, url}을 돌려준다 */
export function uploadReviewImage(file: File) {
  const form = new FormData()
  form.append('image', file)
  return api.post<ReviewImage>('/reviews/images', form)
}
