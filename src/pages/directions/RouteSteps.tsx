import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { DirectionsResult, DirectionsStep } from '../../api/types'
import { BusIcon, WalkIcon } from '../detail/icons'
import { turnOf } from './direction'
import type { Turn } from './direction'
import { compactSteps, detailText, formatDistance, formatDuration, formatKstClock } from './format'
import { parseTransitStep } from './transit'

const BUS = '#2e7d32'
const SUBWAY = '#1f5dd8'
const STEP_PREVIEW = 5
const ROW = 'flex gap-[10px] border-t border-[#f0ebe7] py-3 pl-[10px] pr-4'

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function TurnIcon({ turn, size = 22 }: { turn: Turn; size?: number }) {
  return (
    <Svg size={size}>
      {turn === 'straight' && <path d="M12 19V5M6 11l6-6 6 6" />}
      {turn === 'right' && <path d="M6 20v-8a4 4 0 0 1 4-4h9M15 4l4 4-4 4" />}
      {turn === 'left' && <path d="M18 20v-8a4 4 0 0 0-4-4H5M9 4 5 8l4 4" />}
      {turn === 'uturn' && <path d="M6 20V8a4 4 0 0 1 8 0v10M10 14l4 4 4-4" />}
    </Svg>
  )
}

const Chevron = ({ up }: { up: boolean }) => <Svg size={18}>{up ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}</Svg>

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex h-6 items-center rounded-full px-2 text-[11px] font-black text-white" style={{ background: color }}>
      {children}
    </span>
  )
}

function Circle({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex size-8 items-center justify-center rounded-2xl text-[12px] font-black text-white" style={{ background: color }}>
      {children}
    </span>
  )
}

const meta = (s: DirectionsStep, ...extra: Array<string | null>) =>
  [
    s.durationMinutes != null ? formatDuration(s.durationMinutes) : null,
    s.distanceMeters != null ? formatDistance(s.distanceMeters) : null,
    ...extra,
  ]
    .filter(Boolean)
    .join(' · ')

function ExpandButton({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-expanded={open} aria-label={`${label} ${open ? '접기' : '펼치기'}`} onClick={onClick} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-card">
      <Chevron up={open} />
    </button>
  )
}

