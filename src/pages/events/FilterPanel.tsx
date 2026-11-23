import { useState } from 'react'
import { useCategories, useSidos } from '../../api/hooks'
import type { EventListParams } from '../../api/types'
import { useAuth, useRequireLogin } from '../../auth'
import { Chip } from '../../components'
import { CalendarSmallIcon } from './icons'

type Patch = Partial<EventListParams>

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-[14px] gap-y-[10px] py-[10px] md:flex-nowrap ${last ? '' : 'border-b border-line'}`}>
      <span className="w-[44px] shrink-0 text-[13px] font-bold leading-[19.5px] text-ink">{label}</span>
      {children}
    </div>
  )
}
const chipRow = 'flex min-w-0 flex-1 gap-[6px] overflow-x-auto'
const chipCls = 'h-8 px-[14px]'

/**
 * 분류 / 지역 / 요금 / 기간 필터 (B1·B4 공통).
 * BE가 필터 요청에 JWT를 요구하므로, 비로그인 상태에서 칩을 누르면 로그인 유도를 띄운다.
 */
export function FilterPanel({ params, onPatch }: { params: EventListParams; onPatch: (p: Patch) => void }) {
  const { isLoggedIn } = useAuth()
  const requireLogin = useRequireLogin()
  const categories = useCategories()
  const sidos = useSidos()
  const [dateOpen, setDateOpen] = useState(false)
  const apply = (p: Patch) => requireLogin(() => onPatch(p))
  const hasRange = !!(params.start_date || params.end_date)

  return (
    <section aria-label="필터" className="rounded-lg border border-line px-[18px] py-[6px]">
      <Row label="분류">
        <div className={chipRow}>
          <Chip className={chipCls} selected={params.category_id === undefined} onClick={() => apply({ category_id: undefined })}>
            전체
          </Chip>
          {categories.data?.map((c) => (
            <Chip key={c.id} className={chipCls} selected={params.category_id === c.id} onClick={() => apply({ category_id: c.id })}>
              {c.name}
            </Chip>
          ))}
        </div>
      </Row>
      <Row label="지역">
        <div className={chipRow}>
          <Chip className={chipCls} selected={params.sido_code === undefined} onClick={() => apply({ sido_code: undefined })}>
            전체
          </Chip>
          {isLoggedIn ? (
            sidos.data?.map((s) => (
              <Chip key={s.code} className={chipCls} selected={params.sido_code === s.code} onClick={() => apply({ sido_code: s.code })}>
                {s.short_name || s.name}
              </Chip>
            ))
          ) : (
            <Chip className={chipCls} onClick={() => requireLogin()}>
              로그인하고 지역 선택
            </Chip>
          )}
        </div>
      </Row>
      <Row label="요금" last>
        <div className={chipRow}>
          <Chip className={chipCls} selected={params.is_free === undefined} onClick={() => apply({ is_free: undefined })}>
            전체
          </Chip>
          <Chip className={chipCls} selected={params.is_free === true} onClick={() => apply({ is_free: true })}>
            무료
          </Chip>
          <Chip className={chipCls} selected={params.is_free === false} onClick={() => apply({ is_free: false })}>
            유료
          </Chip>
        </div>
        {/* 모바일에서는 기간을 다음 줄로 내린다 */}
        <div className="flex basis-full items-center gap-[14px] md:basis-auto">
        <span className="w-[44px] shrink-0 text-[13px] font-bold leading-[19.5px] text-ink md:w-auto md:pl-[10px]">기간</span>
        <div className="relative shrink-0">
          <button
            type="button"
            aria-expanded={dateOpen}
            onClick={() => requireLogin(() => setDateOpen((o) => !o))}
            className={`flex h-8 items-center gap-2 rounded-[10px] border px-3 text-[13px] leading-[19.5px] ${
              hasRange ? 'border-primary-border bg-primary-tint-strong font-bold text-primary-ink' : 'border-line text-ink-muted'
            }`}
          >
            <CalendarSmallIcon size={15} />
            {hasRange ? `${params.start_date ?? ''} ~ ${params.end_date ?? ''}` : '날짜 선택'}
          </button>
          {dateOpen && (
            <div className="absolute left-0 top-[38px] z-20 flex w-[280px] md:left-auto md:right-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-float">
              <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
                시작일
                <input
                  type="date"
                  value={params.start_date ?? ''}
                  max={params.end_date}
                  onChange={(e) => onPatch({ start_date: e.target.value || undefined })}
                  className="h-9 rounded-md border border-line px-2 text-[13px] text-ink"
                />
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-ink-muted">
                종료일
                <input
                  type="date"
                  value={params.end_date ?? ''}
                  min={params.start_date}
                  onChange={(e) => onPatch({ end_date: e.target.value || undefined })}
                  className="h-9 rounded-md border border-line px-2 text-[13px] text-ink"
                />
              </label>
              <div className="flex justify-between">
                <button
                  type="button"
                  className="text-[13px] text-ink-muted"
                  onClick={() => onPatch({ start_date: undefined, end_date: undefined })}
                >
                  초기화
                </button>
                <button type="button" className="text-[13px] font-bold text-primary-ink" onClick={() => setDateOpen(false)}>
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </Row>
    </section>
  )
}
