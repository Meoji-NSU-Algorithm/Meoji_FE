import { Link } from 'react-router-dom'
import type { ReactNode, SVGProps } from 'react'
import { MOBILE_TABS } from './mobileTabs'
import type { MobileTabKey } from './mobileTabs'


/** 탭바 아이콘 (Figma M1 721:780, 24px, 선 2px). 색은 currentColor */
function TabSvg({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...p}>
      {children}
    </svg>
  )
}

const ICONS: Record<MobileTabKey, ReactNode> = {
  home: (
    <TabSvg strokeLinejoin="round">
      <path d="M4 10.5L12 4L20 10.5V20C20 20.2652 19.8946 20.5196 19.7071 20.7071C19.5196 20.8946 19.2652 21 19 21H15V15H9V21H5C4.73478 21 4.48043 20.8946 4.29289 20.7071C4.10536 20.5196 4 20.2652 4 20V10.5Z" />
    </TabSvg>
  ),
  events: (
    <TabSvg strokeLinecap="round">
      <path d="M8 6H20M8 12H20M8 18H20M4 6H4.01M4 12H4.01M4 18H4.01" />
    </TabSvg>
  ),
  map: (
    <TabSvg>
      <path d="M12 21C12 21 6 15.4 6 10C6 8.4087 6.63214 6.88258 7.75736 5.75736C8.88258 4.63214 10.4087 4 12 4C13.5913 4 15.1174 4.63214 16.2426 5.75736C17.3679 6.88258 18 8.4087 18 10C18 15.4 12 21 12 21Z" />
      <path d="M14.2 10C14.2 11.215 13.215 12.2 12 12.2C10.785 12.2 9.8 11.215 9.8 10C9.8 8.78497 10.785 7.8 12 7.8C13.215 7.8 14.2 8.78497 14.2 10Z" />
    </TabSvg>
  ),
  calendar: (
    <TabSvg>
      <path d="M6 5H18C19.1046 5 20 5.89543 20 7V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V7C4 5.89543 4.89543 5 6 5Z" />
      <path d="M4 10H20M9 3V7M15 3V7" />
    </TabSvg>
  ),
  my: (
    <TabSvg>
      <path d="M16 8C16 10.2091 14.2091 12 12 12C9.79086 12 8 10.2091 8 8C8 5.79086 9.79086 4 12 4C14.2091 4 16 5.79086 16 8Z" />
      <path d="M4 21C4 18.8783 4.84285 16.8434 6.34315 15.3431C7.84344 13.8429 9.87827 13 12 13C14.1217 13 16.1566 13.8429 17.6569 15.3431C19.1571 16.8434 20 18.8783 20 21" />
    </TabSvg>
  ),
}

export interface BottomTabBarProps {
  /** 활성 탭. Layout 이 activeMobileTab(pathname) 으로 넘긴다 */
  active?: MobileTabKey
}

/**
 * 모바일 하단 탭바 (Figma M1 721:780). 화면 바닥에 고정, 높이 = var(--tabbar-h)(기본 76px).
 * 768px 이상에선 md:hidden 으로 숨는다. 표시 여부는 Layout 의 MOBILE_ROUTES 표가 정한다.
 */
export function BottomTabBar({ active }: BottomTabBarProps) {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-1 pb-[var(--mobile-safe-bottom)] md:hidden"
    >
      <ul className="flex h-[57px]">
        {MOBILE_TABS.map(({ key, label, href }) => {
          const on = active === key
          return (
            <li key={key} className="flex min-w-0 flex-1">
              <Link
                to={href}
                aria-current={on ? 'page' : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-[3px]"
              >
                <span className={on ? 'text-brand' : 'text-ink'}>{ICONS[key]}</span>
                <span
                  className={`whitespace-nowrap text-[11px] leading-[14px] tracking-[-0.2px] text-ink ${
                    on ? 'font-bold' : 'font-normal'
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
