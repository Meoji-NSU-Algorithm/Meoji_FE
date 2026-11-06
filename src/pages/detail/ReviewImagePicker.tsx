import { useRef } from 'react'
import { CameraIcon } from './icons'
import { MAX_REVIEW_IMAGES } from './useReviewImages'
import type { useReviewImages } from './useReviewImages'

type State = ReturnType<typeof useReviewImages>

/** 사진 추가 버튼 + 업로드된 썸네일(삭제 가능). */
export function ReviewImagePicker({ state, disabled }: { state: State; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const full = state.images.length >= MAX_REVIEW_IMAGES
  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        data-testid="review-image-input"
        onChange={(e) => {
          void state.addFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={disabled || full}
        onClick={() => input.current?.click()}
        className="inline-flex h-10 items-center gap-[6px] rounded-[10px] border border-dashed border-[#d5cfcb] px-[14px] text-[13px] text-ink-muted disabled:cursor-not-allowed disabled:text-ink-disabled"
      >
        <CameraIcon size={18} /> 사진 추가 ({state.images.length}/{MAX_REVIEW_IMAGES})
      </button>
      {state.uploading && (
        <p role="status" className="pt-2 text-[12px] text-ink-subtle">
          사진을 올리는 중이에요…
        </p>
      )}
      {state.error && (
        <p role="alert" className="pt-2 text-[13px] text-primary-ink">
          {state.error}
        </p>
      )}
      {state.images.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-2">
          {state.images.map((img, i) => (
            <li key={img.key} className="relative size-16">
              <img src={img.url} alt={`첨부 사진 ${i + 1}`} className="size-full rounded-md object-cover" />
              <button
                type="button"
                aria-label={`첨부 사진 ${i + 1} 삭제`}
                onClick={() => state.remove(img.key)}
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-ink text-[12px] leading-none text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
