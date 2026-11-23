import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, RatingStars, Spinner } from '../components'
import { useMyReviews } from '../api/hooks'
import type { MyReview } from '../api/types'
import { ReviewDeleteModal } from './detail/ReviewDeleteModal'
import { ReviewEditModal } from './detail/ReviewEditModal'
import { ReviewPhotos } from './detail/ReviewPhotos'
import { MyShell } from './my/MyShell'

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

function ReviewRow({ review, onEdit, onDelete }: { review: MyReview; onEdit: () => void; onDelete: () => void }) {
  const event = review.event
  const title = event?.title ?? '삭제되었거나 볼 수 없는 행사'
  const ended = !!event?.end_date && event.end_date.slice(0, 10) < todayStr()
  return (
    <li className="grid grid-cols-[64px_1fr] gap-3 md:grid-cols-[96px_1fr_auto] md:gap-4 border-b border-line py-5">
      <Link
        to={`/events/${review.event_id}`}
        aria-label={`${title} 상세 보기`}
        className="size-16 overflow-hidden md:size-24 rounded-card bg-gradient-to-br from-[#e8461c] to-[#f7a04b]"
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
        <ReviewPhotos
          images={review.images ?? []}
          authorName={review.author?.nickname || '내'}
          authorImage={review.author?.profile_image}
          caption={[event?.title, fmtDate(review.created_at)].filter(Boolean).join(' · ')}
        />
      </div>
      <div className="col-start-2 flex items-start gap-[6px] md:col-start-auto">
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

function Content() {
  const { data, isLoading, isError, error, refetch } = useMyReviews()
  const [editing, setEditing] = useState<MyReview | null>(null)
  const [deleting, setDeleting] = useState<MyReview | null>(null)

  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (!data || data.length === 0)
    return <EmptyState title="아직 작성한 리뷰가 없어요" description="다녀온 행사에 리뷰를 남겨 보세요" />

  return (
    <>
      <ul>
        {data.map((r) => (
          <ReviewRow key={r.id} review={r} onEdit={() => setEditing(r)} onDelete={() => setDeleting(r)} />
        ))}
      </ul>
      {editing && <ReviewEditModal review={editing} eventTitle={editing.event?.title} onClose={() => setEditing(null)} />}
      <ReviewDeleteModal target={deleting && { id: deleting.id, eventId: deleting.event_id }} onClose={() => setDeleting(null)} />
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
