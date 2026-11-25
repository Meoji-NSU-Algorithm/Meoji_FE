import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { SheetCloseIcon } from './icons'
import { Modal } from './Modal'
import type { ModalProps } from './Modal'
import { useDialogBehavior } from './useDialogBehavior'
import { useIsMobile } from '../lib/useIsMobile'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  /** 접근성 이름. title 이 있으면 생략 가능(제목이 이름이 된다) */
  ariaLabel?: string
  /** 시트 머리 왼쪽 제목 (Figma M2-2 '필터': 18px Black). 없으면 오른쪽 X 만 (M1-2) */
  title?: ReactNode
  children?: ReactNode
  /**
   * 시트 바닥에 붙는 버튼 줄 (M2-2 '초기화 / 적용하기').
   * 위쪽 선·좌우 16px·버튼 사이 8px·아이폰 바닥 여백을 자동으로 잡는다. 내용이 길면 본문만 스크롤된다.
   */
  footer?: ReactNode
  /** 배경 클릭으로 닫기 (기본 true) */
  closeOnBackdrop?: boolean
  /** X 버튼 숨기기 (기본 false) */
  hideClose?: boolean
  /** true 면 손잡이만 두고 머리줄·본문 여백 없이 children 을 그대로 놓는다 */
  bare?: boolean
  /** 본문 영역 클래스. 기본은 좌우 20px + 바닥 여백(Figma M1-2) */
  bodyClassName?: string
  /** 시트 높이 클래스. 기본은 내용만큼(최대 92dvh). 필터 시트는 위에서 96px 아래까지 채운다(Figma M2-2) */
  heightClassName?: string
}

/** 본문 기본 여백: 좌우 20px, 바닥은 footer 가 없을 때만 홈 표시줄(18) + 12 = 30px */
const BODY_PAD = 'px-5'
const BODY_PAD_BOTTOM = 'pb-[calc(var(--mobile-safe-bottom)+12px)]'

/**
 * 모바일 하단 시트 (Figma 00 규칙 4번, M1-2·M2-2).
 * 동작(포커스 이동·ESC·배경 클릭·body 스크롤 잠금)은 Modal 과 같다.
 * 768px 이상에서도 열면 그대로 시트로 보이므로, 화면 폭에 따라 고르려면 ResponsiveDialog 를 쓴다.
 */
export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  title,
  children,
  footer,
  closeOnBackdrop = true,
  hideClose = false,
  bare = false,
  bodyClassName,
  heightClassName = 'max-h-[92dvh]',
}: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogBehavior(open, onClose, ref)

  if (!open) return null

  const closeButton = hideClose ? null : (
    <button
      type="button"
      aria-label="닫기"
      onClick={onClose}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
    >
      <SheetCloseIcon />
    </button>
  )

  const bodyClass = bodyClassName ?? (bare ? '' : `${BODY_PAD} ${footer ? '' : BODY_PAD_BOTTOM}`)

  return createPortal(
    <div
      data-testid="bottom-sheet-backdrop"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-dim"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel && title ? titleId : undefined}
        tabIndex={-1}
        className={`flex ${heightClassName} w-full flex-col rounded-t-[20px] bg-surface shadow-sheet outline-none`}
      >
        {/* 손잡이 40×4 */}
        <div className="flex shrink-0 justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-10 rounded-[2px] bg-line-strong" />
        </div>

        {!bare &&
          (title ? (
            <div className="flex shrink-0 items-center justify-between gap-2 pb-[2px] pl-5 pr-2 pt-[6px]">
              <h2 id={titleId} className="min-w-0 text-[18px] font-black leading-[22px] tracking-[-0.2px] text-ink">
                {title}
              </h2>
              {closeButton}
            </div>
          ) : (
            closeButton && <div className="flex shrink-0 justify-end pr-[10px]">{closeButton}</div>
          ))}

        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyClass}`}>{children}</div>

        {footer && (
          <div className="flex shrink-0 gap-2 border-t border-line bg-surface px-4 pb-[calc(var(--mobile-safe-bottom)+10px)] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export interface ResponsiveDialogProps extends ModalProps {
  /** 시트·모달 둘 다 본문 아래에 놓는 버튼 줄. 시트에선 바닥에 고정된다 */
  footer?: ReactNode
  /**
   * 모바일 시트에서만 덮어쓸 값. Modal 의 title(가운데 큰 제목)은 시트에선 머리줄 왼쪽 18px 제목이 되므로,
   * 모양이 달라야 하면 여기서 바꾼다. 예) sheet={{ title: '리뷰 수정' }} / sheet={{ title: undefined }}
   */
  sheet?: Partial<Omit<BottomSheetProps, 'open' | 'onClose'>>
}

/**
 * 768px 미만이면 BottomSheet, 이상이면 기존 Modal 을 그대로 그린다.
 * props 는 Modal 과 같아서 `<Modal` 을 `<ResponsiveDialog` 로 바꾸기만 하면 된다.
 * 데스크톱에서는 hero·widthClass·bare 를 Modal 에 그대로 넘기고, footer 는 children 뒤에 붙인다.
 * 모바일 시트에선 hero·widthClass 를 쓰지 않는다(Figma M1-2 시트엔 그라데이션 머리가 없다).
 */
export function ResponsiveDialog({ footer, sheet, ...modal }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  if (!isMobile) {
    return (
      <Modal {...modal}>
        {modal.children}
        {footer}
      </Modal>
    )
  }
  return (
    <BottomSheet
      open={modal.open}
      onClose={modal.onClose}
      ariaLabel={modal.ariaLabel}
      title={modal.title}
      closeOnBackdrop={modal.closeOnBackdrop}
      bare={modal.bare}
      footer={footer}
      {...sheet}
    >
      {modal.children}
    </BottomSheet>
  )
}
