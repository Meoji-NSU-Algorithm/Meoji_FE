import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

export interface MapPoint {
  id: number
  lat: number
  lng: number
  label: string
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
// 선택된 마커만 진한 색 + 아래 꼬리
const ON = BASE + 'bg-ink text-white after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-[6px] after:border-t-[6px] after:border-x-transparent after:border-t-ink after:content-[""]'
const OFF = BASE + 'bg-white text-ink'
const OFF_FREE = BASE + 'bg-white text-[#16834A]'
const cls = (on: boolean, label: string) => (on ? ON : label === '무료' ? OFF_FREE : OFF)

function makeMarker(label: string, selected: boolean, onClick: () => void) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = cls(selected, label)
  el.textContent = label
  el.addEventListener('click', onClick)
  return el
}

interface Props {
  kakao: any
  points: MapPoint[]
  selectedId: number | null
  /** null: 지도 빈 곳을 눌러 선택 해제 */
  onSelect: (id: number | null) => void
  /** 지도 영역(bounds) 안에 있는 마커 id */
  onVisibleChange: (ids: number[]) => void
  /** 이 값이 바뀌면 모든 마커가 보이도록 지도를 맞춘다 */
  fitKey: string
  ref?: Ref<MapCanvasHandle>
}

/** Kakao 지도 + 가격 라벨 마커(CustomOverlay). 데이터는 props로만 받는다. */
export function MapCanvas({ kakao, points, selectedId, onSelect, onVisibleChange, fitKey, ref }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const overlays = useRef(new Map<number, { overlay: any; el: HTMLElement }>())
  const mine = useRef<any>(null)
  const latest = useRef({ points, onVisibleChange, onSelect })
  latest.current = { points, onVisibleChange, onSelect }

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
    m.setBounds(bounds, 60, 60, 60, 60)
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
    kakao.maps.event.addListener(m, 'idle', reportVisible)
    kakao.maps.event.addListener(m, 'click', () => latest.current.onSelect(null))
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
        clickable: true, // 마커 클릭이 지도 click(선택 해제)으로 번지지 않게
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
      el.className = cls(on, el.textContent ?? '')
      overlay.setZIndex(on ? 10 : 0)
    })
  }, [selectedId, points])

  useEffect(() => {
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  return <div ref={box} className="absolute inset-0" data-testid="kakao-map" />
}
