import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { ToastProvider } from '../components'
import { fail, ok } from '../mocks/handlers'
import { server } from '../mocks/server'
import EventDetail from './EventDetail'

vi.mock('../lib/kakaoMaps', () => ({ loadKakaoMaps: () => Promise.reject(new Error('no sdk')) }))

const openLoginPrompt = vi.fn()
function auth(loggedIn: boolean): AuthContextValue {
  return {
    user: loggedIn ? { id: 7, email: null, nickname: '민지', profile_image: null } : null,
    isLoading: false,
    isLoggedIn: loggedIn,
    loginWithKakaoCode: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isLoginPromptOpen: false,
    openLoginPrompt,
    closeLoginPrompt: vi.fn(),
  }
}

function renderAt(path: string, loggedIn = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth(loggedIn)}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/events/:id" element={<EventDetail />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const baseEvent = {
  id: 1, title: '흥타령춤축제', category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: '천안종합운동장', thumbnail_url: null,
  price: null, is_free: true, description: '소개글', address: '천안시', address_detail: null, play_time: null,
  fee_text: null, image_url: null, latitude: 36.8, longitude: 127.1, organizer: null, contact_phone: null,
  homepage_url: null, is_permanent: false, review_count: 2, average_rating: 4.5,
  reviews: [
    { id: 1, user_id: 7, author: { id: 7, nickname: '민지', profile_image: null }, images: [{ key: 'k1', url: 'https://img.test/1.jpg' }], event_id: 1, rating: 4, content: '내 리뷰', created_at: '2026-10-23T00:00:00', updated_at: '' },
    { id: 2, user_id: 9, author: { id: 9, nickname: '수진', profile_image: 'https://img.test/a.png' }, images: [], event_id: 1, rating: 5, content: '남의 리뷰', created_at: '2026-10-22T00:00:00', updated_at: '' },
  ],
}

describe('EventDetail', () => {
  it('로그아웃 상태면 로그인 유도를 띄우고 플레이스홀더를 보여준다', async () => {
    renderAt('/events/1', false)
    expect(await screen.findByText('로그인하면 행사 상세를 볼 수 있어요')).toBeInTheDocument()
    expect(openLoginPrompt).toHaveBeenCalled()
  })

  it('EVENT_NOT_FOUND 는 404 를 보여준다', async () => {
    server.use(http.get('*/api/events/1', () => fail(404, 'EVENT_NOT_FOUND')))
    renderAt('/events/1')
    expect(await screen.findByText('행사를 찾을 수 없어요')).toBeInTheDocument()
  })

  it('내 리뷰만 수정/삭제 가능하고 타인은 author 닉네임으로 표시', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    expect(await screen.findByText('내 리뷰')).toBeInTheDocument()
    expect(screen.getByText('민지')).toBeInTheDocument()
    expect(screen.getByText('수진')).toBeInTheDocument()
    expect(screen.queryByText('방문자')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '수정' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '삭제' })).toHaveLength(1)
    await waitFor(() => expect(screen.getByTestId('mini-map-fallback')).toBeInTheDocument())
    // 내 리뷰가 있으면 작성 폼은 숨겨진다
    expect(screen.queryByRole('button', { name: '리뷰 등록' })).not.toBeInTheDocument()
  })

  it('삭제는 확인 모달을 거친다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(baseEvent)),
      http.delete('*/api/reviews/1', () => ok({})),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    expect(screen.getByRole('dialog', { name: '리뷰 삭제 확인' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: '삭제' }).at(-1)!)
    expect(await screen.findByText('리뷰를 삭제했어요')).toBeInTheDocument()
  })

  it('REVIEW_ALREADY_EXISTS 는 친절한 안내를 보여준다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok({ ...baseEvent, reviews: [], review_count: 0, average_rating: null })),
      http.post('*/api/reviews', () => fail(409, 'REVIEW_ALREADY_EXISTS')),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('radio', { name: '4점' }))
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 이 행사에 리뷰를 작성했어요')
  })

  it('길찾기 링크는 directions 로 이동한다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    const link = await screen.findByRole('link', { name: /길찾기/ })
    expect(link).toHaveAttribute('href', '/events/1/directions')
  })
})

