import { useCallback, useEffect, useRef, useState } from 'react'
import { useUploadReviewImage } from '../../api/hooks'
import { errorMessage } from '../../api/errors'
import type { ReviewImage } from '../../api/types'

export const MAX_REVIEW_IMAGES = 5
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** 파일을 선택하는 즉시 업로드해 key를 모으는 훅. 제출 시 keys 를 images 로 보낸다. */
export function useReviewImages(initial: ReviewImage[] = []) {
  const upload = useUploadReviewImage()
  const [images, setImages] = useState<ReviewImage[]>(initial)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const countRef = useRef(initial.length)
  /** 이미 리뷰에 붙어 있던 사진의 key. 서버가 새 업로드를 거부했을 때 이것만 남긴다 */
  const attachedRef = useRef(new Set(initial.map((i) => i.key)))
  useEffect(() => {
    countRef.current = images.length + pending
  }, [images.length, pending])

  const addFiles = useCallback(
    async (files: File[]) => {
      setError(null)
      const room = MAX_REVIEW_IMAGES - countRef.current
      if (files.length > room) setError(`사진은 최대 ${MAX_REVIEW_IMAGES}장까지 올릴 수 있어요.`)
      const accepted: File[] = []
      for (const f of files.slice(0, Math.max(room, 0))) {
        if (!ALLOWED_TYPES.includes(f.type)) {
          setError('jpg, png, webp 이미지만 올릴 수 있어요.')
        } else if (f.size > MAX_IMAGE_BYTES) {
          setError('이미지는 한 장에 10MB까지 올릴 수 있어요.')
        } else accepted.push(f)
      }
      if (!accepted.length) return
      countRef.current += accepted.length
      setPending((n) => n + accepted.length)
      await Promise.all(
        accepted.map((f) =>
          upload.mutateAsync(f).then(
            (img) => setImages((cur) => [...cur, img]),
            (e) => setError(errorMessage(e)),
          ).finally(() => setPending((n) => n - 1)),
        ),
      )
    },
    [upload],
  )

  const remove = useCallback((key: string) => setImages((cur) => cur.filter((i) => i.key !== key)), [])
  const reset = useCallback((next: ReviewImage[] = []) => {
    attachedRef.current = new Set(next.map((i) => i.key))
    setImages(next)
    setError(null)
  }, [])

  /** 서버가 새로 올린 사진을 인정하지 않을 때(기한 만료 등) 새 사진만 비워 다시 올리게 한다 */
  const dropNew = useCallback(() => setImages((cur) => cur.filter((i) => attachedRef.current.has(i.key))), [])

  return { images, keys: images.map((i) => i.key), uploading: pending > 0, error, addFiles, remove, reset, dropNew }
}
