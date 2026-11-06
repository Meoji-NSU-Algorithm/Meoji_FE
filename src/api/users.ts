import { api } from './client'
import { tokenStorage } from '../auth/tokenStorage'
import type { ProfileUpdate, User } from './types'

// ===== MOCK: 프로필 수정 =====
// BE에 프로필 수정 API가 없어 localStorage에 사용자별 덮어쓰기 값을 저장한다.
// BE가 PUT /api/users/me 를 제공하면 updateProfile 본문과 getMe의 병합 로직만 교체한다.
const overrideKey = (id: number) => `cheonanon.mock.profile.${id}`

function readOverride(id: number): ProfileUpdate {
  try {
    return JSON.parse(localStorage.getItem(overrideKey(id)) ?? '{}') as ProfileUpdate
  } catch {
    return {}
  }
}

// 같은 토큰으로 동시에 들어온 /users/me 요청은 하나를 공유한다. 끝나면(성공/실패) 비운다.
const inflightMe = new Map<string | null, Promise<User>>()

export function getMe(): Promise<User> {
  const token = tokenStorage.getAccessToken()
  let pending = inflightMe.get(token)
  if (!pending) {
    pending = api.get<User>('/users/me').finally(() => inflightMe.delete(token))
    inflightMe.set(token, pending)
  }
  return pending.then((me) => ({ ...me, ...readOverride(me.id) })) // MOCK 병합
}

/** MOCK: 서버에 저장되지 않는다. */
export async function updateProfile(userId: number, patch: ProfileUpdate): Promise<User> {
  const next = { ...readOverride(userId), ...patch }
  try {
    localStorage.setItem(overrideKey(userId), JSON.stringify(next))
  } catch {
    /* 저장 불가 */
  }
  return getMe()
}
