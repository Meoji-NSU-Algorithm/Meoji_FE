import { useNavigate } from 'react-router-dom'
import { useToggleBookmark } from '../api/hooks'
import { errorMessage } from '../api/errors'
import type { EventCard } from '../api/types'
import { useToast } from '../components'

/** 찜 토글 + 결과 토스트(C2). 담으면 '보러 가기'로 찜 목록에 이동한다. 로그인 가드는 호출 측 몫 */
export function useBookmarkToggle() {
  const mutation = useToggleBookmark()
  const toast = useToast()
  const navigate = useNavigate()

  const toggle = (event: EventCard, bookmarked: boolean) =>
    mutation.mutate(
      { event, bookmarked },
      {
        onError: (err) => toast.show({ message: errorMessage(err) }),
        onSuccess: () =>
          toast.show(
            bookmarked
              ? { message: '찜을 해제했어요' }
              : { message: '찜 목록에 담았어요!', actionLabel: '보러 가기', onAction: () => navigate('/my/bookmarks') },
          ),
      },
    )

  return { toggle, isPending: mutation.isPending }
}
