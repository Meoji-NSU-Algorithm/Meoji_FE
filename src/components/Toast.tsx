import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckIcon } from './icons'
import { useIsMobile } from '../lib/useIsMobile'
import { useMobileChrome } from '../lib/mobileChrome'

export type ToastTone = 'success' | 'info' | 'error'

export interface ToastViewProps {
  message: ReactNode
  /** success: 주황 체크(기본), info: 흰 하트(찜 해제), error: 주황 느낌표(실패) */
  tone?: ToastTone
  /** 되돌리기/보러 가기 같은 액션 */
  actionLabel?: string
  onAction?: () => void
  /** mobile: Figma M13 모양(좌우 16px 꽉 찬 폭, 글자 버튼). 기본 desktop */
  variant?: 'desktop' | 'mobile'
}

/** 표현 전용 토스트 (F2). 위치는 호출 측에서 잡는다 */
function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'info')
    return (
      <span className="flex size-[22px] items-center justify-center rounded-full bg-white text-ink" data-testid="toast-icon-info">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20C12 20 4.5 15.4 4.5 10C4.5 7.8 6.2 6 8.4 6C10 6 11.3 6.7 12 7.8C12.7 6.7 14 6 15.6 6C17.8 6 19.5 7.8 19.5 10C19.5 15.4 12 20 12 20Z" />
        </svg>
      </span>
    )
  return (
    <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-white" data-testid={`toast-icon-${tone}`}>
      {tone === 'error' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M12 6v7M12 18h.01" />
        </svg>
      ) : (
        <CheckIcon />
      )}
    </span>
  )
}

/** Figma M13 746:31·746:40 아이콘: 성공 #F0562C 체크, 실패 #5F5B59 느낌표, 찜 해제는 데스크톱과 같은 흰 하트 */
function MobileToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'info') return <ToneIcon tone="info" />
  return (
    <span
      className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-white ${tone === 'error' ? 'bg-ink-muted' : 'bg-brand'}`}
      data-testid={`toast-icon-${tone}`}
    >
      {tone === 'error' ? <span className="text-[13px] font-black leading-[19px]">!</span> : <CheckIcon />}
    </span>
  )
}

export function ToastView({ message, tone = 'success', actionLabel, onAction, variant = 'desktop' }: ToastViewProps) {
  if (variant === 'mobile')
    return (
      <div
        role="status"
        className="flex min-h-[50px] w-full items-center gap-[10px] rounded-[14px] bg-ink px-[14px] py-3 text-white shadow-toast"
      >
        <MobileToneIcon tone={tone} />
        <span className="min-w-0 flex-1 text-[13.5px] leading-[19px] tracking-[-0.2px]">{message}</span>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="-my-3 h-11 shrink-0 px-1 text-[13.5px] font-bold leading-[19px] tracking-[-0.2px] text-toast-action"
          >
            {actionLabel}
          </button>
        )}
      </div>
    )
  return (
    <div
      role="status"
      className="inline-flex min-h-[52px] max-w-[calc(100vw-32px)] items-center gap-3 rounded-[14px] bg-ink py-2 pl-4 pr-[10px] text-white shadow-[0_10px_15px_rgba(0,0,0,0.25)] md:h-[52px] md:py-0 md:pl-[18px]"
    >
      <ToneIcon tone={tone} />
      <span className="text-[14px] font-medium leading-[21px] md:whitespace-nowrap">{message}</span>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="h-[34px] rounded-[9px] bg-white/12 px-3 text-[13px] font-bold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export interface ToastOptions extends Omit<ToastViewProps, 'onAction'> {
  onAction?: () => void
  /** 표시 시간(ms), 기본 4000 */
  duration?: number
}

interface ToastApi {
  show: (options: ToastOptions) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** 앱 루트에 한 번 감싼다. 화면 아래 가운데에 4초 동안 떴다 사라진다 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((options: ToastOptions) => {
    clearTimeout(timer.current)
    setToast(options)
    timer.current = setTimeout(() => setToast(null), options.duration ?? 4000)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <ToastSlot>
          {(variant) => (
            <ToastView
              variant={variant}
              message={toast.message}
              tone={toast.tone}
              actionLabel={toast.actionLabel}
              onAction={() => {
                toast.onAction?.()
                dismiss()
              }}
            />
          )}
        </ToastSlot>
      )}
    </ToastContext.Provider>
  )
}

/**
 * 토스트 위치 (Figma 00-2 결정 2번, M13).
 *  - 768px 이상: 기존 그대로 화면 아래 32px 가운데
 *  - 모바일 + 탭바     : 탭바 위 12px (바닥에서 88px)
 *  - 모바일 + 하단 고정 버튼: 버튼 바 위 12px
 *  - 모바일 + 둘 다 없음 : 바닥에서 28px (홈 표시줄 18 + 10)
 * 좌우 16px. data-position 으로 어느 규칙인지 표시한다(테스트용).
 */
function ToastSlot({ children }: { children: (variant: 'desktop' | 'mobile') => ReactNode }) {
  const isMobile = useIsMobile()
  const { tabBar, bottomBar } = useMobileChrome()
  if (!isMobile)
    return (
      <div data-position="desktop" className="fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4">
        {children('desktop')}
      </div>
    )
  const position = bottomBar > 0 ? 'bottom-bar' : tabBar ? 'tab-bar' : 'none'
  const cls =
    position === 'tab-bar'
      ? 'bottom-[calc(var(--tabbar-h)+12px)]'
      : position === 'none'
        ? 'bottom-[calc(var(--mobile-safe-bottom)+10px)]'
        : ''
  return (
    <div
      data-position={position}
      className={`fixed inset-x-4 z-[60] flex justify-center ${cls}`}
      style={position === 'bottom-bar' ? { bottom: bottomBar + 12 } : undefined}
    >
      {children('mobile')}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 는 ToastProvider 안에서만 쓸 수 있어요')
  return ctx
}
