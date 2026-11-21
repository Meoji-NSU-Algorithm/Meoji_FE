import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReviewImage } from '../../api/types'

export const MAX_REVIEW_IMAGES = 5
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 기존 사진은 서버 key, 새 사진은 File(key·url은 미리보기용 blob URL)을 들고 있다. */
type PickedImage = ReviewImage & { file?: File }

/** 사진을 고를 때 안내 (사진 줄 아래 한 줄) */
export interface PickError {
  title: string
  hint?: string
}
const TOO_MANY: PickError = { title: `사진은 최대 ${MAX_REVIEW_IMAGES}장까지 올릴 수 있어요`, hint: `${MAX_REVIEW_IMAGES + 1}장 이상 고르면 앞의 ${MAX_REVIEW_IMAGES}장만 추가해요` }
const BAD_TYPE: PickError = { title: 'JPG, PNG, WEBP 사진만 올릴 수 있어요' }
const TOO_BIG: PickError = { title: '10MB 이하 사진만 올릴 수 있어요', hint: '큰 사진은 빼고 나머지만 추가해요' }

/** 첨부 사진 목록. 새 사진은 바로 올리지 않고, 제출 때 files 를 리뷰 등록·수정 요청에 같이 보낸다. */
export function useReviewImages(initial: ReviewImage[] = []) {
  const [images, setImages] = useState<PickedImage[]>(initial)
  const [error, setError] = useState<PickError | null>(null)
  const blobUrls = useRef(new Set<string>())

  const revoke = (url: string) => {
    if (blobUrls.current.delete(url)) URL.revokeObjectURL(url)
  }
  useEffect(() => () => blobUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const addFiles = (files: File[]) => {
    setError(null)
    const room = MAX_REVIEW_IMAGES - images.length
    if (files.length > room) setError(TOO_MANY)
    const added: PickedImage[] = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      if (!ALLOWED_TYPES.includes(file.type)) setError(BAD_TYPE)
      else if (file.size > MAX_IMAGE_BYTES) setError(TOO_BIG)
      else {
        const url = URL.createObjectURL(file)
        blobUrls.current.add(url)
        added.push({ key: url, url, file })
      }
    }
    if (added.length) setImages((cur) => [...cur, ...added])
  }

  const remove = useCallback((key: string) => {
    revoke(key)
    setImages((cur) => cur.filter((i) => i.key !== key))
  }, [])

  const reset = useCallback((next: ReviewImage[] = []) => {
    blobUrls.current.forEach(revoke)
    setImages(next)
    setError(null)
  }, [])

  return {
    images,
    /** 남길 기존 사진 key (수정 요청의 images) */
    keys: images.filter((i) => !i.file).map((i) => i.key),
    /** 새로 첨부한 사진 */
    files: images.flatMap((i) => (i.file ? [i.file] : [])),
    error,
    addFiles,
    remove,
    reset,
  }
}
