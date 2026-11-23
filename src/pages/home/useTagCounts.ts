import { useQueries } from '@tanstack/react-query'
import { getEvents } from '../../api/events'
import { useAuth } from '../../auth'

const FIVE_MIN = 5 * 60 * 1000

/**
 * 태그별 결과 수(GET /events?tag=&size=1 의 total_count). 아직 모르거나 실패한 태그는 undefined 로 두어
 * 카드를 숨기지 않는다(0건으로 확인된 태그만 숨긴다).
 * 필터 파라미터가 붙은 목록은 비로그인에게 401 이라, 로그인했을 때만 세어 온다(BE 요청 사항: 태그별 건수 공개).
 */
export function useTagCounts(tags: readonly string[]): Record<string, number | undefined> {
  const { isLoggedIn } = useAuth()
  const results = useQueries({
    queries: tags.map((tag) => ({
      queryKey: ['events', 'tag-count', tag] as const,
      queryFn: () => getEvents({ tag, page: 1, size: 1 }),
      staleTime: FIVE_MIN,
      retry: false,
      enabled: isLoggedIn,
    })),
  })
  return Object.fromEntries(tags.map((tag, i) => [tag, results[i].data?.total_count]))
}
