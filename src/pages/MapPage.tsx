import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../api/hooks'
import type { EventCard } from '../api/types'
import { useAuth, useRequireLogin } from '../auth'
import { Spinner, useToast } from '../components'
import { PhotoIcon } from '../components/icons'
import { loadKakaoMaps } from '../lib/kakaoMaps'
import { FilterPanel } from './events/FilterPanel'
import { LocateIcon, MinusIcon, PinBigIcon, PlusIcon, SearchBigIcon, WifiOffIcon } from './events/icons'
import { outlineBtn, primaryBtn, StatePanel } from './events/StatePanel'
import { formatPrice } from '../components'
import { hasLoginFilters, useEventFilters } from './events/useEventFilters'
import { PageTitleBar } from './events/ViewTabs'
import { MapCanvas, type MapCanvasHandle } from './map/MapCanvas'
import { markerLabel } from './map/mapFormat'
import { useVenueCoords } from './map/useVenueCoords'

const MAP_SIZE = 30
type Geo = 'idle' | 'loading' | 'granted' | 'denied'

function Thumb({ e }: { e: EventCard }) {
  return e.image_url ? (
    <img src={e.image_url} alt="" loading="lazy" className="size-16 shrink-0 rounded-[10px] bg-surface-muted object-cover" />
  ) : (
    <span className="flex size-16 shrink-0 items-center justify-center rounded-[10px] bg-[#f3f0ee] text-ink-disabled">
      <PhotoIcon size={22} />
    </span>
  )
}

