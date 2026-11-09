import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import type { AuthContextValue } from '../auth/AuthContext'
import { ToastProvider } from '../components'
import Layout from './Layout'

const auth: AuthContextValue = {
  user: { id: 7, email: null, nickname: '민지', profile_image: null },
  isLoading: false,
  isLoggedIn: true,
  loginWithKakaoCode: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isLoginPromptOpen: false,
  openLoginPrompt: vi.fn(),
  closeLoginPrompt: vi.fn(),
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="*" element={<div>본문</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function activeLabel() {
  return screen
    .getAllByRole('link')
    .filter((a) => a.getAttribute('aria-current') === 'page')
    .map((a) => a.textContent)
}

describe('Layout 헤더 활성 탭', () => {
  it.each([
    ['/', '홈'],
    ['/events', '행사 목록'],
    ['/calendar', '행사 목록'],
    ['/map', '행사 목록'],
    ['/my', '마이페이지'],
    ['/my/bookmarks', '마이페이지'],
    ['/my/withdraw/done', '홈'],
  ])('%s 에서는 %s 탭이 활성화된다', (path, label) => {
    renderAt(path)
    expect(activeLabel()).toEqual([label])
  })
})
