import { useNavigate } from 'react-router-dom'
import { useToggleBookmark } from '../api/hooks'
import type { EventCard } from '../api/types'
import { useToast } from '../components'

/** 찜 토글 + 결과 토스트(C2·C4). 담으면 '보러 가기', 해제하면 '되돌리기', 실패하면 '다시 시도'. 로그인 가드는 호출 측 몫 */
export function useBookmarkToggle() {
  const mutation = useToggleBookmark()
  const toast = useToast()
  const navigate = useNavigate()

  const toggle = (event: EventCard, bookmarked: boolean) =>
    mutation.mutate(
      { event, bookmarked },
      {
        // 하트는 useToggleBookmark 의 onError 가 원래대로 되돌린다
        onError: () =>
          toast.show({
            icon: 'error',
            message: bookmarked
              ? '찜을 해제하지 못했어요. 잠시 후 다시 시도해 주세요'
              : '찜하지 못했어요. 잠시 후 다시 시도해 주세요',
            actionLabel: '다시 시도',
            onAction: () => toggle(event, bookmarked),
          }),
        onSuccess: () =>
          toast.show(
            bookmarked
              ? {
                  icon: 'unlike',
                  message: '찜을 해제했어요',
                  actionLabel: '되돌리기',
                  onAction: () => toggle(event, false),
                  duration: 4000,
                }
              : { message: '찜 목록에 담았어요!', actionLabel: '보러 가기', onAction: () => navigate('/my/bookmarks') },
          ),
      },
    )

  return { toggle, isPending: mutation.isPending }
}
