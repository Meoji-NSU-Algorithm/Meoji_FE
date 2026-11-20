import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { useCreateReview } from '../../api/hooks'
import type { Review } from '../../api/types'
import { useAuth, useRequireLogin } from '../../auth'
import { RatingStars, useToast } from '../../components'
import { ReviewAvatar } from './ReviewAvatar'
import { ReviewDeleteModal } from './ReviewDeleteModal'
import { MAX_CONTENT, ReviewEditModal } from './ReviewEditModal'
import { ReviewImagePicker } from './ReviewImagePicker'
import { ReviewPhotos } from './ReviewPhotos'
import { useReviewImages } from './useReviewImages'

/** review.author 가 없을 때만 쓰는 대체 라벨 */
export const ANONYMOUS_LABEL = '방문자'

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll('-', '.')
}

interface Props {
  eventId: number
  eventTitle?: string
  reviews: Review[]
  averageRating: number | null
  reviewCount: number
}

export function ReviewSection({ eventId, eventTitle, reviews, averageRating, reviewCount }: Props) {
  const { user, isLoggedIn } = useAuth()
  const requireLogin = useRequireLogin()
  const toast = useToast()
  const create = useCreateReview()
  const pics = useReviewImages()

  const mine = isLoggedIn && user ? reviews.find((r) => r.user_id === user.id) : undefined
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Review | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)

  const submitCreate = () => {
    if (rating <= 0) return setError('별점을 선택해 주세요.')
    if (!content.trim()) return setError('후기를 입력해 주세요.')
    setError(null)
    create.mutate(
      { event_id: eventId, rating, content: content.trim(), files: pics.files },
      {
        onSuccess: () => {
          setRating(0)
          setContent('')
          pics.reset()
          toast.show({ message: '리뷰가 등록됐어요!' })
        },
        onError: (e) => setError(errorMessage(e)),
      },
    )
  }

  const average = averageRating ?? 0

  return (
    <section className="pt-14" aria-label="리뷰">
      <h2 className="flex items-center gap-[10px] text-[20px] font-black leading-[30px] text-ink">
        리뷰 <span className="text-brand">{reviewCount}</span>
      </h2>

      {reviewCount > 0 && (
        <div className="mt-[14px] flex items-center gap-[22px] rounded-lg bg-surface-card px-6 py-[22px]">
          <span className="font-display text-[44px] font-black leading-[44px] text-ink">{average.toFixed(1)}</span>
          <div>
            <RatingStars value={average} size={18} />
            <p className="pt-1 text-[13px] leading-[19.5px] text-ink-muted">{reviewCount}개의 리뷰</p>
          </div>
        </div>
      )}

      {reviews.length === 0 && (
        <div className="mt-[14px] rounded-lg bg-surface-card px-6 py-[26px] text-center">
          <p className="text-[15px] font-bold leading-[22.5px] text-ink">첫 리뷰의 주인공이 되어 보세요!</p>
          <p className="pt-1 text-[12px] leading-[18px] text-ink-muted">이 행사에 다녀오셨다면 첫 리뷰를 남겨 주세요</p>
        </div>
      )}

      {!mine && (
        <div className="mt-[14px] flex flex-col gap-4 rounded-[18px] border border-line px-[22px] pb-5 pt-[22px]">
          <h3 className="text-[15px] font-bold leading-[22.5px] text-ink">이 행사는 어떠셨나요?</h3>
          <div className="flex flex-wrap items-center gap-3">
            <RatingStars value={rating} size={26} onChange={(v) => requireLogin(() => setRating(v))} />
            <span className="text-[17px] font-bold leading-[25px] text-ink">{rating > 0 ? `${rating}점` : '별점을 선택해 주세요'}</span>
            <span className="text-[12px] leading-[18px] text-ink-subtle">별의 왼쪽을 누르면 반 개, 오른쪽을 누르면 한 개가 선택돼요</span>
          </div>
          <textarea
            aria-label="리뷰 내용"
            value={content}
            maxLength={MAX_CONTENT}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => requireLogin()}
            placeholder="방문 후기를 자유롭게 남겨 주세요"
            className="h-[84px] min-h-[84px] w-full resize-y rounded-[12px] border border-line bg-surface px-[14px] py-3 text-[14px] leading-[21px] text-ink outline-none placeholder:text-[#757575] focus:border-primary"
          />
          <ReviewImagePicker state={pics} disabled={create.isPending} />
          {error && (
            <p role="alert" className="text-[13px] text-primary-ink">
              {error}
            </p>
          )}
          <div className="flex justify-end border-t border-line pt-[14px]">
            <button
              type="button"
              disabled={create.isPending}
              onClick={() => requireLogin(submitCreate)}
              className="h-11 rounded-[12px] bg-primary px-5 text-[14px] font-bold text-white disabled:opacity-60"
            >
              {create.isPending ? '등록 중…' : '리뷰 등록'}
            </button>
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="mt-2">
          {reviews.map((r) => {
            const own = !!user && r.user_id === user.id
            const name = r.author?.nickname || (own ? user?.nickname : undefined) || ANONYMOUS_LABEL
            const avatar = r.author?.profile_image ?? null
            return (
              <li key={r.id} className="border-b border-line py-5" data-testid="review-item">
                <div className="flex items-center gap-[10px]">
                  <ReviewAvatar name={name} src={avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold leading-[21px] text-ink">{name}</p>
                    <p className="flex h-[18px] items-center gap-[6px] text-[12px] text-ink-subtle">
                      <RatingStars value={r.rating} size={13} />
                      {r.rating} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  {own && (
                    <div className="flex gap-[10px] text-[12px] text-ink-subtle">
                      <button type="button" onClick={() => setEditTarget(r)}>수정</button>
                      <button type="button" onClick={() => setDeleteTarget(r)}>삭제</button>
                    </div>
                  )}
                </div>
                <p className="whitespace-pre-wrap pt-[10px] text-[14px] leading-[23.8px] text-ink">{r.content}</p>
                <ReviewPhotos
                  images={r.images ?? []}
                  authorName={name}
                  authorImage={avatar}
                  caption={[eventTitle, formatDate(r.created_at)].filter(Boolean).join(' · ')}
                />
              </li>
            )
          })}
        </ul>
      )}

      {editTarget && <ReviewEditModal review={editTarget} eventTitle={eventTitle} onClose={() => setEditTarget(null)} />}
      <ReviewDeleteModal target={deleteTarget && { id: deleteTarget.id, eventId }} onClose={() => setDeleteTarget(null)} />
    </section>
  )
}