const emptyEvent = { ...baseEvent, reviews: [], review_count: 0, average_rating: null }
const png = (n = 'a.png') => new File(['x'], n, { type: 'image/png' })

describe('리뷰 사진', () => {
  it('리뷰 사진을 보여주고 누르면 크게 본다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('button', { name: '리뷰 사진 1 크게 보기' }))
    expect(within(screen.getByRole('dialog', { name: '리뷰 사진 크게 보기' })).getByAltText('리뷰 사진')).toHaveAttribute('src', 'https://img.test/1.jpg')
  })

  it('선택 즉시 업로드하고 key 를 리뷰 등록에 실어 보낸다', async () => {
    let body: any
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews/images', () => ok({ key: 'new-key', url: 'https://img.test/n.png' }, 201)),
      http.post('*/api/reviews', async ({ request }) => {
        body = await request.json()
        return ok({}, 201)
      }),
    )
    renderAt('/events/1')
    await userEvent.upload(await screen.findByTestId('review-image-input'), png())
    expect(await screen.findByAltText('첨부 사진 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: '4점' }))
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }))
    await waitFor(() => expect(body).toMatchObject({ event_id: 1, images: ['new-key'] }))
  })

  it('첨부한 사진은 삭제할 수 있다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews/images', () => ok({ key: 'k', url: 'https://img.test/n.png' }, 201)),
    )
    renderAt('/events/1')
    await userEvent.upload(await screen.findByTestId('review-image-input'), png())
    await userEvent.click(await screen.findByRole('button', { name: '첨부 사진 1 삭제' }))
    expect(screen.queryByAltText('첨부 사진 1')).not.toBeInTheDocument()
  })

  it('업로드 시간이 지난 사진으로 등록하면 안내하고 새 사진을 비운다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews/images', () => ok({ key: 'old-key', url: 'https://img.test/n.png' }, 201)),
      http.post('*/api/reviews', () => fail(400, 'REVIEW_IMAGE_NOT_UPLOADED')),
    )
    renderAt('/events/1')
    await userEvent.upload(await screen.findByTestId('review-image-input'), png())
    await screen.findByAltText('첨부 사진 1')
    await userEvent.click(screen.getByRole('radio', { name: '4점' }))
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }))
    expect(await screen.findByText('사진 업로드 시간이 지났어요. 사진을 다시 올려 주세요.')).toBeInTheDocument()
    expect(screen.queryByAltText('첨부 사진 1')).not.toBeInTheDocument()
  })

  it('미첨부 사진이 한도에 이르면 업로드 429 문구를 보여준다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews/images', () => fail(429, 'REVIEW_IMAGE_UPLOAD_LIMIT')),
    )
    renderAt('/events/1')
    await userEvent.upload(await screen.findByTestId('review-image-input'), png())
    expect(await screen.findByText(/리뷰에 붙이지 않은 사진이 너무 많아요/)).toBeInTheDocument()
    expect(screen.queryByAltText('첨부 사진 1')).not.toBeInTheDocument()
  })

  it('최대 5장까지만 올린다', async () => {
    let n = 0
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews/images', () => {
        n += 1
        return ok({ key: `k${n}`, url: `https://img.test/${n}.png` }, 201)
      }),
    )
    renderAt('/events/1')
    const input = await screen.findByTestId('review-image-input')
    await userEvent.upload(input, [png('1.png'), png('2.png'), png('3.png'), png('4.png'), png('5.png'), png('6.png')])
    await waitFor(() => expect(screen.getByAltText('첨부 사진 5')).toBeInTheDocument())
    expect(n).toBe(5)
    expect(screen.getByRole('alert')).toHaveTextContent('최대 5장')
    expect(screen.getByRole('button', { name: /사진 추가/ })).toBeDisabled()
  })

  it('형식/용량이 맞지 않으면 업로드하지 않는다', async () => {
    let n = 0
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews/images', () => {
        n += 1
        return ok({ key: 'k', url: 'u' }, 201)
      }),
    )
    renderAt('/events/1')
    const input = await screen.findByTestId('review-image-input')
    await userEvent.upload(input, new File(['x'], 'a.gif', { type: 'image/gif' }), { applyAccept: false })
    expect(await screen.findByRole('alert')).toHaveTextContent('jpg, png, webp')
    const big = new File(['x'], 'b.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    await userEvent.upload(input, big)
    expect(await screen.findByRole('alert')).toHaveTextContent('10MB')
    expect(n).toBe(0)
  })

  it('업로드 에러 코드를 문구로 바꿔 보여준다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews/images', () => fail(503, 'REVIEW_IMAGE_STORAGE_UNAVAILABLE')),
    )
    renderAt('/events/1')
    await userEvent.upload(await screen.findByTestId('review-image-input'), png())
    expect(await screen.findByRole('alert')).toHaveTextContent('이미지 저장소를 잠시 사용할 수 없어요')
  })

  it('수정 시 전체 images 배열을 보낸다(교체 의미)', async () => {
    let body: any
    server.use(
      http.get('*/api/events/1', () => ok(baseEvent)),
      http.put('*/api/reviews/1', async ({ request }) => {
        body = await request.json()
        return ok({})
      }),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    await userEvent.click(screen.getByRole('button', { name: '첨부 사진 1 삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '수정 완료' }))
    await waitFor(() => expect(body).toMatchObject({ rating: 4, content: '내 리뷰', images: [] }))
  })

  it('REVIEW_IMAGE_ALREADY_ATTACHED 등 등록 에러를 문구로 매핑한다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews', () => fail(409, 'REVIEW_IMAGE_ALREADY_ATTACHED')),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('radio', { name: '4점' }))
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('다른 리뷰에 쓰인 이미지')
  })
})

