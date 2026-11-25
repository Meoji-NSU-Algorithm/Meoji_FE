import { useMemo, useState } from 'react'
import { BottomSheet } from '../../components'
import { ymd } from './calendarGrid'
import { shortDate, shortDateDow, todayYmd } from './dateFormat'
import { ChevronLeft20Icon, ChevronRight20Icon } from './icons'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

type Field = 'start' | 'end'

/**
 * S3 필터 · 날짜 선택. 필터 시트 위에 한 겹 더 뜨는 하단 시트.
 * 시작일 → 종료일 순서로 고른다. 오늘 이전 날짜는 고를 수 없다(Figma: 지난 날은 흐리게).
 */
export function DateRangeSheet({
  open,
  start,
  end,
  onClose,
  onConfirm,
}: {
  open: boolean
  start?: string
  end?: string
  onClose: () => void
  onConfirm: (range: { start_date?: string; end_date?: string }) => void
}) {
  const [today] = useState(() => todayYmd())
  const [s, setS] = useState(start)
  const [e, setE] = useState(end)
  const [field, setField] = useState<Field>(start && !end ? 'end' : 'start')
  const [cursor, setCursor] = useState(() => {
    const base = start ?? today
    return { year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) }
  })
  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month - 1, 1).getDay()
    const days = new Date(cursor.year, cursor.month, 0).getDate()
    const out: Array<string | null> = Array.from({ length: first }, () => null)
    for (let d = 1; d <= days; d++) out.push(ymd(cursor.year, cursor.month, d))
    while (out.length % 7) out.push(null)
    return out
  }, [cursor])

  const pick = (date: string) => {
    if (field === 'start' || !s || date < s) {
      setS(date)
      if (e && date > e) setE(undefined)
      setField('end')
    } else {
      setE(date)
    }
  }

  const label = s && e ? `${shortDate(s)} – ${shortDate(e)} 선택` : s ? `${shortDate(s)}부터 선택` : '선택'

  const box = (f: Field, value?: string) => {
    const on = field === f
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setField(f)}
        className={`flex h-[50px] min-w-0 flex-1 flex-col items-start justify-center rounded-card border px-3 text-left ${
          on ? 'border-brand' : 'border-line-strong'
        }`}
      >
        <span className={`text-[11px] font-bold tracking-[-0.2px] ${on ? 'text-primary' : 'text-ink-subtle'}`}>
          {f === 'start' ? '시작일' : '종료일'}
        </span>
        <span className={`text-[14px] font-bold tracking-[-0.2px] ${value ? 'text-ink' : 'text-ink-disabled'}`}>
          {value ? shortDateDow(value) : '날짜 선택'}
        </span>
      </button>
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="기간 선택" bodyClassName="pb-[calc(var(--mobile-safe-bottom)+10px)]">
      <div className="flex gap-2 px-4 pt-[10px]">
        {box('start', s)}
        {box('end', e)}
      </div>
      <div className="flex items-center justify-between pb-1 pl-5 pr-2 pt-[14px]">
        <h3 className="text-[16px] font-bold tracking-[-0.2px] text-ink" aria-live="polite">
          {cursor.year}년 {cursor.month}월
        </h3>
        <div className="flex">
          <button type="button" aria-label="이전 달" onClick={() => move(-1)} className="flex size-11 items-center justify-center text-ink">
            <ChevronLeft20Icon />
          </button>
          <button type="button" aria-label="다음 달" onClick={() => move(1)} className="flex size-11 items-center justify-center text-ink">
            <ChevronRight20Icon />
          </button>
        </div>
      </div>
      <div role="grid" aria-label={`${cursor.year}년 ${cursor.month}월`} className="grid grid-cols-7 gap-y-1 px-3">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            role="columnheader"
            className={`text-center text-[12px] leading-[30px] tracking-[-0.2px] ${i === 0 ? 'text-primary' : 'text-ink-subtle'}`}
          >
            {w}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`x${i}`} className="h-11" />
          const past = date < today
          const edge = date === s || date === e
          const inRange = !!(s && e && date > s && date < e)
          const band =
            s && e && s !== e
              ? date === s
                ? 'bg-[linear-gradient(to_right,transparent_50%,var(--color-primary-tint-strong)_50%)]'
                : date === e
                  ? 'bg-[linear-gradient(to_right,var(--color-primary-tint-strong)_50%,transparent_50%)]'
                  : inRange
                    ? 'bg-primary-tint-strong'
                    : ''
              : ''
          return (
            <div key={date} role="gridcell" className={`flex h-11 items-center justify-center ${band}`}>
              <button
                type="button"
                disabled={past}
                aria-pressed={edge}
                aria-label={`${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`}
                onClick={() => pick(date)}
                className={`flex size-10 items-center justify-center rounded-full text-[14px] tracking-[-0.2px] ${
                  edge ? 'bg-brand font-black text-white' : past ? 'font-medium text-ink-disabled' : 'font-medium text-ink'
                }`}
              >
                {Number(date.slice(8, 10))}
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 px-4 pt-[14px]">
        <button
          type="button"
          onClick={() => {
            setS(undefined)
            setE(undefined)
            setField('start')
          }}
          className="h-[50px] w-[100px] shrink-0 rounded-card border border-line-strong bg-surface text-[15px] font-bold text-ink"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={() => onConfirm({ start_date: s, end_date: e })}
          className="h-[50px] min-w-0 flex-1 rounded-card bg-primary text-[15px] font-bold tracking-[-0.2px] text-white"
        >
          {label}
        </button>
      </div>
    </BottomSheet>
  )
}
