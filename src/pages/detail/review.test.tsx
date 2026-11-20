import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/AuthContext'
import type { AuthContextValue } from '../../auth/AuthContext'
import { ToastProvider } from '../../components'
import { fail, ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import EventDetail from '../EventDetail'

vi.mock('../../lib/kakaoMaps', () => ({ loadKakaoMaps: () => Promise.reject(new Error('no sdk')) }))

const auth: AuthContextValue = {
  user: { id: 7, email: null, nickname: '민지', profile_image: null },
  isLoading: false,
  isLoggedIn: true,
  loginWithKakaoCode: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoginPromptOpen: false,
  openLoginPrompt: vi.fn(),
  closeLoginPrompt: vi.fn(),
}

function renderDetail() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/events/1']}>
            <Routes>
              <Route path="/events/:id" element={<EventDetail />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const imgs = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `k${i + 1}`, url: `https://img.test/${i + 1}.jpg` }))
const event = (over: Record<string, unknown> = {}) => ({
  id: 1, title: '흥타령춤축제', category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: '천안종합운동장', price: null, is_free: true,
  description: '소개글', address: '천안시', address_detail: null, play_time: null, fee_text: null, image_url: null,
  latitude: 36.8, longitude: 127.1, organizer: null, contact_phone: null, homepage_url: null, is_permanent: false,
  review_count: 2, average_rating: 4.5,
  reviews: [
    { id: 1, user_id: 7, author: { id: 7, nickname: '민지', profile_image: null }, images: imgs(2), event_id: 1, rating: 4, content: '내 리뷰', created_at: '2026-10-23T00:00:00', updated_at: '' },
    { id: 2, user_id: 9, author: { id: 9, nickname: '수진', profile_image: 'https://img.test/broken.png' }, images: imgs(4), event_id: 1, rating: 5, content: '남의 리뷰', created_at: '2026-10-22T00:00:00', updated_at: '' },
  ],
  ...over,
})
const file = (name: string, type = 'image/png', size?: number) => {
  const f = new File(['x'], name, { type })
  if (size) Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('삭제 확인 모달 (상세)', () => {
  it('취소·바깥 클릭·Esc 는 삭제하지 않고 닫는다', async () => {
    let deleted = 0
    server.use(
      http.get('*/api/events/1', () => ok(event())),
      http.delete('*/api/reviews/1', () => { deleted += 1; return ok({}) }),
    )
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    const dialog = screen.getByRole('dialog', { name: '리뷰 삭제 확인' })
    expect(within(dialog).getByText('리뷰를 삭제할까요?')).toBeInTheDocument()
    expect(within(dialog).getByText('삭제한 리뷰와 사진은 다시 복구할 수 없어요.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleted).toBe(0)
  })

  it('삭제하기를 누르면 지우고 토스트를 보여준다. 실패하면 모달 안에 안내한다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(event())),
      http.delete('*/api/reviews/1', () => fail(500, 'COMMON_INTERNAL_ERROR')),
    )
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요')
    expect(screen.getByRole('dialog', { name: '리뷰 삭제 확인' })).toBeInTheDocument()
    server.use(http.delete('*/api/reviews/1', () => ok({})))
    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }))
    expect(await screen.findByText('리뷰를 삭제했어요')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('수정 모달 (상세)', () => {
  it('제목·행사명·별점·글자 수·사진 n/5 를 보여주고, 저장하면 토스트를 띄운다', async () => {
    let body: unknown
    server.use(
      http.get('*/api/events/1', () => ok(event())),
      http.put('*/api/reviews/1', async ({ request }) => { body = await request.json(); return ok({}) }),
    )
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    const dialog = screen.getByRole('dialog', { name: '리뷰 수정' })
    expect(within(dialog).getByRole('heading', { name: '리뷰 수정' })).toBeInTheDocument()
    expect(within(dialog).getByText('흥타령춤축제')).toBeInTheDocument()
    expect(within(dialog).getByText('4점')).toBeInTheDocument()
    expect(within(dialog).getByText('4/1000')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '사진 추가 (2/5)' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '첨부 사진 2 삭제' }))
    expect(within(dialog).getByRole('button', { name: '사진 추가 (1/5)' })).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('리뷰 내용'), '!')
    expect(within(dialog).getByText('5/1000')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '수정 완료' }))
    expect(await screen.findByText('리뷰를 수정했어요')).toBeInTheDocument()
    expect(body).toMatchObject({ rating: 4, content: '내 리뷰!', images: ['k1'] })
    expect(screen.queryByRole('dialog', { name: '리뷰 수정' })).not.toBeInTheDocument()
  })

  it('저장하는 동안 버튼이 잠긴다', async () => {
    let release!: () => void
    server.use(
      http.get('*/api/events/1', () => ok(event())),
      http.put('*/api/reviews/1', async () => { await new Promise<void>((r) => (release = r)); return ok({}) }),
    )
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    await userEvent.click(screen.getByRole('button', { name: '수정 완료' }))
    expect(await screen.findByRole('button', { name: '저장 중…' })).toBeDisabled()
    release()
    expect(await screen.findByText('리뷰를 수정했어요')).toBeInTheDocument()
  })

  it('취소하면 요청 없이 닫는다', async () => {
    server.use(http.get('*/api/events/1', () => ok(event())))
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: '리뷰 수정' })).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('사진 첨부 검증', () => {
  const open = async () => {
    server.use(http.get('*/api/events/1', () => ok(event({ reviews: [], review_count: 0, average_rating: null }))))
    renderDetail()
    return screen.findByTestId('review-image-input')
  }

  it('안내 문구와 0/5 를 보여준다', async () => {
    await open()
    expect(screen.getByText('JPG·PNG·WEBP, 한 장에 10MB까지, 최대 5장')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '사진 추가 (0/5)' })).toBeInTheDocument()
  })

  it('6장을 고르면 앞의 5장만 추가하고 안내한다', async () => {
    const input = await open()
    await userEvent.upload(input, ['1', '2', '3', '4', '5', '6'].map((n) => file(`${n}.png`)))
    expect(await screen.findByAltText('첨부 사진 5')).toBeInTheDocument()
    expect(screen.queryByAltText('첨부 사진 6')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('사진은 최대 5장까지 올릴 수 있어요')
    expect(screen.getByRole('button', { name: '사진 추가 (5/5)' })).toBeDisabled()
  })

  it('형식이 다른 파일은 빼고 나머지는 추가한다', async () => {
    const input = await open()
    await userEvent.upload(input, [file('a.png'), file('b.gif', 'image/gif'), file('c.webp', 'image/webp')], { applyAccept: false })
    expect(await screen.findByAltText('첨부 사진 2')).toBeInTheDocument()
    expect(screen.queryByAltText('첨부 사진 3')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG, WEBP 사진만 올릴 수 있어요')
  })

  it('10MB 를 넘는 파일은 빼고 나머지는 추가한다', async () => {
    const input = await open()
    await userEvent.upload(input, [file('big.png', 'image/png', 10 * 1024 * 1024 + 1), file('ok.png'), file('edge.jpg', 'image/jpeg', 10 * 1024 * 1024)])
    expect(await screen.findByAltText('첨부 사진 2')).toBeInTheDocument()
    expect(screen.queryByAltText('첨부 사진 3')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('10MB 이하 사진만 올릴 수 있어요')
  })

  it('등록하는 동안 버튼이 잠긴다', async () => {
    let release!: () => void
    server.use(
      http.get('*/api/events/1', () => ok(event({ reviews: [], review_count: 0, average_rating: null }))),
      http.post('*/api/reviews', async () => { await new Promise<void>((r) => (release = r)); return ok({}, 201) }),
    )
    renderDetail()
    await userEvent.click(await screen.findByRole('radio', { name: '4점' }))
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }))
    expect(await screen.findByRole('button', { name: '등록 중…' })).toBeDisabled()
    release()
    expect(await screen.findByText('리뷰가 등록됐어요!')).toBeInTheDocument()
  })
})

