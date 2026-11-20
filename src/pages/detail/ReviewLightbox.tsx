import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReviewImage } from '../../api/types'
import { ReviewAvatar } from './ReviewAvatar'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from './icons'

interface Props {
  images: ReviewImage[]
  /** 처음 보여 줄 사진 */
  index: number
  authorName: string
  authorImage?: string | null
  /** 헤더 둘째 줄: '행사명 · 날짜' */
  caption: string
  onClose: () => void
}

/** 리뷰 사진 확대 보기 (Figma C3). ← → 로 넘기고 Esc·바깥 클릭으로 닫는다. */
export function ReviewLightbox({ images, index, authorName, authorImage, caption, onClose }: Props) {
  const total = images.length
  const [current, setCurrent] = useState(Math.min(Math.max(index, 0), total - 1))
  const go = useCallback((delta: number) => setCurrent((c) => (c + delta + total) % total), [total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [go, onClose])

  const image = images[current]
  if (!image) return null
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const arrow =
    'flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white/[0.14] text-white hover:bg-white/25'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${authorName}님의 리뷰 사진`}
      className="fixed inset-0 z-[55] flex flex-col bg-[#1a1513]"
      onMouseDown={onClose}
    >
      <div className="flex h-[72px] shrink-0 items-center gap-[14px] px-4 sm:px-8" onMouseDown={stop}>
        <ReviewAvatar name={authorName} src={authorImage} size={32} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-white">{authorName}님의 리뷰 사진</p>
          <p className="truncate text-[12px] text-[#c9c0bb]">{caption}</p>
        </div>
        <p className="ml-auto text-[14px] font-bold text-white" aria-live="polite">
          {current + 1} <span className="text-[#a79e99]">/ {total}</span>
        </p>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="ml-3 flex size-11 items-center justify-center rounded-[12px] bg-white/[0.12] text-white hover:bg-white/25"
        >
          <XIcon size={22} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-3 px-3 sm:gap-9 sm:px-10">
        {total > 1 && (
          <button type="button" aria-label="이전 사진" onMouseDown={stop} onClick={() => go(-1)} className={arrow}>
            <ChevronLeftIcon size={24} />
          </button>
        )}
        <img
          src={image.url}
          alt={`리뷰 사진 ${current + 1}`}
          onMouseDown={stop}
          className="max-h-full min-w-0 max-w-[840px] rounded-[14px] object-contain"
        />
        {total > 1 && (
          <button type="button" aria-label="다음 사진" onMouseDown={stop} onClick={() => go(1)} className={arrow}>
            <ChevronRightIcon size={24} />
          </button>
        )}
      </div>
      <div className="flex h-[128px] shrink-0 flex-col items-center justify-center gap-3" onMouseDown={stop}>
        <ul className="flex max-w-full gap-3 overflow-x-auto px-4">
          {images.map((img, i) => (
            <li key={img.key} className="shrink-0">
              <button
                type="button"
                aria-label={`사진 ${i + 1}${i === current ? ', 보는 중' : ''}`}
                aria-current={i === current}
                onClick={() => setCurrent(i)}
                className={`block size-16 overflow-hidden rounded-[10px] ${i === current ? '' : 'opacity-55'}`}
              >
                <img src={img.url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-[#a79e99]">← → 키로 넘기고, Esc나 바깥을 누르면 닫혀요</p>
      </div>
    </div>,
    document.body,
  )
}
