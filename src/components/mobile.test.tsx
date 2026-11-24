import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useIsMobile } from '../lib/useIsMobile'
import { setViewportWidth } from '../test/viewport'
import { BottomSheet, MobileBottomBar, ResponsiveDialog } from '.'

describe('useIsMobile', () => {
  it('기본(테스트 1024px)은 false', () => {
    expect(renderHook(() => useIsMobile()).result.current).toBe(false)
  })

  it('767px 은 모바일, 768px 은 데스크톱', () => {
    setViewportWidth(767)
    expect(renderHook(() => useIsMobile()).result.current).toBe(true)
    setViewportWidth(768)
    expect(renderHook(() => useIsMobile()).result.current).toBe(false)
  })

  it('폭이 바뀌면 다시 그린다', () => {
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    setViewportWidth(390)
    expect(result.current).toBe(true)
    setViewportWidth(1280)
    expect(result.current).toBe(false)
  })
})

function SheetHarness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        열기
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          onClose()
          setOpen(false)
        }}
        title="필터"
        footer={<button type="button">적용하기</button>}
      >
        <p>본문</p>
      </BottomSheet>
    </>
  )
}

describe('BottomSheet', () => {
  it('열면 제목·본문·footer 가 보이고 X 로 닫힌다', async () => {
    render(<SheetHarness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '열기' }))
    const dialog = screen.getByRole('dialog', { name: '필터' })
    expect(dialog).toHaveFocus()
    expect(screen.getByRole('button', { name: '적용하기' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('ESC 로 닫힌다', async () => {
    const onClose = vi.fn()
    render(<SheetHarness onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: '열기' }))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('배경을 누르면 닫히고, 시트 안을 누르면 안 닫힌다', async () => {
    const onClose = vi.fn()
    render(<SheetHarness onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: '열기' }))
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(screen.getByTestId('bottom-sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closeOnBackdrop=false 면 배경 클릭을 무시한다', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} ariaLabel="확인" closeOnBackdrop={false}>
        x
      </BottomSheet>,
    )
    fireEvent.mouseDown(screen.getByTestId('bottom-sheet-backdrop'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('ResponsiveDialog', () => {
  it('데스크톱은 기존 Modal(가운데 제목), 모바일은 하단 시트', () => {
    const props = { open: true, onClose: () => {}, title: '리뷰 수정', children: <p>내용</p> }
    const { unmount } = render(<ResponsiveDialog {...props} />)
    expect(screen.queryByTestId('bottom-sheet-backdrop')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent('리뷰 수정')
    unmount()

    setViewportWidth(390)
    render(<ResponsiveDialog {...props} sheet={{ title: '시트 제목' }} />)
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '시트 제목' })).toHaveTextContent('내용')
  })
})

describe('MobileBottomBar', () => {
  it('데스크톱에서는 아무것도 그리지 않는다', () => {
    render(
      <MobileBottomBar>
        <button type="button">길찾기</button>
      </MobileBottomBar>,
    )
    expect(screen.queryByRole('button', { name: '길찾기' })).not.toBeInTheDocument()
  })

  it('모바일에서는 바닥 고정 바로 그린다', () => {
    setViewportWidth(390)
    render(
      <MobileBottomBar>
        <button type="button">길찾기</button>
      </MobileBottomBar>,
    )
    expect(screen.getByTestId('mobile-bottom-bar')).toHaveClass('fixed', 'bottom-0')
  })
})
