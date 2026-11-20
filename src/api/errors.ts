import { ApiError } from './client'

/**
 * BE 에러 코드(app/core/errors/codes.py) -> 사용자 문구.
 * 문구는 '무슨 일인지 한 줄 + 할 수 있는 일 한 줄'이고 끝은 '-요'다.
 * 상태 코드나 영어 오류 메시지는 보여 주지 않는다.
 */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: '연결이 끊겨 정보를 불러오지 못했어요. 연결되면 다시 시도해 주세요.',
  COMMON_INVALID_INPUT: '입력한 내용이 올바르지 않아요. 내용을 확인하고 다시 시도해 주세요.',
  COMMON_DB_UNAVAILABLE: '서버가 잠시 바빠요. 잠시 후 다시 시도해 주세요.',
  COMMON_NOT_FOUND: '요청한 페이지를 찾을 수 없어요. 주소를 확인하고 다시 시도해 주세요.',
  COMMON_METHOD_NOT_ALLOWED: '처리할 수 없는 요청이에요. 처음부터 다시 시도해 주세요.',
  COMMON_PAYLOAD_TOO_LARGE: '보내는 내용이 너무 커요. 사진 크기를 줄여서 다시 시도해 주세요.',
  COMMON_HTTP_ERROR: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  COMMON_INTERNAL_ERROR: '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
  EVENT_NOT_FOUND: '행사를 찾을 수 없어요. 삭제되었거나 주소가 잘못됐을 수 있어요.',
  ROUTE_NOT_FOUND: '이 조건으로 이용할 수 있는 경로를 찾지 못했어요. 이동 수단을 바꿔서 다시 시도해 주세요.',
  DIRECTIONS_API_ERROR: '길찾기 서비스에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
  DIRECTIONS_API_TIMEOUT: '길찾기 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
  DIRECTIONS_API_KEY_MISSING: '길찾기 서비스를 지금은 쓸 수 없어요. 잠시 후 다시 시도해 주세요.',
  TOUR_API_KEY_MISSING: '서버 설정에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
  TOUR_API_REQUEST_FAILED: '행사 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
  TOUR_API_INVALID_RESPONSE: '행사 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
  AUTH_UNAUTHORIZED: '로그인이 필요해요. 로그인한 뒤 다시 시도해 주세요.',
  AUTH_TOKEN_EXPIRED: '로그인이 만료되었어요. 다시 로그인해 주세요.',
  AUTH_TOKEN_INVALID: '로그인 정보가 올바르지 않아요. 다시 로그인해 주세요.',
  AUTH_TOKEN_REVOKED: '로그아웃된 상태예요. 다시 로그인해 주세요.',
  KAKAO_TOKEN_REQUEST_FAILED: '카카오 로그인 시간이 지났어요. 처음부터 다시 로그인해 주세요.',
  KAKAO_API_UNAVAILABLE: '카카오 서버와 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
  KAKAO_PROFILE_INVALID: '카카오 계정 정보를 가져오지 못했어요. 이메일 제공에 동의하고 다시 시도해 주세요.',
  USER_NOT_FOUND: '사용자를 찾을 수 없어요. 다시 로그인해 주세요.',
  USER_EMAIL_CONFLICT: '이미 다른 계정에서 쓰고 있는 이메일이에요. 다른 계정으로 로그인해 주세요.',
  REVIEW_NOT_FOUND: '리뷰를 찾을 수 없어요. 이미 삭제됐는지 확인해 주세요.',
  REVIEW_FORBIDDEN: '내가 쓴 리뷰만 수정하거나 삭제할 수 있어요. 내 리뷰인지 확인해 주세요.',
  REVIEW_ALREADY_EXISTS: '이미 이 행사에 리뷰를 작성했어요. 쓴 리뷰는 수정할 수 있어요.',
  REVIEW_IMAGE_INVALID: 'JPG, PNG, WEBP 사진만 올릴 수 있어요. 다른 사진으로 바꿔 주세요.',
  REVIEW_IMAGE_TOO_LARGE: '10MB 이하 사진만 올릴 수 있어요. 더 작은 사진으로 바꿔 주세요.',
  REVIEW_IMAGE_STORAGE_UNAVAILABLE: '이미지 저장소를 잠시 사용할 수 없어요. 잠시 후 다시 시도해 주세요.',
}

const FALLBACK = '잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'

/** ApiError 또는 에러 코드 문자열을 사용자 문구로 바꾼다. 매핑이 없으면 일반 문구를 쓴다. */
export function errorMessage(errOrCode: unknown): string {
  const code =
    typeof errOrCode === 'string' ? errOrCode : errOrCode instanceof ApiError ? errOrCode.code : undefined
  if (code) {
    if (MESSAGES[code]) return MESSAGES[code]
    if (code.startsWith('DIRECTIONS_API_')) return MESSAGES.DIRECTIONS_API_ERROR
    if (code.startsWith('REVIEW_IMAGE_')) return '사진을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }
  if (errOrCode instanceof ApiError && errOrCode.status === 413) return MESSAGES.COMMON_PAYLOAD_TOO_LARGE
  return FALLBACK
}
