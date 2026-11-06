import { tokenStorage } from '../auth/tokenStorage'
import type { ApiFailure, TokenPair } from './types'

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  status: number
  code: string
  errors?: ApiFailure['errors']
  constructor(status: number, code: string, message: string, errors?: ApiFailure['errors']) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

/** undefined/null/빈 문자열은 제거한다. BE는 중복·알 수 없는 파라미터에 400을 돌려준다. */
export function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const str = String(value)
    if (str.trim() === '') continue
    sp.set(key, str) // set: 같은 키가 두 번 들어가지 않는다
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function resolveUrl(path: string, query?: QueryParams) {
  return `${API_BASE}${path}${buildQuery(query)}`
}

async function parse<T>(res: Response): Promise<T> {
  let body = null as unknown
  try {
    body = await res.json()
  } catch {
    /* 본문이 JSON이 아님 */
  }
  const env = body as { success?: boolean; data?: T; code?: string; message?: string; errors?: ApiFailure['errors'] } | null
  if (res.ok && env && env.success !== false) {
    return env.data as T
  }
  if (env && env.success === false) {
    throw new ApiError(res.status, env.code ?? 'UNKNOWN', env.message ?? '', env.errors)
  }
  throw new ApiError(res.status, 'HTTP_' + res.status, res.statusText || '요청에 실패했습니다.')
}

async function send(
  method: string,
  path: string,
  opts: { query?: QueryParams; body?: unknown; bearer?: string | null },
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.bearer) headers.Authorization = `Bearer ${opts.bearer}`
  let body: string | FormData | undefined
  if (opts.body instanceof FormData) {
    // Content-Type은 브라우저가 boundary와 함께 설정한다. FormData는 재전송(401 재시도)해도 안전하다.
    body = opts.body
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  try {
    return await fetch(resolveUrl(path, opts.query), { method, headers, body })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '네트워크 연결을 확인해 주세요.')
  }
}

// ---- 토큰 갱신: refresh 토큰은 1회용이므로 동시에 하나만 보낸다 ----
let refreshInFlight: Promise<string> | null = null

export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    tokenStorage.clear()
    return Promise.reject(new ApiError(401, 'AUTH_UNAUTHORIZED', '로그인이 필요합니다.'))
  }
  refreshInFlight = (async () => {
    try {
      const res = await send('POST', '/auth/refresh', { bearer: refreshToken })
      const tokens = await parse<TokenPair>(res)
      tokenStorage.setTokens(tokens)
      return tokens.access_token
    } catch (e) {
      // 네트워크 오류가 아닌 거절이면 세션이 끝난 것이다
      if (!(e instanceof ApiError) || e.code !== 'NETWORK_ERROR') tokenStorage.clear()
      throw e
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

const DEAD_TOKEN_CODES = new Set(['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_REVOKED'])

export interface RequestOptions {
  query?: QueryParams
  body?: unknown
  /** false면 Authorization 헤더를 붙이지 않고 401 자동 갱신도 하지 않는다 */
  auth?: boolean
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false
  const tokenUsed = useAuth ? tokenStorage.getAccessToken() : null
  const res = await send(method, path, { ...opts, bearer: tokenUsed })

  if (res.status === 401 && useAuth && tokenUsed) {
    // 본문을 복제해 code를 확인한다
    const peek = (await res.clone().json().catch(() => null)) as Partial<ApiFailure> | null
    if (peek?.code === 'AUTH_TOKEN_EXPIRED') {
      // 이미 다른 요청이 갱신을 끝냈다면(토큰이 바뀜) 갱신 없이 새 토큰으로 재시도
      const current = tokenStorage.getAccessToken()
      const fresh = current && current !== tokenUsed ? current : await refreshAccessToken()
      const retry = await send(method, path, { ...opts, bearer: fresh })
      return parse<T>(retry)
    }
    if (peek?.code && DEAD_TOKEN_CODES.has(peek.code)) tokenStorage.clear()
  }
  return parse<T>(res)
}

export const api = {
  get: <T>(path: string, query?: QueryParams, opts?: Pick<RequestOptions, 'auth'>) =>
    request<T>('GET', path, { query, ...opts }),
  post: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, 'auth'>) =>
    request<T>('POST', path, { body, ...opts }),
  postForm: <T>(path: string, form: FormData) => request<T>('POST', path, { body: form }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
