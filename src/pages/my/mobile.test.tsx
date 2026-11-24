import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components'
import { setViewportWidth } from '../../test/viewport'
import MyBookmarks from '../MyBookmarks'
import MyReviews from '../MyReviews'
import MyProfile from '../MyProfile'
import MyWithdraw from '../MyWithdraw'
import MyWithdrawDone from '../MyWithdrawDone'
import NotFound from '../NotFound'

const auth = vi.hoisted(() => ({
  value: {
    user: { id: 1, email: 'a@b.c', nickname: '안민영', profile_image: null },
    isLoggedIn: true,
    isLoading: false,
    logout: vi.fn(() => Promise.resolve()),
    refreshUser: vi.fn(() => Promise.resolve()),
    openLoginPrompt: vi.fn(),
  } as Record<string, unknown>,
  clear: vi.fn(),
}))
vi.mock('../../auth', () => ({
  useAuth: () => auth.value,
  useRequireLogin: () => () => undefined,
  tokenStorage: { clear: auth.clear },
}))

const hooks = vi.hoisted(() => ({
  bookmarks: { totalCount: 0, events: [] } as unknown,
  reviews: [] as unknown[],
  toggle: vi.fn(),
  withdraw: vi.fn(),
  reset: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../api/hooks', () => ({
  useBookmarks: () => ({ data: hooks.bookmarks, isLoading: false, isError: false }),
  useMyReviews: () => ({ data: hooks.reviews, isLoading: false, isError: false }),
  useToggleBookmark: () => ({ mutate: hooks.toggle }),
  useEvent: vi.fn(),
  useUpdateReview: () => ({ mutate: vi.fn(), isError: false, isPending: false }),
  useDeleteReview: () => ({ mutate: vi.fn(), reset: vi.fn(), isError: false, isPending: false }),
  useUploadProfileImage: () => ({ mutateAsync: vi.fn() }),
  useResetProfileImage: () => ({ mutateAsync: hooks.reset }),
  useWithdraw: () => ({ mutate: hooks.withdraw, isError: false, isPending: false }),
}))

const wrap = (ui: React.ReactNode, entry: string | { pathname: string; state?: unknown } = '/') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[entry]}>
        <ToastProvider>
          <Routes>
            <Route path="*" element={ui} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const item = (id: number, title: string, start: string) => ({
  id, title, imageUrl: null, startDate: start, endDate: start, priceType: 'FREE' as const,
})

beforeEach(() => {
  vi.clearAllMocks()
  hooks.bookmarks = { totalCount: 0, events: [] }
  hooks.reviews = []
  setViewportWidth(390)
})

describe('M7 마이 · 내 찜 (390px)', () => {
  it('프로필 요약에 숫자·프로필 편집·로그아웃, 탭과 회원 탈퇴 링크가 있다', () => {
    hooks.bookmarks = { totalCount: 2, events: [item(1, '나중 행사', '2026-12-01'), item(2, '먼저 행사', '2026-11-01')] }
    wrap(<MyBookmarks />)
    expect(screen.getByRole('heading', { name: '마이페이지' })).toHaveClass('text-[23px]')
    expect(screen.getByRole('link', { name: '프로필 편집' })).toHaveAttribute('href', '/my/profile')
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '마이페이지 탭' })
    expect(within(nav).getByRole('link', { name: /내 찜/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '회원 탈퇴' })).toHaveAttribute('href', '/my/withdraw')
  })

  it('2열 그리드, 정렬은 오른쪽 두 버튼(다가오는 순 기본)', async () => {
    hooks.bookmarks = { totalCount: 2, events: [item(1, '나중 행사', '2026-12-01'), item(2, '먼저 행사', '2026-11-01')] }
    wrap(<MyBookmarks />)
    const grid = screen.getAllByRole('listitem')[0].parentElement!
    expect(grid).toHaveClass('grid-cols-2', 'gap-x-[11px]')
    expect(grid.className).not.toContain('lg:grid-cols-4')
    const sort = screen.getByRole('group', { name: '정렬' })
    expect(within(sort).getByRole('button', { name: '다가오는 순' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(grid).getAllByRole('link', { name: /행사$/ })[0]).toHaveTextContent('먼저 행사')
    await userEvent.click(within(sort).getByRole('button', { name: '최근 찜한 순' }))
    expect(within(grid).getAllByRole('link', { name: /행사$/ })[0]).toHaveTextContent('나중 행사')
  })

  it('S7 찜이 없으면 64px 원 하트와 행사 둘러보기 버튼', () => {
    wrap(<MyBookmarks />)
    expect(screen.getByText('아직 찜한 행사가 없어요')).toHaveClass('text-[17px]')
    expect(screen.queryByTestId('empty-state-tile')).toBeNull()
    expect(screen.getByRole('button', { name: '행사 둘러보기' })).toBeInTheDocument()
  })
})

