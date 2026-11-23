import { useState } from 'react'
import { errorMessage } from '../../api/errors'
import { useUpdateReview } from '../../api/hooks'
import type { Review } from '../../api/types'
import { Modal, RatingStars, useToast } from '../../components'
import { ReviewImagePicker } from './ReviewImagePicker'
import { PencilIcon, XIcon } from './icons'
import { useReviewImages } from './useReviewImages'

/** BE 상한(공백 제외 1~1000자) */
export const MAX_CONTENT = 1000

interface Props {
  review: Pick<Review, 'id' | 'event_id' | 'rating' | 'content' | 'images'>
  eventTitle?: string
  onClose: () => void
}

/** 리뷰 수정 모달 (Figma E4). 작성 폼과 같은 모양이고, 저장하면 '리뷰를 수정했어요' 토스트가 뜬다. */
export function ReviewEditModal({ review, eventTitle, onClose }: Props) {
  const toast = useToast()
  const update = useUpdateReview()
  const [rating, setRating] = useState(review.rating)
  const [content, setContent] = useState(review.content)
  const pics = useReviewImages(review.images ?? [])
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const initialKeys = (review.images ?? []).map((i) => i.key)
  const dirty =
    rating !== review.rating ||
    content !== review.content ||
    pics.files.length > 0 ||
    pics.keys.length !== initialKeys.length ||
    pics.keys.some((k, i) => k !== initialKeys[i])
  /** 닫기(취소·×·Esc·바깥): 바뀐 게 있으면 바로 닫지 않고 확인을 먼저 보여 준다 */
  const requestClose = () => {
    if (confirmingDiscard) return
    if (dirty && !update.isPending) setConfirmingDiscard(true)
    else onClose()
  }
  const trimmed = content.trim()
  const valid = rating >= 0.5 && trimmed.length >= 1 && trimmed.length <= MAX_CONTENT

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
    <Modal open onClose={requestClose} ariaLabel="리뷰 수정" bare widthClass="max-w-[664px]">
      <div className="flex items-center border-b border-line px-[22px] py-[18px]">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold text-ink">리뷰 수정</h2>
          {eventTitle && <p className="truncate text-[12px] text-ink-subtle">{eventTitle}</p>}
        </div>
        <button type="button" aria-label="닫기" onClick={requestClose} className="flex size-10 items-center justify-center rounded-[10px] text-ink">
          <XIcon size={20} />
        </button>
      </div>
      <div className="flex flex-col gap-[14px] px-[22px] py-5">
        <div className="flex items-center gap-2">
          <RatingStars value={rating} size={28} onChange={setRating} />
          <span className="pl-2 text-[17px] font-bold text-ink">{rating > 0 ? `${rating}점` : '별점을 선택해 주세요'}</span>
        </div>
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="review-edit-content" className="text-[13px] font-bold text-ink">
            후기
          </label>
          <textarea
            id="review-edit-content"
            aria-label="리뷰 내용"
            value={content}
            maxLength={MAX_CONTENT}
            onChange={(e) => setContent(e.target.value)}
            className="h-[104px] w-full resize-none rounded-[12px] border border-ink bg-surface px-[14px] py-3 text-[14px] leading-[21px] text-ink outline-none"
          />
          <p className="self-end text-[12px] text-ink-subtle">
            {content.length}/{MAX_CONTENT}
          </p>
        </div>
        <ReviewImagePicker state={pics} disabled={update.isPending} compact />
        {update.isError && (
          <p role="alert" className="text-[13px] text-primary-ink">
            {errorMessage(update.error)}
          </p>
        )}
      </div>
      <div className="flex gap-2 border-t border-line px-[22px] pb-5 pt-[14px]">
        <button type="button" onClick={requestClose} className="h-12 w-[120px] rounded-[12px] bg-[#f2eeeb] text-[14px] font-bold text-ink">
          취소
        </button>
        <button
          type="button"
          disabled={!valid || update.isPending}
          onClick={submit}
          className="h-12 flex-1 rounded-[12px] bg-primary text-[14px] font-bold text-white disabled:opacity-40"
        >
          {update.isPending ? '저장 중…' : '수정 완료'}
        </button>
      </div>
    </Modal>
    <Modal open={confirmingDiscard} onClose={() => setConfirmingDiscard(false)} ariaLabel="수정 취소 확인" bare widthClass="max-w-[384px]">
      <div className="flex flex-col items-center px-6 pb-5 pt-7">
        <span className="mb-[6px] flex size-[52px] items-center justify-center rounded-[16px] bg-primary-tint text-primary">
          <PencilIcon size={24} />
        </span>
        <h2 className="pt-2 text-[18px] font-bold text-ink">수정한 내용이 사라져요</h2>
        <p className="pt-2 text-center text-[14px] leading-[22.4px] text-ink-muted">닫으면 바꾼 내용이 저장되지 않아요.</p>
        <div className="flex w-full gap-2 pt-6">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-[12px] bg-[#f2eeeb] text-[14px] font-bold text-ink">
            닫기
          </button>
          <button type="button" onClick={() => setConfirmingDiscard(false)} className="h-12 flex-1 rounded-[12px] bg-primary text-[14px] font-bold text-white">
            계속 수정
          </button>
        </div>
      </div>
    </Modal>
    </>
  )
}
