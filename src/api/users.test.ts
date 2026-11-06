import { describe, expect, it } from 'vitest'
import { http } from 'msw'
import { server } from '../mocks/server'
import { fail, ok } from '../mocks/handlers'
import { getMe } from './users'
import { tokenStorage } from '../auth/tokenStorage'

const user = (id: number) => ({ id, email: null, nickname: `u${id}`, profile_image: null })

describe('getMe 중복 요청 방지', () => {
  it('같은 토큰의 동시 호출은 요청 하나를 공유하고, 끝나면 다시 조회한다', async () => {
    tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
    let calls = 0
    server.use(http.get('*/api/users/me', async () => {
      calls++
      await new Promise((r) => setTimeout(r, 20))
      return ok(user(1))
    }))
    const results = await Promise.all([getMe(), getMe(), getMe()])
    expect(results.map((u) => u.id)).toEqual([1, 1, 1])
    expect(calls).toBe(1)
    await getMe()
    expect(calls).toBe(2)
  })
  it('토큰이 다르면 별도로 요청한다', async () => {
    const seen: (string | null)[] = []
    server.use(http.get('*/api/users/me', async ({ request }) => {
      const auth = request.headers.get('authorization')
      seen.push(auth)
      await new Promise((r) => setTimeout(r, 20))
      return ok(user(auth === 'Bearer b' ? 2 : 1))
    }))
    tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
    const first = getMe()
    tokenStorage.setTokens({ access_token: 'b', refresh_token: 'r' })
    const second = getMe()
    expect((await first).id).toBe(1)
    expect((await second).id).toBe(2)
    expect(seen.sort()).toEqual(['Bearer a', 'Bearer b'])
  })
  it('실패한 요청은 다음 호출에서 재시도한다', async () => {
    tokenStorage.setTokens({ access_token: 'a', refresh_token: 'r' })
    let calls = 0
    server.use(http.get('*/api/users/me', () => (++calls === 1 ? fail(500, 'SERVER_ERROR') : ok(user(1)))))
    await expect(getMe()).rejects.toMatchObject({ status: 500 })
    expect((await getMe()).id).toBe(1)
    expect(calls).toBe(2)
  })
})
