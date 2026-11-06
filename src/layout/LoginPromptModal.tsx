import { useCallback, type ReactNode } from 'react'
import { Modal } from '../components'
import { formatDateRange } from '../components'
import { CalendarIcon, HeartIcon, KakaoIcon } from '../components/icons'
import { buildKakaoAuthorizeUrl, clearPendingBookmark, consumeReturnTo } from '../auth'
import { setLoginPromptEvent, useLoginPromptEvent } from './loginPromptStore'

interface Props {
  open: boolean
  onClose: () => void
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5.5H19C19.828 5.5 20.5 6.172 20.5 7V15C20.5 15.828 19.828 16.5 19 16.5H10L6 20V16.5H5C4.172 16.5 3.5 15.828 3.5 15V7C3.5 6.172 4.172 5.5 5 5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Benefit({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-primary-tint text-brand">
        {icon}
      </span>
      <span className="flex flex-col">
        <b className="text-[14px] font-bold leading-[21px] text-ink">{title}</b>
        <span className="text-[12px] leading-[18px] text-ink-muted">{desc}</span>
      </span>
    </li>
  )
}

export function LoginPromptModal({ open, onClose }: Props) {
  const event = useLoginPromptEvent()

  const close = useCallback(() => {
    setLoginPromptEvent(null)
    clearPendingBookmark()
    consumeReturnTo() // 로그인하지 않고 닫으면 저장해 둔 이동 경로도 버린다
    onClose()
  }, [onClose])

  const meta = event
    ? [
        formatDateRange(event.start_date, event.end_date),
        event.venue_name,
        event.is_free ? '무료' : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const hero = (
    <div className="h-[170px] rounded-t-xl" style={{ background: 'var(--gradient-night)' }}>
      {event && (
        <div className="absolute left-5 top-[73px] flex w-[400px] max-w-[calc(100%-40px)] items-center gap-3 rounded-lg bg-white/95 py-[10px] pl-[10px] pr-[14px] shadow-float">
          {event.image_url ? (
            <img src={event.image_url} alt="" className="size-[52px] shrink-0 rounded-[10px] object-cover" />
          ) : (
            <span
              className="size-[52px] shrink-0 rounded-[10px]"
              style={{ background: 'var(--gradient-night)' }}
              aria-hidden
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold leading-[16.5px] text-primary-ink">방금 고른 행사</span>
            <b className="block truncate text-[15px] font-bold leading-[22.5px] text-ink">{event.title}</b>
            <span className="block truncate text-[12px] leading-[18px] text-ink-muted">{meta}</span>
          </span>
          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary-tint text-brand">
            <HeartIcon filled size={20} />
          </span>
        </div>
      )}
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={close}
      ariaLabel="로그인 안내"
      hero={hero}
      title={
        event ? (
          <>
            로그인하면 이 행사를
            <br />
            바로 찜해 둘게요
          </>
        ) : (
          <>
            로그인하면 관심 행사를
            <br />
            바로 찜해 둘게요
          </>
        )
      }
    >
      <ul className="flex flex-col gap-3 pb-5 pt-[18px]">
        <Benefit icon={<CalendarIcon size={18} />} title="찜한 행사는 캘린더에 자동 정리" desc="날짜별로 한눈에 보고 일정이 겹치지 않게" />
        <Benefit icon={<HeartIcon size={18} />} title="마이페이지에 모아 보기" desc="다가오는 순으로 정렬돼요" />
        <Benefit icon={<ChatIcon />} title="다녀온 행사에 리뷰 남기기" desc="별점과 후기로 다른 사람에게 도움을" />
      </ul>
      <button
        type="button"
        onClick={() => window.location.assign(buildKakaoAuthorizeUrl())}
        className="flex h-[54px] w-full items-center justify-center gap-[7px] rounded-card bg-kakao px-4 text-[16px] font-bold leading-6 text-kakao-ink"
      >
        <KakaoIcon />
        카카오로 3초 만에 시작하기
      </button>
      <div className="pt-3 text-center">
        <button type="button" onClick={close} className="text-[13px] leading-[19.5px] text-ink-muted underline">
          다음에 할게요
        </button>
      </div>
      <p className="pt-[10px] text-center text-[11px] leading-[16.5px] text-ink-subtle">
        로그인하면 이용약관 및 개인정보처리방침에 동의한 것으로 봐요.
      </p>
    </Modal>
  )
}
