import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components'
import MyBookmarks from '../MyBookmarks'
import MyReviews from '../MyReviews'
import MyProfile from '../MyProfile'
import NotFound from '../NotFound'

const auth = vi.hoisted(() => ({
  value: {
    user: { id: 1, email: 'a@b.c', nickname: '안민영', profile_image: null },
    isLoggedIn: true,
    isLoading: false,
    logout: vi.fn(() => Promise.resolve()),
    openLoginPrompt: vi.fn(),
  } as Record<string, unknown>,
}))
vi.mock('../../auth', () => ({
  useAuth: () => auth.value,
  useRequireLogin: () => () => (auth.value.isLoggedIn ? undefined : (auth.value.openLoginPrompt as () => void)()),
}))

const hooks = vi.hoisted(() => ({
  bookmarks: [] as unknown[],
  reviews: [] as unknown[],
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  updateProfile: vi.fn(),
  toggle: vi.fn(),
}))
vi.mock('../../api/hooks', () => ({
  useBookmarks: () => ({ data: hooks.bookmarks, isLoading: false, isError: false }),
  useMyReviews: () => ({ data: hooks.reviews, isLoading: false, isError: false }),
  useToggleBookmark: () => ({ mutate: hooks.toggle }),
  useEvent: () => ({ data: { title: '천안 축제', end_date: '2000-01-01', is_permanent: false, image_url: null } }),
  useUpdateReview: () => ({ mutate: hooks.updateReview, isError: false, isPending: false }),
  useDeleteReview: () => ({ mutate: hooks.deleteReview, isError: false, isPending: false }),
  useUpdateProfile: () => ({ mutate: hooks.updateProfile, isError: false, isPending: false }),
}))

const wrap = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  )

const card = (id: number, title: string, start: string) => ({
  id, title, category_id: 1, category: '공연', sido_code: '44', sido: '충남',
  start_date: start, end_date: start, venue_name: '장소', image_url: null, price: null, is_free: true,
})

beforeEach(() => {
  vi.clearAllMocks()
  auth.value.isLoggedIn = true
  hooks.bookmarks = []
  hooks.reviews = []
})

describe('로그인 가드', () => {
  it('비로그인이면 로그인 유도를 열고 안내를 보여준다', () => {
    auth.value.isLoggedIn = false
    wrap(<MyBookmarks />)
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument()
    expect(auth.value.openLoginPrompt).toHaveBeenCalled()
  })
})

describe('MyBookmarks', () => {
  it('비어 있으면 빈 상태를 보여준다', () => {
    wrap(<MyBookmarks />)
    expect(screen.getByText('아직 찜한 행사가 없어요')).toBeInTheDocument()
  })
  it('다가오는 순으로 정렬하고 하트로 해제한다', async () => {
    hooks.bookmarks = [card(1, '나중 행사', '2026-12-01'), card(2, '먼저 행사', '2026-11-01')]
    wrap(<MyBookmarks />)
    const titles = screen.getAllByRole('link', { name: /행사$/ }).map((a) => a.textContent)
    expect(titles[0]).toBe('먼저 행사')
    await userEvent.click(screen.getAllByRole('button', { name: '찜 해제' })[0])
    expect(hooks.toggle).toHaveBeenCalledWith(expect.objectContaining({ bookmarked: true }), expect.anything())
  })
})

describe('MyReviews', () => {
  const review = { id: 7, user_id: 1, event_id: 3, rating: 4.5, content: '좋았어요', created_at: '2026-10-23T01:00:00', updated_at: '' }

  it('행사명과 종료 표시를 보여준다', () => {
    hooks.reviews = [review]
    wrap(<MyReviews />)
    expect(screen.getAllByText('천안 축제').length).toBeGreaterThan(0)
    expect(screen.getByText('종료된 행사')).toBeInTheDocument()
    expect(screen.getByText('좋았어요')).toBeInTheDocument()
  })
  it('수정은 별점 0.5 이상, 내용 1자 이상일 때만 저장된다', async () => {
    hooks.reviews = [review]
    wrap(<MyReviews />)
    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    const textarea = screen.getByLabelText('리뷰 내용')
    await userEvent.clear(textarea)
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeDisabled()
    await userEvent.type(textarea, '다시 씀')
    expect(save).toBeEnabled()
    await userEvent.click(save)
    expect(hooks.updateReview).toHaveBeenCalledWith(
      { id: 7, eventId: 3, rating: 4.5, content: '다시 씀' },
      expect.anything(),
    )
  })
  it('삭제는 확인 후 호출된다', async () => {
    hooks.reviews = [review]
    wrap(<MyReviews />)
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))
    expect(hooks.deleteReview).toHaveBeenCalledWith({ id: 7, eventId: 3 }, expect.anything())
  })
})

describe('MyProfile', () => {
  it('닉네임이 2자 미만이면 저장할 수 없다', async () => {
    wrap(<MyProfile />)
    const input = screen.getByLabelText('이름')
    await userEvent.clear(input)
    await userEvent.type(input, '가')
    expect(screen.getByRole('alert')).toHaveTextContent('2자 이상')
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
  it('변경 후 저장하면 updateProfile 을 호출한다', async () => {
    wrap(<MyProfile />)
    const input = screen.getByLabelText('이름')
    await userEvent.clear(input)
    await userEvent.type(input, '새이름')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() =>
      expect(hooks.updateProfile).toHaveBeenCalledWith({ nickname: '새이름', profile_image: null }, expect.anything()),
    )
  })
})

describe('NotFound', () => {
  it('404 를 보여준다', () => {
    wrap(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '홈으로 가기' })).toBeInTheDocument()
  })
})
