import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReviewImage } from '../../api/types'
import { checkImageFile } from '../../lib/imageFile'

export const MAX_REVIEW_IMAGES = 5

/** 사진 줄 아래에 보여 줄 안내 한 건 (Figma C2): 무슨 일 한 줄 + 어떻게 되는지 한 줄 */
export interface ImageNotice {
  text: string
  hint: string
}
const NOTICE_COUNT: ImageNotice = { text: `사진은 최대 ${MAX_REVIEW_IMAGES}장까지 올릴 수 있어요`, hint: `${MAX_REVIEW_IMAGES + 1}장 이상 고르면 앞의 ${MAX_REVIEW_IMAGES}장만 추가해요` }
const NOTICE_TYPE: ImageNotice = { text: 'JPG, PNG, WEBP 사진만 올릴 수 있어요', hint: '예: GIF, HEIC 파일을 골랐을 때' }
const NOTICE_SIZE: ImageNotice = { text: '10MB 이하 사진만 올릴 수 있어요', hint: '큰 사진은 빼고 나머지만 추가해요' }

/** 기존 사진은 서버 key, 새 사진은 File(key·url은 미리보기용 blob URL)을 들고 있다. */
type PickedImage = ReviewImage & { file?: File }

/** 첨부 사진 목록. 새 사진은 바로 올리지 않고, 제출 때 files 를 리뷰 등록·수정 요청에 같이 보낸다. */
export function useReviewImages(initial: ReviewImage[] = []) {
  const [images, setImages] = useState<PickedImage[]>(initial)
  const [notices, setNotices] = useState<ImageNotice[]>([])
  const blobUrls = useRef(new Set<string>())

  const revoke = (url: string) => {
    if (blobUrls.current.delete(url)) URL.revokeObjectURL(url)
  }
  useEffect(() => () => blobUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  const addFiles = (files: File[]) => {
    const next: ImageNotice[] = []
    const room = MAX_REVIEW_IMAGES - images.length
    // 넘치면 앞에서부터 남은 자리만큼만 다룬다
    if (files.length > room) next.push(NOTICE_COUNT)
    const added: PickedImage[] = []
    for (const file of files.slice(0, Math.max(room, 0))) {
      // 형식·용량이 안 맞는 사진만 빼고 나머지는 그대로 추가한다
      const problem = checkImageFile(file)
      if (problem === 'type') {
        if (!next.includes(NOTICE_TYPE)) next.push(NOTICE_TYPE)
      } else if (problem === 'size') {
        if (!next.includes(NOTICE_SIZE)) next.push(NOTICE_SIZE)
      } else {
        const url = URL.createObjectURL(file)
        blobUrls.current.add(url)
        added.push({ key: url, url, file })
      }
    }
    setNotices(next)
    if (added.length) setImages((cur) => [...cur, ...added])
  }

  const remove = useCallback((key: string) => {
    revoke(key)
    setImages((cur) => cur.filter((i) => i.key !== key))
    setNotices([])
  }, [])

  const reset = useCallback((next: ReviewImage[] = []) => {
    blobUrls.current.forEach(revoke)
    setImages(next)
    setNotices([])
  }, [])

  return {
    images,
    /** 남길 기존 사진 key (수정 요청의 images) */
    keys: images.filter((i) => !i.file).map((i) => i.key),
    /** 새로 첨부한 사진 */
    files: images.flatMap((i) => (i.file ? [i.file] : [])),
    /** 사진 줄 아래 안내 (최대 장수·형식·용량) */
    notices,
    addFiles,
    remove,
    reset,
  }
}
