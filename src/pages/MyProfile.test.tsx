import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { getMe } from '../api/users'
import type { User } from '../api/types'
import { AuthContext } from '../auth/AuthContext'
import { ToastProvider } from '../components'
import { fail } from '../mocks/handlers'
import { server } from '../mocks/server'
import MyProfile from './MyProfile'

const NEW_URL = 'https://img.test/profiles/new.webp'
const me = (profile_image: string | null) => ({ success: true, data: { id: 1, email: 'a@b.c', nickname: '안민영', profile_image } })

function Harness({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>({ id: 1, email: 'a@b.c', nickname: '안민영', profile_image: null })
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: false,
        isLoggedIn: true,
        loginWithKakaoCode: vi.fn(),
        logout: vi.fn(() => Promise.resolve()),
        refreshUser: async () => setUser(await getMe()),
        isLoginPromptOpen: false,
        openLoginPrompt: vi.fn(),
        closeLoginPrompt: vi.fn(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const setup = () => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToastProvider>
          <Harness>
            <MyProfile />
          </Harness>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const file = (type: string, size = 100) => {
  const f = new File(['x'], 'p.img', { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}
const album = () => screen.getByTestId('profile-album-input') as HTMLInputElement
const openMenu = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: '프로필 사진 변경' }))

/** 요청이 갔는지만 센다 (jsdom 은 multipart 본문을 읽지 못한다) */
function track(path: string, reply: () => Response) {
  const hit = vi.fn()
  server.use(http.put(`*/api/users/me/${path}`, () => { hit(); return reply() }))
  return hit
}

describe('프로필 사진 변경', () => {
  it('카메라 배지로 메뉴를 열고 Esc 로 닫으며 포커스를 돌려준다', async () => {
    const user = userEvent.setup()
    setup()
    const badge = screen.getByRole('button', { name: '프로필 사진 변경' })
    expect(badge).toHaveAttribute('aria-haspopup', 'menu')
    expect(badge).toHaveAttribute('aria-expanded', 'false')
    await user.click(badge)
    expect(badge).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['앨범에서 선택', '사진 촬영', '기본 이미지로 변경'])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(badge).toHaveFocus()
    await user.click(badge)
    await user.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('사진 촬영 입력은 capture 를 쓴다', () => {
    setup()
    expect(screen.getByTestId('profile-camera-input')).toHaveAttribute('capture', 'user')
    expect(album()).not.toHaveAttribute('capture')
  })

  it('올리면 아바타 사진이 바뀌고 저장 토스트를 보여준다', async () => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    server.use(http.get('*/api/users/me', () => HttpResponse.json(me(NEW_URL))))
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
    const user = userEvent.setup()
    const { container } = setup()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: '앨범에서 선택' }))
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    expect(await screen.findByText('프로필을 저장했어요!')).toBeInTheDocument()
    expect(hit).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', NEW_URL))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it.each([
    ['형식이 다르면', file('image/gif'), 'JPG, PNG, WEBP 사진만'],
    ['10MB 를 넘으면', file('image/jpeg', 10 * 1024 * 1024 + 1), '10MB 이하 사진만'],
  ])('%s 요청 없이 안내한다', async (_n, f, text) => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    setup()
    fireEvent.change(album(), { target: { files: [f] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(hit).not.toHaveBeenCalled()
  })

  it.each([
    ['IMAGE_TOO_LARGE', 413, '10MB 이하 사진만'],
    ['IMAGE_INVALID', 400, 'JPG, PNG, WEBP 사진만'],
  ])('서버가 %s 를 주면 안내를 보여준다', async (code, status, text) => {
    track('profile-image', () => fail(status, code))
    URL.createObjectURL = vi.fn(() => 'blob:p')
    URL.revokeObjectURL = vi.fn()
    setup()
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(screen.queryByText('프로필을 저장했어요!')).not.toBeInTheDocument()
  })

  it('기본 이미지로 변경은 source=default 를 보낸다', async () => {
    const hit = track('profile-image/source', () => HttpResponse.json(me(null)))
    const user = userEvent.setup()
    setup()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: '기본 이미지로 변경' }))
    expect(await screen.findByText('프로필을 저장했어요!')).toBeInTheDocument()
    expect(hit).toHaveBeenCalledTimes(1)
  })
})
