import { useEffect, useMemo, useRef, useState } from 'react'
import { loadKakaoMaps } from '../../lib/kakaoMaps'
import { MinusIcon, PlusIcon } from '../detail/icons'
import { ROUTE_LAYERS, bridgeSegments, routeLayerStyle, type RouteSegment } from './path'

interface Props {
  from: { lat: number; lng: number; label: string } | null
  to: { lat: number; lng: number; label: string }
  /** 경로선 구간. 비어 있으면 선 없이 출발·도착 마커만 그린다. */
  segments?: RouteSegment[]
}

/** D1 지도. SDK/키 실패 시 Figma의 정적 회색 지도 + 라벨 카드로 대체한다. */
const NO_SEGMENTS: RouteSegment[] = []

export function RouteMap({ from, to, segments = NO_SEGMENTS }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [failed, setFailed] = useState(false)
  const bridged = useMemo(() => bridgeSegments(segments, from, to), [segments, from, to])

  useEffect(() => {
    let cancelled = false
    const overlays: any[] = []
    let observer: ResizeObserver | null = null
    let raf = 0
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !ref.current) return
        const dest = new kakao.maps.LatLng(to.lat, to.lng)
        const map = mapRef.current ?? new kakao.maps.Map(ref.current, { center: dest, level: 6 })
        mapRef.current = map
        map.relayout()
        const bounds = new kakao.maps.LatLngBounds()
        bounds.extend(dest)
        // 라벨 + 줄기 + 점으로 이뤄진 Figma 모양의 끝점 마커. 점이 좌표 위에 오도록 아래쪽을 기준으로 한다.
        const endpoint = (pos: any, text: string, color: string) => {
          const o = new kakao.maps.CustomOverlay({
            position: pos,
            yAnchor: 1,
            content: `<div style="display:flex;flex-direction:column;align-items:center"><div style="background:${color};color:#fff;font:700 12px 'Noto Sans KR',sans-serif;padding:4px 10px;border-radius:8px;white-space:nowrap">${text.replace(/[<>&]/g, '')}</div><div style="width:2px;height:10px;background:${color}"></div><div style="width:14px;height:14px;box-sizing:border-box;border:3px solid #fff;border-radius:50%;background:${color};margin-bottom:-7px"></div></div>`,
          })
          o.setMap(map)
          overlays.push(o)
        }
        const ll = ([lat, lng]: [number, number]) => new kakao.maps.LatLng(lat, lng)
        // 경로선: 흰 테두리를 먼저 깔고 그 위에 브랜드 주황. 도보 구간만 점선.
        bridged.forEach((seg, i) => {
          const path = seg.points.map(ll)
          path.forEach((p: any) => bounds.extend(p))
          for (const layer of ROUTE_LAYERS) {
            const line = new kakao.maps.Polyline({ path, strokeWeight: layer.weight, strokeColor: layer.color, strokeOpacity: 1, strokeStyle: routeLayerStyle(layer, seg.walk, seg.kind), zIndex: layer.z })
            line.setMap(map)
            overlays.push(line)
          }
          // 구간이 바뀌는 지점(승차·환승)을 흰 점 + 주황 테두리로 표시한다.
          if (i > 0 && !seg.kind) {
            const o = new kakao.maps.CustomOverlay({
              position: path[0],
              content: '<div style="width:14px;height:14px;box-sizing:border-box;border:3px solid #f0562c;border-radius:50%;background:#fff"></div>',
            })
            o.setMap(map)
            overlays.push(o)
          }
        })
        endpoint(dest, `도착 · ${to.label}`, '#f0562c')
        let fit = () => map.setCenter(dest)
        if (from) {
          const start = new kakao.maps.LatLng(from.lat, from.lng)
          bounds.extend(start)
          endpoint(start, `출발 · ${from.label}`, '#2a2320')
          fit = () => map.setBounds(bounds, 80, 80, 80, 80)
        }
        fit()
        // 컨테이너 크기가 바뀌면(레이아웃 확정 등) 타일이 비지 않도록 relayout 후 다시 맞춘다.
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
              if (cancelled) return
              map.relayout()
              fit()
            })
          })
          observer.observe(ref.current)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      observer?.disconnect()
      cancelAnimationFrame(raf)
      overlays.forEach((o) => o.setMap(null))
    }
  }, [from, to.lat, to.lng, to.label, bridged])

  return (
    <div
      className="relative h-[320px] overflow-hidden lg:h-[640px] rounded-[18px] bg-[#eef0ea]"
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
