import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components'
import { ReviewEditModal } from './ReviewEditModal'

const review = { id: 1, event_id: 1, rating: 4, content: '내 리뷰', images: [{ key: 'k1', url: 'https://img.test/1.jpg' }] }

function setup() {
  const onClose = vi.fn()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <ReviewEditModal review={review} eventTitle="흥타령춤축제" onClose={onClose} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return onClose
}

describe('리뷰 수정 모달 닫기 확인', () => {
  it('바뀐 게 없으면 취소·×·Esc·바깥 모두 바로 닫는다', async () => {
    const onClose = setup()
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    await userEvent.keyboard('{Escape}')
    fireEvent.mouseDown(screen.getByRole('dialog', { name: '리뷰 수정' }).parentElement!)
    expect(onClose).toHaveBeenCalledTimes(4)
    expect(screen.queryByText('수정한 내용이 사라져요')).not.toBeInTheDocument()
  })

  it('내용을 바꾸고 닫으면 확인을 먼저 보여 준다. 계속 수정하면 모달이 남고, 닫기를 누르면 닫는다', async () => {
    const onClose = setup()
    await userEvent.type(screen.getByLabelText('리뷰 내용'), '!')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('수정한 내용이 사라져요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '계속 수정' }))
    expect(screen.queryByText('수정한 내용이 사라져요')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '리뷰 수정' })).toBeInTheDocument()
    expect((screen.getByLabelText('리뷰 내용') as HTMLTextAreaElement).value).toBe('내 리뷰!')
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('수정한 내용이 사라져요')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog', { name: '수정 취소 확인' })).getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('사진을 지우거나 별점을 바꿔도 바뀐 것으로 본다. 확인 중 Esc 는 확인만 닫는다', async () => {
    const onClose = setup()
    await userEvent.click(screen.getByRole('button', { name: '첨부 사진 1 삭제' }))
    fireEvent.mouseDown(screen.getByRole('dialog', { name: '리뷰 수정' }).parentElement!)
    expect(screen.getByText('수정한 내용이 사라져요')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('수정한 내용이 사라져요')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
