import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useEffect, useState, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe } from '../api/users'
import type { User } from '../api/types'
import { AuthContext } from '../auth/AuthContext'
import { ToastProvider } from '../components'
import { cropToFile } from '../lib/cropImage'
import { fail } from '../mocks/handlers'
import { server } from '../mocks/server'
import MyProfile from './MyProfile'

// jsdom 에는 레이아웃·canvas 가 없어서 자르기 영역 계산과 실제 자르기를 흉내 낸다
const AREA = { x: 10, y: 20, width: 300, height: 300 }
vi.mock('react-easy-crop', () => ({
  default: function CropperStub({ onCropComplete }: { onCropComplete: (a: typeof AREA, p: typeof AREA) => void }) {
    useEffect(() => onCropComplete(AREA, AREA), [onCropComplete])
    return <div data-testid="cropper" />
  },
}))
vi.mock('../lib/cropImage', () => ({ cropToFile: vi.fn() }))
const CROPPED = new File(['jpeg'], 'profile.jpg', { type: 'image/jpeg' })

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

  beforeEach(() => {
    vi.mocked(cropToFile).mockReset().mockResolvedValue(CROPPED)
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('사진을 고르면 자르기 모달이 열리고, 취소하면 올리지 않는다', async () => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    const user = userEvent.setup()
    setup()
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    const dialog = await screen.findByRole('dialog', { name: '사진 자르기' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('slider', { name: '확대' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '적용' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hit).not.toHaveBeenCalled()
    expect(cropToFile).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('Esc 나 바깥을 눌러도 올리지 않고 닫힌다', async () => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    const user = userEvent.setup()
    setup()
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    await screen.findByRole('dialog', { name: '사진 자르기' })
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    const dialog = await screen.findByRole('dialog', { name: '사진 자르기' })
    fireEvent.mouseDown(dialog.parentElement!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hit).not.toHaveBeenCalled()
  })

  it('적용하면 잘라낸 사진을 올리고 아바타가 바뀌며 저장 토스트를 보여준다', async () => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    server.use(http.get('*/api/users/me', () => HttpResponse.json(me(NEW_URL))))
    const append = vi.spyOn(FormData.prototype, 'append')
    const user = userEvent.setup()
    const { container } = setup()
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: '앨범에서 선택' }))
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    await screen.findByRole('dialog', { name: '사진 자르기' })
    await user.click(screen.getByRole('button', { name: '적용' }))
    expect(await screen.findByText('프로필을 저장했어요!')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cropToFile).toHaveBeenCalledWith('blob:preview', AREA)
    expect(hit).toHaveBeenCalledTimes(1)
    expect(append).toHaveBeenCalledWith('image', CROPPED)
    append.mockRestore()
    await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', NEW_URL))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('형식이 다르면 자르기 없이 안내한다', async () => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    setup()
    fireEvent.change(album(), { target: { files: [file('image/gif')] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG, WEBP 사진만')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hit).not.toHaveBeenCalled()
  })

  it('원본이 10MB 를 넘어도 자를 수 있고, 잘라낸 결과로 용량을 본다', async () => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    vi.mocked(cropToFile).mockResolvedValue(file('image/jpeg', 10 * 1024 * 1024 + 1))
    const user = userEvent.setup()
    setup()
    fireEvent.change(album(), { target: { files: [file('image/jpeg', 20 * 1024 * 1024)] } })
    await screen.findByRole('dialog', { name: '사진 자르기' })
    await user.click(screen.getByRole('button', { name: '적용' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('10MB 이하 사진만')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hit).not.toHaveBeenCalled()
  })

  it('사진을 자르지 못하면 안내하고 모달을 닫는다', async () => {
    const hit = track('profile-image', () => HttpResponse.json(me(NEW_URL)))
    vi.mocked(cropToFile).mockRejectedValue(new Error('CROP_FAILED'))
    const user = userEvent.setup()
    setup()
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    await screen.findByRole('dialog', { name: '사진 자르기' })
    await user.click(screen.getByRole('button', { name: '적용' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG, WEBP 사진만')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hit).not.toHaveBeenCalled()
  })

  it.each([
    ['IMAGE_TOO_LARGE', 413, '10MB 이하 사진만'],
    ['IMAGE_INVALID', 400, 'JPG, PNG, WEBP 사진만'],
  ])('서버가 %s 를 주면 안내를 보여준다', async (code, status, text) => {
    track('profile-image', () => fail(status, code))
    const user = userEvent.setup()
    setup()
    fireEvent.change(album(), { target: { files: [file('image/png')] } })
    await screen.findByRole('dialog', { name: '사진 자르기' })
    await user.click(screen.getByRole('button', { name: '적용' }))
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
