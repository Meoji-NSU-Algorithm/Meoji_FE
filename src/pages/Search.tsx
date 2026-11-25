import { useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useSidos } from '../api/hooks'
import { saveReturnTo, useAuth, useRequireLogin } from '../auth'
import { MobileBackHeader } from '../components'
import { CloseIcon, SearchIcon } from '../components/icons'
import { useIsMobile } from '../lib/useIsMobile'
import { BE_TAG_DICTIONARY } from './home/utils'
import { SEARCH_REGIONS, sidoCodeOf } from './search/regions'
import { useRecentSearches } from './search/recentSearches'

const chip =
  'flex h-8 shrink-0 items-center rounded-pill border border-line bg-surface px-[13px] text-[13px] tracking-[-0.2px] text-ink-muted'

/** 섹션 제목 줄 (723:16 · 723:37): 오른쪽 버튼이 있으면 36px, 없으면 제목 높이 21px */
function Heading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className={`flex items-center justify-between ${right ? 'min-h-9' : ''}`}>
      <h2 className="text-[15px] font-black leading-[21px] tracking-[-0.2px] text-ink">{children}</h2>
      {right}
    </div>
  )
}

/**
 * M1-3 검색 화면 (Figma 723:2). 모바일 전용: 768px 이상에서 열면 목록(/events)으로 q 를 들고 옮긴다.
 * 목록·태그·지역 결과는 모두 로그인이 필요한 필터라(hasLoginFilters) 로그인 전엔 로그인 유도 시트를 띄우고,
 * 로그인 후 그 결과로 돌아오도록 경로를 저장한다.
 */
export default function Search() {
  const isMobile = useIsMobile()
  const [sp] = useSearchParams()
  const initial = sp.get('q')?.trim() ?? ''
  const navigate = useNavigate()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const requireLogin = useRequireLogin()
  const sidos = useSidos(isMobile) // 데스크톱은 아래에서 바로 /events 로 보내므로 요청하지 않는다
  const recent = useRecentSearches()
  const [text, setText] = useState(initial)

  if (!isMobile) return <Navigate to={initial ? `/events?q=${encodeURIComponent(initial)}` : '/events'} replace />

  const go = (path: string) => {
    if (authLoading) return // 저장된 토큰으로 사용자 확인 중엔 잠깐 기다린다(로그인 시트가 잘못 뜨지 않게)
    if (isLoggedIn) return navigate(path)
    requireLogin()
    saveReturnTo(path) // 로그인하고 나면 고른 결과로 바로 간다
  }
  const search = (q: string) => {
    const term = q.trim()
    if (!term) return
    recent.add(term)
    go(`/events?q=${encodeURIComponent(term)}`)
  }

  return (
    <>
      <MobileBackHeader
        border={false}
        className="h-[66px]! pr-4!"
        title={
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              search(text)
            }}
            className="flex h-12 w-full items-center gap-2 rounded-pill border border-ink pl-4 pr-[5px]"
          >
            <input
              autoFocus
              type="search"
              enterKeyHint="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="행사명, 장소, 태그로 검색"
              aria-label="행사 검색"
              className="min-w-0 flex-1 bg-transparent px-[2px] text-[15px] text-ink outline-none placeholder:text-ink-subtle [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              aria-label="검색"
              className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white after:absolute after:-inset-1 after:content-['']"
            >
              <SearchIcon size={17} />
            </button>
          </form>
        }
      />

      <div className="pb-[calc(var(--mobile-safe-bottom)+24px)]">
        {recent.list.length > 0 && (
          <section className="px-4 pt-[14px]" aria-label="최근 검색">
            <Heading
              right={
                <button
                  type="button"
                  onClick={recent.clear}
                  className="relative flex h-9 items-center text-[12px] text-ink-muted after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
                >
                  전체 삭제
                </button>
              }
            >
              최근 검색
            </Heading>
            {/* 칩 히트 영역(테두리 안 30px + 위아래 7px = 44px)이 가로 스크롤 상자에 잘리지 않도록 위아래 7px 여백을 두고 같은 만큼 바깥 여백으로 되돌린다 */}
            <ul className="-mx-4 mb-[-7px] mt-[3px] flex gap-[7px] overflow-x-auto px-4 py-[7px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recent.list.map((q) => (
                <li key={q} className={`${chip} gap-0 pr-[6px]`}>
                  <button
                    type="button"
                    onClick={() => search(q)}
                    className="relative flex h-full items-center whitespace-nowrap after:absolute after:-inset-y-[7px] after:inset-x-0 after:content-['']"
                  >
                    {q}
                  </button>
                  <button
                    type="button"
                    aria-label={`${q} 삭제`}
                    onClick={() => recent.remove(q)}
                    className="relative flex h-full w-6 items-center justify-center text-ink-muted after:absolute after:-inset-y-[7px] after:inset-x-0 after:content-['']"
                  >
                    <CloseIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="pt-2 text-[11px] leading-[13px] tracking-[-0.2px] text-ink-subtle">최근 검색은 이 기기에만 저장돼요.</p>
          </section>
        )}

        <section className="px-4 pt-7" aria-label="태그로 찾기">
          <Heading>태그로 찾기</Heading>
          <div className="flex flex-wrap gap-x-[7px] gap-y-[7px] pt-[10px]">
            {BE_TAG_DICTIONARY.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => go(`/events?tag=${encodeURIComponent(tag)}`)}
                className={`${chip} relative after:absolute after:-inset-y-[6px] after:inset-x-0 after:content-['']`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </section>

        <section className="px-4 pt-7" aria-label="지역으로 찾기">
          <Heading>지역으로 찾기</Heading>
          <div className="grid grid-cols-5 gap-[6px] pt-[10px]">
            {SEARCH_REGIONS.map((label) => (
              <button
                key={label}
                type="button"
                disabled={authLoading || (isLoggedIn && !sidos.data && !sidos.isError)} // 사용자·지역 코드를 받는 동안
                onClick={() => {
                  if (!isLoggedIn) return requireLogin() // 지역 코드는 로그인해야 받아온다(필터 패널과 같은 규칙)
                  const code = sidoCodeOf(label, sidos.data)
                  navigate(code ? `/events?sido_code=${encodeURIComponent(code)}` : '/events')
                }}
                className="relative flex h-10 items-center justify-center rounded-[10px] border border-line text-[13px] after:absolute after:-inset-y-[2px] after:inset-x-0 after:content-[''] tracking-[-0.2px] text-ink disabled:text-ink-disabled"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
