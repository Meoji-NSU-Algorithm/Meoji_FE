import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../api/errors'
import { useUpdateReview } from '../../api/hooks'
import type { Review } from '../../api/types'
import { Modal, RatingStars, useToast } from '../../components'
import { PencilIcon, TrashIcon } from './icons'
import { ReviewImagePicker } from './ReviewImagePicker'
import { useReviewImages } from './useReviewImages'

export const MAX_REVIEW_CONTENT = 1000

const grayBtn = 'h-12 flex-1 rounded-[10px] bg-surface-muted text-[14px] font-bold text-ink'
const primaryBtn = 'h-12 flex-1 rounded-[10px] bg-primary text-[14px] font-bold text-white disabled:opacity-60'

interface ConfirmProps {
  open: boolean
  icon: ReactNode
  title: string
  message: string
  cancelLabel: string
  confirmLabel: string
  /** 취소 버튼·Esc·바깥 클릭 */
  onCancel: () => void
  /** 왼쪽 회색 버튼을 따로 처리할 때 (없으면 onCancel) */
  onSecondary?: () => void
  onConfirm: () => void
  busy?: boolean
  error?: string | null
  ariaLabel?: string
}

/** 아이콘 + 제목 + 한 줄 설명 + 회색/주황 두 버튼 확인 모달 */
export function ConfirmDialog({ open, icon, title, message, cancelLabel, confirmLabel, onCancel, onSecondary, onConfirm, busy, error, ariaLabel }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} ariaLabel={ariaLabel ?? title}>
      <div className="flex flex-col items-center pt-3 text-center">
        <span className="flex size-[52px] items-center justify-center rounded-[14px] bg-primary-tint text-primary">{icon}</span>
        <h2 className="pt-4 text-[18px] font-black leading-[27px] text-ink">{title}</h2>
        <p className="pt-1 text-[14px] leading-[21px] text-ink-muted">{message}</p>
        {error && (
          <p role="alert" className="pt-3 text-[13px] text-primary-ink">
            {error}
          </p>
        )}
        <div className="flex w-full gap-2 pt-6">
          <button type="button" onClick={onSecondary ?? onCancel} className={grayBtn}>
            {cancelLabel}
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={primaryBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function DeleteReviewDialog(props: Pick<ConfirmProps, 'open' | 'onCancel' | 'onConfirm' | 'busy' | 'error'>) {
  return (
    <ConfirmDialog
      {...props}
      ariaLabel="리뷰 삭제 확인"
      icon={<TrashIcon size={22} />}
      title="리뷰를 삭제할까요?"
      message="삭제한 리뷰와 사진은 다시 복구할 수 없어요."
      cancelLabel="취소"
      confirmLabel="삭제하기"
    />
  )
}

type EditableReview = Pick<Review, 'id' | 'event_id' | 'rating' | 'content' | 'images'>

/** 리뷰 수정 모달. 바꾼 내용이 있는데 닫으려 하면 이탈 확인을 띄운다. */
export function ReviewEditModal({ review, eventTitle, onClose }: { review: EditableReview; eventTitle?: string; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdateReview()
  const [rating, setRating] = useState(review.rating)
  const [content, setContent] = useState(review.content)
  const [confirming, setConfirming] = useState(false)
  const pics = useReviewImages(review.images ?? [])
  const trimmed = content.trim()
  const valid = rating >= 0.5 && trimmed.length >= 1 && trimmed.length <= MAX_REVIEW_CONTENT
  const busy = update.isPending
  const dirty = rating !== review.rating || content !== review.content || pics.files.length > 0 || pics.keys.length !== (review.images ?? []).length

  // Modal 은 onClose 가 바뀌면 포커스를 다시 잡으므로, 최신 상태는 ref 로 읽고 함수는 고정한다
  const latest = useRef({ confirming, busy, dirty, onClose })
  useEffect(() => {
    latest.current = { confirming, busy, dirty, onClose }
  })
  const requestClose = useCallback(() => {
    const { confirming, busy, dirty, onClose } = latest.current
    // 이탈 확인이 떠 있으면 그 모달이 Esc·바깥 클릭을 처리한다
    if (confirming || busy) return
    if (dirty) setConfirming(true)
    else onClose()
  }, [])

  const submit = () =>
    update.mutate(
      { id: review.id, eventId: review.event_id, rating, content: trimmed, images: pics.keys, files: pics.files },
      {
        onSuccess: () => {
          toast.show({ message: '리뷰를 수정했어요' })
          onClose()
        },
      },
    )

  return (
    <>
      <Modal open onClose={requestClose} title="리뷰 수정" ariaLabel="리뷰 수정">
        {eventTitle && <p className="pt-1 text-center text-[12px] leading-[18px] text-ink-muted">{eventTitle}</p>}
        <fieldset disabled={busy} className="flex flex-col gap-3 pt-5 disabled:opacity-60">
          <div className="flex items-center gap-3">
            <RatingStars value={rating} size={30} onChange={setRating} />
            <span className="text-[18px] font-bold text-ink">{rating}점</span>
          </div>
          <label className="text-[13px] font-bold text-ink" htmlFor="review-edit-content">
            후기
          </label>
          <textarea
            id="review-edit-content"
            aria-label="리뷰 수정 내용"
            value={content}
            maxLength={MAX_REVIEW_CONTENT}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-[12px] border border-line p-3 text-[14px] text-ink outline-none focus:border-ink"
          />
          <p className="self-end text-[12px] text-ink-subtle">
            {content.length}/{MAX_REVIEW_CONTENT}
          </p>
          <ReviewImagePicker state={pics} disabled={busy} />
        </fieldset>
        {update.isError && (
          <p role="alert" className="pt-3 text-[13px] text-primary-ink">
            {errorMessage(update.error)}
          </p>
        )}
        <div className="flex gap-2 pt-5">
          <button type="button" onClick={requestClose} disabled={busy} className={`${grayBtn} max-w-[120px]`}>
            취소
          </button>
          <button type="button" disabled={!valid || busy} onClick={submit} className={primaryBtn}>
            {busy ? '수정 중…' : '수정 완료'}
          </button>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirming}
        icon={<PencilIcon size={22} />}
        title="수정한 내용이 사라져요"
        message="닫으면 바꾼 내용이 저장되지 않아요."
        cancelLabel="닫기"
        confirmLabel="계속 수정"
        onCancel={() => setConfirming(false)}
        onSecondary={onClose}
        onConfirm={() => setConfirming(false)}
      />
    </>
  )
}
