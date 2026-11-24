import type { ReactNode } from 'react'

/** B2(결과 없음)·B5·B6(불러오기 실패) 공통: 틴트 아이콘 상자 + 제목 + 설명 + 버튼 */
export function StatePanel({
  icon,
  title,
  message,
  action,
  role,
}: {
  icon: ReactNode
  title: string
  message?: ReactNode
  action?: ReactNode
  role?: 'alert' | 'status'
}) {
  return (
    <div role={role} className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-[60px] items-center justify-center rounded-[20px] bg-primary-tint text-primary-ink">
        {icon}
      </span>
      <h2 className="pt-[18px] text-[18px] font-black leading-[27px] text-ink">{title}</h2>
      {message && <p className="pt-[6px] text-[13px] leading-[19.5px] text-ink-muted">{message}</p>}
      {action && <div className="pt-5">{action}</div>}
    </div>
  )
}

export const primaryBtn =
  'inline-flex h-[44px] items-center rounded-card bg-primary px-[18px] text-[14px] font-bold text-white'
export const outlineBtn =
  'inline-flex h-[44px] items-center rounded-card border border-line bg-surface px-[18px] text-[14px] font-bold text-ink'

/**
 * 모바일 빈/실패 상태 (Figma S1·S2·S6): 64px 동그라미 아이콘 + 17px 제목 + 13px 설명 + 44px 버튼.
 * tone: brand(주황 틴트, S1·S6) / muted(회색, S2)
 */
export function MobileStatePanel({
  icon,
  title,
  message,
  action,
  role,
  tone = 'brand',
  className = 'pb-14 pt-20',
}: {
  icon: ReactNode
  title: string
  message?: ReactNode
  action?: ReactNode
  role?: 'alert' | 'status'
  tone?: 'brand' | 'muted'
  className?: string
}) {
  return (
    <div role={role} className={`flex flex-col items-center px-6 text-center ${className}`}>
      <span
        className={`mb-4 flex size-16 items-center justify-center rounded-full ${
          tone === 'brand' ? 'bg-primary-tint text-brand' : 'bg-surface-muted text-ink-muted'
        }`}
      >
        {icon}
      </span>
      <h2 className="text-[17px] font-black leading-6 tracking-[-0.2px] text-ink">{title}</h2>
      {message && <p className="whitespace-pre-line pt-[6px] text-[13px] leading-5 tracking-[-0.2px] text-ink-muted">{message}</p>}
      {action && <div className="pt-5">{action}</div>}
    </div>
  )
}

export const mobilePrimaryBtn =
  'inline-flex h-11 items-center justify-center rounded-card bg-primary px-5 text-[14px] font-bold text-white'
export const mobileOutlineBtn =
  'inline-flex h-11 items-center justify-center rounded-card border border-line-strong bg-surface px-5 text-[14px] font-bold tracking-[-0.2px] text-ink'
