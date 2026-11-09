import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDirections, useEvent } from '../api/hooks'
import { ApiError } from '../api/client'
import { errorMessage } from '../api/errors'
import type { DirectionsMode, DirectionsResult, DirectionsStep } from '../api/types'
import { useAuth } from '../auth'
import { EmptyState, ErrorState, Spinner } from '../components'
import { BusIcon, CarIcon, ChevronLeftIcon, RouteIcon, WalkIcon, WarnIcon } from './detail/icons'
import { OriginPicker } from './directions/OriginPicker'
import type { Origin } from './directions/OriginPicker'
import { RouteMap } from './directions/RouteMap'
import { getCurrentPosition } from './directions/geocode'
import { STEP_LABEL, compactSteps, detailText, formatDistance, formatDuration, formatKstTime } from './directions/format'

const MODES: Array<{ key: DirectionsMode; label: string; Icon: typeof BusIcon }> = [
  { key: 'transit', label: '대중교통', Icon: BusIcon },
  { key: 'car', label: '자동차', Icon: CarIcon },
  { key: 'walk', label: '도보', Icon: WalkIcon },
]

const stepColor = (t: string) =>
  t === 'BUS' ? 'bg-[#2e7d32] text-white' : t === 'SUBWAY' ? 'bg-[#1f5dd8] text-white' : t === 'DRIVE' ? 'bg-ink text-white' : 'border-2 border-ink bg-surface text-ink'

function StepIcon({ type }: { type: string }) {
  if (type === 'BUS' || type === 'SUBWAY') return <BusIcon size={14} />
  if (type === 'DRIVE') return <CarIcon size={14} />
  if (type === 'WALK') return <WalkIcon size={14} />
  return <RouteIcon size={14} />
}

function stepMeta(s: DirectionsStep) {
  const parts = [
    s.durationMinutes != null ? formatDuration(s.durationMinutes) : null,
    s.distanceMeters != null ? formatDistance(s.distanceMeters) : null,
  ].filter(Boolean)
  return parts.join(' · ')
}

const STEP_PREVIEW = 5

