import { pageItems } from './pageItems'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  const btn = 'flex size-9 md:size-8 items-center justify-center rounded-full text-[13px] leading-[19.5px]'
  return (
    <nav aria-label="페이지" className="flex items-center justify-center gap-[2px] py-7 md:gap-1 md:py-0 md:pt-12">
      <button type="button" aria-label="이전 페이지" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${btn} text-ink-muted disabled:opacity-40`}>
        <ChevronLeftIcon />
      </button>
      {pageItems(page, totalPages).map((it, i) =>
        it === 'gap' ? (
          <span key={`g${i}`} className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-current={it === page ? 'page' : undefined}
            onClick={() => onChange(it)}
            className={`${btn} ${it === page ? 'bg-primary-tint-strong font-bold text-primary-ink' : 'text-ink-muted'}`}
          >
            {it}
          </button>
        ),
      )}
      <button type="button" aria-label="다음 페이지" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={`${btn} text-ink-muted disabled:opacity-40`}>
        <ChevronRightIcon />
      </button>
    </nav>
  )
}
