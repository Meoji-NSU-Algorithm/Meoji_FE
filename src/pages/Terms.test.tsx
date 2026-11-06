import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import { fail, ok } from '../mocks/handlers'
import { AuthProvider, tokenStorage } from '../auth'
import { ToastProvider } from '../components'
import Terms from './Terms'

function setup() {
  tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/auth/terms']}>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<div>홈 화면</div>} />
              <Route path="auth/login" element={<div>로그인 화면</div>} />
              <Route path="auth/terms" element={<Terms />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => tokenStorage.clear())

const consentsRes = { terms_agreed_at: 'x', privacy_agreed_at: 'x', marketing_agreed: false, marketing_agreed_at: null }

describe('Terms', () => {
  it('필수 항목 둘 다 동의해야 시작할 수 있다 (마케팅은 선택)', async () => {
    setup()
    const start = await screen.findByRole('button', { name: '동의하고 시작하기' })
    expect(start).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /서비스 이용약관/ }))
    expect(start).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /개인정보/ }))
    expect(start).toBeEnabled()
  })

  it('동의 내용을 저장하고 홈으로 이동한다', async () => {
    let body: unknown
    server.use(
      http.post('*/api/users/me/consents', async ({ request }) => {
        body = await request.json()
        return ok(consentsRes)
      }),
    )
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: '전체 동의' }))
    await userEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }))
    expect(await screen.findByText('홈 화면')).toBeInTheDocument()
    expect(body).toEqual({ terms: true, privacy: true, marketing: true })
  })

  it('저장 실패 시 에러 문구를 보여주고 이동하지 않는다', async () => {
    server.use(http.post('*/api/users/me/consents', () => fail(400, 'COMMON_INVALID_INPUT')))
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: '전체 동의' }))
    await userEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('입력한 내용을 다시 확인해 주세요')
    expect(screen.queryByText('홈 화면')).not.toBeInTheDocument()
  })

  it('취소하면 로그아웃하고 홈으로 간다', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: '취소' }))
    await waitFor(() => expect(tokenStorage.getAccessToken()).toBeNull())
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
  })
})
