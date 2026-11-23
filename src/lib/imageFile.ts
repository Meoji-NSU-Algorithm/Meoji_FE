/** 서버가 받는 사진 형식·용량 (리뷰·프로필 사진 공통) */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 올리기 전에 형식·용량을 먼저 본다. 통과하면 null */
export function checkImageFile(file: File): 'type' | 'size' | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'type'
  if (file.size > MAX_IMAGE_BYTES) return 'size'
  return null
}
