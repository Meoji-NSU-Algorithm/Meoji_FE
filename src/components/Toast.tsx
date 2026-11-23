import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckIcon } from './icons'

export type ToastTone = 'success' | 'info' | 'error'

export interface ToastViewProps {
  message: ReactNode
  /** success: 주황 체크(기본), info: 흰 하트(찜 해제), error: 주황 느낌표(실패) */
  tone?: ToastTone
  /** 되돌리기/보러 가기 같은 액션 */
  actionLabel?: string
  onAction?: () => void
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

export function ToastView({ message, tone = 'success', actionLabel, onAction }: ToastViewProps) {
  return (
    <div
      role="status"
      className="inline-flex min-h-[52px] max-w-[calc(100vw/var(--app-zoom,1)-32px)] items-center gap-3 rounded-[14px] bg-ink py-2 pl-4 pr-[10px] text-white shadow-[0_10px_15px_rgba(0,0,0,0.25)] md:h-[52px] md:py-0 md:pl-[18px]"
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
        <div className="fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4">
          <ToastView
            message={toast.message}
            tone={toast.tone}
            actionLabel={toast.actionLabel}
            onAction={() => {
              toast.onAction?.()
              dismiss()
            }}
          />
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 는 ToastProvider 안에서만 쓸 수 있어요')
  return ctx
}
