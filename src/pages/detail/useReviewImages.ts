import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReviewImage } from '../../api/types'

export const MAX_REVIEW_IMAGES = 5
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 기존 사진은 서버 key, 새 사진은 File(key·url은 미리보기용 blob URL)을 들고 있다. */
type PickedImage = ReviewImage & { file?: File }

/** 첨부 사진 목록. 새 사진은 바로 올리지 않고, 제출 때 files 를 리뷰 등록·수정 요청에 같이 보낸다. */
export function useReviewImages(initial: ReviewImage[] = []) {
  const [images, setImages] = useState<PickedImage[]>(initial)
  const [error, setError] = useState<string | null>(null)
  const blobUrls = useRef(new Set<string>())

  const revoke = (url: string) => {
    if (blobUrls.current.delete(url)) URL.revokeObjectURL(url)
  }
  useEffect(() => () => blobUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const addFiles = (files: File[]) => {
    setError(null)
    const room = MAX_REVIEW_IMAGES - images.length
    if (files.length > room) setError(`사진은 최대 ${MAX_REVIEW_IMAGES}장까지 올릴 수 있어요.`)
    const added: PickedImage[] = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      if (!ALLOWED_TYPES.includes(file.type)) setError('jpg, png, webp 이미지만 올릴 수 있어요.')
      else if (file.size > MAX_IMAGE_BYTES) setError('이미지는 한 장에 10MB까지 올릴 수 있어요.')
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
