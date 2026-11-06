import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

export interface MapPoint {
  id: number
  lat: number
  lng: number
  label: string
}
export interface MapBounds {
  min_lat: number
  max_lat: number
  min_lng: number
  max_lng: number
}
export interface MapCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  panTo: (lat: number, lng: number) => void
  setMyLocation: (lat: number, lng: number) => void
  fit: () => void
}

const CHEONAN = { lat: 36.8151, lng: 127.1139 }

const BASE = 'relative cursor-pointer whitespace-nowrap rounded-pill px-3 h-[30px] flex items-center text-[12px] font-black leading-[18px] shadow-[0_2px_4px_rgba(0,0,0,0.16)] border-0 '
const ON = BASE + 'bg-primary-ink text-white'
const OFF = BASE + 'bg-white text-ink'

function makeMarker(label: string, selected: boolean, onClick: () => void) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = selected ? ON : OFF
  el.textContent = label
  el.addEventListener('click', onClick)
  return el
}

interface Props {
  kakao: any
  points: MapPoint[]
  selectedId: number | null
  onSelect: (id: number) => void
  /** 지도 영역(bounds) 안에 있는 마커 id */
  onVisibleChange: (ids: number[]) => void
  /** 이 값이 바뀌면 모든 마커가 보이도록 지도를 맞춘다 */
  fitKey: string
  /** 사용자가 지도를 움직이거나 확대/축소해 멈췄을 때의 영역. fit으로 맞춘 이동은 알리지 않는다 */
  onUserMove?: (bounds: MapBounds) => void
  ref?: Ref<MapCanvasHandle>
}

/** Kakao 지도 + 가격 라벨 마커(CustomOverlay). 데이터는 props로만 받는다. */
// fit 직후 이 시간 안에 오는 idle은 프로그램이 맞춘 이동으로 본다(같은 영역이면 idle이 안 올 수도 있어 시간으로 끊는다).
const FIT_SETTLE_MS = 800

export function MapCanvas({ kakao, points, selectedId, onSelect, onVisibleChange, fitKey, onUserMove, ref }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const overlays = useRef(new Map<number, { overlay: any; el: HTMLElement }>())
  const mine = useRef<any>(null)
  const latest = useRef({ points, onVisibleChange, onSelect, onUserMove })
  latest.current = { points, onVisibleChange, onSelect, onUserMove }
  const fittedAt = useRef(0)

  const reportVisible = () => {
    const m = map.current
    if (!m) return
    const b = m.getBounds()
    const ids = latest.current.points
      .filter((p) => b.contain(new kakao.maps.LatLng(p.lat, p.lng)))
      .map((p) => p.id)
    latest.current.onVisibleChange(ids)
  }
  const fit = () => {
    const m = map.current
    const pts = latest.current.points
    if (!m || pts.length === 0) return
    const bounds = new kakao.maps.LatLngBounds()
    pts.forEach((p) => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)))
    fittedAt.current = Date.now()
    m.setBounds(bounds, 60, 60, 60, 60)
  }
  const onIdle = () => {
    reportVisible()
    const m = map.current
    if (!m || !latest.current.onUserMove) return
    if (Date.now() - fittedAt.current < FIT_SETTLE_MS) return
    const b = m.getBounds()
    const sw = b.getSouthWest()
    const ne = b.getNorthEast()
    latest.current.onUserMove({ min_lat: sw.getLat(), max_lat: ne.getLat(), min_lng: sw.getLng(), max_lng: ne.getLng() })
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => map.current?.setLevel(map.current.getLevel() - 1, { animate: true }),
    zoomOut: () => map.current?.setLevel(map.current.getLevel() + 1, { animate: true }),
    panTo: (lat, lng) => map.current?.panTo(new kakao.maps.LatLng(lat, lng)),
    setMyLocation: (lat, lng) => {
      const m = map.current
      if (!m) return
      const pos = new kakao.maps.LatLng(lat, lng)
      if (!mine.current) {
        const dot = document.createElement('div')
        dot.setAttribute('aria-label', '내 위치')
        dot.className = 'size-[18px] rounded-[9px] border-[3px] border-white bg-[#2563eb] shadow-[0_0_0_8px_rgba(37,99,235,0.18)]'
        mine.current = new kakao.maps.CustomOverlay({ position: pos, content: dot, zIndex: 1 })
        mine.current.setMap(m)
      } else mine.current.setPosition(pos)
      m.panTo(pos)
    },
    fit,
  }))

  // 지도 생성/정리
  useEffect(() => {
    if (!box.current) return
    const m = new kakao.maps.Map(box.current, {
      center: new kakao.maps.LatLng(CHEONAN.lat, CHEONAN.lng),
      level: 8,
    })
    map.current = m
    // 처음 그린 직후의 idle은 사용자 이동이 아니다.
    fittedAt.current = Date.now()
    kakao.maps.event.addListener(m, 'idle', onIdle)
    const store = overlays.current
    return () => {
      store.forEach(({ overlay }) => overlay.setMap(null))
      store.clear()
      mine.current?.setMap(null)
      mine.current = null
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kakao])

  // 마커 동기화
  useEffect(() => {
    const m = map.current
    if (!m) return
    const store = overlays.current
    const ids = new Set(points.map((p) => p.id))
    store.forEach(({ overlay }, id) => {
      if (!ids.has(id)) {
        overlay.setMap(null)
        store.delete(id)
      }
    })
    for (const p of points) {
      const cur = store.get(p.id)
      if (cur) {
        cur.el.textContent = p.label
        continue
      }
      const el = makeMarker(p.label, false, () => latest.current.onSelect(p.id))
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(p.lat, p.lng),
        content: el,
        yAnchor: 1.4,
      })
      overlay.setMap(m)
      store.set(p.id, { overlay, el })
    }
    reportVisible()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  // 선택 강조
  useEffect(() => {
    overlays.current.forEach(({ el, overlay }, id) => {
      const on = id === selectedId
      el.className = on ? ON : OFF
      overlay.setZIndex(on ? 10 : 0)
    })
  }, [selectedId, points])

  useEffect(() => {
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  return <div ref={box} className="absolute inset-0" data-testid="kakao-map" />
}
