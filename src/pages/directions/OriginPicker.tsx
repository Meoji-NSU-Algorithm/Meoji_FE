import { useState } from 'react'
import type { FormEvent } from 'react'
import { SearchIcon } from '../../components/icons'
import { TargetIcon } from '../detail/icons'
import { MapPinIcon } from '../../components/icons'
import { getCurrentPosition, searchPlaces } from './geocode'
import type { Place } from './geocode'

export interface Origin {
  lat: number
  lng: number
  label: string
}

interface Props {
  notice?: string | null
  onSelect: (origin: Origin) => void
  onCancel?: () => void
  /** 모바일 출발지 변경 시트 안의 모양 (Figma S13 759:11). 취소는 시트 머리에 있다 */
  mobile?: boolean
}

/** 검색어와 겹치는 앞부분을 주황으로 (Figma S13: '천안'역) */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  const i = q ? text.indexOf(q) : -1
  if (i < 0) return <span className="text-ink">{text}</span>
  return (
    <>
      <span className="text-ink-subtle">{text.slice(0, i)}</span>
      <span className="text-primary">{text.slice(i, i + q.length)}</span>
      <span className="text-ink-subtle">{text.slice(i + q.length)}</span>
    </>
  )
}

/** D2 출발지 변경: 현재 위치로 설정 또는 장소/주소 검색 */
export function OriginPicker({ notice, onSelect, onCancel, mobile = false }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [message, setMessage] = useState<string | null>(notice ?? null)
  const [busy, setBusy] = useState(false)

  const applyCurrentLocation = async () => {
    setBusy(true)
    try {
      const p = await getCurrentPosition()
      onSelect({ ...p, label: '현재 위치' })
    } catch {
      setMessage('현재 위치를 가져오지 못했어요. 위치 권한을 확인하거나 장소를 검색해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    setMessage(null)
    try {
      const found = await searchPlaces(query)
      setResults(found)
      if (found.length === 0) setMessage('검색 결과가 없어요. 다른 이름이나 주소로 찾아 보세요.')
    } catch {
      setResults(null)
      setMessage('지금은 장소 검색을 사용할 수 없어요. 현재 위치를 사용하거나 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  if (mobile) {
    const row = 'flex h-[60px] w-full items-center gap-3 text-left'
    return (
      <div data-testid="origin-picker">
        <div className="px-4 pt-[6px]">
          <form onSubmit={(e) => void search(e)} className="flex h-12 items-center gap-2 rounded-[12px] border border-ink px-[14px] text-ink">
            <SearchIcon size={18} />
            <input
              autoFocus
              type="search"
              enterKeyHint="search"
              aria-label="출발지 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="출발지 장소나 주소를 입력하세요"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle"
            />
          </form>
          {message && (
            <p role="status" className="px-1 pt-2 text-[12px] leading-[18px] text-ink-muted">
              {message}
            </p>
          )}
        </div>
        <ul className="px-4 pt-[6px]">
          <li className="border-b border-line-soft last:border-b-0">
            <button type="button" disabled={busy} onClick={() => void applyCurrentLocation()} className={row}>
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#eef3fd] text-[#2563eb]"><TargetIcon size={18} /></span>
              <span className="min-w-0 tracking-[-0.2px]">
                <span className="block text-[14.5px] font-bold leading-5 text-ink">현재 위치로 설정</span>
                <span className="block text-[12px] text-ink-subtle">내 위치를 출발지로 사용해요</span>
              </span>
            </button>
          </li>
          {results?.map((p) => (
            <li key={`${p.name}-${p.lat}-${p.lng}`} className="border-b border-line-soft last:border-b-0">
              <button type="button" onClick={() => onSelect({ lat: p.lat, lng: p.lng, label: p.name })} className={row}>
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted"><MapPinIcon size={18} /></span>
                <span className="min-w-0 tracking-[-0.2px]">
                  <span className="block truncate text-[14.5px] font-bold leading-5"><Highlight text={p.name} query={query} /></span>
                  <span className="block truncate text-[12px] text-ink-subtle">{p.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="pt-3" data-testid="origin-picker">
      <form onSubmit={(e) => void search(e)} className="flex h-11 items-center gap-2 rounded-card border-2 border-ink px-3">
        <SearchIcon size={16} />
        <input
          autoFocus
          aria-label="출발지 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="출발지 장소나 주소를 입력하세요"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
        />
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-[12px] text-ink-muted">
            취소
          </button>
        )}
      </form>
      {message && (
        <p role="status" className="px-1 pt-2 text-[12px] leading-[18px] text-ink-muted">
          {message}
        </p>
      )}
      <ul className="pt-2">
        <li>
          <button type="button" disabled={busy} onClick={() => void applyCurrentLocation()} className="flex w-full items-center gap-3 rounded-card px-1 py-[10px] text-left hover:bg-surface-muted">
            <span className="flex size-[30px] items-center justify-center rounded-full bg-surface-muted text-[#2563eb]"><TargetIcon size={16} /></span>
            <span>
              <span className="block text-[13px] font-bold leading-[19.5px] text-ink">현재 위치로 설정</span>
              <span className="block text-[11px] leading-[16.5px] text-ink-subtle">내 위치를 출발지로 사용해요</span>
            </span>
          </button>
        </li>
        {results?.map((p) => (
          <li key={`${p.name}-${p.lat}-${p.lng}`}>
            <button type="button" onClick={() => onSelect({ lat: p.lat, lng: p.lng, label: p.name })} className="flex w-full items-center gap-3 rounded-card px-1 py-[10px] text-left hover:bg-surface-muted">
              <span className="flex size-[30px] items-center justify-center rounded-full bg-surface-muted text-ink-muted"><MapPinIcon size={16} /></span>
              <span>
                <span className="block text-[13px] font-bold leading-[19.5px] text-ink">{p.name}</span>
                <span className="block text-[11px] leading-[16.5px] text-ink-subtle">{p.address}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