export default function MapPage() {
  const toast = useToast()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const requireLogin = useRequireLogin()
  const { params, patch } = useEventFilters()
  const needsLogin = hasLoginFilters(params) && !isLoggedIn

  // SDK
  const [kakao, setKakao] = useState<any>(null)
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [sdkTry, setSdkTry] = useState(0)
  useEffect(() => {
    let alive = true
    setSdkError(null)
    loadKakaoMaps().then(
      (k) => alive && setKakao(k),
      (err: Error) => alive && setSdkError(err.message),
    )
    return () => {
      alive = false
    }
  }, [sdkTry])

  // 행사 + 좌표
  const query = useEvents(
    { ...params, sort: params.sort ?? 'dateAsc', page: 1, size: MAP_SIZE },
    { enabled: !needsLogin && !authLoading },
  )
  const filterKey = JSON.stringify(params)
  useEffect(() => {
    if (needsLogin && !authLoading) requireLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLogin, authLoading, filterKey])

  const events = useMemo(() => query.data?.events ?? [], [query.data])
  const { located, settled, unlocatedCount } = useVenueCoords(kakao, events)
  const points = useMemo(
    () => located.map(({ event, coord }) => ({ id: event.id, lat: coord.lat, lng: coord.lng, label: markerLabel(event) })),
    [located],
  )

  // 선택 / 지도 영역 안 목록
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [visibleIds, setVisibleIds] = useState<number[] | null>(null)
  const mapRef = useRef<MapCanvasHandle>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const visibleList = useMemo(
    () => (visibleIds ? located.filter((l) => visibleIds.includes(l.event.id)) : located),
    [located, visibleIds],
  )
  const select = useCallback(
    (id: number, pan: boolean) => {
      setSelectedId(id)
      const l = located.find((x) => x.event.id === id)
      if (pan && l) mapRef.current?.panTo(l.coord.lat, l.coord.lng)
      requestAnimationFrame(() => listRef.current?.querySelector(`[data-event-id="${id}"]`)?.scrollIntoView?.({ block: 'nearest' }))
    },
    [located],
  )

  // 내 위치 (B5: 권한 꺼짐)
  const [geo, setGeo] = useState<Geo>('idle')
  const [dismissed, setDismissed] = useState(false)
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo('denied')
      return
    }
    setGeo('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo('granted')
        mapRef.current?.setMyLocation(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        if (err.code === 1) {
          setGeo('denied')
          setDismissed(false)
        } else {
          setGeo('idle')
          toast.show({ message: '현재 위치를 가져오지 못했어요' })
        }
      },
      { timeout: 10000 },
    )
  }, [toast])
  const mapReady = !!kakao
  useEffect(() => {
    if (mapReady) requestLocation()
    // 지도가 준비되면 한 번만 위치를 요청한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

  const fitKey = `${filterKey}|${settled ? located.length : 'loading'}`
  // SDK 없이도(키 없음/로드 실패) 행사 목록은 보여준다. 지도 영역 필터는 지도가 있을 때만 적용.
  const listEvents = useMemo(() => (kakao ? visibleList.map((l) => l.event) : events), [kakao, visibleList, events])
  const countText = kakao ? (visibleIds ? visibleList.length : located.length) : events.length

  const showDenied = geo === 'denied' && !dismissed

  return (
    <div className="mx-auto max-w-content px-6 pb-12">
      <PageTitleBar active="map" />
      <div className="pt-[18px]">
        <FilterPanel params={params} onPatch={patch} />
      </div>
      <div className="flex items-center justify-between pb-4 pt-[22px]">
        <p className="text-[14px] leading-[21px] text-ink" aria-live="polite">
          지도 영역 안 <b className="font-bold text-brand">{countText}</b>개 행사
          {kakao && settled && unlocatedCount > 0 && (
            <span className="pl-2 text-[12px] text-ink-subtle">위치를 찾지 못한 행사 {unlocatedCount}개는 지도에 표시되지 않아요</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr] lg:h-[600px]">
        <aside className="h-[360px] overflow-y-auto rounded-lg border border-line p-2 lg:h-auto" aria-label="행사 목록">
          {needsLogin ? (
            <StatePanel
              role="status"
              icon={<SearchBigIcon />}
              title="로그인이 필요해요"
              message="필터는 로그인 후 이용할 수 있어요"
              action={
                <button type="button" className={primaryBtn} onClick={() => requireLogin()}>
                  로그인하기
                </button>
              }
            />
          ) : query.isError ? (
            <StatePanel
              role="alert"
              icon={<WifiOffIcon />}
              title="행사를 불러오지 못했어요"
              message="인터넷 연결을 확인하고 다시 시도해 주세요"
              action={
                <button type="button" className={primaryBtn} onClick={() => void query.refetch()}>
                  다시 시도
                </button>
              }
            />
          ) : query.isPending || (kakao && !sdkError && !settled && located.length === 0 && events.length > 0) ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : events.length === 0 ? (
            <StatePanel icon={<SearchBigIcon />} title="조건에 맞는 행사가 없어요" message="필터를 바꿔 보세요" />
          ) : listEvents.length === 0 ? (
            <StatePanel icon={<PinBigIcon />} title="이 지도 영역엔 행사가 없어요" message="지도를 움직이거나 확대/축소해 보세요" />
          ) : (
            <ul ref={listRef} className="flex flex-col">
              {listEvents.map((e) => {
                const on = e.id === selectedId
                const price = e.is_free ? '무료' : formatPrice(e.price)
                return (
                  <li key={e.id} data-event-id={e.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => select(e.id, true)}
                      className={`flex w-full items-center gap-3 rounded-card p-[10px] text-left ${on ? 'bg-primary-tint' : ''}`}
                    >
                      <Thumb e={e} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-bold leading-[16.5px] text-primary-ink">{e.category}</span>
                        <span className="block truncate text-[14px] font-bold leading-[18.2px] text-ink">{e.title}</span>
                        <span className="block truncate text-[12px] leading-[18px] text-ink-muted">
                          {[e.venue_name, price].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                    {on && (
                      <Link to={`/events/${e.id}`} className="block px-[10px] pb-2 text-right text-[12px] font-bold text-primary-ink">
                        상세 보기 ›
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="relative h-[420px] overflow-hidden rounded-lg bg-[#eef0ea] lg:h-auto">
          {sdkError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <StatePanel
                role="alert"
                icon={<WifiOffIcon />}
                title="지도를 불러오지 못했어요"
                message={sdkError}
                action={
                  <button type="button" className={primaryBtn} onClick={() => setSdkTry((n) => n + 1)}>
                    다시 시도
                  </button>
                }
              />
            </div>
          ) : !kakao ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner label="지도를 불러오는 중" />
            </div>
          ) : (
            <>
              <MapCanvas
                ref={mapRef}
                kakao={kakao}
                points={points}
                selectedId={selectedId}
                onSelect={(id) => select(id, false)}
                onVisibleChange={setVisibleIds}
                fitKey={fitKey}
              />
              <div className="absolute bottom-[26px] right-[14px] z-10 flex flex-col gap-[6px]">
                {[
                  { label: '내 위치', Icon: LocateIcon, onClick: requestLocation },
                  { label: '확대', Icon: PlusIcon, onClick: () => mapRef.current?.zoomIn() },
                  { label: '축소', Icon: MinusIcon, onClick: () => mapRef.current?.zoomOut() },
                ].map(({ label, Icon, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    onClick={onClick}
                    className="flex size-10 items-center justify-center rounded-[10px] bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,0.14)]"
                  >
                    <Icon />
                  </button>
                ))}
              </div>
              {showDenied && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/15 p-4">
                  <div role="alertdialog" aria-label="위치 권한이 꺼져 있어요" className="w-full max-w-[256px] rounded-lg bg-surface px-[18px] pb-[18px] pt-5 text-center shadow-float sm:max-w-[320px]">
                    <span className="mx-auto flex size-[44px] items-center justify-center rounded-[14px] bg-primary-tint text-primary-ink">
                      <PinBigIcon size={20} />
                    </span>
                    <h2 className="pt-[14px] text-[15px] font-black leading-[22px] text-ink">위치 권한이 꺼져 있어요</h2>
                    <p className="pt-1 text-[12px] leading-[18px] text-ink-muted">브라우저 설정에서 위치를 허용하면 내 주변 행사를 보여드려요</p>
                    <div className="flex gap-2 pt-4">
                      <button
                        type="button"
                        className={`${outlineBtn} h-10 flex-1 justify-center px-2 text-[13px]`}
                        onClick={() => {
                          setDismissed(true)
                          mapRef.current?.fit()
                        }}
                      >
                        지역으로 보기
                      </button>
                      <button type="button" className={`${primaryBtn} h-10 flex-1 justify-center px-2 text-[13px]`} onClick={requestLocation}>
                        다시 확인
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
