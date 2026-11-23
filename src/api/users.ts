import { api } from './client'
import type { Consents, User } from './types'

export const getMe = () => api.get<User>('/users/me')
export const getConsents = () => api.get<Consents>('/users/me/consents')
export const saveConsents = (v: { terms: boolean; privacy: boolean; marketing?: boolean }) =>
  api.post<Consents>('/users/me/consents', v)
/** 회원 탈퇴 */
export const withdrawAccount = () => api.delete<unknown>('/users/me')

/** 프로필 사진 올리기. multipart 필드명은 `image`, 한 장만 보낸다. JPG/PNG/WEBP 10MB 이하. */
export const putProfileImage = (file: File) => {
  const form = new FormData()
  form.append('image', file)
  return api.put<User>('/users/me/profile-image', form)
}
/** 올린 사진을 지우고 카카오 사진 또는 기본 이미지로 되돌린다. */
export const putProfileImageSource = (source: 'kakao' | 'default') =>
  api.put<User>('/users/me/profile-image/source', { source })