describe('리뷰 목록 사진', () => {
  it('3장까지만 보이고 나머지는 +N 으로 묶는다', async () => {
    server.use(http.get('*/api/events/1', () => ok(event())))
    renderDetail()
    await screen.findByText('남의 리뷰')
    const items = screen.getAllByTestId('review-item')
    // 2장: +N 없음
    expect(within(items[0]).getAllByRole('button', { name: /리뷰 사진 \d 크게 보기/ })).toHaveLength(2)
    expect(within(items[0]).queryByText(/^\+\d/)).not.toBeInTheDocument()
    // 4장: 3장 + '+1'
    expect(within(items[1]).getAllByRole('button', { name: /리뷰 사진 \d 크게 보기/ })).toHaveLength(3)
    expect(within(items[1]).getByText('+1')).toBeInTheDocument()
    expect(within(items[1]).getByRole('button', { name: '리뷰 사진 3 크게 보기, 1장 더 있음' })).toBeInTheDocument()
  })

  it('프로필 사진이 없거나 깨지면 이름 첫 글자 동그라미로 바꾼다', async () => {
    server.use(http.get('*/api/events/1', () => ok(event())))
    renderDetail()
    await screen.findByText('남의 리뷰')
    const items = screen.getAllByTestId('review-item')
    // 프로필 사진이 없는 내 리뷰
    expect(within(items[0]).getByTestId('avatar-fallback')).toHaveTextContent('민')
    // 사진이 있는 리뷰는 먼저 사진을 보여 주다가 불러오지 못하면 글자로 바꾼다
    expect(within(items[1]).queryByTestId('avatar-fallback')).not.toBeInTheDocument()
    const avatar = items[1].querySelector('img[src="https://img.test/broken.png"]')!
    fireEvent.error(avatar)
    expect(within(items[1]).getByTestId('avatar-fallback')).toHaveTextContent('수')
  })
})

