import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from './icons'
import { Logo } from './Logo'

export interface MobileBackHeaderProps {
  /**
   * 가운데 영역. 문자열이면 16px Bold 제목(M9·M10·M12), 'logo' 면 22px 로고(M5 상세),
   * 그 밖의 노드는 그대로 놓는다(M1-3 검색창처럼). 남은 폭을 모두 차지한다.
   */
  title?: ReactNode
  /** 오른쪽 액션 (M5 공유 버튼 등). 44px 버튼을 넣는다 */
  right?: ReactNode
  /** 뒤로 동작. 기본: 앱 안에서 온 기록이 있으면 history.back, 없으면 홈 */
  onBack?: () => void
  /** 아래 선 (기본 true, M1-3 검색처럼 선이 없으면 false) */
  border?: boolean
  className?: string
}

/** 앱 안에서 이동해 온 기록이 있는지 (react-router 가 history.state.idx 를 남긴다) */
function canGoBack() {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' && idx > 0
}

/**
 * 탭바를 숨기는 화면의 모바일 상단 '뒤로' 헤더 (Figma M5 729:4, M12 745:4). 높이 56px.
 * 768px 이상에선 md:hidden 으로 숨는다.
 * Layout 이 경로 표대로 자동으로 그려 주므로, 페이지는 보통 MobileHeaderTitle / MobileHeaderActions 로 내용만 채운다.
 * 헤더를 직접 그리는 화면(검색 등, 표에서 header: 'none')은 이 컴포넌트를 직접 렌더한다.
 */
export function MobileBackHeader({ title, right, onBack, border = true, className = '' }: MobileBackHeaderProps) {
  const navigate = useNavigate()
  const back = onBack ?? (() => (canGoBack() ? navigate(-1) : navigate('/')))
  return (
    <header
      className={`flex h-14 items-center gap-[2px] bg-surface pl-1 pr-2 md:hidden ${
        border ? 'border-b border-line-soft' : ''
      } ${className}`}
    >
      <button
        type="button"
        aria-label="뒤로"
        onClick={back}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
      >
        <BackIcon />
      </button>
      <div className="flex min-w-0 flex-1 items-center">{renderTitle(title)}</div>
      {right && <div className="flex shrink-0 items-center">{right}</div>}
    </header>
  )
}

/** '뒤로' 헤더 가운데 기본 모양: 문자열 → 16px Bold 제목, 'logo' → 22px 로고 */
export function MobileTitle({ title }: { title?: ReactNode }) {
  return <>{renderTitle(title)}</>
}

function renderTitle(title: ReactNode) {
  if (title === 'logo') return <Logo size={22} />
  if (typeof title === 'string')
    return <h1 className="truncate text-[16px] font-bold tracking-[-0.2px] text-ink">{title}</h1>
  return title
}

/* ───────── Layout 이 그린 '뒤로' 헤더에 페이지가 내용을 꽂는 슬롯 ───────── */

interface SlotContextValue {
  titleEl: HTMLElement | null
  rightEl: HTMLElement | null
  /** 제목을 덮어쓰는 MobileHeaderTitle 이 몇 개 마운트됐는지 (+1 / -1) */
  addTitleOverride: (delta: number) => void
}

const SlotContext = createContext<SlotContextValue | null>(null)
// eslint-disable-next-line react-refresh/only-export-components
export const MobileHeaderSlotProvider = SlotContext.Provider

/**
 * Layout 이 그린 '뒤로' 헤더의 가운데 제목을 바꾼다. 데스크톱·헤더 없는 화면에선 아무것도 안 그린다.
 *   <MobileHeaderTitle>{event.title}</MobileHeaderTitle>
 * 문자열이면 기본 제목 모양(16px Bold), 'logo' 면 로고.
 */
export function MobileHeaderTitle({ children }: { children: ReactNode }) {
  const ctx = useContext(SlotContext)
  const add = ctx?.addTitleOverride
  useEffect(() => {
    if (!add) return
    add(1)
    return () => add(-1)
  }, [add])
  if (!ctx?.titleEl) return null
  return createPortal(renderTitle(children), ctx.titleEl)
}

/**
 * Layout 이 그린 '뒤로' 헤더 오른쪽에 버튼을 넣는다 (M5 공유 등). 데스크톱에선 아무것도 안 그린다.
 *   <MobileHeaderActions><button aria-label="공유" className="flex size-11 items-center justify-center"><ShareIcon /></button></MobileHeaderActions>
 */
export function MobileHeaderActions({ children }: { children: ReactNode }) {
  const ctx = useContext(SlotContext)
  if (!ctx?.rightEl) return null
  return createPortal(children, ctx.rightEl)
}

/** Layout 전용: 슬롯 DOM 과 덮어쓰기 개수를 들고 있는 상태 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMobileHeaderSlots() {
  const [titleEl, setTitleEl] = useState<HTMLElement | null>(null)
  const [rightEl, setRightEl] = useState<HTMLElement | null>(null)
  const [overrides, setOverrides] = useState(0)
  const [addTitleOverride] = useState(() => (delta: number) => setOverrides((n) => n + delta))
  const value = useMemo<SlotContextValue>(() => ({ titleEl, rightEl, addTitleOverride }), [titleEl, rightEl, addTitleOverride])
  return {
    value,
    titleOverridden: overrides > 0,
    setTitleEl,
    setRightEl,
  }
}
