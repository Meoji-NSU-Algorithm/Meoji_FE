import { Link } from 'react-router-dom'
import { CalendarSmallIcon, ListIcon, MapSmallIcon } from './icons'

const TABS = [
  { key: 'list', to: '/events', label: '리스트', Icon: ListIcon },
  { key: 'calendar', to: '/calendar', label: '캘린더', Icon: CalendarSmallIcon },
  { key: 'map', to: '/map', label: '지도', Icon: MapSmallIcon },
] as const

export type ViewKey = (typeof TABS)[number]['key']

/** 리스트 / 캘린더 / 지도 전환 (B1·B3·B4 공통) */
export function ViewTabs({ active }: { active: ViewKey }) {
  return (
    <nav aria-label="보기 방식" className="flex rounded-pill bg-surface-muted p-1">
      {TABS.map(({ key, to, label, Icon }) => {
        const on = key === active
        return (
          <Link
            key={key}
            to={to}
            aria-current={on ? 'page' : undefined}
            className={`flex h-[34px] items-center gap-[6px] whitespace-nowrap rounded-pill px-3 text-[13px] md:px-4 leading-[19.5px] ${
              on ? 'bg-surface font-bold text-ink shadow-[0_1px_1.5px_rgba(0,0,0,0.08)]' : 'font-medium text-ink-muted'
            }`}
          >
            <Icon />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function PageTitleBar({ active }: { active: ViewKey }) {
  return (
    <div className="flex flex-col items-start gap-3 pb-[18px] pt-6 md:flex-row md:items-center md:justify-between md:pt-9">
      <h1 className="whitespace-nowrap text-[24px] font-black md:text-[28px] leading-[42px] tracking-[-0.56px] text-ink">행사 목록</h1>
      <ViewTabs active={active} />
    </div>
  )
}
