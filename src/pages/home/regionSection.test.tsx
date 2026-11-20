import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../auth'
import { ToastProvider } from '../../components'
import { RegionSection } from './Sections'

const ev = (id: number, sido: string) =>
  ({ id, title: `행사${id}`, category_id: 1, category: '축제', sido_code: '1', sido, start_date: '2099-01-01', end_date: '2099-01-02', venue_name: '장소', image_url: null, price: null, is_free: true }) as any
const state = { isLoading: false, isError: false, refetch: () => {} } as any

function setup(events: any[]) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
    <AuthProvider>
      <MemoryRouter>
        <ToastProvider>
          <RegionSection events={events} state={state} />
        </ToastProvider>
      </MemoryRouter>
    </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('RegionSection', () => {
  it('기본 선택은 전체이고 모든 지역의 행사를 보여준다', () => {
    setup([ev(1, '충남'), ev(2, '서울'), ev(3, '제주')])
    const region = screen.getByRole('region', { name: '지역별 행사' })
    expect(within(region).getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true')
    for (const t of ['행사1', '행사2', '행사3']) expect(within(region).getAllByText(t).length).toBeGreaterThan(0)
  })

  it('비어 있으면 전체는 지역명 없이, 지역 선택 시 지역명과 함께 안내한다', async () => {
    setup([])
    expect(screen.getByText('아직 등록된 행사가 없어요')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '서울' }))
    expect(screen.getByText('서울 지역의 행사가 아직 없어요')).toBeInTheDocument()
  })
})
