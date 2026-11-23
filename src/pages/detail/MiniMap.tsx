import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../../lib/kakaoMaps'
import { MapPinIcon } from '../../components/icons'

interface Props {
  latitude: number | null
  longitude: number | null
  address?: string | null
  /** 카카오맵을 못 쓸 때 보여 줄 짧은 안내 */
  className?: string
}

/** 상세 사이드바 미니맵. 좌표가 없거나 SDK/키 문제면 주소 카드로 대체한다. */
export function MiniMap({ latitude, longitude, address, className = '' }: Props) {
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
      className={`relative h-[170px] w-full overflow-hidden rounded-card bg-[#eef0ea] ${className}`}
      style={{ backgroundImage: 'linear-gradient(169deg, #eef0ea 8%, #e6ede0 54%, #eef0ea 92%)' }}
    >
      {showMap ? (
        <div ref={ref} data-testid="mini-map" className="absolute inset-0" />
      ) : (
        <div data-testid="mini-map-fallback" className="absolute left-1/2 top-[51px] -translate-x-1/2 text-brand">
          <MapPinIcon size={34} />
        </div>
      )}
      {address && (
        <p className="absolute inset-x-[10px] bottom-[10px] z-10 truncate rounded-md bg-surface px-[10px] py-[6px] text-[12px] leading-[18px] text-ink shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
          {address}
        </p>
      )}
    </div>
  )
}
