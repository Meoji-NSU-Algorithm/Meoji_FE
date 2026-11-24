import { useState } from 'react'
import { useCategories, useSidos } from '../../api/hooks'
import type { EventListParams } from '../../api/types'
import { useAuth, useRequireLogin } from '../../auth'
import { BottomSheet, Chip } from '../../components'
import { DateRangeSheet } from './DateRangeSheet'
import { shortDateDow } from './dateFormat'
import { CalendarFieldIcon } from './icons'

export type FilterDraft = Pick<EventListParams, 'category_id' | 'sido_code' | 'is_free' | 'start_date' | 'end_date'>
const EMPTY_DRAFT: FilterDraft = {
  category_id: undefined,
  sido_code: undefined,
  is_free: undefined,
  start_date: undefined,
  end_date: undefined,
}

const chip = 'px-[13px]! tracking-[-0.2px]'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-[18px]">
      <h3 className="text-[14px] font-bold leading-5 tracking-[-0.2px] text-ink">{title}</h3>
      <div className="flex flex-wrap gap-[7px] pt-[10px]">{children}</div>
    </section>
  )
}

/**
 * M2-2 필터 시트. 시트 안에서 고른 값은 임시 상태로만 들고 있다가 '적용하기' 때 onApply 로 넘긴다.
 * 열 때마다 새로 마운트해서(params 기준) 임시 상태를 초기화한다.
 */
export function FilterSheet({
  params,
  onClose,
  onApply,
}: {
  params: EventListParams
  onClose: () => void
  onApply: (draft: FilterDraft) => void
}) {
  const { isLoggedIn } = useAuth()
  const requireLogin = useRequireLogin()
  const categories = useCategories()
  const sidos = useSidos()
  const [draft, setDraft] = useState<FilterDraft>({
    category_id: params.category_id,
    sido_code: params.sido_code,
    is_free: params.is_free,
    start_date: params.start_date,
    end_date: params.end_date,
  })
  const [dateOpen, setDateOpen] = useState(false)
  // 필터 값 자체가 로그인이 필요하다(BE JWT). 세션이 끊긴 경우에도 기존 규칙대로 로그인 유도.
  const set = (p: Partial<FilterDraft>) => requireLogin(() => setDraft((d) => ({ ...d, ...p })))

  const dateBtn = (value: string | undefined, placeholder: string) => (
    <button
      type="button"
      onClick={() => requireLogin(() => setDateOpen(true))}
      className="flex h-[46px] min-w-0 flex-1 items-center gap-2 rounded-card border border-line-strong bg-surface px-3 text-[13px]"
    >
      <CalendarFieldIcon className="shrink-0 text-ink-muted" />
      <span className={value ? 'font-bold text-ink' : 'text-ink-muted'}>{value ? shortDateDow(value) : placeholder}</span>
    </button>
  )

  return (
    <>
      <BottomSheet
        open
        onClose={onClose}
        title="필터"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDraft(EMPTY_DRAFT)}
              className="h-[50px] w-[108px] shrink-0 rounded-card border border-line-strong bg-surface text-[15px] font-bold text-ink"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="h-[50px] min-w-0 flex-1 rounded-card bg-primary text-[15px] font-bold tracking-[-0.2px] text-white"
            >
              적용하기
            </button>
          </>
        }
      >
        <div className="pb-6">
          <Section title="분류">
            <Chip className={chip} selected={draft.category_id === undefined} onClick={() => set({ category_id: undefined })}>
              전체
            </Chip>
            {categories.data?.map((c) => (
              <Chip key={c.id} className={chip} selected={draft.category_id === c.id} onClick={() => set({ category_id: c.id })}>
                {c.name}
              </Chip>
            ))}
          </Section>
          <Section title="지역">
            <Chip className={chip} selected={draft.sido_code === undefined} onClick={() => set({ sido_code: undefined })}>
              전체
            </Chip>
            {isLoggedIn ? (
              sidos.data?.map((s) => (
                <Chip key={s.code} className={chip} selected={draft.sido_code === s.code} onClick={() => set({ sido_code: s.code })}>
                  {s.short_name || s.name}
                </Chip>
              ))
            ) : (
              <Chip className={chip} onClick={() => requireLogin()}>
                로그인하고 지역 선택
              </Chip>
            )}
          </Section>
          <Section title="요금">
            <Chip className={chip} selected={draft.is_free === undefined} onClick={() => set({ is_free: undefined })}>
              전체
            </Chip>
            <Chip className={chip} selected={draft.is_free === true} onClick={() => set({ is_free: true })}>
              무료
            </Chip>
            <Chip className={chip} selected={draft.is_free === false} onClick={() => set({ is_free: false })}>
              유료
            </Chip>
          </Section>
          <section className="pt-[18px]">
            <h3 className="text-[14px] font-bold leading-5 tracking-[-0.2px] text-ink">기간</h3>
            <div className="flex items-center gap-[6px] pt-[10px]">
              {dateBtn(draft.start_date, '시작일')}
              <span aria-hidden="true" className="text-[16px] text-ink-subtle">
                –
              </span>
              {dateBtn(draft.end_date, '종료일')}
            </div>
          </section>
        </div>
      </BottomSheet>
      {dateOpen && (
        <DateRangeSheet
          open
          start={draft.start_date}
          end={draft.end_date}
          onClose={() => setDateOpen(false)}
          onConfirm={(r) => {
            setDraft((d) => ({ ...d, ...r }))
            setDateOpen(false)
          }}
        />
      )}
    </>
  )
}
