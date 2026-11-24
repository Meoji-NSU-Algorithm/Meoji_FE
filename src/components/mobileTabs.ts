/** 모바일 하단 탭 5칸 (Figma 00-2 결정 1번: 찜 대신 캘린더) */
export type MobileTabKey = 'home' | 'events' | 'map' | 'calendar' | 'my'

export const MOBILE_TABS: { key: MobileTabKey; label: string; href: string }[] = [
  { key: 'home', label: '홈', href: '/' },
  { key: 'events', label: '행사 목록', href: '/events' },
  { key: 'map', label: '지도', href: '/map' },
  { key: 'calendar', label: '캘린더', href: '/calendar' },
  { key: 'my', label: '마이', href: '/my' },
]

/** 경로 → 활성 탭. 404 등 해당 없는 경로는 undefined (아무 탭도 켜지 않음) */
export function activeMobileTab(pathname: string): MobileTabKey | undefined {
  if (pathname === '/') return 'home'
  if (pathname === '/events' || pathname === '/events/') return 'events'
  if (pathname === '/map' || pathname.startsWith('/map/')) return 'map'
  if (pathname === '/calendar' || pathname.startsWith('/calendar/')) return 'calendar'
  if (pathname === '/my' || pathname.startsWith('/my/')) return 'my'
  return undefined
}

