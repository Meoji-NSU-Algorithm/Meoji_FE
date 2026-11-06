import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, Modal, RatingStars, Spinner, useToast } from '../components'
import { useDeleteReview, useEvent, useMyReviews, useUpdateReview } from '../api/hooks'
import type { Review } from '../api/types'
import { MyShell } from './my/MyShell'

const MAX_CONTENT = 1000

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const btn = 'h-8 rounded-md border border-line px-3 text-[12px] text-ink'

/**
 * BE 의 /reviews/my 는 event_id 만 주므로 행사명/썸네일은 행사별 상세 조회(useEvent)로 보강한다.
 * (BE 요청: 리뷰 응답에 event {id,title,image_url,end_date} 포함)
 */
function ReviewRow({ review, onEdit, onDelete }: { review: Review; onEdit: () => void; onDelete: () => void }) {
  const { data: event, isError } = useEvent(review.event_id)
  const title = event?.title ?? (isError ? '삭제되었거나 볼 수 없는 행사' : '행사 정보를 불러오는 중')
  const ended = !!event?.end_date && !event.is_permanent && event.end_date < todayStr()
  return (
    <li className="grid grid-cols-[96px_1fr_auto] gap-4 border-b border-line py-5">
      <Link
        to={`/events/${review.event_id}`}
        aria-label={`${title} 상세 보기`}
        className="size-24 overflow-hidden rounded-card bg-gradient-to-br from-[#e8461c] to-[#f7a04b]"
      >
        {event?.image_url && <img src={event.image_url} alt="" className="size-full object-cover" />}
      </Link>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/events/${review.event_id}`} className="truncate text-[15px] font-bold leading-[22.5px] text-ink">
            {title}
          </Link>
          {ended && (
            <span className="rounded-[5px] bg-surface-muted px-[7px] py-[2px] text-[11px] font-bold text-ink-muted">
              종료된 행사
            </span>
          )}
        </div>
        <div className="flex items-center gap-[6px] pt-1 text-[12px] leading-[18px] text-ink-subtle">
          <RatingStars value={review.rating} size={18} />
          <span>
            {review.rating} · {fmtDate(review.created_at)}
          </span>
        </div>
        <p className="whitespace-pre-line break-words pt-2 text-[14px] leading-[23.8px] text-ink">{review.content}</p>
      </div>
      <div className="flex items-start gap-[6px]">
        <button type="button" className={btn} onClick={onEdit}>
          수정
        </button>
        <button type="button" className={btn} onClick={onDelete}>
          삭제
        </button>
      </div>
    </li>
  )
}

function EditModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdateReview()
  const [rating, setRating] = useState(review.rating)
  const [content, setContent] = useState(review.content)
  const trimmed = content.trim()
  const valid = rating >= 0.5 && trimmed.length >= 1 && trimmed.length <= MAX_CONTENT

  const submit = () =>
    update.mutate(
      { id: review.id, eventId: review.event_id, rating, content: trimmed },
      {
        onSuccess: () => {
          toast.show({ message: '리뷰를 수정했어요' })
          onClose()
        },
      },
    )

  return (
    <Modal open onClose={onClose} title="리뷰 수정">
      <div className="flex flex-col items-center gap-4 pt-5">
        <RatingStars value={rating} size={32} onChange={setRating} />
        <textarea
          aria-label="리뷰 내용"
          value={content}
          maxLength={MAX_CONTENT}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="w-full resize-none rounded-[12px] border border-line p-3 text-[14px] text-ink outline-none focus:border-ink"
        />
        <p className="self-end text-[12px] text-ink-subtle">
          {content.length}/{MAX_CONTENT}
        </p>
        {update.isError && (
          <p role="alert" className="text-[13px] text-primary-ink">
            수정하지 못했어요. 잠시 후 다시 시도해 주세요
          </p>
        )}
        <div className="flex w-full gap-2">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-[12px] border border-line text-[14px] font-bold">
            취소
          </button>
          <button
            type="button"
            disabled={!valid || update.isPending}
            onClick={submit}
            className="h-11 flex-1 rounded-[12px] bg-primary text-[14px] font-bold text-white disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const toast = useToast()
  const del = useDeleteReview()
  return (
    <Modal open onClose={onClose} title="리뷰를 삭제할까요?">
      <p className="pt-2 text-center text-[14px] text-ink-muted">삭제한 리뷰는 되돌릴 수 없어요</p>
      {del.isError && (
        <p role="alert" className="pt-3 text-center text-[13px] text-primary-ink">
          삭제하지 못했어요. 잠시 후 다시 시도해 주세요
        </p>
      )}
      <div className="flex gap-2 pt-6">
        <button type="button" onClick={onClose} className="h-11 flex-1 rounded-[12px] border border-line text-[14px] font-bold">
          취소
        </button>
        <button
          type="button"
          disabled={del.isPending}
          onClick={() =>
            del.mutate(
              { id: review.id, eventId: review.event_id },
              {
                onSuccess: () => {
                  toast.show({ message: '리뷰를 삭제했어요' })
                  onClose()
                },
              },
            )
          }
          className="h-11 flex-1 rounded-[12px] bg-primary text-[14px] font-bold text-white disabled:opacity-40"
        >
          삭제
        </button>
      </div>
    </Modal>
  )
}

function Content() {
  const { data, isLoading, isError, refetch } = useMyReviews()
  const [editing, setEditing] = useState<Review | null>(null)
  const [deleting, setDeleting] = useState<Review | null>(null)

  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!data || data.length === 0)
    return <EmptyState title="아직 작성한 리뷰가 없어요" description="다녀온 행사에 리뷰를 남겨 보세요" />

  return (
    <>
      <ul>
        {data.map((r) => (
          <ReviewRow key={r.id} review={r} onEdit={() => setEditing(r)} onDelete={() => setDeleting(r)} />
        ))}
      </ul>
      {editing && <EditModal review={editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteModal review={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}

export default function MyReviews() {
  return (
    <MyShell tab="reviews">
      <Content />
    </MyShell>
  )
}
