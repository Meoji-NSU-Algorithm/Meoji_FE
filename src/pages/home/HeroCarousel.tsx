import { useEffect, useState } from 'react'
import { useAuth } from '../../auth'
import { KakaoIcon } from '../../components/icons'
import { formatDateRange } from '../../components'
import type { EventCard } from '../../api/types'
import { useEventActions } from './useEventActions'
import { startKakaoLogin } from './kakaoLogin'

function HeroEvent({ event, today, onOpen }: { event: EventCard; today: string; onOpen: () => void }) {
  const daysLeft = event.end_date
    ? (new Date(event.end_date.slice(0, 10)).getTime() - new Date(today).getTime()) / 86400000
    : null
  const ending = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
  const meta = [formatDateRange(event.start_date, event.end_date), event.venue_name, event.is_free ? '무료' : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative h-[230px] overflow-hidden rounded-[20px] text-left text-white"
      style={
        event.image_url
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.42) 100%), url(${event.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.42) 100%), var(--gradient-festival)' }
      }
    >
      <span className="absolute left-[30px] top-[80.9px] text-[12px] font-bold leading-[18px] opacity-90">
        {ending ? '이번 주말' : '진행 중'}
        {event.sido ? ` · ${event.sido}` : ''}
      </span>
      <span className="absolute left-[30px] right-[30px] top-[106.9px] line-clamp-2 text-[26px] font-black leading-[33.8px] tracking-[-0.52px]">
        {event.title}
        {ending && (
          <>
            <br />
            마지막 주말이에요
          </>
        )}
      </span>
      <span className="absolute bottom-[28px] left-[30px] right-[30px] truncate text-[13px] leading-[19.5px] opacity-90">{meta}</span>
    </button>
  )
}

function SignupBanner() {
  return (
    <div className="relative flex h-[230px] flex-col justify-end overflow-hidden rounded-[20px] bg-primary-tint px-[30px] py-[28px]">
      <span aria-hidden className="absolute right-[18px] top-[22px] font-display text-[76px] font-black leading-[76px] tracking-[-3.8px] text-brand/[0.13]">
        meoji
      </span>
      <span className="absolute left-[30px] top-[54px] text-[12px] font-bold leading-[18px] text-primary-ink">카카오로 3초 만에 시작</span>
      <h2 className="text-[26px] font-black leading-[33.8px] tracking-[-0.52px] text-ink">
        보고 싶은 행사,
        <br />
        찜해 두면 캘린더에 쏙
      </h2>
      <div className="pt-4">
        <button
          type="button"
          onClick={startKakaoLogin}
          className="inline-flex h-[38px] items-center gap-[7px] rounded-pill bg-kakao px-4 text-[13px] font-bold leading-[19.5px] text-kakao-ink"
        >
          <KakaoIcon />
          카카오로 시작하기
        </button>
      </div>
    </div>
  )
}

/** 히어로 배너 (1/3 페이저). 로그인 전엔 오른쪽이 가입 유도 배너, 로그인 후엔 다음 행사. */
export function HeroCarousel({ events, today }: { events: EventCard[]; today: string }) {
  const { isLoggedIn } = useAuth()
  const { openEvent } = useEventActions()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const slides = events.slice(0, 3)
  const count = slides.length

  // 5초마다 다음 배너로 넘긴다. 마우스를 올리거나 키보드 포커스가 있으면 멈춘다.
  useEffect(() => {
    if (count < 2 || paused) return
    const t = window.setInterval(() => setIndex((n) => (n + 1) % count), 5000)
    return () => window.clearInterval(t)
  }, [count, paused])
  if (slides.length === 0) return isLoggedIn ? null : (
    <div className="grid grid-cols-2 gap-4 pt-[18px]">
      <SignupBanner />
    </div>
  )
  const i = Math.min(index, slides.length - 1)
  const left = slides[i]
  const right = isLoggedIn ? slides[(i + 1) % slides.length] : null
  const go = (delta: number) => setIndex((i + delta + count) % count)
  const arrow =
    'absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[20px] font-bold text-ink shadow-float hover:bg-white'
  return (
    <div
      className="pt-[18px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative grid grid-cols-2 gap-4">
        {count > 1 && (
          <>
            <button type="button" aria-label="이전 배너" onClick={() => go(-1)} className={`${arrow} -left-5`}>
              ‹
            </button>
            <button type="button" aria-label="다음 배너" onClick={() => go(1)} className={`${arrow} -right-5`}>
              ›
            </button>
          </>
        )}
        <HeroEvent event={left} today={today} onOpen={() => openEvent(left)} />
        {right && right.id !== left.id ? <HeroEvent event={right} today={today} onOpen={() => openEvent(right)} /> : <SignupBanner />}
      </div>
      <div className="flex items-center justify-center gap-3 pt-[14px]">
        <div className="flex gap-[5px]">
          {slides.map((s, n) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${n + 1}번째 배너`}
              aria-current={n === i}
              onClick={() => setIndex(n)}
              className={`h-[6px] rounded-[3px] ${n === i ? 'w-[22px] bg-primary-ink' : 'w-[6px] bg-line'}`}
            />
          ))}
        </div>
        <span className="text-[12px] leading-[18px] text-ink-subtle">
          {i + 1} / {slides.length}
        </span>
      </div>
    </div>
  )
}
