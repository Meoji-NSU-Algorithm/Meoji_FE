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
import { STEP_LABEL, compactSteps, detailText, formatDistance, formatDuration, formatKstTime, toAmPm, turnOf } from './directions/format'

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

const TURN_PATH = {
  straight: 'M12 20V5M6 11l6-6 6 6',
  right: 'M7 20v-7a4 4 0 0 1 4-4h8M15 5l4 4-4 4',
  left: 'M17 20v-7a4 4 0 0 0-4-4H5M9 5 5 9l4 4',
  uturn: 'M8 20V9a4 4 0 0 1 8 0v4M12 10l4 4 4-4',
}

/** A3: 자동차·도보 단계의 방향 화살표 */
function TurnIcon({ step }: { step: DirectionsStep }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TURN_PATH[turnOf(step)]} />
    </svg>
  )
}

const Pill = ({ children, className }: { children: string; className: string }) => (
  <span className={`shrink-0 rounded-full px-[9px] py-[3px] text-[11px] font-bold leading-[16px] text-white ${className}`}>{children}</span>
)

function RouteSteps({ route, originLabel, destLabel }: { route: DirectionsResult; originLabel: string; destLabel: string }) {
  const arrival = formatKstTime(route.arrivalTime)
  const departure = formatKstTime(route.departureTime)
  const [expanded, setExpanded] = useState(false)
  const steps = useMemo(() => compactSteps(route.steps), [route.steps])
  const collapsible = steps.length > STEP_PREVIEW
  const visible = collapsible && !expanded ? steps.slice(0, STEP_PREVIEW) : steps
  const transit = route.mode === 'transit'
  // A2 요약: 대중교통은 도보 시간·환승 횟수, 자동차·도보는 단계 수를 거리와 함께 보여준다.
  const rides = steps.filter((s) => s.type === 'BUS' || s.type === 'SUBWAY').length
  const walkMin = steps.filter((s) => s.type === 'WALK').reduce((a, s) => a + (s.durationMinutes ?? 0), 0)
  const sub = transit
    ? [walkMin ? `도보 ${formatDuration(walkMin)}` : null, rides > 1 ? `환승 ${rides - 1}회` : null, formatDistance(route.distanceMeters)]
    : [formatDistance(route.distanceMeters), `${steps.length}단계`]
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line">
      <div className="bg-surface-card px-4 py-4" data-testid="route-summary">
        <p className="flex items-baseline gap-2">
          <span className="text-[28px] font-black leading-[36px] text-ink">{formatDuration(route.durationMinutes)}</span>
          <span className="text-[13px] text-ink-muted">{sub.filter(Boolean).join(' · ')}</span>
        </p>
        {arrival && (
          <p className="pt-1 text-[13px] text-ink">
            {departure && `${toAmPm(departure)} 출발 → `}
            <b>{toAmPm(arrival)} 도착 예정</b>
          </p>
        )}
      </div>
      <h3 className="sr-only">경로 안내</h3>
      <ol data-testid="route-step-list">
        <li className="flex items-center gap-3 border-t border-line px-4 py-3">
          <Pill className="bg-ink">출발</Pill>
          <span className="truncate text-[14px] font-bold text-ink">{originLabel}</span>
        </li>
        {visible.map((s, i) => {
          const detail = detailText(s.detail)
          const label = STEP_LABEL[s.type as keyof typeof STEP_LABEL] ?? STEP_LABEL.OTHER
          return (
            <li key={s.stepNumber ?? i} className="flex items-center gap-3 border-t border-line px-4 py-3" data-testid="route-step">
              {transit ? (
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${stepColor(s.type)}`} title={label}>
                  <StepIcon type={s.type} />
                </span>
              ) : (
                <span className="flex w-7 shrink-0 justify-center text-ink" title={label}><TurnIcon step={s} /></span>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-[21px] text-ink">{s.instruction}</p>
                <p className="text-[12px] leading-[18px] text-ink-subtle">{stepMeta(s)}</p>
                {detail && <p className="text-[12px] leading-[18px] text-ink-muted">{detail}</p>}
              </div>
            </li>
          )
        })}
        {visible.length === steps.length && (
          <li className="flex items-center gap-3 border-t border-line px-4 py-3">
            <Pill className="bg-brand">도착</Pill>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-bold text-ink">{destLabel}</span>
              {arrival && <span className="block text-[12px] text-ink-subtle">{toAmPm(arrival)} 도착 예정</span>}
            </span>
          </li>
        )}
      </ol>
      {collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="w-full border-t border-line py-3 text-[13px] font-bold text-ink"
        >
          {expanded ? '접기' : `전체 ${steps.length}단계 보기`}
        </button>
      )}
    </div>
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
              // A2: 탭에는 시간을 표시하지 않고, 누른 수단만 조회해 아래에 보여준다.
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setMode(key)}
                  className={`flex h-[54px] items-center justify-center gap-[6px] rounded-card ${selected ? 'border-2 border-brand bg-primary-tint text-primary-ink' : 'border border-line text-ink'}`}
                >
                  <Icon size={16} />
                  <span className="text-[14px] font-bold leading-[21px]">{label}</span>
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
            // C4: 경로 없음과 같은 자리·모양, 아이콘만 새로고침으로 구분한다.
            <div className="mt-3 flex flex-col items-center rounded-lg border border-line px-6 py-8 text-center" data-testid="directions-error">
              <span className="flex size-10 items-center justify-center rounded-card bg-primary-tint text-primary">
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" /></svg>
              </span>
              <p className="pt-4 text-[15px] font-bold leading-[22px] text-ink">경로를 불러오지 못했어요</p>
              <p className="pt-1 text-[12px] leading-[18px] text-ink-muted">{errorMessage(dirError)}</p>
              <div className="flex w-full gap-2 pt-4">
                <Link to={`/events/${id}`} className="flex h-11 flex-1 items-center justify-center rounded-card border border-line text-[14px] font-bold text-ink">행사 상세로</Link>
                <button type="button" onClick={() => void dir.refetch()} className="h-11 flex-1 rounded-card bg-primary text-[14px] font-bold text-white">다시 시도</button>
              </div>
            </div>
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
            <RouteSteps key={route.mode} route={route} originLabel={origin.label} destLabel={destLabel} />
          ) : null}
        </div>

        <div>
          <RouteMap
            from={origin}
            path={route?.path}
            to={{ lat: lat ?? 36.8151, lng: lng ?? 127.1139, label: destLabel }}
                    />
          {!!route?.path?.length && (
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-dashed border-line px-4 py-3 text-[12px] text-ink-muted" data-testid="route-legend">
              <span className="rounded-full bg-primary-tint px-2 py-[2px] font-bold text-primary-ink">경로선</span>
              <span className="flex items-center gap-[6px]"><span className="h-[4px] w-8 rounded-full bg-brand" />버스·지하철·자동차 (실선)</span>
              <span className="flex items-center gap-[6px]"><span className="w-8 border-t-[4px] border-dotted border-brand" />도보 (점선)</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
