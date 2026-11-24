import { useState } from 'react'
import { ApiError } from '../../api/client'
import { errorMessage } from '../../api/errors'
import { useCreateReview } from '../../api/hooks'
import type { Review } from '../../api/types'
import { useAuth, useRequireLogin } from '../../auth'
import { RatingStars, useToast } from '../../components'
import { ReviewAvatar } from './ReviewAvatar'
import { useIsMobile } from '../../lib/useIsMobile'
import { ChatIcon, RefreshIcon, SpinnerIcon, WarnIcon } from './icons'
import { MobileReviewForm } from './MobileReviewForm'
import { ReviewDeleteModal } from './ReviewDeleteModal'
import { MAX_CONTENT, ReviewEditModal } from './ReviewEditModal'
import { ReviewImagePicker } from './ReviewImagePicker'
import { ReviewPhotos } from './ReviewPhotos'
import { useReviewImages } from './useReviewImages'

/** review.author 가 없을 때만 쓰는 대체 라벨 */
export const ANONYMOUS_LABEL = '방문자'

const FAILURE_HINT = '쓴 글과 고른 사진은 그대로 있어요. 다시 등록해 주세요.'
/** 사유가 분명한 실패(중복 리뷰·사진 규칙·저장소 장애 등)는 그 안내를, 그 밖에는 기본 안내를 보여 준다 */
function failureHint(e: unknown) {
  const specific = e instanceof ApiError && (e.status < 500 || e.code.startsWith('IMAGE_'))
  return specific ? errorMessage(e) : FAILURE_HINT
}

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
  /** 등록 요청이 실패했을 때의 안내 (Figma C2 ③ 등록 실패). 글·사진은 그대로 남는다 */
  const [failure, setFailure] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Review | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)

  const submitCreate = () => {
    if (rating <= 0) return setError('별점을 선택해 주세요.')
    if (!content.trim()) return setError('후기를 입력해 주세요.')
    setError(null)
    setFailure(null)
    create.mutate(
      { event_id: eventId, rating, content: content.trim(), files: pics.files },
      {
        onSuccess: () => {
          setRating(0)
          setContent('')
          pics.reset()
          toast.show({ message: '리뷰가 등록됐어요!' })
        },
        onError: (e) => setFailure(failureHint(e)),
      },
    )
  }

  const average = averageRating ?? 0
  const pending = create.isPending
  const isMobile = useIsMobile()

  const dialogs = (
    <>
      {editTarget && <ReviewEditModal review={editTarget} eventTitle={eventTitle} onClose={() => setEditTarget(null)} />}
      <ReviewDeleteModal target={deleteTarget && { id: deleteTarget.id, eventId }} onClose={() => setDeleteTarget(null)} />
    </>
  )

  if (isMobile) {
    // Figma M5 729:125(리뷰), M5-2 730:13(작성 중), S8 754:54(리뷰 없음)
    return (
      <section id="reviews" className="scroll-mt-16 px-4 pt-[34px]" aria-label="리뷰">
        <h2 className="text-[18px] font-black tracking-[-0.3px] text-ink">
          리뷰 <span className="text-brand">{reviewCount}</span>
        </h2>

        {reviewCount > 0 && (
          <div className="mt-3 flex items-center gap-[14px] rounded-[14px] bg-surface-card p-4">
            <span className="text-[34px] font-black leading-[34px] tracking-[-1px] text-ink">{average.toFixed(1)}</span>
            <div>
              <RatingStars value={average} size={14} gap={1} />
              <p className="pt-[2px] text-[11.5px] tracking-[-0.2px] text-ink-muted">{reviewCount}개의 리뷰</p>
            </div>
          </div>
        )}

        {reviews.length === 0 && (
          <div className="flex flex-col items-center px-3 pb-5 pt-[26px] text-center" data-testid="reviews-empty">
            <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-tint text-brand">
              <ChatIcon size={24} />
            </span>
            <p className="text-[17px] font-black leading-6 tracking-[-0.2px] text-ink">첫 리뷰의 주인공이 되어 보세요!</p>
            <p className="pt-[6px] text-[13px] leading-5 tracking-[-0.2px] text-ink-muted">이 행사에 다녀오셨다면 첫 리뷰를 남겨 주세요</p>
          </div>
        )}

        {!mine && (
          <div className={reviews.length === 0 ? '' : 'pt-3'}>
            <MobileReviewForm
              rating={rating}
              setRating={setRating}
              content={content}
              setContent={setContent}
              pics={pics}
              pending={pending}
              error={error}
              failure={failure}
              requireLogin={requireLogin}
              onSubmit={submitCreate}
            />
          </div>
        )}

        {reviews.length > 0 && (
          <ul className="pt-1">
            {reviews.map((r) => {
              const own = !!user && r.user_id === user.id
              const name = r.author?.nickname || (own ? user?.nickname : undefined) || ANONYMOUS_LABEL
              const avatar = r.author?.profile_image ?? null
              // 글자 작은 수정·삭제는 보이는 크기는 그대로 두고 누르는 범위만 44px 로 넓힌다
              const hit = 'relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[""]'
              return (
                <li key={r.id} className="border-b border-line py-4 last:border-b-0" data-testid="review-item">
                  <div className="flex items-center gap-[10px]">
                    <ReviewAvatar name={name} src={avatar} size={34} />
                    <div className="min-w-0 flex-1 tracking-[-0.2px]">
                      <p className="truncate text-[13.5px] font-bold text-ink">{name}</p>
                      <p className="flex items-center gap-1 text-[11.5px] text-ink-subtle">
                        <RatingStars value={r.rating} size={11} />
                        {r.rating} · {formatDate(r.created_at)}
                      </p>
                    </div>
                    {own && (
                      <div className="flex shrink-0 items-center gap-1 text-[11.5px] tracking-[-0.2px] text-ink-subtle">
                        <button type="button" className={hit} onClick={() => setEditTarget(r)}>수정</button>
                        <span aria-hidden="true">·</span>
                        <button type="button" className={hit} onClick={() => setDeleteTarget(r)}>삭제</button>
                      </div>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap pt-2 text-[13.5px] leading-[21px] tracking-[-0.2px] text-ink">{r.content}</p>
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
        {dialogs}
      </section>
    )
  }

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
        <div className="mt-[14px] flex flex-col gap-[14px] rounded-[18px] border border-line px-[22px] pb-5 pt-[22px]">
          <fieldset
            disabled={pending}
            aria-busy={pending}
            className={`m-0 flex min-w-0 flex-col gap-[14px] border-0 p-0 ${pending ? 'pointer-events-none opacity-50' : ''}`}
          >
            <h3 className="text-[15px] font-bold leading-[22.5px] text-ink">이 행사는 어떠셨나요?</h3>
            <div className="flex flex-wrap items-center gap-3">
              <RatingStars value={rating} size={30} onChange={(v) => requireLogin(() => setRating(v))} />
              <span className="text-[17px] font-bold leading-[25px] text-ink">{rating > 0 ? `${rating}점` : '별점을 선택해 주세요'}</span>
              <span className="text-[12px] leading-[18px] text-ink-subtle">별의 왼쪽을 누르면 반 개, 오른쪽을 누르면 한 개가 선택돼요</span>
            </div>
            <div className="flex flex-col items-end gap-[6px]">
              <textarea
                aria-label="리뷰 내용"
                value={content}
                maxLength={MAX_CONTENT}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => requireLogin()}
                placeholder="방문 후기를 자유롭게 남겨 주세요"
                className="h-[96px] min-h-[96px] w-full resize-y rounded-[12px] border border-line bg-surface px-[14px] py-3 text-[14px] leading-[21px] text-ink outline-none placeholder:text-[#757575] focus:border-primary"
              />
              <p className="text-[12px] text-ink-subtle">
                {content.length}/{MAX_CONTENT}
              </p>
            </div>
            <ReviewImagePicker state={pics} disabled={pending} />
          </fieldset>
          {error && (
            <p role="alert" className="text-[13px] text-primary-ink">
              {error}
            </p>
          )}
          {failure && !pending && (
            <div role="alert" className="flex items-start gap-[10px] rounded-[12px] bg-primary-tint px-[14px] py-3">
              <WarnIcon size={18} className="mt-[2px] shrink-0 text-primary-ink" />
              <div>
                <p className="text-[13px] leading-[20.8px] text-[#8a2a0e]">리뷰를 등록하지 못했어요</p>
                <p className="text-[12px] leading-[19.2px] text-ink-muted">{failure}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line pt-[14px]">
            <p className="text-[12px] text-ink-muted">{pending ? '사진이 많으면 몇 초 걸릴 수 있어요' : ''}</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => requireLogin(submitCreate)}
              className={`flex h-11 items-center gap-2 rounded-[12px] px-5 text-[14px] font-bold text-white ${pending ? 'bg-[#e07a55]' : 'bg-primary'}`}
            >
              {pending && <SpinnerIcon size={16} />}
              {!pending && failure && <RefreshIcon size={16} />}
              {pending ? '등록 중…' : failure ? '다시 등록' : '리뷰 등록'}
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

      {dialogs}
    </section>
  )
}
