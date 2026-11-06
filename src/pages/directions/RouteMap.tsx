import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../../lib/kakaoMaps'
import { MinusIcon, PlusIcon } from '../detail/icons'

interface Props {
  from: { lat: number; lng: number; label: string } | null
  to: { lat: number; lng: number; label: string }
}

/** D1 지도. SDK/키 실패 시 Figma의 정적 회색 지도 + 라벨 카드로 대체한다. */
export function RouteMap({ from, to }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const overlays: any[] = []
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !ref.current) return
        const dest = new kakao.maps.LatLng(to.lat, to.lng)
        const map = mapRef.current ?? new kakao.maps.Map(ref.current, { center: dest, level: 6 })
        mapRef.current = map
        map.relayout()
        const bounds = new kakao.maps.LatLngBounds()
        bounds.extend(dest)
        const label = (pos: any, text: string, bg: string) => {
          const o = new kakao.maps.CustomOverlay({
            position: pos,
            yAnchor: 1.4,
            content: `<div style="background:${bg};color:#fff;font:700 12px 'Noto Sans KR',sans-serif;padding:4px 10px;border-radius:8px;white-space:nowrap">${text.replace(/[<>&]/g, '')}</div>`,
          })
          o.setMap(map)
          overlays.push(o)
        }
        const pin = (pos: any) => {
          const m = new kakao.maps.Marker({ position: pos })
          m.setMap(map)
          overlays.push(m)
        }
        pin(dest)
        label(dest, `도착 · ${to.label}`, '#f0562c')
        if (from) {
          const start = new kakao.maps.LatLng(from.lat, from.lng)
          bounds.extend(start)
          pin(start)
          label(start, `출발 · ${from.label}`, '#2a2320')
          // BE 는 경로 좌표를 주지 않으므로 출발-도착을 잇는 점선은 방향 참고용일 뿐 실제 경로가 아니다.
          {
            const line = new kakao.maps.Polyline({
              path: [start, dest],
              strokeWeight: 3,
              strokeColor: '#9a928c',
              strokeOpacity: 0.7,
              strokeStyle: 'dash',
            })
            line.setMap(map)
            overlays.push(line)
          }
          map.setBounds(bounds, 80, 80, 80, 80)
        } else {
          map.setCenter(dest)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      overlays.forEach((o) => o.setMap(null))
    }
  }, [from, to.lat, to.lng, to.label])

  return (
    <div
      className="relative h-[640px] overflow-hidden rounded-[18px] bg-[#eef0ea]"
      style={{ backgroundImage: 'linear-gradient(162deg, #eef0ea 8%, #e6ede0 54%, #eef0ea 92%)' }}
    >
      {failed ? (
        <div data-testid="route-map-fallback" className="absolute inset-0">
          <span className="absolute right-[30%] top-[20%] rounded-md bg-brand px-[10px] py-1 text-[12px] font-bold text-white">도착 · {to.label}</span>
          {from && <span className="absolute bottom-[25%] left-[14%] rounded-md bg-ink px-[10px] py-1 text-[12px] font-bold text-white">출발 · {from.label}</span>}
          <p className="absolute inset-x-0 bottom-4 text-center text-[12px] text-ink-muted">지도를 불러오지 못했어요</p>
        </div>
      ) : (
        <div ref={ref} data-testid="route-map" className="absolute inset-0" />
      )}
      {!failed && from && (
        <p
          data-testid="route-map-caption"
          className="absolute inset-x-0 bottom-2 z-10 mx-auto w-fit max-w-[calc(100%-80px)] rounded-md bg-surface/90 px-2 py-1 text-center text-[12px] text-ink-muted"
        >
          실제 경로선은 준비 중이에요. 출발지와 도착지만 표시돼요.
        </p>
      )}
      {!failed && (
        <div className="absolute bottom-[26px] right-[14px] z-10 flex flex-col gap-[6px]">
          {[
            { label: '확대', d: -1, Icon: PlusIcon },
            { label: '축소', d: 1, Icon: MinusIcon },
          ].map(({ label, d, Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => mapRef.current?.setLevel(mapRef.current.getLevel() + d)}
              className="flex size-10 items-center justify-center rounded-[10px] bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.14)]"
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
