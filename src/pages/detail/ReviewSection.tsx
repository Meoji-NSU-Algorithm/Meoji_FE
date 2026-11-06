import { useState } from 'react'
import { ApiError } from '../../api/client'
import { useCreateReview, useDeleteReview, useUpdateReview } from '../../api/hooks'
import type { Review } from '../../api/types'
import { useAuth, useRequireLogin } from '../../auth'
import { EmptyState, Modal, RatingStars, useToast } from '../../components'
import { Avatar } from '../my/Avatar'
import { CameraIcon } from './icons'

/** 작성자 정보(author)가 없는 리뷰에 쓰는 익명 라벨 */
export const ANONYMOUS_LABEL = '방문자'

const MAX_CONTENT = 1000

function formatDate(iso: string) {
  return iso.slice(0, 10).replaceAll('-', '.')
}

interface Props {
  eventId: number
  reviews: Review[]
  averageRating: number | null
  reviewCount: number
}

export function ReviewSection({ eventId, reviews, averageRating, reviewCount }: Props) {
  const { user, isLoggedIn } = useAuth()
  const requireLogin = useRequireLogin()
  const toast = useToast()
  const create = useCreateReview()
  const update = useUpdateReview()
  const remove = useDeleteReview()

  const mine = isLoggedIn && user ? reviews.find((r) => r.user_id === user.id) : undefined
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)

  const startEdit = (r: Review) => {
    setEditingId(r.id)
    setRating(r.rating)
    setContent(r.content)
    setError(null)
  }

  const submitCreate = () => {
    if (rating <= 0) return setError('별점을 선택해 주세요.')
    if (!content.trim()) return setError('후기를 입력해 주세요.')
    setError(null)
    create.mutate(
      { event_id: eventId, rating, content: content.trim() },
      {
        onSuccess: () => {
          setRating(0)
          setContent('')
          toast.show({ message: '리뷰를 등록했어요' })
        },
        onError: (e) => {
          if (e instanceof ApiError && e.code === 'REVIEW_ALREADY_EXISTS') {
            setError('이미 이 행사에 리뷰를 남기셨어요. 작성한 리뷰를 수정해 주세요.')
          } else {
            setError(e instanceof Error && e.message ? e.message : '리뷰를 등록하지 못했어요.')
          }
        },
      },
    )
  }

  const submitEdit = () => {
    if (editingId === null) return
    if (rating <= 0) return setError('별점을 선택해 주세요.')
    if (!content.trim()) return setError('후기를 입력해 주세요.')
    setError(null)
    update.mutate(
      { id: editingId, eventId, rating, content: content.trim() },
      {
        onSuccess: () => {
          setEditingId(null)
          setRating(0)
          setContent('')
          toast.show({ message: '리뷰를 수정했어요' })
        },
        onError: (e) => setError(e instanceof Error && e.message ? e.message : '리뷰를 수정하지 못했어요.'),
      },
    )
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    remove.mutate(
      { id: deleteTarget.id, eventId },
      {
        onSuccess: () => {
          setDeleteTarget(null)
          toast.show({ message: '리뷰를 삭제했어요' })
        },
        onError: (e) => {
          setDeleteTarget(null)
          toast.show({ message: e instanceof Error && e.message ? e.message : '리뷰를 삭제하지 못했어요' })
        },
      },
    )
  }

  const average = averageRating ?? 0
  const formDisabled = create.isPending

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

      {!mine && (
        <div className="mt-[14px] rounded-lg border border-line p-5">
          <h3 className="text-[15px] font-bold leading-[22.5px] text-ink">이 행사는 어떠셨나요?</h3>
          <div className="flex flex-wrap items-center gap-3 pb-3 pt-[10px]">
            <RatingStars value={rating} size={30} onChange={(v) => requireLogin(() => setRating(v))} />
            <span className="text-[18px] font-bold leading-[27px] text-ink">{rating > 0 ? `${rating}점` : '별점을 선택해 주세요'}</span>
            <span className="text-[12px] leading-[18px] text-ink-subtle">별의 왼쪽을 누르면 반 개, 오른쪽을 누르면 한 개가 선택돼요</span>
          </div>
          <textarea
            aria-label="리뷰 내용"
            value={content}
            maxLength={MAX_CONTENT}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => requireLogin()}
            placeholder="방문 후기를 자유롭게 남겨 주세요"
            className="h-24 min-h-24 w-full resize-y rounded-card border border-line bg-[#fcfbfa] p-[14px] text-[14px] leading-[21px] text-ink outline-none placeholder:text-[#757575] focus:border-primary"
          />
          {error && (
            <p role="alert" className="pt-2 text-[13px] text-primary-ink">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between pt-3">
            {/* BE에 사진 업로드 API가 없어 비활성화한다. */}
            <button
              type="button"
              disabled
              title="사진 첨부는 준비 중이에요"
              className="inline-flex h-10 cursor-not-allowed items-center gap-[6px] rounded-[10px] border border-dashed border-[#d5cfcb] px-[14px] text-[13px] text-ink-disabled"
            >
              <CameraIcon size={18} /> 사진 추가 (준비 중)
            </button>
            <button
              type="button"
              disabled={formDisabled}
              onClick={() => requireLogin(submitCreate)}
              className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white disabled:opacity-60"
            >
              리뷰 등록
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState title="아직 리뷰가 없어요" description="첫 번째 리뷰를 남겨 보세요" />
      ) : (
        <ul className="mt-2">
          {reviews.map((r) => {
            const own = !!user && r.user_id === user.id
            // 내 리뷰는 로컬 프로필 수정(MOCK)이 반영된 user 값을 우선한다.
            const writer = own ? user : r.author
            const name = writer?.nickname ?? ANONYMOUS_LABEL
            const editing = editingId === r.id
            return (
              <li key={r.id} className="border-b border-line py-5" data-testid="review-item">
                <div className="flex items-center gap-[10px]">
                  <Avatar name={name} src={writer?.profile_image} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold leading-[21px] text-ink">{name}</p>
                    <p className="flex h-[18px] items-center gap-[6px] text-[12px] text-ink-subtle">
                      <RatingStars value={r.rating} size={13} />
                      {r.rating} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  {own && !editing && (
                    <div className="flex gap-[10px] text-[12px] text-ink-subtle">
                      <button type="button" onClick={() => startEdit(r)}>수정</button>
                      <button type="button" onClick={() => setDeleteTarget(r)}>삭제</button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="pt-[10px]">
                    <RatingStars value={rating} size={26} onChange={setRating} />
                    <textarea
                      aria-label="리뷰 수정 내용"
                      value={content}
                      maxLength={MAX_CONTENT}
                      onChange={(e) => setContent(e.target.value)}
                      className="mt-2 h-24 w-full resize-y rounded-card border border-line bg-[#fcfbfa] p-[14px] text-[14px] leading-[21px] text-ink outline-none focus:border-primary"
                    />
                    {error && (
                      <p role="alert" className="pt-2 text-[13px] text-primary-ink">
                        {error}
                      </p>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => { setEditingId(null); setError(null) }} className="h-10 rounded-card border border-line px-4 text-[14px] font-bold text-ink">
                        취소
                      </button>
                      <button type="button" disabled={update.isPending} onClick={submitEdit} className="h-10 rounded-card bg-primary px-4 text-[14px] font-bold text-white disabled:opacity-60">
                        수정 완료
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap pt-[10px] text-[14px] leading-[23.8px] text-ink">{r.content}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="리뷰를 삭제할까요?" ariaLabel="리뷰 삭제 확인">
        <p className="pt-2 text-center text-[14px] leading-[21px] text-ink-muted">삭제한 리뷰는 되돌릴 수 없어요.</p>
        <div className="flex gap-2 pt-5">
          <button type="button" onClick={() => setDeleteTarget(null)} className="h-11 flex-1 rounded-card border border-line text-[14px] font-bold text-ink">
            취소
          </button>
          <button type="button" disabled={remove.isPending} onClick={confirmDelete} className="h-11 flex-1 rounded-card bg-primary text-[14px] font-bold text-white disabled:opacity-60">
            삭제
          </button>
        </div>
      </Modal>
    </section>
  )
}
