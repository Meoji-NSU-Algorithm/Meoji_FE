import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCategories } from '../../api/hooks'
import { useRequireLogin } from '../../auth'
import { nextWeekend, ymd, CATEGORY_NAMES } from './utils'
import all from './assets/cat-all.svg'
import festival from './assets/cat-festival.svg'
import exhibition from './assets/cat-exhibition.svg'
import performance from './assets/cat-performance.svg'
import experience from './assets/cat-experience.svg'
import season from './assets/cat-season.svg'
import weekend from './assets/cat-weekend.svg'
import map from './assets/cat-map.svg'
import calendar from './assets/cat-calendar.svg'

const ICONS: Record<string, string> = { 축제: festival, 전시: exhibition, 공연: performance, 체험: experience, 계절행사: season }

function Item({ label, icon, to, badge, onClick }: { label: string; icon: React.ReactNode; to?: string; badge?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="relative flex size-[60px] items-center justify-center rounded-[20px] bg-surface-warm">
        {icon}
        {badge && (
          <span className="absolute left-[12.5px] top-[22px] flex h-4 w-[35px] items-center rounded-md bg-primary px-[6px] font-display text-[9px] font-extrabold leading-4 tracking-[0.36px] text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[13px] font-medium leading-[19.5px] text-ink">{label}</span>
    </>
  )
  const cls = 'flex w-[86px] shrink-0 flex-col items-center gap-2'
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

const img = (src: string) => <img src={src} alt="" width={44} height={44} />

/** 무료 아이콘은 Figma의 벡터 조합 대신 단순한 티켓 형태로 대체 */
function FreeIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
      <rect x="5" y="12" width="34" height="20" rx="4" fill="#3fbf8a" transform="rotate(-8 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" transform="rotate(-8 22 22)">0원</text>
    </svg>
  )
}

export function CategoryStrip() {
  const { data: categories } = useCategories()
  const navigate = useNavigate()
  const requireLogin = useRequireLogin()
  const [now] = useState(() => new Date())
  const { sat, sun } = nextWeekend(now)
  const idOf = (name: string) => categories?.find((c) => c.name === name)?.id

  return (
    <nav aria-label="카테고리" className="flex gap-1 overflow-x-auto pb-[6px] pt-[22px]">
      <Item label="전체" icon={img(all)} to="/events" />
      {CATEGORY_NAMES.map((name) => {
        const id = idOf(name)
        return <Item key={name} label={name} icon={img(ICONS[name])} to={id ? `/events?category_id=${id}` : '/events'} />
      })}
      <span className="flex px-2 pb-[30px] pt-[10px]" aria-hidden>
        <span className="h-full w-px bg-line" />
      </span>
      <Item label="무료" icon={<FreeIcon />} to="/events?is_free=true" />
      <Item label="이번 주말" icon={img(weekend)} to={`/events?start_date=${ymd(sat)}&end_date=${ymd(sun)}`} />
      <Item label="지도로 보기" icon={img(map)} badge="NEW" to="/map" />
      <Item label="내 캘린더" icon={img(calendar)} onClick={() => requireLogin(() => navigate('/calendar'))} />
    </nav>
  )
}
