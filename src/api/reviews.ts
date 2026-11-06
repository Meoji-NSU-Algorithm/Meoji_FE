import { api } from './client'
import type { CreateReviewInput, MyReview, RatingSummary, Review, ReviewImage, ReviewInput } from './types'

export const createReview = (input: CreateReviewInput) => api.post<Review>('/reviews', input)
export const getEventReviews = (eventId: number) => api.get<Review[]>(`/reviews/event/${eventId}`)
export const getEventRating = (eventId: number) => api.get<RatingSummary>(`/reviews/event/${eventId}/rating`)
export const getMyReviews = () => api.get<MyReview[]>('/reviews/my')
export const updateReview = (id: number, input: ReviewInput) => api.put<Review>(`/reviews/${id}`, input)
export const deleteReview = (id: number) => api.delete<unknown>(`/reviews/${id}`)
/** jpg/png/webp, 10MB 이하. 응답 key를 리뷰의 images에 넣어 연결한다. */
export function uploadReviewImage(file: File) {
  const form = new FormData()
  form.append('image', file)
  return api.postForm<ReviewImage>('/reviews/images', form)
}