function RouteSteps({ route }: { route: DirectionsResult }) {
  const arrival = formatKstTime(route.arrivalTime)
  const departure = formatKstTime(route.departureTime)
  const [expanded, setExpanded] = useState(false)
  const steps = useMemo(() => compactSteps(route.steps), [route.steps])
  const collapsible = steps.length > STEP_PREVIEW
  const visible = collapsible && !expanded ? steps.slice(0, STEP_PREVIEW) : steps
  return (
    <>
      <div className="mt-3 grid grid-cols-3 rounded-lg bg-surface-card p-4" data-testid="route-summary">
        <div>
          <p className="text-[20px] font-black leading-[30px] text-ink">{formatDuration(route.durationMinutes)}</p>
          <p className="text-[12px] leading-[18px] text-ink-muted">총 소요시간</p>
        </div>
        <div>
          <p className="text-[20px] font-black leading-[30px] text-ink">{formatDistance(route.distanceMeters)}</p>
          <p className="text-[12px] leading-[18px] text-ink-muted">이동 거리</p>
        </div>
        <div>
          <p className="text-[20px] font-black leading-[30px] text-ink">{arrival ?? '-'}</p>
          <p className="text-[12px] leading-[18px] text-ink-muted">{departure ? `${departure} 출발 · 도착 예정` : '도착 예정'}</p>
        </div>
      </div>
      <h3 className="pt-[18px] text-[16px] font-black leading-[24px] text-ink">경로 안내</h3>
      <ol className="mt-[6px] max-h-[360px] overflow-y-auto pr-1" data-testid="route-step-list">
        {visible.map((s, i) => {
          const detail = detailText(s.detail)
          const label = STEP_LABEL[s.type as keyof typeof STEP_LABEL] ?? STEP_LABEL.OTHER
          return (
            <li key={s.stepNumber ?? i} className="relative flex gap-3 py-3" data-testid="route-step">
              {i < visible.length - 1 && <span className="absolute left-[13px] top-[40px] h-[35px] w-[2px] bg-line" aria-hidden="true" />}
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${stepColor(s.type)}`} title={label}>
                <StepIcon type={s.type} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-[21px] text-ink">
                  <span className="pr-1 text-[12px] font-bold text-ink-subtle">{label}</span>
                  {s.instruction}
                </p>
                <p className="text-[12px] leading-[18px] text-ink-subtle">{stepMeta(s)}</p>
                {detail && <p className="text-[12px] leading-[18px] text-ink-muted">{detail}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full rounded-lg border border-line py-2 text-[13px] font-bold text-ink"
        >
          {expanded ? '접기' : `전체 ${steps.length}단계 보기`}
        </button>
      )}
    </>
  )
}

export default function Directions() {
  const id = Number(useParams().id)
  const { isLoggedIn, isLoading: authLoading, openLoginPrompt } = useAuth()
  const { data: event, isLoading, error, refetch } = useEvent(id)

  const [origin, setOrigin] = useState<Origin | null>(null)
  const [locating, setLocating] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [mode, setMode] = useState<DirectionsMode>('transit')

  useEffect(() => {
    if (!authLoading && !isLoggedIn) openLoginPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isLoggedIn])

  // 현재 위치를 출발지로 시도하고, 거부/실패하면 D2(출발지 변경)를 연다.
  useEffect(() => {
    let cancelled = false
    getCurrentPosition()
      .then((p) => !cancelled && setOrigin({ ...p, label: '현재 위치' }))
      .catch(() => {
        if (cancelled) return
        setNotice('현재 위치를 사용할 수 없어요. 출발지를 직접 검색해 주세요.')
        setPickerOpen(true)
      })
      .finally(() => !cancelled && setLocating(false))
    return () => {
      cancelled = true
    }
  }, [])

  const lat = event?.latitude ?? null
  const lng = event?.longitude ?? null
  const query = useMemo(
    () => (origin && lat != null && lng != null && Number.isFinite(id) ? { eventId: id, originLat: origin.lat, originLng: origin.lng, mode } : null),
    [origin, lat, lng, id, mode],
  )
  const dir = useDirections(query)
  const route = dir.data
  const dirError = dir.error
  const routeNotFound = dirError instanceof ApiError && dirError.code === 'ROUTE_NOT_FOUND'
  const dirEventMissing = dirError instanceof ApiError && dirError.code === 'EVENT_NOT_FOUND'

  if (!Number.isFinite(id)) return <ErrorState code="404" title="행사를 찾을 수 없어요" />
  if (authLoading) return <div className="flex justify-center py-32"><Spinner /></div>
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-content px-6 py-10">
        <EmptyState
          title="로그인하면 길찾기를 이용할 수 있어요"
          action={<button type="button" onClick={openLoginPrompt} className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white">로그인하기</button>}
        />
      </div>
    )
  }
  if (dirEventMissing) return <ErrorState code="404" title="행사를 찾을 수 없어요" message="삭제되었거나 잘못된 주소예요" />
  if (error) {
    if (error instanceof ApiError && error.code === 'EVENT_NOT_FOUND') {
      return <ErrorState code="404" title="행사를 찾을 수 없어요" message="삭제되었거나 잘못된 주소예요" />
    }
    return <ErrorState onRetry={() => void refetch()} message={errorMessage(error)} />
  }
  if (isLoading || !event) return <div className="flex justify-center py-32"><Spinner /></div>

  const destLabel = event.venue_name ?? event.title
  const place = [event.venue_name, event.sido && `(${event.sido})`].filter(Boolean).join(' ')
  const noCoords = lat == null || lng == null
  const showNoRoute = !noCoords && !!origin && routeNotFound
  const showRoute = !!route && dir.isSuccess

  return (
    <div className="mx-auto max-w-content px-6 pb-10">
      <div className="flex h-[57.5px] items-end pb-[14px]">
        <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-[13px] text-ink-muted">
          <ChevronLeftIcon /> 행사 상세로 돌아가기
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">
        <div>
          <h1 className="text-[24px] font-black leading-[36px] tracking-[-0.48px] text-ink">{event.title} 가는 길</h1>
          <p className="pt-1 text-[14px] leading-[21px] text-ink-muted">{place}</p>

          <div className="mt-4 rounded-lg border border-line px-4 py-[6px]">
            <div className="flex items-center gap-3 py-3">
              <span className="size-3 rounded-full bg-[#2563eb]" />
              <span className="w-7 text-[12px] text-ink-subtle">출발</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">
                {origin?.label ?? (locating ? '현재 위치 확인 중…' : '출발지를 선택해 주세요')}
              </span>
              <button type="button" onClick={() => setPickerOpen((v) => !v)} className="text-[12px] font-bold text-primary-ink">
                출발지 변경
              </button>
            </div>
            <div className="flex items-center gap-3 border-t border-line py-3">
              <span className="size-3 rounded-full bg-brand" />
              <span className="w-7 text-[12px] text-ink-subtle">도착</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{destLabel}</span>
            </div>
            {pickerOpen && (
              <div className="pb-3">
                <OriginPicker
                  notice={notice}
                  onSelect={(o) => {
                    setOrigin(o)
                    setPickerOpen(false)
                    setNotice(null)
                  }}
                  onCancel={() => setPickerOpen(false)}
                />
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-[6px]" role="tablist" aria-label="이동 수단">
            {MODES.map(({ key, label, Icon }) => {
              const selected = mode === key
              // 선택한 수단만 조회하므로 소요시간은 선택된 탭에만 표시한다.
              const sub = selected ? (route ? formatDuration(route.durationMinutes) : routeNotFound ? '경로 없음' : '-') : '-'
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setMode(key)}
                  className={`flex flex-col items-center gap-[2px] rounded-card py-[6px] ${selected ? 'border-2 border-brand bg-primary-tint' : 'border border-line'}`}
                >
                  <Icon size={18} />
                  <span className="text-[13px] font-bold leading-[19.5px] text-ink">{label}</span>
                  <span className="text-[12px] leading-[18px] text-ink-muted">{sub}</span>
                </button>
              )
            })}
          </div>

          {noCoords ? (
            <div className="mt-3"><EmptyState icon={<WarnIcon size={28} />} title="행사 위치 정보가 없어요" description="길찾기를 사용할 수 없는 행사예요" /></div>
          ) : !origin ? (
            <p className="pt-4 text-[13px] text-ink-muted">출발지를 선택하면 경로를 안내해 드려요.</p>
          ) : dir.isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : dir.isError && !routeNotFound ? (
            <div className="mt-3" data-testid="directions-error"><ErrorState onRetry={() => void dir.refetch()} message={errorMessage(dirError)} /></div>
          ) : showNoRoute ? (
            <div className="mt-3 flex flex-col items-center rounded-lg border border-line px-6 py-8 text-center" data-testid="no-route">
              <span className="flex size-10 items-center justify-center rounded-card bg-primary-tint text-primary"><WarnIcon size={22} /></span>
              <p className="pt-4 text-[15px] font-bold leading-[22px] text-ink">이 방법으로는 경로를 찾지 못했어요</p>
              <p className="pt-1 text-[12px] leading-[18px] text-ink-muted">다른 이동 수단을 고르거나 출발지를 바꿔 보세요</p>
              <div className="flex w-full gap-2 pt-4">
                <button type="button" onClick={() => setPickerOpen(true)} className="h-11 flex-1 rounded-card border border-line text-[14px] font-bold text-ink">출발지 변경</button>
                <button type="button" onClick={() => setMode('transit')} className="h-11 flex-1 rounded-card bg-primary text-[14px] font-bold text-white">대중교통으로 보기</button>
              </div>
            </div>
          ) : showRoute ? (
            <RouteSteps key={route.mode} route={route} />
          ) : null}
        </div>

        <RouteMap
          from={origin}
          to={{ lat: lat ?? 36.8151, lng: lng ?? 127.1139, label: destLabel }}
                  />
      </div>
    </div>
  )
}
