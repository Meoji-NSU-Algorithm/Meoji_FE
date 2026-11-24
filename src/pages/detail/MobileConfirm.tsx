import { Modal } from '../../components'

interface Props {
  open: boolean
  onClose: () => void
  ariaLabel: string
  title: string
  message: string
  error?: string | null
  cancelLabel: string
  onCancel: () => void
  confirmLabel: string
  /** 오른쪽 버튼 색. 삭제처럼 되돌릴 수 없는 일은 'ink'(검정), 계속하기는 'primary' */
  confirmTone: 'ink' | 'primary'
  confirmDisabled?: boolean
  onConfirm: () => void
}

/**
 * 모바일 확인 창 (Figma S11 757:25 리뷰 삭제, S12 758:16 수정 중 나가기).
 * 화면 가운데 334px(좌우 28px) 흰 카드, 아이콘 없이 제목 18 Black + 설명 13.5 + 48px 버튼 두 개.
 * 동작(ESC·바깥 클릭·포커스)은 공용 Modal 그대로 쓴다.
 */
export function MobileConfirm({
  open,
  onClose,
  ariaLabel,
  title,
  message,
  error,
  cancelLabel,
  onCancel,
  confirmLabel,
  confirmTone,
  confirmDisabled,
  onConfirm,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={ariaLabel} bare widthClass="max-w-[334px]">
      <div className="flex flex-col px-5 pb-[18px] pt-[26px]">
        <h2 className="text-center text-[18px] font-black leading-[25px] tracking-[-0.2px] text-ink">{title}</h2>
        <p className="pt-2 text-center text-[13.5px] leading-5 tracking-[-0.2px] text-ink-muted">{message}</p>
        {error && (
          <p role="alert" className="pt-3 text-center text-[13px] leading-5 text-primary-ink">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 flex-1 rounded-[12px] border border-line-strong bg-surface text-[15px] font-bold tracking-[-0.2px] text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={`h-12 flex-1 rounded-[12px] text-[15px] font-bold tracking-[-0.2px] text-white disabled:opacity-60 ${
              confirmTone === 'ink' ? 'bg-ink' : 'bg-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
