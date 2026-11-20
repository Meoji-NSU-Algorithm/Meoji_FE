import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Chip, ErrorState, EventCard, Header, Modal, RatingStars, ToastView, formatDateRange, formatViewCount, priceLabel } from '.'
import type { EventCardData } from '.'

const event: EventCardData = {
  id: 1,
  title: '2026 천안흥타령춤축제',
  category: '축제',
  sido: '충남',
  start_date: '2026-10-22',
  end_date: '2026-10-26',
  venue_name: '천안종합운동장 일원',
  image_url: null,
  price: null,
  is_free: true,
}

describe('formatDateRange', () => {
  it('요일을 붙여 범위를 만든다', () => {
    expect(formatDateRange('2026-10-22', '2026-10-26')).toBe('10.22(목) – 10.26(월)')
    expect(formatDateRange('2026-11-07', '2026-11-07')).toBe('11.7(토)')
  })
})

describe('EventCard', () => {
  it('조회수를 표시하고, 가격 null 은 안내 문구를 보여준다', () => {
    render(<EventCard event={{ ...event, is_free: null, price: null, view_count: 12000 }} />)
    expect(screen.getByText('조회 1.2만')).toBeInTheDocument()
    expect(screen.getByText('가격 정보 없음')).toBeInTheDocument()
    expect(screen.queryByText('무료')).not.toBeInTheDocument()
  })
  it('썸네일이 없으면 플레이스홀더를 보여주고 무료를 표시한다', () => {
    render(<EventCard event={event} variant="ranked" rank={1} />)
    expect(screen.getByTestId('thumbnail-placeholder')).toBeInTheDocument()
    expect(screen.getByText('무료')).toBeInTheDocument()
    expect(screen.getByLabelText('1위')).toBeInTheDocument()
  })

  it('작은 무료 카드는 사진에 무료 배지를 올리지 않고 "무료 [지역 · 분류]" 줄을 보여준다', () => {
    const { container } = render(<EventCard event={event} variant="small" />)
    const photo = container.querySelector('article > div') as HTMLElement
    expect(within(photo).queryByText('무료')).not.toBeInTheDocument()
    expect(screen.getAllByText('무료')).toHaveLength(1)
    expect(screen.getByText('무료')).toHaveClass('text-free')
    expect(screen.getAllByText('충남 · 축제').length).toBeGreaterThan(0)
  })

  it('rating/review_count 필드가 없어도 크래시 없이 별점 줄을 숨긴다', () => {
    expect('rating' in event || 'review_count' in event).toBe(false)
    const { container } = render(<EventCard event={event} />)
    expect(screen.getByRole('button', { name: event.title })).toBeInTheDocument()
    expect(container.querySelector('svg.text-star')).toBeNull()
  })

  it('categoryPill 이면 사진 왼쪽 위에 분류 알약을 그리고, 분류가 없으면 그리지 않는다', () => {
    const { container, rerender } = render(<EventCard event={event} variant="small" categoryPill />)
    const photo = container.querySelector('article > div') as HTMLElement
    expect(within(photo).getByText('축제', { selector: 'span.absolute' })).toHaveClass('left-3', 'top-3', 'bg-surface')
    rerender(<EventCard event={{ ...event, category: '' }} variant="small" categoryPill />)
    expect(container.querySelector('span.absolute.left-3.top-3')).toBeNull()
    rerender(<EventCard event={event} variant="small" />)
    expect(container.querySelector('span.absolute.left-3.top-3')).toBeNull()
  })

  it('하트는 카드 클릭과 분리되어 onToggleLike 만 호출한다', async () => {
    const onToggleLike = vi.fn()
    const onClick = vi.fn()
    render(<EventCard event={event} onToggleLike={onToggleLike} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: '찜하기' }))
    expect(onToggleLike).toHaveBeenCalledWith(event, true)
    expect(onClick).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: event.title }))
    expect(onClick).toHaveBeenCalledWith(event)
  })
})

describe('RatingStars', () => {
  it('0.5 단위로 선택한다', async () => {
    const onChange = vi.fn()
    render(<RatingStars value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: '3.5점' }))
    expect(onChange).toHaveBeenCalledWith(3.5)
  })

  it('읽기 모드에서 값을 라벨로 노출한다', () => {
    render(<RatingStars value={4.3} />)
    expect(screen.getByRole('img', { name: '별점 4.5점 / 5점' })).toBeInTheDocument()
  })
})

describe('Header', () => {
  it('비로그인이면 로그인 버튼, 로그인이면 아바타', async () => {
    const onLoginClick = vi.fn()
    const { rerender } = render(<Header onLoginClick={onLoginClick} />)
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))
    expect(onLoginClick).toHaveBeenCalled()
    rerender(<Header user={{ name: '민지' }} />)
    expect(screen.queryByRole('button', { name: '로그인' })).toBeNull()
    expect(screen.getByText('민')).toBeInTheDocument()
  })

  it('검색 제출 시 값을 넘긴다', async () => {
    const onSearchSubmit = vi.fn()
    render(<Header onSearchSubmit={onSearchSubmit} />)
    await userEvent.type(screen.getByLabelText('행사 검색'), '불꽃{Enter}')
    expect(onSearchSubmit).toHaveBeenCalledWith('불꽃')
  })
})