describe('M7-2 내가 쓴 리뷰 (390px)', () => {
  const review = (id: number, title: string, end: string) => ({
    id, event_id: id, rating: 4.5, content: '좋았어요', created_at: '2026-09-30T00:00:00Z', images: [],
    event: { id, title, end_date: end, image_url: null },
  })
  it('짧은 프로필 요약(로그아웃 없음)과 썸네일 없는 리뷰 줄, 종료 배지', () => {
    hooks.reviews = [review(1, '진행 행사', '2099-01-01'), review(2, '끝난 행사', '2000-01-01')]
    wrap(<MyReviews />)
    expect(screen.getByText('찜한 행사 0 · 작성한 리뷰 2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '로그아웃' })).toBeNull()
    expect(screen.getByRole('link', { name: '진행 행사 상세 보기' })).toHaveTextContent('›')
    expect(screen.getByRole('link', { name: '끝난 행사 상세 보기' })).toHaveTextContent('종료된 행사')
    expect(screen.getAllByRole('button', { name: '수정' })).toHaveLength(2)
    expect(document.querySelector('img')).toBeNull()
  })
})

describe('M9 프로필 편집 (390px)', () => {
  it('아바타를 누르면 하단 시트(앨범·촬영·기본 이미지·취소)가 열린다', async () => {
    wrap(<MyProfile />)
    expect(screen.getByText('다른 사람에게 보이는 이름과 사진이에요')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '내 프로필' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: '프로필 사진 변경' }))
    const sheet = screen.getByRole('dialog', { name: '프로필 사진' })
    expect(within(sheet).getByRole('button', { name: '앨범에서 선택' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: '사진 촬영' })).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: /기본 이미지로 변경/ }))
    expect(hooks.reset).toHaveBeenCalledWith('default')
    expect(screen.queryByRole('dialog', { name: '프로필 사진' })).toBeNull()
  })

  it('바닥 고정 취소·저장 버튼이 있다', () => {
    wrap(<MyProfile />)
    const bar = screen.getByTestId('mobile-bottom-bar')
    expect(within(bar).getByRole('button', { name: '취소' })).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: '저장' })).toBeInTheDocument()
  })
})

describe('M10 회원 탈퇴 (390px)', () => {
  it('동의 체크 후 바닥의 탈퇴하기가 켜지고 API 를 부른다', async () => {
    hooks.bookmarks = { totalCount: 6, events: [] }
    wrap(<MyWithdraw />)
    expect(screen.getByText('찜한 행사 6개가 삭제돼요')).toBeInTheDocument()
    const bar = screen.getByTestId('mobile-bottom-bar')
    const submit = within(bar).getByRole('button', { name: '탈퇴하기' })
    expect(submit).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /탈퇴에 동의해요/ }))
    expect(submit).toBeEnabled()
    expect(submit).toHaveClass('bg-ink')
    await userEvent.click(submit)
    expect(hooks.withdraw).toHaveBeenCalled()
  })
})

describe('M10-2 탈퇴 완료 (390px)', () => {
  it('안내와 바닥 고정 홈으로 가기', () => {
    wrap(<MyWithdrawDone />, { pathname: '/my/withdraw/done', state: { withdrawn: true } })
    expect(screen.getByRole('heading', { name: '탈퇴가 완료됐어요' })).toHaveClass('text-[21px]')
    const bar = screen.getByTestId('mobile-bottom-bar')
    expect(within(bar).getByRole('link', { name: '홈으로 가기' })).toHaveAttribute('href', '/')
    expect(auth.clear).toHaveBeenCalled()
  })
})

describe('M11 404 (390px)', () => {
  it('88px 404 와 위아래 버튼(행사 둘러보기가 주 버튼)', () => {
    wrap(<NotFound />)
    expect(screen.getByText('404')).toHaveClass('text-[88px]')
    const [first, second] = screen.getAllByRole('button')
    expect(first).toHaveTextContent('행사 둘러보기')
    expect(first).toHaveClass('bg-primary')
    expect(second).toHaveTextContent('홈으로 가기')
  })
})
