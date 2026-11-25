import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useSidos } from '../../api/hooks'
import type { EventListParams } from '../../api/types'
import { useRequireLogin } from '../../auth'
import { SearchIcon } from '../../components/icons'
import { shortDate } from './dateFormat'
import { FilterSheet } from './FilterSheet'
import { FilterIcon } from './icons'

type Patch = Partial<EventListParams>

/** M2 검색창: 누르면 /search 로 간다(입력은 검색 화면에서). 현재 검색어가 있으면 그대로 보여준다. */
export function MobileSearchLink({ q }: { q?: string }) {
  return (
    <div className="px-4">
      <Link
        to={q ? `/search?q=${encodeURIComponent(q)}` : '/search'}
        aria-label={q ? `행사 검색: ${q}` : '행사 검색'}
        className="flex h-[50px] items-center gap-[10px] rounded-pill border border-ink bg-surface pl-4 pr-[5px]"
      >
        <SearchIcon className="shrink-0 text-ink" />
        <span className={`min-w-0 flex-1 truncate px-[2px] text-[14px] ${q ? 'text-ink' : 'text-ink-subtle'}`}>
          {q || '행사명, 장소, 태그로 검색'}
        </span>
        <span aria-hidden="true" className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <SearchIcon />
        </span>
      </Link>
    </div>
  )
}

const pill = 'inline-flex h-8 shrink-0 items-center gap-1 rounded-pill border px-[13px] text-[13px] tracking-[-0.2px] whitespace-nowrap'

/**
 * M2 필터 칩 줄: [필터 N] + 적용된 필터(눌러서 해제) + 아직 안 고른 항목(누르면 필터 시트).
 * 필터 시트는 여기서 연다.
 */
export function MobileFilterBar({ params, onPatch }: { params: EventListParams; onPatch: (p: Patch) => void }) {
  const requireLogin = useRequireLogin()
  const categories = useCategories()
  const sidos = useSidos()
  const [open, setOpen] = useState(false)
  const openSheet = () => requireLogin(() => setOpen(true))

  const applied: Array<{ key: string; label: string; clear: Patch }> = []
  if (params.category_id !== undefined) {
    const name = categories.data?.find((c) => c.id === params.category_id)?.name
    applied.push({ key: 'category', label: name ?? '분류', clear: { category_id: undefined } })
  }
  if (params.sido_code !== undefined) {
    const s = sidos.data?.find((x) => x.code === params.sido_code)
    applied.push({ key: 'sido', label: s ? s.short_name || s.name : '지역', clear: { sido_code: undefined } })
  }
  if (params.is_free !== undefined) {
    applied.push({ key: 'price', label: params.is_free ? '무료' : '유료', clear: { is_free: undefined } })
  }
  if (params.start_date || params.end_date) {
    const label = `${params.start_date ? shortDate(params.start_date) : ''} – ${params.end_date ? shortDate(params.end_date) : ''}`.trim()
    applied.push({ key: 'period', label, clear: { start_date: undefined, end_date: undefined } })
  }
  if (params.tag) applied.push({ key: 'tag', label: `#${params.tag}`, clear: { tag: undefined } })

  const has = new Set(applied.map((a) => a.key))
  const shortcuts = [
    { key: 'category', label: '분류' },
    { key: 'sido', label: '지역' },
    { key: 'price', label: '요금' },
    { key: 'period', label: '기간' },
  ].filter((s) => !has.has(s.key))
  const count = applied.length

  return (
    <>
      <div role="group" aria-label="필터" className="flex gap-[6px] overflow-x-auto px-4 pt-[14px] [scrollbar-width:none]">
        <button
          type="button"
          onClick={openSheet}
          aria-label={count ? `필터 ${count}개 적용됨` : '필터'}
          className={`${pill} gap-[5px] border-ink bg-surface font-bold text-ink`}
        >
          <FilterIcon />
          필터
          {count > 0 && <span className="text-primary">{count}</span>}
        </button>
        {applied.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-label={`${a.label} 필터 해제`}
            onClick={() => onPatch(a.clear)}
            className={`${pill} border-primary-border bg-primary-tint-strong font-bold text-primary`}
          >
            {a.label} <span aria-hidden="true">✕</span>
          </button>
        ))}
        {shortcuts.map((s) => (
          <button key={s.key} type="button" onClick={openSheet} className={`${pill} border-line bg-surface text-ink-muted`}>
            {s.label}
          </button>
        ))}
      </div>
      {open && (
        <FilterSheet
          params={params}
          onClose={() => setOpen(false)}
          onApply={(draft) => {
            setOpen(false)
            onPatch(draft)
          }}
        />
      )}
    </>
  )
}