describe('리뷰 등록 토스트', () => {
  it('등록에 성공하면 "리뷰가 등록됐어요!" 토스트를 보여준다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(emptyEvent)),
      http.post('*/api/reviews', () => ok({}, 201)),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('radio', { name: '4점' }))
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '좋아요')
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }))
    expect(await screen.findByText('리뷰가 등록됐어요!')).toBeInTheDocument()
  })
})

describe('리뷰가 없는 행사 (C4)', () => {
  it('회색 안내 블록이 작성 폼 위에 있고 메타 줄에 "아직 리뷰가 없어요"를 보여준다', async () => {
    server.use(http.get('*/api/events/1', () => ok(emptyEvent)))
    renderAt('/events/1')
    const title = await screen.findByText('첫 리뷰의 주인공이 되어 보세요!')
    expect(screen.getByText('이 행사에 다녀오셨다면 첫 리뷰를 남겨 주세요')).toBeInTheDocument()
    const formTitle = screen.getByText('이 행사는 어떠셨나요?')
    expect(title.compareDocumentPosition(formTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const rating = screen.getByText(/- 아직 리뷰가 없어요/)
    expect(rating.querySelector('svg.text-star')).not.toBeNull()
  })

  it('메타 줄에 일정·장소·평점 아이콘을 보여준다 (C1)', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    const date = (await screen.findByRole('heading', { level: 1 })).nextElementSibling as HTMLElement
    expect(within(date).getByText(/천안종합운동장/).querySelector('svg')).not.toBeNull()
    expect(within(date).getByText(/10\.22/).querySelector('svg')).not.toBeNull()
    expect(within(date).getByText(/4\.5/).closest('span')!.querySelector('svg.text-star')).not.toBeNull()
  })

  it('리뷰가 있으면 안내 블록을 보여주지 않는다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderAt('/events/1')
    await screen.findByText('내 리뷰')
    expect(screen.queryByText('첫 리뷰의 주인공이 되어 보세요!')).not.toBeInTheDocument()
  })
})

describe('찜 토스트', () => {
  it('찜하면 같은 문구와 보러 가기 액션을 보여준다', async () => {
    server.use(
      http.get('*/api/events/1', () => ok(baseEvent)),
      http.get('*/api/bookmarks', () => ok({ totalCount: 0, events: [] })),
      http.post('*/api/bookmarks', () => ok({}, 201)),
    )
    renderAt('/events/1')
    await userEvent.click(await screen.findByRole('button', { name: '찜하기' }))
    expect(await screen.findByText('찜 목록에 담았어요!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보러 가기' })).toBeInTheDocument()
  })
})
