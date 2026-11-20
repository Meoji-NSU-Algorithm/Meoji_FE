import { useNavigate } from 'react-router-dom'
import { useToggleBookmark } from '../api/hooks'
import type { EventCard } from '../api/types'
import { useToast } from '../components'

/**
 * 찜 토글 + 결과 토스트. 상세·카드·내 찜이 모두 이 훅을 쓴다. 로그인 가드는 호출 측 몫.
 * - 담기 성공: '찜 목록에 담았어요!' + 보러 가기
 * - 해제 성공: '찜을 해제했어요' + 되돌리기(다시 찜 추가)
 * - 실패: 하트는 useToggleBookmark 가 원래 상태로 되돌리고, 실패 토스트에 '다시 시도'를 붙인다
 */
export function useBookmarkToggle() {
  const mutation = useToggleBookmark()
  const toast = useToast()
  const navigate = useNavigate()

  const run = (event: EventCard, bookmarked: boolean, undo = false) =>
    mutation.mutate(
      { event, bookmarked },
      {
        onError: () =>
          toast.show({
            tone: 'error',
            message: bookmarked
              ? '찜을 해제하지 못했어요. 잠시 후 다시 시도해 주세요'
              : '찜하지 못했어요. 잠시 후 다시 시도해 주세요',
            actionLabel: '다시 시도',
            onAction: () => run(event, bookmarked, undo),
          }),
        onSuccess: () => {
          if (bookmarked)
            toast.show({
              tone: 'info',
              message: '찜을 해제했어요',
              actionLabel: '되돌리기',
              onAction: () => run(event, false, true),
            })
          else if (undo) toast.show({ message: '다시 찜했어요' })
          else
            toast.show({
              message: '찜 목록에 담았어요!',
              actionLabel: '보러 가기',
              onAction: () => navigate('/my/bookmarks'),
            })
        },
      },
    )

  const toggle = (event: EventCard, bookmarked: boolean) => run(event, bookmarked)

  return { toggle, isPending: mutation.isPending }
}
