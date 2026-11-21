import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../../lib/kakaoMaps'
import type { DirectionsResult } from '../../api/types'
import { MinusIcon, PlusIcon } from '../detail/icons'

interface Props {
  from: { lat: number; lng: number; label: string } | null
  to: { lat: number; lng: number; label: string }
  path?: DirectionsResult['path']
}

/** D1 지도. SDK/키 실패 시 Figma의 정적 회색 지도 + 라벨 카드로 대체한다. */
export function RouteMap({ from, to, path }: Props) {
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
          // BE path: 자동차·도보는 [[lat,lng]], 대중교통은 [{type, coordinates}]. 없으면 방향 참고용 점선.
          const segs = !path?.length ? [] : Array.isArray(path[0]) ? [{ type: 'LINE', coordinates: path as [number, number][] }] : (path as { type: string; coordinates: [number, number][] }[])
          const drawn = segs.filter((g) => g.coordinates.length > 1)
          // BE 가 일부 구간(기차 등)의 좌표를 빼면 선이 끊기므로, 앞 구간 끝과 다음 구간 시작이 멀면 점선으로 잇는다.
          for (let i = drawn.length - 1; i > 0; i--) {
            const [aLat, aLng] = drawn[i - 1].coordinates.at(-1)!
            const [bLat, bLng] = drawn[i].coordinates[0]
            if (Math.abs(aLat - bLat) + Math.abs(aLng - bLng) > 0.003) {
              drawn.splice(i, 0, { type: 'WALK', coordinates: [[aLat, aLng], [bLat, bLng]] })
            }
          }
          for (const g of drawn.length ? drawn : [{ type: 'WALK', coordinates: null }]) {
            const pts = g.coordinates ? g.coordinates.map(([la, ln]) => new kakao.maps.LatLng(la, ln)) : [start, dest]
            const guess = !g.coordinates || g.type === 'WALK'
            pts.forEach((pt: any) => bounds.extend(pt))
            // A2: 탈것은 주황 실선, 도보는 주황 점선. 흰 테두리를 깔아 지도 위에서 잘 보이게 한다.
            const outline = guess ? null : new kakao.maps.Polyline({ path: pts, strokeWeight: 9, strokeColor: '#ffffff', strokeOpacity: 1, strokeStyle: 'solid' })
            const line = new kakao.maps.Polyline({
              path: pts,
              strokeWeight: 5,
              strokeColor: '#f0562c',
              strokeOpacity: 1,
              strokeStyle: guess ? 'shortdot' : 'solid',
            })
            for (const l of outline ? [outline, line] : [line]) {
              l.setMap(map)
              overlays.push(l)
            }
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
  }, [from, to.lat, to.lng, to.label, path])

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
      {!failed && from && !path?.length && (
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
