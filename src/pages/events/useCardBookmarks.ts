import { useMemo } from 'react'
import { useBookmarks, useToggleBookmark } from '../../api/hooks'
import type { EventCard } from '../../api/types'
import { errorMessage } from '../../api/errors'
import { useToast } from '../../components'
import { savePendingBookmark, useAuth, useRequireLogin } from '../../auth'

/** 카드 하트용: 찜 여부 조회 + 로그인 가드가 포함된 토글 */
export function useCardBookmarks() {
  const { data } = useBookmarks()
  const toggle = useToggleBookmark()
  const toast = useToast()
  const requireLogin = useRequireLogin()
  const { isLoggedIn } = useAuth()
  const ids = useMemo(() => new Set((data?.events ?? []).map((e) => e.id)), [data])
  return {
    isLiked: (id: number | string) => ids.has(Number(id)),
    toggle: (event: EventCard, liked: boolean) => {
      if (!isLoggedIn) savePendingBookmark(event)
      requireLogin(() => toggle.mutate(
          { event, bookmarked: liked },
          { onError: (err) => toast.show({ message: errorMessage(err) }) },
        ))
    },
  }
}
