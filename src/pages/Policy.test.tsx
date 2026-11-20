import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { AuthProvider, tokenStorage } from '../auth'
import { ToastProvider } from '../components'
import { POLICY_EFFECTIVE_DATE } from '../content/policies'

function renderAt(path: string) {
  tokenStorage.clear()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('약관 페이지', () => {
  it('/terms 는 로그인 없이 이용약관과 목차, 시행일을 보여준다', async () => {
    renderAt('/terms')
    expect(await screen.findByRole('heading', { name: '약관 및 정책' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '제1조 (목적)' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: '조항 목차' })).getByText('부칙')).toBeInTheDocument()
    expect(screen.getByText(`시행일 ${POLICY_EFFECTIVE_DATE}`)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '이용약관' })).toHaveAttribute('aria-selected', 'true')
  })

  it('탭으로 /privacy 로 바꾼다', async () => {
    renderAt('/terms')
    await userEvent.click(await screen.findByRole('tab', { name: '개인정보처리방침' }))
    expect(screen.getByRole('tab', { name: '개인정보처리방침' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: /수집하는 개인정보 항목/ })).toBeInTheDocument()
  })

  it('/privacy 로 바로 들어가도 방침이 보인다', async () => {
    renderAt('/privacy')
    expect(await screen.findByRole('heading', { name: /수집하는 개인정보 항목/ })).toBeInTheDocument()
  })

  it('푸터 링크는 약관·방침으로 가고 서비스 소개·문의하기는 없다', async () => {
    renderAt('/terms')
    const nav = await screen.findByRole('navigation', { name: '푸터 메뉴' })
    expect(within(nav).getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms')
    expect(within(nav).getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/privacy')
    expect(within(nav).queryByText('서비스 소개')).not.toBeInTheDocument()
    expect(within(nav).queryByText('문의하기')).not.toBeInTheDocument()
    await userEvent.click(within(nav).getByRole('link', { name: '개인정보처리방침' }))
    expect(await screen.findByRole('heading', { name: /수집하는 개인정보 항목/ })).toBeInTheDocument()
  })
})
