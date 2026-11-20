import { api } from './client'
import type { CreateReviewInput, MyReview, RatingSummary, Review, ReviewInput } from './types'

/** 사진이 있으면 multipart(data: 본문 JSON 문자열, images: 사진 파일), 없으면 JSON 본문 그대로. */
function withFiles(body: object, files: File[] = []) {
  if (!files.length) return body
  const form = new FormData()
  form.append('data', JSON.stringify(body))
  files.forEach((file) => form.append('images', file))
  return form
}

export const createReview = ({ files, ...input }: CreateReviewInput) => api.post<Review>('/reviews', withFiles(input, files))
export const getEventReviews = (eventId: number) => api.get<Review[]>(`/reviews/event/${eventId}`)
export const getEventRating = (eventId: number) => api.get<RatingSummary>(`/reviews/event/${eventId}/rating`)
export const getMyReviews = () => api.get<MyReview[]>('/reviews/my')
export const updateReview = (id: number, { files, ...input }: ReviewInput) =>
  api.put<Review>(`/reviews/${id}`, withFiles(input, files))
export const deleteReview = (id: number) => api.delete<unknown>(`/reviews/${id}`)
