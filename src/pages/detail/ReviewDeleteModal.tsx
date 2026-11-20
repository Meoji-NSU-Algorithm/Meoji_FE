import { errorMessage } from '../../api/errors'
import { useDeleteReview } from '../../api/hooks'
import { Modal, useToast } from '../../components'
import { TrashIcon } from './icons'

interface Props {
  /** 지울 리뷰. null 이면 닫혀 있다 */
  target: { id: number; eventId: number } | null
  onClose: () => void
}

/** 리뷰 삭제 확인 (Figma E4). 내가 쓴 리뷰(E3)와 상세의 내 리뷰(C1)가 같이 쓴다. 성공하면 토스트를 띄운다. */
export function ReviewDeleteModal({ target, onClose }: Props) {
  const toast = useToast()
  const remove = useDeleteReview()
  const close = () => {
    remove.reset()
    onClose()
  }
  const confirm = () => {
    if (!target) return
    remove.mutate(
      { id: target.id, eventId: target.eventId },
      {
        onSuccess: () => {
          toast.show({ message: '리뷰를 삭제했어요' })
          close()
        },
      },
    )
  }
  return (
    <Modal open={!!target} onClose={close} ariaLabel="리뷰 삭제 확인" bare widthClass="max-w-[384px]">
      <div className="flex flex-col items-center px-6 pb-5 pt-7">
        <span className="mb-[6px] flex size-[52px] items-center justify-center rounded-[16px] bg-primary-tint text-primary">
          <TrashIcon size={24} />
        </span>
        <h2 className="pt-2 text-[18px] font-bold text-ink">리뷰를 삭제할까요?</h2>
        <p className="pt-2 text-center text-[14px] leading-[22.4px] text-ink-muted">삭제한 리뷰와 사진은 다시 복구할 수 없어요.</p>
        {remove.isError && (
          <p role="alert" className="pt-3 text-center text-[13px] leading-[20px] text-primary-ink">
            {errorMessage(remove.error)}
          </p>
        )}
        <div className="flex w-full gap-2 pt-6">
          <button type="button" onClick={close} className="h-12 flex-1 rounded-[12px] bg-[#f2eeeb] text-[14px] font-bold text-ink">
            취소
          </button>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={confirm}
            className="h-12 flex-1 rounded-[12px] bg-primary text-[14px] font-bold text-white disabled:opacity-60"
          >
            {remove.isPending ? '삭제 중…' : '삭제하기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
