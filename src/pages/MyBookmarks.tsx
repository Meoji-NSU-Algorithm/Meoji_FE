import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, EventCard, Spinner, useToast } from '../components'
import type { EventCardData } from '../components'
import { useBookmarks, useToggleBookmark } from '../api/hooks'
import { bookmarkToCard } from '../api/bookmarks'
import { errorMessage } from '../api/errors'
import type { EventCard as EventCardType } from '../api/types'
import { MyShell } from './my/MyShell'

type Sort = 'upcoming' | 'recent'

function toCardData(e: EventCardType): EventCardData {
  return {
    ...e,
    category: e.category ?? '',
    sido: e.sido ?? '',
    start_date: e.start_date ?? '',
    end_date: e.end_date ?? e.start_date ?? '',
    venue_name: e.venue_name ?? '',
  }
}

function Content() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data, isLoading, isError, refetch } = useBookmarks()
  const toggle = useToggleBookmark()
  const [sort, setSort] = useState<Sort>('upcoming')

  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!data || data.events.length === 0)
    return (
      <EmptyState
        title="아직 찜한 행사가 없어요"
        description="관심 있는 행사를 찜하고 한눈에 모아 보세요"
        action={
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white"
          >
            행사 둘러보기
          </button>
        }
      />
    )

  // 저장 순서가 곧 최근 찜한 순(addBookmark 가 앞에 추가)
  const list =
    sort === 'upcoming'
      ? [...data.events.map(bookmarkToCard)].sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999'))
      : data.events.map(bookmarkToCard)

  const unlike = (event: EventCardType) =>
    toggle.mutate(
      { event, bookmarked: true },
      {
        onError: (err) => toast.show({ message: errorMessage(err) }),
        onSuccess: () =>
          toast.show({
            message: '찜을 해제했어요',
            actionLabel: '되돌리기',
            onAction: () =>
              toggle.mutate(
                { event, bookmarked: false },
                { onError: (err) => toast.show({ message: errorMessage(err) }) },
              ),
          }),
      },
    )

  return (
    <>
      <div className="flex items-center justify-between pb-4 pt-[22px]">
        <p className="text-[14px] text-ink">{sort === 'upcoming' ? '다가오는 순' : '최근 찜한 순'}</p>
        <div className="flex gap-[2px]" role="group" aria-label="정렬">
          {(
            [
              ['upcoming', '다가오는 순'],
              ['recent', '최근 찜한 순'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
              className={`px-2 py-1 text-[13px] ${sort === key ? 'font-bold text-ink' : 'text-ink-subtle'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-4">
        {list.map((e) => (
          <li key={e.id}>
            <EventCard
              event={toCardData(e)}
              variant="small"
              liked
              href={`/events/${e.id}`}
              onClick={(ev) => navigate(`/events/${ev.id}`)}
              onToggleLike={() => unlike(e)}
            />
          </li>
        ))}
      </ul>
    </>
  )
}

export default function MyBookmarks() {
  return (
    <MyShell tab="bookmarks">
      <Content />
    </MyShell>
  )
}