describe('사진 확대 보기', () => {
  it('제목·행사명·날짜·n / total 을 보여주고 ← → 로 넘기며 Esc 로 닫는다', async () => {
    server.use(http.get('*/api/events/1', () => ok(event())))
    renderDetail()
    await screen.findByText('남의 리뷰')
    await userEvent.click(within(screen.getAllByTestId('review-item')[1]).getByRole('button', { name: '리뷰 사진 2 크게 보기' }))
    const box = screen.getByRole('dialog', { name: '수진님의 리뷰 사진' })
    expect(within(box).getByText('수진님의 리뷰 사진')).toBeInTheDocument()
    expect(within(box).getByText('흥타령춤축제 · 2026.10.22')).toBeInTheDocument()
    const counter = () => box.querySelector('[aria-live]')!.textContent
    expect(counter()).toBe('2 / 4')
    expect(within(box).getByAltText('리뷰 사진 2')).toHaveAttribute('src', 'https://img.test/2.jpg')
    // 썸네일 줄은 4장 전부
    expect(within(box).getAllByRole('button', { name: /^사진 \d/ })).toHaveLength(4)
    await userEvent.keyboard('{ArrowRight}')
    expect(counter()).toBe('3 / 4')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(counter()).toBe('1 / 4')
    await userEvent.keyboard('{ArrowLeft}') // 처음에서 이전은 마지막으로
    expect(counter()).toBe('4 / 4')
    await userEvent.click(within(box).getByRole('button', { name: '이전 사진' }))
    expect(counter()).toBe('3 / 4')
    await userEvent.click(within(box).getByRole('button', { name: '사진 1' }))
    expect(counter()).toBe('1 / 4')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('바깥을 누르거나 닫기 버튼으로 닫는다', async () => {
    server.use(http.get('*/api/events/1', () => ok(event())))
    renderDetail()
    await userEvent.click(await screen.findAllByRole('button', { name: '리뷰 사진 1 크게 보기' }).then((b) => b[0]))
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: '리뷰 사진 1 크게 보기' })[0])
    fireEvent.mouseDown(screen.getByRole('dialog'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('찜 실패·해제 토스트', () => {
  const bookmarkItem = { id: 1, title: '흥타령춤축제', imageUrl: null, startDate: '2026-10-22', endDate: '2026-10-26', priceType: 'FREE' }
  const setup = (bookmarked: boolean) =>
    server.use(
      http.get('*/api/events/1', () => ok(event())),
      http.get('*/api/bookmarks', () => ok({ totalCount: bookmarked ? 1 : 0, events: bookmarked ? [bookmarkItem] : [] })),
    )

  it('찜 추가에 실패하면 하트를 되돌리고 다시 시도할 수 있다', async () => {
    setup(false)
    server.use(http.post('*/api/bookmarks', () => fail(500, 'COMMON_INTERNAL_ERROR')))
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: '찜하기' }))
    expect(await screen.findByText('찜하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeInTheDocument()
    expect(screen.getByTestId('toast-icon-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '찜하기' })).toHaveAttribute('aria-pressed', 'false')
    // 이번엔 성공
    server.use(http.post('*/api/bookmarks', () => ok({}, 201)))
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('찜 목록에 담았어요!')).toBeInTheDocument()
  })

  it('찜 해제에 실패하면 하트를 유지하고 실패 문구를 보여준다', async () => {
    setup(true)
    server.use(http.delete('*/api/bookmarks/1', () => fail(503, 'COMMON_DB_UNAVAILABLE')))
    renderDetail()
    const heart = await screen.findByRole('button', { name: '찜 완료' })
    await userEvent.click(heart)
    expect(await screen.findByText('찜을 해제하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '찜 완료' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('찜 해제 뒤 되돌리기를 누르면 다시 찜한다', async () => {
    setup(true)
    let added = 0
    server.use(
      http.delete('*/api/bookmarks/1', () => ok({})),
      http.post('*/api/bookmarks', () => { added += 1; return ok({}, 201) }),
    )
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: '찜 완료' }))
    expect(await screen.findByText('찜을 해제했어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))
    await waitFor(() => expect(added).toBe(1))
    expect(await screen.findByText('다시 찜했어요')).toBeInTheDocument()
  })
})
