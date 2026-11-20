import { ApiError } from '../api/client'

/** 실패·안내 상태 종류 (Figma C4): route=길찾기 502/504, server=서버 오류, offline=네트워크 끊김 */
export type ErrorKind = 'route' | 'server' | 'offline'

/**
 * 오류를 카드 종류로 매핑한다. 네트워크 단절 -> offline, 길찾기(DIRECTIONS_API_*) -> route,
 * 5xx/알 수 없는 오류 -> server. 그 외 4xx(입력·권한 오류 등)는 undefined (기존 한 줄 문구를 쓴다).
 */
export function errorKind(err: unknown): ErrorKind | undefined {
  if (err instanceof ApiError) {
    if (err.status === 0 || err.code === 'NETWORK_ERROR') return 'offline'
    if (err.code.startsWith('DIRECTIONS_API_')) return 'route'
    if (err.status >= 500) return 'server'
    return undefined
  }
  if (err instanceof TypeError) return 'offline'
  return err == null ? undefined : 'server'
}
