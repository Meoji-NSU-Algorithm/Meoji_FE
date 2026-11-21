import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertIcon, CheckIcon, SmallHeartIcon } from './icons'

export interface ToastViewProps {
  message: ReactNode
  /** 되돌리기/보러 가기 같은 액션 */
  actionLabel?: string
  onAction?: () => void
  /** success: 주황 체크(기본), error: 주황 느낌표, unlike: 흰 원 빈 하트 (C4) */
  icon?: 'success' | 'error' | 'unlike'
}

/** 표현 전용 토스트 (F2). 위치는 호출 측에서 잡는다 */
export function ToastView({ message, actionLabel, onAction, icon = 'success' }: ToastViewProps) {
  return (
    <div
      role="status"
      className="inline-flex h-[52px] items-center gap-3 rounded-[14px] bg-ink pl-[18px] pr-[10px] text-white"
    >
      <span
        className={`flex size-[22px] items-center justify-center rounded-full ${
          icon === 'unlike' ? 'bg-white text-ink' : 'bg-primary'
        }`}
      >
        {icon === 'error' ? <AlertIcon /> : icon === 'unlike' ? <SmallHeartIcon /> : <CheckIcon />}
      </span>
      <span className="text-[14px] font-medium leading-[21px] whitespace-nowrap">{message}</span>
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
  /** 표시 시간(ms), 기본 3000 */
  duration?: number
}

interface ToastApi {
  show: (options: ToastOptions) => void
  dismiss: () => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** 앱 루트에 한 번 감싼다. 화면 아래 가운데에 3초 동안 떴다 사라진다 */
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
    timer.current = setTimeout(() => setToast(null), options.duration ?? 3000)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <div className="fixed inset-x-0 bottom-8 z-[60] flex justify-center px-4">
          <ToastView
            message={toast.message}
            actionLabel={toast.actionLabel}
            icon={toast.icon}
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
