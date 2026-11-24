import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useBottomBar } from '../lib/mobileChrome'
import { useIsMobile } from '../lib/useIsMobile'

/** Figma M5 729:222 기준 높이: 선 1 + 위 10 + 버튼 50 + 아래 28 = 89 (측정 못 할 때 쓰는 값) */
export const MOBILE_BOTTOM_BAR_FALLBACK_HEIGHT = 89

export interface MobileBottomBarProps {
  /** 버튼들. 사이 간격 8px 은 자동. 버튼 높이는 Figma 대로 h-[50px] rounded-card 를 쓴다 */
  children: ReactNode
  className?: string
}

/**
 * 모바일 하단 고정 버튼 바 (Figma M5 상세의 찜·길찾기, 00 규칙 5번).
 * - 768px 미만에서만 렌더한다(데스크톱에선 null — 데스크톱 버튼은 기존 자리 그대로 둔다).
 * - 바닥에 고정되고, 같은 높이의 빈 칸을 본문 끝에 둬서 내용이 가려지지 않는다.
 * - 높이를 mobileChrome 에 알려서 토스트가 바 위 12px 에 뜬다.
 * 탭바와 같이 쓰지 않는다(이 바가 있는 화면은 MOBILE_ROUTES 에서 tabBar: false).
 */
export function MobileBottomBar({ children, className = '' }: MobileBottomBarProps) {
  const isMobile = useIsMobile()
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(MOBILE_BOTTOM_BAR_FALLBACK_HEIGHT)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height)
      setHeight(h > 0 ? h : MOBILE_BOTTOM_BAR_FALLBACK_HEIGHT)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile])

  useBottomBar(isMobile ? height : 0)

  if (!isMobile) return null
  return (
    <>
      <div aria-hidden="true" style={{ height }} className="md:hidden" />
      <div
        ref={ref}
        data-testid="mobile-bottom-bar"
        className={`fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-line bg-surface px-4 pb-[calc(var(--mobile-safe-bottom)+10px)] pt-[10px] md:hidden ${className}`}
      >
        {children}
      </div>
    </>
  )
}
