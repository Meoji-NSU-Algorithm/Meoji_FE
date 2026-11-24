import { useEffect, useSyncExternalStore } from 'react'

/**
 * 모바일 화면 바닥에 무엇이 깔려 있는지 공유하는 작은 저장소.
 * 토스트가 탭바/하단 고정 버튼 위에 뜨도록 위치를 정할 때 쓴다.
 *  - tabBar    : Layout 이 경로 표(MOBILE_ROUTES)를 보고 정한다
 *  - bottomBar : 하단 고정 버튼 바의 높이(px). 0 이면 없음. MobileBottomBar 가 자동으로 알린다
 */
export interface MobileChromeState {
  tabBar: boolean
  bottomBar: number
}

let state: MobileChromeState = { tabBar: false, bottomBar: 0 }
const listeners = new Set<() => void>()

function set(patch: Partial<MobileChromeState>) {
  const next = { ...state, ...patch }
  if (next.tabBar === state.tabBar && next.bottomBar === state.bottomBar) return
  state = next
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useMobileChrome(): MobileChromeState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

/** Layout 전용: 지금 화면에 하단 탭바가 보이는지 알린다 */
export function useTabBarFlag(visible: boolean) {
  useEffect(() => {
    set({ tabBar: visible })
    return () => set({ tabBar: false })
  }, [visible])
}

/**
 * 하단 고정 버튼 바가 있는 화면이 그 높이(px)를 알린다. 언마운트되면 자동으로 0.
 * 보통은 <MobileBottomBar> 가 대신 불러 주므로 직접 쓸 일은 드물다.
 * 직접 만든 고정 바라면: useBottomBar(isMobile ? 89 : 0)
 */
export function useBottomBar(heightPx: number) {
  useEffect(() => {
    set({ bottomBar: heightPx })
    return () => set({ bottomBar: 0 })
  }, [heightPx])
}
