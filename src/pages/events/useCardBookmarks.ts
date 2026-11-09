import { useMemo } from 'react'
import { useBookmarks } from '../../api/hooks'
import type { EventCard } from '../../api/types'
import { useBookmarkToggle } from '../../lib/useBookmarkToggle'
import { savePendingBookmark, useAuth, useRequireLogin } from '../../auth'

/** 카드 하트용: 찜 여부 조회 + 로그인 가드가 포함된 토글 */
export function useCardBookmarks() {
  const { data } = useBookmarks()
  const { toggle } = useBookmarkToggle()
  const requireLogin = useRequireLogin()
  const { isLoggedIn } = useAuth()
  const ids = useMemo(() => new Set((data?.events ?? []).map((e) => e.id)), [data])
  return {
    isLiked: (id: number | string) => ids.has(Number(id)),
    toggle: (event: EventCard, liked: boolean) => {
      if (!isLoggedIn) savePendingBookmark(event)
      requireLogin(() => toggle(event, liked))
    },
  }
}