describe('Modal', () => {
  it('ESC 로 닫힌다', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} ariaLabel="로그인 안내">내용</Modal>)
    expect(screen.getByRole('dialog', { name: '로그인 안내' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('닫혀 있으면 렌더하지 않는다', () => {
    render(<Modal open={false} onClose={() => {}}>x</Modal>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Chip / Toast / ErrorState', () => {
  it('Chip 은 aria-pressed 로 선택 상태를 알린다', () => {
    render(<Chip selected>충남</Chip>)
    expect(screen.getByRole('button', { name: '충남' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('ToastView 액션 클릭', async () => {
    const onAction = vi.fn()
    render(<ToastView message="찜을 해제했어요" actionLabel="되돌리기" onAction={onAction} />)
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))
    expect(onAction).toHaveBeenCalled()
  })

  it('ErrorState 다시 시도', async () => {
    const onRetry = vi.fn()
    render(<ErrorState code="404" title="페이지를 찾을 수 없어요" onRetry={onRetry} />)
    expect(screen.getByText('404')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalled()
  })
})

describe('formatViewCount / priceLabel', () => {
  it('조회수: 1만 이상은 만 단위, 미만은 천 단위 구분, 0은 빈 문자열', () => {
    expect(formatViewCount(32000)).toBe('3.2만')
    expect(formatViewCount(10000)).toBe('1만')
    expect(formatViewCount(9620)).toBe('9,620')
    expect(formatViewCount(0)).toBe('')
    expect(formatViewCount(null)).toBe('')
  })
  it('가격: 무료 / 금액 / 정보 없음', () => {
    expect(priceLabel(null, true).text).toBe('무료')
    expect(priceLabel(15000, false)).toEqual({ text: '15,000원', tone: 'paid' })
    expect(priceLabel(null, null).text).toBe('가격 정보 없음')
    expect(priceLabel(0, false).text).toBe('가격 정보 없음')
  })
})

describe('EventCard 상태', () => {
  const base = { ...event, is_free: false, price: 15000 }
  it('리뷰가 있으면 별점 (리뷰 수) · 조회수', () => {
    render(<EventCard event={{ ...base, rating: 4.7, review_count: 128, view_count: 32000 }} />)
    expect(screen.getByText('4.7')).toBeInTheDocument()
    expect(screen.getByText('(128)')).toBeInTheDocument()
    expect(screen.getByText('· 조회 3.2만')).toBeInTheDocument()
    expect(screen.getByText('15,000원')).toBeInTheDocument()
  })
  it('리뷰가 없으면 별 없이 눈 아이콘 + 조회수만, 조회수 9,620 표기', () => {
    const { container } = render(<EventCard event={{ ...base, rating: 0, review_count: 0, view_count: 9620 }} />)
    expect(container.querySelector('svg.text-star')).toBeNull()
    expect(screen.getByText('조회 9,620')).toBeInTheDocument()
  })
  it('조회수 0이고 리뷰도 없으면 줄을 숨긴다', () => {
    render(<EventCard event={{ ...base, view_count: 0 }} />)
    expect(screen.queryByText(/조회/)).not.toBeInTheDocument()
  })
  it('사진 없음: 분류 색 그라데이션 + 시·도 + 제목, 분류가 없으면 축제 색', () => {
    const { rerender } = render(<EventCard event={{ ...base, category: '전시' }} />)
    expect(screen.getByTestId('thumbnail-placeholder').style.background).toContain('47, 43, 42')
    rerender(<EventCard event={{ ...base, category: '' }} />)
    expect(screen.getByTestId('thumbnail-placeholder').style.background).toContain('232, 70, 28')
  })
  it('찜 카드: 장소·지역 칩 없이 무료/유료/가격 정보 없음, 4:3', () => {
    const { container, rerender } = render(<EventCard event={{ ...base, is_free: true, image_url: 'x.jpg' }} variant="bookmark" liked />)
    expect(screen.getByText('무료')).toBeInTheDocument()
    expect(screen.queryByText('충남 · 축제')).toBeNull()
    expect(container.querySelector('[class*="aspect-[274"]')).not.toBeNull()
    rerender(<EventCard event={{ ...base, is_free: false, price: null }} variant="bookmark" liked />)
    expect(screen.getByText('유료')).toBeInTheDocument()
    rerender(<EventCard event={{ ...base, is_free: null, price: null }} variant="bookmark" liked />)
    expect(screen.getByText('가격 정보 없음')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '찜 해제' })).toBeInTheDocument()
  })
})
