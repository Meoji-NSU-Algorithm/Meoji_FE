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
}

/** D2 출발지 변경: 현재 위치로 설정 또는 장소/주소 검색 */
export function OriginPicker({ notice, onSelect, onCancel }: Props) {
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
        {/* D2: 글자마다 조회하지 않고 Enter 나 검색 버튼으로만 찾는다. */}
        <button type="submit" disabled={busy} className="text-[12px] font-bold text-primary-ink">
          검색
        </button>
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
