import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/AuthContext'
import type { AuthContextValue } from '../../auth/AuthContext'
import { ToastProvider } from '../../components'
import Layout from '../../layout/Layout'
import { ok } from '../../mocks/handlers'
import { server } from '../../mocks/server'
import { setViewportWidth } from '../../test/viewport'
import EventDetail from '../EventDetail'

vi.mock('../../lib/kakaoMaps', () => ({ loadKakaoMaps: () => Promise.reject(new Error('no sdk')) }))

const openLoginPrompt = vi.fn()
function auth(loggedIn = true): AuthContextValue {
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

const mine = { id: 1, user_id: 7, author: { id: 7, nickname: '민지', profile_image: null }, images: [{ key: 'k1', url: 'https://img.test/1.jpg' }, { key: 'k2', url: 'https://img.test/2.jpg' }], event_id: 1, rating: 4, content: '내 리뷰', created_at: '2026-10-23T00:00:00', updated_at: '' }
const other = { id: 2, user_id: 9, author: { id: 9, nickname: '수진', profile_image: null }, images: [], event_id: 1, rating: 5, content: '남의 리뷰', created_at: '2026-10-22T00:00:00', updated_at: '' }
const baseEvent = {
  id: 1, title: '흥타령춤축제', category_id: 1, category: '축제', sido_code: '44', sido: '충남',
  start_date: '2026-10-22', end_date: '2026-10-26', venue_name: '천안종합운동장',
  price: null, is_free: true, description: '소개글', address: '천안시', address_detail: null, play_time: null,
  fee_text: '일부 체험 유료', image_url: 'https://img.test/hero.jpg', latitude: 36.8, longitude: 127.1, organizer: '천안시', contact_phone: '041-900-7392',
  homepage_url: 'https://cheonanfestival.com', is_permanent: false, review_count: 2, average_rating: 4.5,
  reviews: [mine, other],
}

function renderPage(loggedIn = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth(loggedIn)}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/events/1']}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/events/:id/directions" element={<div>길찾기 화면</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('모바일 행사 상세 (390px)', () => {
  beforeEach(() => setViewportWidth(390))
  afterEach(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  })

  it('M5: 헤더 공유 버튼, 하단 고정 찜·길찾기 바, 데스크톱 사이드바·뒤로 링크는 없다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: '흥타령춤축제' })).toBeInTheDocument()
    const bar = screen.getByTestId('mobile-bottom-bar')
    expect(within(bar).getByRole('button', { name: /찜하기/ })).toBeInTheDocument()
    expect(within(bar).getByRole('link', { name: /길찾기/ })).toHaveAttribute('href', '/events/1/directions')
    expect(screen.getAllByRole('button', { name: '공유' })).toHaveLength(1)
    expect(screen.queryByText('행사 목록으로')).not.toBeInTheDocument()
    expect(screen.getByText('041-900-7392').closest('a')).toHaveAttribute('href', 'tel:0419007392')
    expect(screen.getAllByText('일부 체험 유료').length).toBeGreaterThan(0)
  })

  it('공유: navigator.share 가 있으면 공유 시트, 없으면 링크 복사', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: '공유' }))
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: '흥타령춤축제' }))

    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } })
    await userEvent.click(screen.getByRole('button', { name: '공유' }))
    expect(write).toHaveBeenCalled()
    expect(await screen.findByText('링크를 복사했어요')).toBeInTheDocument()
  })

  it('하단 찜하기는 기존 찜 토글을 쓴다(로그인 상태면 바로 찜)', async () => {
    let posted = false
    server.use(
      http.get('*/api/events/1', () => ok(baseEvent)),
      http.post('*/api/bookmarks*', () => {
        posted = true
        return ok({}, 201)
      }),
    )
    renderPage()
    const bar = await screen.findByTestId('mobile-bottom-bar')
    await userEvent.click(within(bar).getByRole('button', { name: /찜하기/ }))
    await waitFor(() => expect(posted).toBe(true))
  })

  it('S8: 사진 없음·리뷰 없음 안내와 접힌 작성 폼', async () => {
    server.use(http.get('*/api/events/1', () => ok({ ...baseEvent, image_url: null, review_count: 0, average_rating: null, reviews: [] })))
    renderPage()
    expect(await screen.findByText('등록된 사진이 없어요')).toBeInTheDocument()
    expect(screen.getByText('아직 리뷰가 없어요')).toBeInTheDocument()
    expect(screen.getByTestId('reviews-empty')).toHaveTextContent('첫 리뷰의 주인공이 되어 보세요!')
    expect(screen.getByTestId('review-form')).toHaveAttribute('data-expanded', 'false')
    expect(screen.getByRole('button', { name: /사진 추가 \(최대 5장\)/ })).toBeInTheDocument()
  })

  it('M5-2: 별점을 고르면 폼이 펼쳐지고 등록한다', async () => {
    let posted = false
    server.use(
      http.get('*/api/events/1', () => ok({ ...baseEvent, reviews: [other], review_count: 1 })),
      http.post('*/api/reviews', () => {
        posted = true
        return ok({}, 201)
      }),
    )
    renderPage()
    const form = await screen.findByTestId('review-form')
    expect(form).toHaveAttribute('data-expanded', 'false')
    await userEvent.click(within(form).getByRole('radio', { name: '4.5점' }))
    const open = screen.getByTestId('review-form')
    expect(open).toHaveAttribute('data-expanded', 'true')
    expect(open).toHaveTextContent('4.5점')
    expect(within(open).getByRole('button', { name: /사진 추가 \(0\/5\)/ })).toBeInTheDocument()
    await userEvent.type(within(open).getByLabelText('리뷰 내용'), '좋았어요')
    expect(open).toHaveTextContent('4 / 1000')
    await userEvent.click(within(open).getByRole('button', { name: '리뷰 등록' }))
    await waitFor(() => expect(posted).toBe(true))
    expect(await screen.findByText('리뷰가 등록됐어요!')).toBeInTheDocument()
  })

  it('로그인 전 폼을 누르면 로그인 유도를 띄우고 펼치지 않는다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderPage(false)
    expect(await screen.findByText('로그인하면 행사 상세를 볼 수 있어요')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-bottom-bar')).not.toBeInTheDocument()
  })

  it('S10: 내 리뷰 수정은 하단 시트로 열리고, 수정 완료로 저장한다', async () => {
    let saved = false
    server.use(
      http.get('*/api/events/1', () => ok(baseEvent)),
      http.put('*/api/reviews/1', () => {
        saved = true
        return ok({})
      }),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    const sheet = screen.getByRole('dialog', { name: '리뷰 수정' })
    expect(screen.getByTestId('bottom-sheet-backdrop')).toContainElement(sheet)
    expect(within(sheet).getByText('흥타령춤축제')).toBeInTheDocument()
    expect(within(sheet).getByText('4/1000')).toBeInTheDocument()
    expect(within(sheet).getByText('2/5')).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: '취소' })).not.toBeInTheDocument()
    await userEvent.type(within(sheet).getByLabelText('리뷰 내용'), '!')
    await userEvent.click(within(sheet).getByRole('button', { name: '수정 완료' }))
    await waitFor(() => expect(saved).toBe(true))
    expect(await screen.findByText('리뷰를 수정했어요')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '리뷰 수정' })).not.toBeInTheDocument()
  })

  it('S12: 바꾼 내용이 있으면 닫기 전에 확인한다(계속 수정 / 닫기). 안 바꿨으면 바로 닫힌다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: '수정' }))
    let sheet = screen.getByRole('dialog', { name: '리뷰 수정' })
    await userEvent.click(within(sheet).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog', { name: '리뷰 수정' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '수정' }))
    sheet = screen.getByRole('dialog', { name: '리뷰 수정' })
    await userEvent.type(within(sheet).getByLabelText('리뷰 내용'), '!')
    fireEvent.mouseDown(screen.getByTestId('bottom-sheet-backdrop'))
    const confirm = screen.getByRole('dialog', { name: '수정 취소 확인' })
    expect(confirm).toHaveTextContent('수정한 내용이 사라져요')
    expect(within(confirm).getAllByRole('button').map((b) => b.textContent)).toEqual(['닫기', '계속 수정'])
    await userEvent.click(within(confirm).getByRole('button', { name: '계속 수정' }))
    expect(screen.queryByRole('dialog', { name: '수정 취소 확인' })).not.toBeInTheDocument()
    expect((within(sheet).getByLabelText('리뷰 내용') as HTMLTextAreaElement).value).toBe('내 리뷰!')

    await userEvent.click(within(sheet).getByRole('button', { name: '닫기' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: '수정 취소 확인' })).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog', { name: '리뷰 수정' })).not.toBeInTheDocument()
  })

  it('S11: 삭제 확인은 아이콘 없는 가운데 창, 검정 "삭제하기"로 지운다', async () => {
    let deleted = false
    server.use(
      http.get('*/api/events/1', () => ok(baseEvent)),
      http.delete('*/api/reviews/1', () => {
        deleted = true
        return ok({})
      }),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: '삭제' }))
    const dialog = screen.getByRole('dialog', { name: '리뷰 삭제 확인' })
    expect(dialog).toHaveTextContent('삭제한 리뷰와 사진은 다시 복구할 수 없어요.')
    const [cancel, confirm] = within(dialog).getAllByRole('button')
    expect(cancel).toHaveTextContent('취소')
    expect(confirm).toHaveClass('bg-ink')
    await userEvent.click(confirm)
    await waitFor(() => expect(deleted).toBe(true))
    expect(await screen.findByText('리뷰를 삭제했어요')).toBeInTheDocument()
  })

  it('S9: 리뷰 사진 크게 보기 — 화살표 없이 밀어서 넘기고 아래로 내려 닫는다', async () => {
    server.use(http.get('*/api/events/1', () => ok(baseEvent)))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /리뷰 사진 1 크게 보기/ }))
    const box = screen.getByRole('dialog', { name: '민지님의 리뷰 사진' })
    expect(box).toHaveTextContent('1 / 2')
    expect(within(box).queryByRole('button', { name: '다음 사진' })).not.toBeInTheDocument()
    expect(box).toHaveTextContent('옆으로 넘기면 다음 사진, 아래로 내리면 닫혀요')
    fireEvent.touchStart(box, { touches: [{ clientX: 300, clientY: 400 }] })
    fireEvent.touchEnd(box, { changedTouches: [{ clientX: 100, clientY: 410 }] })
    expect(box).toHaveTextContent('2 / 2')
    fireEvent.touchStart(box, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(box, { changedTouches: [{ clientX: 210, clientY: 500 }] })
    expect(screen.queryByRole('dialog', { name: '민지님의 리뷰 사진' })).not.toBeInTheDocument()
  })
})
