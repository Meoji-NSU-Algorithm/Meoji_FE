import { useSyncExternalStore } from 'react'

/** 모바일 디자인을 쓰는 폭. Tailwind `md`(768px) 바로 아래까지다. */
export const MOBILE_QUERY = '(max-width: 767px)'

function getMql(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(MOBILE_QUERY)
}

function subscribe(onChange: () => void) {
  const mql = getMql()
  if (!mql) return () => {}
  // Safari 13 이하는 addListener 만 있다
  if (mql.addEventListener) {
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
  mql.addListener(onChange)
  return () => mql.removeListener(onChange)
}

const getSnapshot = () => getMql()?.matches ?? false
// SSR·matchMedia 가 없는 환경은 데스크톱으로 본다
const getServerSnapshot = () => false

/**
 * 화면 폭이 768px 미만이면 true.
 * 768px 이상은 기존 데스크톱 화면을 그대로 그리므로, 모바일 전용 마크업은 이 값이 true 일 때만 렌더한다.
 * 테스트에서는 src/test/viewport.ts 의 setViewportWidth() 로 바꾼다(기본 1024 = 데스크톱).
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
