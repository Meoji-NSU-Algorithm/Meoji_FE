import { api } from './client'
import type { Consents, User } from './types'

export const getMe = () => api.get<User>('/users/me')
export const getConsents = () => api.get<Consents>('/users/me/consents')
export const saveConsents = (v: { terms: boolean; privacy: boolean; marketing?: boolean }) =>
  api.post<Consents>('/users/me/consents', v)
/** 회원 탈퇴 */
export const withdrawAccount = () => api.delete<unknown>('/users/me')
