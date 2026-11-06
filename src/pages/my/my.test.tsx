import { render, screen, within } from '@testing-library/react'
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
  useEvent: vi.fn(),
}))
vi.mock('../../api/hooks', () => ({
  useBookmarks: () => ({ data: hooks.bookmarks, isLoading: false, isError: false }),
  useMyReviews: () => ({ data: hooks.reviews, isLoading: false, isError: false }),
  useToggleBookmark: () => ({ mutate: hooks.toggle }),
  useEvent: hooks.useEvent,
  useUploadReviewImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
  const list = (...events: ReturnType<typeof item>[]) => ({ totalCount: events.length, events }) as unknown as unknown[]
  const item = (id: number, title: string, start: string) => ({
    id, title, imageUrl: null, startDate: start, endDate: start, priceType: 'FREE' as const,
  })
  it('비어 있으면 빈 상태를 보여준다', () => {
    hooks.bookmarks = list()
    wrap(<MyBookmarks />)
    expect(screen.getByText('아직 찜한 행사가 없어요')).toBeInTheDocument()
  })
  it('다가오는 순으로 정렬하고 하트로 해제한다', async () => {
    hooks.bookmarks = list(item(1, '나중 행사', '2026-12-01'), item(2, '먼저 행사', '2026-11-01'))
    wrap(<MyBookmarks />)
    const titles = screen.getAllByRole('link', { name: /행사$/ }).map((a) => a.textContent)
    expect(titles[0]).toBe('먼저 행사')
    await userEvent.click(screen.getAllByRole('button', { name: '찜 해제' })[0])
    expect(hooks.toggle).toHaveBeenCalledWith(
      expect.objectContaining({ bookmarked: true, event: expect.objectContaining({ id: 2, image_url: null }) }),
      expect.anything(),
    )
  })
})

describe('MyReviews', () => {
  const review = {
    id: 7, user_id: 1, event_id: 3, rating: 4.5, content: '좋았어요', created_at: '2026-10-23T01:00:00', updated_at: '',
    author: { id: 1, nickname: '안민영', profile_image: null },
    images: [{ key: 'k1', url: 'https://img.test/1.jpg' }],
    event: { id: 3, title: '천안 축제', image_url: null, end_date: '2000-01-01' },
  }

  it('행사명과 종료 표시를 보여준다', () => {
    hooks.reviews = [review]
    wrap(<MyReviews />)
    expect(screen.getAllByText('천안 축제').length).toBeGreaterThan(0)
    expect(screen.getByText('종료된 행사')).toBeInTheDocument()
    expect(screen.getByText('좋았어요')).toBeInTheDocument()
    expect(hooks.useEvent).not.toHaveBeenCalled()
  })
  it('내장 event 로 표시하며 진행 중 행사는 종료 표시가 없고 사진을 보여준다', () => {
    hooks.reviews = [{ ...review, event: { ...review.event, end_date: '2999-01-01' } }]
    wrap(<MyReviews />)
    expect(screen.queryByText('종료된 행사')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '리뷰 사진 1 크게 보기' })).toBeInTheDocument()
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
      { id: 7, eventId: 3, rating: 4.5, content: '다시 씀', images: ['k1'] },
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

describe('회원 탈퇴 링크', () => {
  it('내 찜/내가 쓴 리뷰 하단에 있다', () => {
    hooks.bookmarks = { totalCount: 0, events: [] } as unknown as unknown[]
    hooks.reviews = []
    for (const Page of [MyBookmarks, MyReviews]) {
      const { unmount } = wrap(<Page />)
      expect(screen.getByRole('link', { name: '회원 탈퇴' })).toHaveAttribute('href', '/my/withdraw')
      unmount()
    }
  })
})

describe('MyProfile', () => {
  it('카카오 프로필을 읽기 전용으로 보여준다', () => {
    wrap(<MyProfile />)
    expect(screen.getByText('안민영')).toBeInTheDocument()
    expect(screen.getByText('a@b.c')).toBeInTheDocument()
    expect(screen.getByText(/카카오 프로필과 연동돼요/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()
  })
  it('회원 탈퇴 링크가 없다', () => {
    wrap(<MyProfile />)
    expect(screen.queryByRole('link', { name: '회원 탈퇴' })).not.toBeInTheDocument()
  })
})

describe('NotFound', () => {
  it('404 를 보여준다', () => {
    wrap(<NotFound />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '홈으로 가기' })).toBeInTheDocument()
  })
})