/** 대중교통 단계 하나. 승차(또는 도보) 행과, 있으면 하차·환승 행으로 구성된다. */
function TransitStep({ step, clockAt, nextIsTransit }: { step: DirectionsStep; clockAt: (offsetMin: number) => string | null; nextIsTransit: boolean }) {
  const [open, setOpen] = useState(false)
  const p = useMemo(() => parseTransitStep(step), [step])
  const detail = detailText(step.detail)
  const arrive = clockAt(step.durationMinutes ?? 0)
  const arriveText = arrive ? `${arrive} 도착 예정` : null

  if (p.kind === 'bus' || p.kind === 'subway') {
    const bus = p.kind === 'bus'
    const color = bus ? BUS : SUBWAY
    const lead = bus ? p.lines : p.lineNo.replace('호선', '')
    const badgeText = bus ? `버스 ${p.lines}` : p.lineNo
    const title = bus ? (p.board ? `${p.board} 승차` : '버스 승차') : `${p.line} 승차`
    const sub = bus ? (p.alight ? `${p.alight}까지` : null) : p.direction ? `${p.direction} 방면` : null
    const stops = bus && p.passStops != null ? `${p.passStops}개 정류장 이동` : null
    const alight = p.alight ? (bus ? p.alight : `${p.alight}역`) : null
    return (
      <>
        <li className={ROW} data-testid="route-step">
          <span className="flex w-11 shrink-0 justify-center"><Circle color={color}><span className={lead.length > 3 ? 'text-[10px]' : ''}>{lead}</span></Circle></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-[21.75px] text-ink">{title}</p>
            <p className="flex items-center gap-2 pt-[2px]">
              <span className="flex h-5 items-center rounded-[5px] px-[7px] text-[11px] font-bold text-white" style={{ background: color }}>{badgeText}</span>
              {sub && <span className="text-[13px] text-ink">{sub}</span>}
            </p>
            <p className="pt-[2px] text-[12.5px] text-ink-subtle">{meta(step, stops, arriveText)}</p>
            {open && detail && <p className="pt-1 text-[12.5px] text-ink-muted" data-testid="step-detail">{detail}</p>}
          </div>
          {detail ? <ExpandButton open={open} label={bus ? '지나는 정류장' : '출구 안내'} onClick={() => setOpen((v) => !v)} /> : <span className="size-8 shrink-0" />}
        </li>
        {alight && (
          <li className={ROW} data-testid="route-step-exit">
            <span className="flex w-11 shrink-0 items-center justify-center"><Badge color={color}>{nextIsTransit ? '환승' : '하차'}</Badge></span>
            <p className="flex-1 text-[15px] font-bold leading-[21.75px] text-ink">{alight} {nextIsTransit ? '환승' : '하차'}</p>
            <span className="size-8 shrink-0" />
          </li>
        )}
      </>
    )
  }

  if (p.kind === 'walk') {
    const expandable = p.guides.length > 1
    const title = p.guides.length === 1 ? p.guides[0] : '도보 이동'
    return (
      <>
        <li className={ROW} data-testid="route-step">
          <span className="flex w-11 shrink-0 justify-center"><span className="flex size-8 items-center justify-center rounded-2xl bg-[#8a8380] text-white"><WalkIcon size={16} /></span></span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-[21.75px] text-ink">{title}</p>
            <p className="pt-[2px] text-[12.5px] text-ink-subtle">{meta(step)}</p>
            {detail && <p className="text-[12.5px] text-ink-muted">{detail}</p>}
          </div>
          {expandable ? <ExpandButton open={open} label="도보 상세" onClick={() => setOpen((v) => !v)} /> : <span className="size-8 shrink-0" />}
        </li>
        {expandable && open && (
          <ol className="bg-[#fcfbfa]" data-testid="walk-guides">
            {p.guides.map((g, i) => (
              <li key={i} className="flex items-center gap-[10px] border-t border-[#f5f1ee] py-[10px] pl-[10px] pr-4">
                <span className="flex w-11 shrink-0 justify-center text-ink"><TurnIcon turn={turnOf(g)} size={20} /></span>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] border border-[#cfc7c2] text-[11px] text-ink-muted">{i + 1}</span>
                <span className="text-[13.5px] text-ink">{g}</span>
              </li>
            ))}
          </ol>
        )}
      </>
    )
  }

  // 파싱 실패: 원문 그대로.
  return (
    <li className={ROW} data-testid="route-step">
      <span className="flex w-11 shrink-0 justify-center"><span className="flex size-8 items-center justify-center rounded-2xl bg-[#8a8380] text-white"><BusIcon size={16} /></span></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-[21.75px] text-ink">{step.instruction}</p>
        <p className="pt-[2px] text-[12.5px] text-ink-subtle">{meta(step)}</p>
        {detail && <p className="text-[12.5px] text-ink-muted">{detail}</p>}
      </div>
    </li>
  )
}

function Terminal({ label, color, children, sub }: { label: string; color: string; children: ReactNode; sub?: string | null }) {
  return (
    <li className={ROW} data-testid={label === '출발' ? 'route-start' : 'route-end'}>
      <span className="flex w-11 shrink-0 justify-center"><Badge color={color}>{label}</Badge></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold leading-[24px] text-ink">{children}</p>
        {sub && <p className="text-[12px] text-ink-subtle">{sub}</p>}
      </div>
    </li>
  )
}

