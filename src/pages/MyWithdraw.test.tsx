import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import { fail, ok } from '../mocks/handlers'
import App from '../App'
import { AuthProvider, tokenStorage } from '../auth'
import { ToastProvider } from '../components'

function setup() {
  tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  server.use(
    http.get('*/api/bookmarks', () => ok({ totalCount: 6, events: [] })),
    http.get('*/api/reviews/my', () => ok([{ id: 1 }, { id: 2 }, { id: 3 }])),
  )
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/my/withdraw']}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => tokenStorage.clear())

describe('MyWithdraw', () => {
  it('실제 찜/리뷰 개수를 보여주고 동의해야 탈퇴할 수 있다', async () => {
    setup()
    expect(await screen.findByText('찜한 행사 6개와 캘린더 일정이 모두 삭제돼요')).toBeInTheDocument()
    expect(screen.getByText(/작성한 리뷰 3개/)).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: '탈퇴하기' })
    expect(submit).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: '사용하기 불편해요' }))
    expect(submit).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(submit).toBeEnabled()
  })

  it('탈퇴하면 토큰을 지우고 완료 화면을 보여준다 (사유는 보내지 않는다)', async () => {
    let called = 0
    let bodyText = 'unset'
    server.use(
      http.delete('*/api/users/me', async ({ request }) => {
        called += 1
        bodyText = await request.text()
        return ok(null)
      }),
    )
    setup()
    await userEvent.click(await screen.findByRole('radio', { name: '기타' }))
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
    expect(await screen.findByText('탈퇴가 완료됐어요')).toBeInTheDocument()
    expect(screen.getByText('찜·리뷰·캘린더 정보가 모두 삭제됐고, 카카오 계정 연결도 해제됐어요.')).toBeInTheDocument()
    expect(called).toBe(1)
    expect(bodyText).toBe('')
    expect(tokenStorage.getAccessToken()).toBeNull()
  })

  it('실패하면 에러 문구를 보여주고 토큰을 유지한다', async () => {
    server.use(http.delete('*/api/users/me', () => fail(500, 'COMMON_INTERNAL_ERROR')))
    setup()
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('서버에 문제가 생겼어요')
    await waitFor(() => expect(tokenStorage.getAccessToken()).toBe('a'))
  })
})
