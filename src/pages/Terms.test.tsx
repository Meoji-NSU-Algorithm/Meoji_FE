import { render, screen, waitFor, within } from '@testing-library/react'
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
  it('처음에는 모두 해제돼 있고 필수 둘에 동의해야 시작할 수 있다 (마케팅은 선택)', async () => {
    setup()
    const start = await screen.findByRole('button', { name: '동의하고 시작하기' })
    for (const c of screen.getAllByRole('checkbox')) expect(c).not.toBeChecked()
    expect(start).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /이용약관/ }))
    expect(start).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /개인정보/ }))
    expect(start).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: /마케팅/ })).not.toBeChecked()
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
    await userEvent.click(await screen.findByRole('checkbox', { name: '모두 동의하기' }))
    await userEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }))
    expect(await screen.findByText('홈 화면')).toBeInTheDocument()
    expect(body).toEqual({ terms: true, privacy: true, marketing: true })
  })

  it('마케팅 없이 필수만 동의하면 marketing=false 로 저장한다', async () => {
    let body: unknown
    server.use(
      http.post('*/api/users/me/consents', async ({ request }) => {
        body = await request.json()
        return ok(consentsRes)
      }),
    )
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: /이용약관/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /개인정보/ }))
    await userEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }))
    expect(await screen.findByText('홈 화면')).toBeInTheDocument()
    expect(body).toEqual({ terms: true, privacy: true, marketing: false })
  })

  it("'보기'는 약관 본문 모달을 열고 확인으로 닫는다", async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: '이용약관 보기' }))
    const dialog = screen.getByRole('dialog', { name: '이용약관' })
    expect(within(dialog).getByText('제1조 (목적)')).toBeInTheDocument()
    expect(within(dialog).getByText(/시행일/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '개인정보 수집·이용 보기' }))
    expect(screen.getByRole('dialog', { name: '개인정보처리방침' })).toBeInTheDocument()
  })

  it('저장 실패 시 안내 문구와 다시 시도 버튼을 보여주고, 다시 시도하면 저장된다', async () => {
    let fails = true
    server.use(
      http.post('*/api/users/me/consents', () => (fails ? fail(500, 'COMMON_INTERNAL_ERROR') : ok(consentsRes))),
    )
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: '모두 동의하기' }))
    await userEvent.click(screen.getByRole('button', { name: '동의하고 시작하기' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/동의 내용을 저장하지 못했어요\.\s*잠시 후 다시 시도해 주세요\./)
    expect(screen.queryByText('홈 화면')).not.toBeInTheDocument()
    fails = false
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('홈 화면')).toBeInTheDocument()
  })

  it('취소하면 로그아웃하고 로그인 화면으로 간다', async () => {
    setup()
    await userEvent.click(await screen.findByRole('button', { name: '취소' }))
    await waitFor(() => expect(tokenStorage.getAccessToken()).toBeNull())
    expect(await screen.findByText('로그인 화면')).toBeInTheDocument()
  })
})
