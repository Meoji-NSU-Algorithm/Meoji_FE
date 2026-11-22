import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from 'msw'
import { server } from '../mocks/server'
import { fail, ok } from '../mocks/handlers'
import { putProfileImage, putProfileImageSource } from './users'

const png = () => new File(['x'], 'a.png', { type: 'image/png' })

describe('프로필 사진 API (BE 계약)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('multipart 필드명은 image 이고 한 장만 보낸다', async () => {
    // jsdom 의 FormData 는 MSW 핸들러에서 파싱할 수 없어서, 본문에 넣은 필드 이름을 직접 가로채 확인한다.
    const append = vi.spyOn(FormData.prototype, 'append')
    let contentType = ''
    server.use(
      http.put('*/api/users/me/profile-image', ({ request }) => {
        contentType = request.headers.get('content-type') ?? ''
        return ok({ id: 1, email: 'a@b.c', nickname: '테스터', profile_image: 'https://img.test/p.webp' })
      }),
    )
    const user = await putProfileImage(png())
    expect(append.mock.calls.map((c) => c[0])).toEqual(['image'])
    expect(contentType).toContain('multipart/form-data')
    expect(user.profile_image).toBe('https://img.test/p.webp')
  })

  it('source 는 JSON 본문 { source } 로 보낸다', async () => {
    let body: unknown
    server.use(
      http.put('*/api/users/me/profile-image/source', async ({ request }) => {
        body = await request.json()
        return ok({ id: 1, email: 'a@b.c', nickname: '테스터', profile_image: null })
      }),
    )
    await putProfileImageSource('default')
    expect(body).toEqual({ source: 'default' })
  })

  it('IMAGE_INVALID 는 ApiError 코드로 전달된다', async () => {
    server.use(http.put('*/api/users/me/profile-image', () => fail(400, 'IMAGE_INVALID')))
    await expect(putProfileImage(png())).rejects.toMatchObject({ code: 'IMAGE_INVALID' })
  })
})
