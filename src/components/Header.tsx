import { useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { CalendarIcon, HeartIcon, KakaoIcon, MapPinIcon, SearchIcon } from './icons'
import { Logo } from './Logo'

export type HeaderNavKey = 'home' | 'events' | 'mypage'

export interface HeaderUser {
  name: string
  avatarUrl?: string | null
}

export interface HeaderProps {
  /** 현재 위치 (nav 활성 표시) */
  active?: HeaderNavKey
  /** 로그인한 사용자. 없으면 로그인 버튼을 보여준다 */
  user?: HeaderUser | null
  /** 이동 경로 덮어쓰기 */
  hrefs?: Partial<Record<HeaderNavKey | 'calendar' | 'map' | 'bookmarks', string>>
  /** 링크 클릭을 가로채 SPA 라우팅에 쓴다. 지정하면 기본 이동은 막는다 */
  onNavigate?: (href: string) => void
  onLoginClick?: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: (value: string) => void
}

const DEFAULT_HREFS = {
  home: '/',
  events: '/events',
  mypage: '/my',
  calendar: '/calendar',
  map: '/map',
  bookmarks: '/my/bookmarks',
}

export function Header({
  active,
  user,
  hrefs,
  onNavigate,
  onLoginClick,
  searchValue,
  onSearchChange,
  onSearchSubmit,
}: HeaderProps) {
  const h = { ...DEFAULT_HREFS, ...hrefs }
  const [inner, setInner] = useState('')
  const q = searchValue ?? inner

  const go = (href: string) => (e: MouseEvent) => {
    if (onNavigate) {
      e.preventDefault()
      onNavigate(href)
    }
  }

  const navItems: { key: HeaderNavKey; label: string }[] = [
    { key: 'home', label: '홈' },
    { key: 'events', label: '행사 목록' },
    { key: 'mypage', label: '마이페이지' },
  ]

  const utility: { label: string; href: string; icon: ReactNode }[] = [
    { label: '캘린더', href: h.calendar, icon: <CalendarIcon /> },
    { label: '지도', href: h.map, icon: <MapPinIcon /> },
    { label: '찜', href: h.bookmarks, icon: <HeartIcon /> },
  ]

  return (
    <header className="border-b border-line bg-surface">
      {/* 모바일: 1줄 로고·아이콘, 2줄 메뉴, 3줄 검색. md부터 한 줄 */}
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:h-[72px] md:flex-nowrap md:gap-[26px] md:px-6 md:py-0">
        <a href={h.home} onClick={go(h.home)} aria-label="meoji 홈" className="order-1 shrink-0 md:order-none">
          <Logo size={31} />
        </a>

        <nav aria-label="주 메뉴" className="order-3 flex shrink-0 gap-1 md:order-none">
          {navItems.map(({ key, label }) => (
            <a
              key={key}
              href={h[key]}
              onClick={go(h[key])}
              aria-current={active === key ? 'page' : undefined}
              className={`flex h-9 items-center rounded-pill px-3 text-[14px] leading-[21px] ${
                active === key ? 'bg-surface-muted font-bold text-ink' : 'font-medium text-ink-muted'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        <form
          role="search"
          className="order-4 flex h-[42px] min-w-0 basis-full items-center md:order-none md:max-w-[380px] md:flex-1 md:basis-auto gap-[10px] rounded-pill bg-surface-muted px-4 text-ink-muted"
          onSubmit={(e) => {
            e.preventDefault()
            onSearchSubmit?.(q.trim())
          }}
        >
          <SearchIcon />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setInner(e.target.value)
              onSearchChange?.(e.target.value)
            }}
            placeholder="행사명, 장소, 태그로 검색"
            aria-label="행사 검색"
            className="min-w-0 flex-1 bg-transparent px-[2px] text-[14px] text-ink outline-none placeholder:text-ink-subtle"
          />
        </form>

        <div className="order-2 flex flex-1 justify-end md:order-none">
          <div className="flex items-center gap-4">
            {utility.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                onClick={go(href)}
                className="flex flex-col items-center gap-px text-ink-muted"
              >
                {icon}
                <span className="text-[11px] leading-[16.5px]">{label}</span>
              </a>
            ))}
            {user ? (
              <a
                href={h.mypage}
                onClick={go(h.mypage)}
                aria-label={`${user.name} 마이페이지`}
                className="flex size-[34px] items-center justify-center overflow-hidden rounded-full bg-primary-tint text-[14px] font-bold text-primary-ink"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  user.name.slice(0, 1)
                )}
              </a>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="flex h-[38px] items-center justify-center gap-[7px] rounded-pill bg-kakao px-4 text-[13px] font-bold text-kakao-ink"
              >
                <KakaoIcon />
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
