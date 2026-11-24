import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../api/hooks'
import type { EventSort } from '../api/types'
import { useAuth, useRequireLogin } from '../auth'
import { EventCard, Spinner } from '../components'
import { EventSearchBar } from './events/EventSearchBar'
import { FilterPanel } from './events/FilterPanel'
import { RefreshIcon, SearchBigIcon, SearchMinusIcon, WifiOffIcon } from './events/icons'
import { MobileFilterBar, MobileSearchLink } from './events/MobileFilterBar'
import { Pagination } from './events/Pagination'
import { MobileStatePanel, mobileOutlineBtn, mobilePrimaryBtn, outlineBtn, primaryBtn, StatePanel } from './events/StatePanel'
import { useIsMobile } from '../lib/useIsMobile'
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
  const isMobile = useIsMobile()

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

  const emptyTitle = params.q ? `‘${params.q}’ 검색 결과가 없어요` : params.tag ? `#${params.tag} 행사가 아직 없어요` : '조건에 맞는 행사가 없어요'

  if (isMobile) {
    let mBody: React.ReactNode
    if (needsLogin) {
      mBody = (
        <MobileStatePanel
          role="status"
          icon={<SearchMinusIcon />}
          title="로그인이 필요해요"
          message="검색과 필터는 로그인 후 이용할 수 있어요"
          action={
            <button type="button" className={mobilePrimaryBtn} onClick={() => requireLogin()}>
              로그인하기
            </button>
          }
        />
      )
    } else if (query.isError) {
      mBody = (
        <MobileStatePanel
          role="alert"
          tone="muted"
          className="pb-14 pt-[130px]"
          icon={<RefreshIcon />}
          title="행사를 불러오지 못했어요"
          message="인터넷 연결을 확인하고 다시 시도해 주세요"
          action={
            <button type="button" className={mobilePrimaryBtn} onClick={() => void query.refetch()}>
              다시 시도
            </button>
          }
        />
      )
    } else if (!data) {
      mBody = (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      )
    } else if (data.events.length === 0) {
      mBody = (
        <MobileStatePanel
          icon={<SearchMinusIcon />}
          title={emptyTitle}
          message={'다른 키워드로 검색하거나\n필터를 초기화해 보세요'}
          action={
            <button type="button" className={mobileOutlineBtn} onClick={reset}>
              필터 초기화
            </button>
          }
        />
      )
    } else {
      mBody = (
        <>
          <ul className="grid grid-cols-2 gap-x-[11px] gap-y-[22px] px-4">
            {data.events.map((e) => (
              <li key={e.id} className="min-w-0">
                <EventCard
                  event={toCardData(e)}
                  variant="small"
                  categoryPill
                  size="mobile"
                  thumbHeight={216}
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
      <div className="pb-4">
        <h1 className="px-4 pb-[14px] pt-5 text-[23px] font-black tracking-[-0.6px] text-ink">행사 목록</h1>
        <MobileSearchLink q={params.q} />
        {!query.isError && <MobileFilterBar params={params} onPatch={patch} />}
        {data && !query.isError && !needsLogin && (
          <div className="flex items-center justify-between px-4 pb-[10px] pt-4">
            <p className="text-[13px] tracking-[-0.2px] text-ink">
              총 <b className="font-bold text-primary">{data.total_count.toLocaleString('ko-KR')}</b>건의 행사
            </p>
            {data.events.length > 0 && (
              <div className="flex gap-3" role="group" aria-label="정렬">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={sort === s.key}
                    onClick={() => patch({ sort: s.key })}
                    className={`flex h-9 items-center text-[12px] tracking-[-0.2px] ${sort === s.key ? 'font-bold text-ink' : 'text-ink-subtle'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {mBody}
      </div>
    )
  }

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
        title={emptyTitle}
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
    <div className="mx-auto max-w-content px-4 pb-12 md:px-6 md:pb-20">
      <PageTitleBar active="list" />
      <EventSearchBar value={params.q ?? ''} onSubmit={(q) => requireLogin(() => patch({ q: q || undefined }))} />
      <div className="pt-4">
        <FilterPanel params={params} onPatch={patch} />
        {params.tag && (
          <div className="flex items-center gap-2 pt-3">
            <span className="text-[13px] text-ink-muted">태그</span>
            <button
              type="button"
              data-testid="active-tag"
              aria-label={`#${params.tag} 태그 해제`}
              onClick={() => patch({ tag: undefined })}
              className="inline-flex h-[30px] items-center gap-1 rounded-pill bg-brand px-3 text-[13px] font-bold text-white"
            >
              #{params.tag} <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
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
