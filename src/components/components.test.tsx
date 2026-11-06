import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Chip, ErrorState, EventCard, Header, Modal, RatingStars, ToastView, formatDateRange } from '.'
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
  it('썸네일이 없으면 플레이스홀더를 보여주고 무료를 표시한다', () => {
    render(<EventCard event={event} variant="ranked" rank={1} />)
    expect(screen.getByTestId('thumbnail-placeholder')).toBeInTheDocument()
    expect(screen.getByText('무료')).toBeInTheDocument()
    expect(screen.getByLabelText('1위')).toBeInTheDocument()
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
