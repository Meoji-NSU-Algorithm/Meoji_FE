import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../api/hooks'
import type { EventSort } from '../api/types'
import { useAuth, useRequireLogin } from '../auth'
import { EventCard, Spinner } from '../components'
import { EventSearchBar } from './events/EventSearchBar'
import { FilterPanel } from './events/FilterPanel'
import { SearchBigIcon, WifiOffIcon } from './events/icons'
import { Pagination } from './events/Pagination'
import { outlineBtn, primaryBtn, StatePanel } from './events/StatePanel'
import { toCardData } from './events/cardData'
import { DEFAULT_SIZE, hasLoginFilters, useEventFilters } from './events/useEventFilters'
import { useCardBookmarks } from './events/useCardBookmarks'
import { PageTitleBar } from './events/ViewTabs'

const SORTS: Array<{ key: EventSort; label: string }> = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'dateAsc', label: '날짜순' },
]

export default function EventList() {
  const navigate = useNavigate()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const requireLogin = useRequireLogin()
  const { params, patch, reset } = useEventFilters()
  const { isLiked, toggle } = useCardBookmarks()

  // 검색 필터는 BE가 JWT를 요구한다: 비로그인이면 쿼리를 보내지 않고 로그인 유도를 띄운다.
  const needsLogin = hasLoginFilters(params) && !isLoggedIn
  const query = useEvents(
    { ...params, size: params.size ?? DEFAULT_SIZE },
    { enabled: !needsLogin && !authLoading },
  )
  const filterKey = JSON.stringify(params)
  useEffect(() => {
    if (needsLogin && !authLoading) requireLogin()
    // 필터가 바뀔 때마다 한 번만 띄운다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLogin, authLoading, filterKey])

  const sort = params.sort ?? 'latest'
  const data = query.data
  const size = data?.size || params.size || DEFAULT_SIZE
  const totalPages = data ? Math.ceil(data.total_count / size) : 0

  let body: React.ReactNode
  if (needsLogin) {
    body = (
      <StatePanel
        role="status"
        icon={<SearchBigIcon />}
        title="로그인이 필요해요"
        message="검색과 필터는 로그인 후 이용할 수 있어요"
        action={
          <button type="button" className={primaryBtn} onClick={() => requireLogin()}>
            로그인하기
          </button>
        }
      />
    )
  } else if (query.isError) {
    body = (
      <StatePanel
        role="alert"
        icon={<WifiOffIcon />}
        title="행사를 불러오지 못했어요"
        message="인터넷 연결을 확인하고 다시 시도해 주세요"
        action={
          <button type="button" className={primaryBtn} onClick={() => void query.refetch()}>
            다시 시도
          </button>
        }
      />
    )
  } else if (!data) {
    body = (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  } else if (data.events.length === 0) {
    body = (
      <StatePanel
        icon={<SearchBigIcon />}
        title={params.q ? `‘${params.q}’ 검색 결과가 없어요` : '조건에 맞는 행사가 없어요'}
        message="다른 키워드로 검색하거나 필터를 초기화해 보세요"
        action={
          <button type="button" className={outlineBtn} onClick={reset}>
            필터 초기화
          </button>
        }
      />
    )
  } else {
    body = (
      <>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {data.events.map((e) => (
            <li key={e.id}>
              <EventCard
                event={toCardData(e)}
                variant="small"
                categoryPill
                href={`/events/${e.id}`}
                onClick={() => navigate(`/events/${e.id}`)}
                liked={isLiked(e.id)}
                onToggleLike={(_, next) => toggle(e, !next)}
              />
            </li>
          ))}
        </ul>
        <Pagination page={data.page || params.page || 1} totalPages={totalPages} onChange={(page) => patch({ page })} />
      </>
    )
  }

  return (
    <div className="mx-auto max-w-content px-6 pb-12">
      <PageTitleBar active="list" />
      <EventSearchBar value={params.q ?? ''} onSubmit={(q) => requireLogin(() => patch({ q: q || undefined }))} />
      <div className="pt-4">
        <FilterPanel params={params} onPatch={patch} />
      </div>

      {data && !query.isError && !needsLogin && (
        <div className="flex items-center justify-between pb-4 pt-[22px]">
          <p className="text-[14px] leading-[21px] text-ink">
            총 <b className="font-bold text-brand">{data.total_count.toLocaleString('ko-KR')}</b>건의 행사
          </p>
          <div className="flex gap-[14px]" role="group" aria-label="정렬">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={sort === s.key}
                onClick={() => patch({ sort: s.key })}
                className={`text-[12px] leading-[18px] ${sort === s.key ? 'font-bold text-ink' : 'text-ink-subtle'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={data || needsLogin || query.isError ? '' : 'pt-6'}>{body}</div>
    </div>
  )
}
