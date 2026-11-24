import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../../lib/kakaoMaps'
import { MapPinIcon } from '../../components/icons'

interface Props {
  latitude: number | null
  longitude: number | null
  address?: string | null
  /** 카카오맵을 못 쓸 때 보여 줄 짧은 안내 */
  className?: string
  /** 모바일 상세(Figma M5 729:73): 높이 120, 모서리 12, 주소 칸 28px */
  compact?: boolean
}

/** 상세 사이드바 미니맵. 좌표가 없거나 SDK/키 문제면 주소 카드로 대체한다. */
export function MiniMap({ latitude, longitude, address, className = '', compact = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const hasCoords = latitude != null && longitude != null

  useEffect(() => {
    if (!hasCoords) return
    let cancelled = false
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !ref.current) return
        const pos = new kakao.maps.LatLng(latitude, longitude)
        const map = new kakao.maps.Map(ref.current, { center: pos, level: 4, draggable: false, scrollwheel: false })
        new kakao.maps.Marker({ position: pos, map })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [hasCoords, latitude, longitude])

  const showMap = hasCoords && !failed
  return (
    <div
      className={`relative w-full overflow-hidden bg-[#eef0ea] ${compact ? 'h-[120px] rounded-[12px]' : 'h-[170px] rounded-card'} ${className}`}
      style={{ backgroundImage: 'linear-gradient(169deg, #eef0ea 8%, #e6ede0 54%, #eef0ea 92%)' }}
    >
      {showMap ? (
        <div ref={ref} data-testid="mini-map" className="absolute inset-0" />
      ) : (
        <div data-testid="mini-map-fallback" className={`absolute left-1/2 -translate-x-1/2 text-brand ${compact ? 'top-[22px]' : 'top-[51px]'}`}>
          <MapPinIcon size={compact ? 32 : 34} />
        </div>
      )}
      {address && (
        <p
          className={
            compact
              ? 'absolute inset-x-2 bottom-2 z-10 h-7 truncate rounded-[7px] leading-7 bg-surface px-[10px] text-[11.5px] text-ink'
              : 'absolute inset-x-[10px] bottom-[10px] z-10 truncate rounded-md bg-surface px-[10px] py-[6px] text-[12px] leading-[18px] text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
          }
        >
          {address}
        </p>
      )}
    </div>
  )
}
