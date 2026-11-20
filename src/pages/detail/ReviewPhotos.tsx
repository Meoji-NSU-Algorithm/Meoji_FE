import { useState } from 'react'
import type { ReviewImage } from '../../api/types'
import { ReviewLightbox } from './ReviewLightbox'

const MAX_VISIBLE = 3

interface Props {
  images: ReviewImage[]
  authorName: string
  authorImage?: string | null
  /** 확대 보기 헤더의 둘째 줄: '행사명 · 날짜' */
  caption: string
}

/** 리뷰 사진 줄. 3장까지 보이고 나머지는 마지막 사진 위에 +N 으로 묶는다. 누르면 확대 보기가 열린다. */
export function ReviewPhotos({ images, authorName, authorImage, caption }: Props) {
  const [open, setOpen] = useState<number | null>(null)
  if (!images.length) return null
  const visible = images.slice(0, MAX_VISIBLE)
  const more = images.length - visible.length
  return (
    <>
      <ul className="flex flex-wrap gap-2 pt-[10px]">
        {visible.map((img, i) => {
          const last = i === visible.length - 1 && more > 0
          return (
            <li key={img.key}>
              <button
                type="button"
                aria-label={`리뷰 사진 ${i + 1} 크게 보기${last ? `, ${more}장 더 있음` : ''}`}
                onClick={() => setOpen(i)}
                className="relative block size-24 overflow-hidden rounded-[10px] bg-surface-muted"
              >
                <img src={img.url} alt="" className="size-full object-cover" />
                {last && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/50 text-[15px] font-bold text-white">
                    +{more}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {open !== null && (
        <ReviewLightbox
          images={images}
          index={open}
          authorName={authorName}
          authorImage={authorImage}
          caption={caption}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
