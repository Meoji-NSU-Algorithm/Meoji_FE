import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EventCard } from '../../api/types'
import { PhotoPlaceholder, formatDateRange, priceLabel } from '../../components'
import { CloseSmallIcon } from '../events/icons'

export function MapThumb({ e, size }: { e: EventCard; size: number }) {
  return (
    <span
      className={`relative shrink-0 overflow-hidden bg-surface-muted ${size >= 72 ? 'rounded-card' : 'rounded-[10px]'}`}
      style={{ width: size, height: size }}
    >
      {e.image_url ? (
        <img src={e.image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <PhotoPlaceholder variant="thumb" title={e.title} category={e.category} />
      )}
    </span>
  )
}

const price = (e: EventCard) => {
  const p = priceLabel(e.price, e.is_free)
  return p.tone === 'unknown' ? null : p
}

/**
 * M3·S4·S5 지도 아래 끌어올리는 목록 시트 (모달 아님).
 * 접힘(S5): 개수 + 안내 한 줄 / 펼침(S4): 목록 / 선택(M3): 선택한 행사 카드 + 이 지역 다른 행사.
 */
export function MobileMapSheet({
  expanded,
  onExpandedChange,
  count,
  selected,
  onClearSelected,
  others,
  onPick,
  status,
}: {
  expanded: boolean
  onExpandedChange: (v: boolean) => void
  count: number
  selected: EventCard | null
  onClearSelected: () => void
  others: EventCard[]
  onPick: (id: number) => void
  /** 로그인 필요·실패·로딩·빈 상태처럼 목록 대신 보여줄 내용 */
  status?: ReactNode
}) {
  const startY = useRef<number | null>(null)
  const sp = selected ? price(selected) : null

  return (
    <section
      aria-label="행사 목록"
      data-expanded={expanded}
      className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[20px] bg-surface drop-shadow-[0_-6px_10px_rgba(0,0,0,0.1)] ${
        expanded ? (selected ? 'h-[336px]' : 'h-[330px]') : 'h-[120px]'
      }`}
    >
      <button
        type="button"
        aria-label={expanded ? '목록 접기' : '목록 펼치기'}
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
        onPointerDown={(e) => (startY.current = e.clientY)}
        onPointerUp={(e) => {
          if (startY.current == null) return
          const dy = e.clientY - startY.current
          startY.current = null
          if (dy < -24) onExpandedChange(true)
          else if (dy > 24) onExpandedChange(false)
        }}
        className="flex w-full shrink-0 touch-none justify-center pb-[2px] pt-2"
      >
        <span className="h-1 w-10 rounded-[2px] bg-line-strong" />
      </button>

      {status ? (
        <div className="min-h-0 flex-1 overflow-y-auto">{status}</div>
      ) : selected && expanded ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
          <div className="px-4 pt-[10px]">
            <div
              role="group"
              aria-label="선택한 행사"
              className="relative flex gap-3 rounded-lg border border-primary-border bg-[#fff6f2] p-3"
            >
              <MapThumb e={selected} size={72} />
              <div className="min-w-0 flex-1 pr-6">
                <p className="text-[11px] font-bold leading-[15px] tracking-[-0.2px] text-primary">
                  선택한 행사{selected.category ? ` · ${selected.category}` : ''}
                </p>
                <p className="truncate text-[15px] font-black leading-[21px] tracking-[-0.2px] text-ink">{selected.title}</p>
                <p className="truncate text-[12px] leading-[17px] tracking-[-0.2px] text-ink-muted">
                  {formatDateRange(selected.start_date ?? '', selected.end_date ?? selected.start_date ?? '')}
                  {sp && (
                    <>
                      {' · '}
                      <b className={`font-bold ${sp.tone === 'free' ? 'text-free' : 'text-ink-muted'}`}>{sp.text}</b>
                    </>
                  )}
                </p>
                <Link
                  to={`/events/${selected.id}`}
                  className="mt-[6px] inline-flex h-[30px] items-center rounded-pill bg-primary px-3 text-[12px] font-bold tracking-[-0.2px] text-white"
                >
                  상세 보기 ›
                </Link>
              </div>
              <button
                type="button"
                aria-label="선택 해제"
                onClick={onClearSelected}
                className="absolute right-1 top-1 flex size-9 items-center justify-center text-ink-subtle"
              >
                <CloseSmallIcon />
              </button>
            </div>
          </div>
          <p className="px-5 pt-[14px] text-[13px] font-black tracking-[-0.2px] text-ink">
            이 지역 다른 행사 <span className="text-primary">{others.length}</span>
          </p>
          <EventRows list={others} onPick={onPick} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="px-5 pt-[10px] text-[14px] font-black tracking-[-0.2px] text-ink" aria-live="polite">
            지도 영역 안 <span className="text-primary">{count}</span>개 행사
          </p>
          <p className="px-5 pt-[2px] text-[11.5px] tracking-[-0.2px] text-ink-subtle">
            {expanded ? '가격 표시나 목록을 누르면 그 행사가 위에 고정돼요' : '위로 끌어 올리면 목록이 펼쳐져요'}
          </p>
          {expanded && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 pt-[6px]">
              <EventRows list={others} onPick={onPick} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function EventRows({ list, onPick }: { list: EventCard[]; onPick: (id: number) => void }) {
  return (
    <ul className="px-2 pt-[2px]">
      {list.map((e) => {
        const p = price(e)
        return (
          <li key={e.id} data-event-id={e.id}>
            <button type="button" onClick={() => onPick(e.id)} className="flex w-full items-center gap-3 rounded-card p-2 text-left">
              <MapThumb e={e} size={52} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold leading-[15px] tracking-[-0.2px] text-primary">{e.category}</span>
                <span className="block truncate text-[14px] font-bold leading-5 tracking-[-0.2px] text-ink">{e.title}</span>
                <span className="block truncate text-[12px] leading-[17px] tracking-[-0.2px] text-ink-muted">
                  {[e.venue_name, p?.text].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
