import { matchPath } from 'react-router-dom'

/**
 * 모바일(768px 미만) 경로별 크롬 표 — 탭바·상단 헤더는 여기 한 곳에서만 정한다.
 * (Figma 00-2 결정 4번: '한 가지 일' 하는 화면은 탭바를 숨기고 왼쪽 위 '뒤로'로 돌아간다)
 *
 *  tabBar : 하단 탭바 표시 여부
 *  header : 'main' = 로고 + 로그인/프로필 헤더
 *           'back' = Layout 이 '뒤로' 헤더(MobileBackHeader)를 그린다. title 이 기본 제목,
 *                    페이지는 <MobileHeaderTitle>/<MobileHeaderActions> 로 바꾸거나 채운다
 *           'none' = Layout 은 헤더를 그리지 않는다. 페이지가 직접 그린다(검색창 헤더, 로그인 화면 등)
 *  footer : 모바일에서 푸터 표시 (Figma 는 홈 M1 맨 아래에만 있다)
 *
 * 위에서부터 처음 맞는 줄을 쓴다. 어느 줄에도 안 맞으면 404 로 본다(탭바 보임, main 헤더).
 */
export type MobileHeaderKind = 'main' | 'back' | 'none'

export interface MobileRouteRule {
  path: string
  tabBar: boolean
  header: MobileHeaderKind
  /** header: 'back' 일 때 기본 제목. 'logo' 면 로고(M5 상세) */
  title?: string
  footer?: boolean
}

export const MOBILE_ROUTES: MobileRouteRule[] = [
  // 탭바 보임
  { path: '/', tabBar: true, header: 'main', footer: true }, // M1 홈
  { path: '/events', tabBar: true, header: 'main' }, // M2 목록
  { path: '/map', tabBar: true, header: 'main' }, // M3 지도
  { path: '/calendar', tabBar: true, header: 'main' }, // M4 캘린더
  { path: '/my', tabBar: true, header: 'main' }, // M7 마이(내 찜)
  { path: '/my/bookmarks', tabBar: true, header: 'main' },
  { path: '/my/reviews', tabBar: true, header: 'main' }, // M7-2 내가 쓴 리뷰
  // 탭바 숨김
  { path: '/events/:id', tabBar: false, header: 'back', title: 'logo' }, // M5 상세 (오른쪽 공유는 페이지가)
  { path: '/events/:id/directions', tabBar: false, header: 'back', title: '길찾기' }, // M6
  { path: '/search', tabBar: false, header: 'none' }, // M1-3: 뒤로 + 검색창 헤더를 페이지가 그린다
  { path: '/auth/login', tabBar: false, header: 'none' }, // M8: 그림 위에 뜬 뒤로 버튼
  { path: '/auth/kakao/callback', tabBar: false, header: 'none' }, // M8-2·M8-3
  { path: '/auth/terms', tabBar: false, header: 'none' }, // M8-4: 왼쪽 위 작은 로고만
  { path: '/my/profile', tabBar: false, header: 'back', title: '프로필 편집' }, // M9
  { path: '/my/withdraw', tabBar: false, header: 'back', title: '회원 탈퇴' }, // M10
  { path: '/my/withdraw/done', tabBar: false, header: 'main' }, // M10-2: 로고 + 로그인 헤더, 탭바 없음
  { path: '/terms', tabBar: false, header: 'back', title: '약관 및 정책' }, // M12
  { path: '/privacy', tabBar: false, header: 'back', title: '약관 및 정책' }, // M12
]

const NOT_FOUND: MobileRouteRule = { path: '*', tabBar: true, header: 'main' } // M11 404

export function getMobileRoute(pathname: string): MobileRouteRule {
  return MOBILE_ROUTES.find((r) => matchPath({ path: r.path, end: true }, pathname)) ?? NOT_FOUND
}
