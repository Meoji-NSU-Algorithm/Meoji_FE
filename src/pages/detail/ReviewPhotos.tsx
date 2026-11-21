import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../components/icons'
import type { ReviewImage } from '../../api/types'
import { Avatar } from '../my/Avatar'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

const VISIBLE = 3

export interface PhotoOwner {
  name: string
  avatar?: string | null
  /** 머리글 둘째 줄 (행사명 · 날짜) */
  caption?: string
}

/** 리뷰 사진 썸네일(최대 3장, 나머지는 +N). 누르면 전체 화면에서 넘겨 본다. */
export function ReviewPhotos({ images, owner }: { images: ReviewImage[]; owner: PhotoOwner }) {
  const [index, setIndex] = useState<number | null>(null)
  if (!images.length) return null
  const rest = images.length - VISIBLE
  return (
    <>
      <ul className="flex flex-wrap gap-2 pt-[10px]">
        {images.slice(0, VISIBLE).map((img, i) => (
          <li key={img.key}>
            <button type="button" aria-label={`리뷰 사진 ${i + 1} 크게 보기`} onClick={() => setIndex(i)} className="relative block size-20 overflow-hidden rounded-[10px]">
              <img src={img.url} alt="" className="size-full object-cover" />
              {i === VISIBLE - 1 && rest > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[15px] font-bold text-white">+{rest}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {index !== null && <Lightbox images={images} index={index} setIndex={setIndex} owner={owner} onClose={() => setIndex(null)} />}
    </>
  )
}

function Lightbox({
  images,
  index,
  setIndex,
  owner,
  onClose,
}: {
  images: ReviewImage[]
  index: number
  setIndex: (i: number) => void
  owner: PhotoOwner
  onClose: () => void
}) {
  const last = images.length - 1
  const prev = () => setIndex(Math.max(index - 1, 0))
  const next = () => setIndex(Math.min(index + 1, last))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setIndex(Math.max(index - 1, 0))
      else if (e.key === 'ArrowRight') setIndex(Math.min(index + 1, last))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, last, onClose, setIndex])

  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const navBtn = 'flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white/15 text-white disabled:invisible'
  const closeOnSelf = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="리뷰 사진 크게 보기" className="fixed inset-0 z-50 flex flex-col bg-[#1b1512] text-white">
      <header className="flex items-center gap-3 px-8 py-[14px]">
        <Avatar name={owner.name} src={owner.avatar} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-[21px]">{owner.name}님의 리뷰 사진</p>
          {owner.caption && <p className="truncate text-[12px] leading-[18px] text-white/70">{owner.caption}</p>}
        </div>
        <p className="text-[14px] font-bold">
          {index + 1} <span className="text-white/50">/ {images.length}</span>
        </p>
        <button type="button" aria-label="닫기" onClick={onClose} className="ml-4 flex size-11 items-center justify-center rounded-[10px] bg-white/15">
          <CloseIcon size={22} />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-6 px-4 sm:px-[60px]" onMouseDown={closeOnSelf}>
        <button type="button" aria-label="이전 사진" disabled={index === 0} onClick={prev} className={navBtn}>
          <ChevronLeftIcon size={22} />
        </button>
        <img src={images[index].url} alt="리뷰 사진" className="max-h-full min-w-0 max-w-[840px] flex-1 rounded-[12px] object-contain" />
        <button type="button" aria-label="다음 사진" disabled={index === last} onClick={next} className={navBtn}>
          <ChevronRightIcon size={22} />
        </button>
      </div>
      <div className="flex flex-col items-center gap-3 px-4 pb-6 pt-[30px]" onMouseDown={closeOnSelf}>
        <ul className="flex gap-3">
          {images.map((img, i) => (
            <li key={img.key}>
              <button
                type="button"
                aria-label={`사진 ${i + 1} 보기`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`block size-16 overflow-hidden rounded-[10px] ${i === index ? 'ring-2 ring-white' : 'opacity-60'}`}
              >
                <img src={img.url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-white/60">← → 키로 넘기고, Esc나 바깥을 누르면 닫혀요</p>
      </div>
    </div>,
    document.body,
  )
}