export function RouteSteps({ route, originLabel, destLabel }: { route: DirectionsResult; originLabel: string; destLabel: string }) {
  const [expanded, setExpanded] = useState(false)
  const steps = useMemo(() => compactSteps(route.steps ?? []), [route.steps])
  const transit = route.mode === 'transit'

  const departure = formatKstClock(route.departureTime)
  const arrival = formatKstClock(route.arrivalTime) ?? formatKstClock(route.departureTime, route.durationMinutes)
  const clockAt = (offset: number) => formatKstClock(route.departureTime, offset)

  // 대중교통: 도보 시간 합계 / 환승 횟수. 자동차·도보: 단계 수.
  const walkMin = steps.filter((s) => s.type === 'WALK').reduce((a, s) => a + (s.durationMinutes ?? 0), 0)
  const rides = steps.filter((s) => s.type === 'BUS' || s.type === 'SUBWAY').length
  const summaryMeta = (transit
    ? [walkMin > 0 ? `도보 ${formatDuration(walkMin)}` : null, rides > 1 ? `환승 ${rides - 1}회` : null, formatDistance(route.distanceMeters) || null]
    : [formatDistance(route.distanceMeters) || null, steps.length ? `${steps.length}단계` : null]
  ).filter(Boolean).join(' · ')

  const collapsible = !transit && steps.length >= 6
  const visible = collapsible && !expanded ? steps.slice(0, STEP_PREVIEW) : steps

  // 각 단계가 끝나는 시각을 누적 소요시간으로 추정한다.
  const offsets = steps.reduce<number[]>((acc, s) => [...acc, (acc[acc.length - 1] ?? 0) + (s.durationMinutes ?? 0)], [])
  const isRide = (s?: DirectionsStep) => !!s && (s.type === 'BUS' || s.type === 'SUBWAY')

  return (
    <div className="mt-[14px] overflow-hidden rounded-[18px] border border-line" data-testid="route-card">
      <div className="flex flex-col gap-[5px] bg-surface-card p-4" data-testid="route-summary">
        <p className="flex items-baseline gap-3">
          <span className="text-[26px] font-black leading-[31px] tracking-[-0.52px] text-ink">{formatDuration(route.durationMinutes)}</span>
          <span className="text-[13px] text-ink-muted">{summaryMeta}</span>
        </p>
        {(departure || arrival) && (
          <p className="text-[13px] text-ink">
            {departure && <>{departure} 출발{arrival && ' → '}</>}
            {arrival && <b>{arrival} 도착 예정</b>}
          </p>
        )}
      </div>
      <ol data-testid="route-step-list">
        <Terminal label="출발" color="#2a2320">{originLabel}</Terminal>
        {transit
          ? visible.map((s, i) => <TransitStep key={s.stepNumber ?? i} step={s} clockAt={(o) => clockAt((offsets[i] ?? 0) - (s.durationMinutes ?? 0) + o)} nextIsTransit={isRide(steps[i + 1])} />)
          : visible.map((s, i) => (
              <li key={s.stepNumber ?? i} className={`${ROW} items-center`} data-testid="route-step">
                <span className="flex w-11 shrink-0 justify-center text-ink"><TurnIcon turn={turnOf(s.instruction)} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-[21px] text-ink">{s.instruction}</p>
                  {s.distanceMeters != null && <p className="text-[12px] text-ink-subtle">{formatDistance(s.distanceMeters)}</p>}
                  {detailText(s.detail) && <p className="text-[12px] text-ink-muted">{detailText(s.detail)}</p>}
                </div>
              </li>
            ))}
        {(!collapsible || expanded) && <Terminal label="도착" color="#f0562c" sub={arrival ? `${arrival} 도착 예정` : null}>{destLabel}</Terminal>}
      </ol>
      {collapsible && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="flex h-[47px] w-full items-center justify-center gap-[6px] border-t border-[#f0ebe7] text-[13px] font-bold text-ink">
          {expanded ? '접기' : `전체 ${steps.length}단계 보기`}
          <Chevron up={expanded} />
        </button>
      )}
    </div>
  )
}
