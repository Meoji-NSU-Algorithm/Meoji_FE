import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

function setup(bookmarks = 6, reviews = 3) {
  tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  server.use(
    http.get('*/api/bookmarks', () => ok({ totalCount: bookmarks, events: [] })),
    http.get('*/api/reviews/my', () => ok(Array.from({ length: reviews }, (_, i) => ({ id: i + 1 })))),
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
  it('0개인 항목은 문구에서 빼고, 둘 다 0이면 그 줄을 뺀다', async () => {
    setup(0, 2)
    expect(await screen.findByText('작성한 리뷰 2개')).toBeInTheDocument()
    expect(screen.queryByText(/찜한 행사/)).not.toBeInTheDocument()
    cleanup()
    setup(4, 0)
    expect(await screen.findByText('찜한 행사 4개')).toBeInTheDocument()
    expect(screen.queryByText(/작성한 리뷰/)).not.toBeInTheDocument()
    cleanup()
    setup(0, 0)
    expect(await screen.findByText('삭제된 정보는 다시 복구할 수 없어요')).toBeInTheDocument()
    expect(screen.queryByText(/가 삭제돼요/)).not.toBeInTheDocument()
  })

  it('실제 찜/리뷰 개수를 보여주고 동의해야 탈퇴할 수 있다', async () => {
    setup()
    expect(await screen.findByText('찜한 행사 6개')).toBeInTheDocument()
    expect(screen.getByText('작성한 리뷰 3개')).toBeInTheDocument()
    expect(screen.getByText(/가 삭제돼요/)).toHaveTextContent('찜한 행사 6개와 작성한 리뷰 3개가 삭제돼요')
    expect(screen.queryByText(/떠나시는 이유/)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    const submit = screen.getByRole('button', { name: '탈퇴하기' })
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
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
    expect(await screen.findByText('탈퇴가 완료됐어요')).toBeInTheDocument()
    expect(screen.getByText('찜한 행사와 작성한 리뷰가 모두 삭제됐고, 카카오 계정 연결도 해제됐어요.')).toBeInTheDocument()
    // E9 헤더는 로그아웃 상태(로그인 버튼)
    expect(screen.getByRole('button', { name: /로그인/ })).toBeInTheDocument()
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
