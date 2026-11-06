import { useState } from 'react'
import { Modal } from '../../components'
import type { ReviewImage } from '../../api/types'

/** 리뷰 사진 그리드. 누르면 모달에서 크게 본다. */
export function ReviewPhotos({ images }: { images: ReviewImage[] }) {
  const [open, setOpen] = useState<ReviewImage | null>(null)
  if (!images.length) return null
  return (
    <>
      <ul className="flex flex-wrap gap-2 pt-[10px]">
        {images.map((img, i) => (
          <li key={img.key}>
            <button type="button" aria-label={`리뷰 사진 ${i + 1} 크게 보기`} onClick={() => setOpen(img)}>
              <img src={img.url} alt="" className="size-20 rounded-md object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <Modal open={!!open} onClose={() => setOpen(null)} ariaLabel="리뷰 사진 크게 보기">
        {open && <img src={open.url} alt="리뷰 사진" className="max-h-[70vh] w-full rounded-md object-contain" />}
      </Modal>
    </>
  )
}
