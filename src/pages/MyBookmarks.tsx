import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, EventCard, Spinner } from '../components'
import { HeartIcon } from '../components/icons'
import { useBookmarks } from '../api/hooks'
import { useBookmarkToggle } from '../lib/useBookmarkToggle'
import { bookmarkToCard } from '../api/bookmarks'
import { toCardData } from './events/cardData'
import { MyShell } from './my/MyShell'
import { HeartOutlineIcon } from './my/mobileIcons'
import { useIsMobile } from '../lib/useIsMobile'

type Sort = 'upcoming' | 'recent'

function Content() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useBookmarks()
  const { toggle } = useBookmarkToggle()
  const [sort, setSort] = useState<Sort>('upcoming')
  const isMobile = useIsMobile()

  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if ((!data || data.events.length === 0) && isMobile)
    return (
      // S7 마이 찜 없음
      <div className="flex flex-col items-center px-4 pb-10 pt-[60px] text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary-tint text-brand">
          <HeartOutlineIcon />
        </span>
        <p className="pt-5 text-[17px] font-black tracking-[-0.2px] text-ink">아직 찜한 행사가 없어요</p>
        <p className="pt-2 text-[12.5px] tracking-[-0.2px] text-ink-muted">관심 있는 행사를 찜하고 한눈에 모아 보세요</p>
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="mt-5 h-11 rounded-card bg-primary px-5 text-[14px] font-bold text-white"
        >
          행사 둘러보기
        </button>
      </div>
    )
  if (!data || data.events.length === 0)
    return (
      <EmptyState
        variant="feature"
        icon={<HeartIcon size={40} />}
        title="아직 찜한 행사가 없어요"
        description="관심 있는 행사를 찜하고 한눈에 모아 보세요"
        action={
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="h-12 rounded-card bg-primary px-7 text-[15px] font-bold text-white"
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

  const sortOptions = [
    ['upcoming', '다가오는 순'],
    ['recent', '최근 찜한 순'],
  ] as const

  if (isMobile)
    return (
      <>
        {/* M7: 오른쪽 정렬 두 개, 가운데 라벨 없음 */}
        <div className="flex justify-end gap-3 px-4 pb-2 pt-[6px]" role="group" aria-label="정렬">
          {sortOptions.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
              className={`flex h-9 items-center text-[12px] tracking-[-0.2px] ${sort === key ? 'font-bold text-ink' : 'text-ink-subtle'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-[11px] gap-y-5 px-4">
          {list.map((e) => (
            <li key={e.id}>
              <EventCard
                event={toCardData(e)}
                variant="bookmark"
                size="mobile"
                thumbHeight={200}
                liked
                href={`/events/${e.id}`}
                onClick={(ev) => navigate(`/events/${ev.id}`)}
                onToggleLike={() => toggle(e, true)}
              />
            </li>
          ))}
        </ul>
      </>
    )

  return (
    <>
      <div className="flex items-center justify-between pb-4 pt-[22px]">
        <p className="text-[14px] text-ink">{sort === 'upcoming' ? '다가오는 순' : '최근 찜한 순'}</p>
        <div className="flex gap-[2px]" role="group" aria-label="정렬">
          {sortOptions.map(([key, label]) => (
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
              variant="bookmark"
              liked
              href={`/events/${e.id}`}
              onClick={(ev) => navigate(`/events/${ev.id}`)}
              onToggleLike={() => toggle(e, true)}
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
