import { useRef } from 'react'
import { AlertIcon, CameraIcon } from './icons'
import { MAX_REVIEW_IMAGES } from './useReviewImages'
import type { useReviewImages } from './useReviewImages'

type State = ReturnType<typeof useReviewImages>

/** 첨부한 사진 썸네일(삭제 가능) + 사진 추가 타일. 사진은 리뷰를 등록·수정할 때 같이 올라간다. */
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
          state.addFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      <ul className="flex flex-wrap gap-[10px]">
        {state.images.map((img, i) => (
          <li key={img.key} className="relative size-20">
            <img src={img.url} alt={`첨부 사진 ${i + 1}`} className="size-full rounded-[10px] object-cover" />
            {!disabled && (
              <button
                type="button"
                aria-label={`첨부 사진 ${i + 1} 삭제`}
                onClick={() => state.remove(img.key)}
                className="absolute right-[6px] top-[6px] flex size-[22px] items-center justify-center rounded-full bg-ink/80 text-[13px] leading-none text-white"
              >
                ×
              </button>
            )}
          </li>
        ))}
        <li>
            <button
              type="button"
              disabled={disabled || full}
              aria-label={`사진 추가 (${state.images.length}/${MAX_REVIEW_IMAGES})`}
              onClick={() => input.current?.click()}
              className="flex size-20 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-[#d5cfcb] text-[12px] text-ink-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CameraIcon size={18} />
              <span>
                <b className="text-ink">{state.images.length}</b>/{MAX_REVIEW_IMAGES}
              </span>
            </button>
        </li>
      </ul>
      <p className="pt-2 text-[12px] leading-[18px] text-ink-subtle">
        JPG·PNG·WEBP, 한 장에 10MB까지, 최대 {MAX_REVIEW_IMAGES}장 · 리뷰를 등록할 때 함께 올라가요
      </p>
      {state.error && (
        <div role="alert" className="mt-2 flex gap-2 rounded-[10px] bg-primary-tint px-4 py-3 text-primary-ink">
          <AlertIcon size={16} className="mt-[2px] shrink-0" />
          <div>
            <p className="text-[13px] leading-[19.5px]">{state.error.title}</p>
            {state.error.hint && <p className="text-[12px] leading-[18px] text-ink-muted">{state.error.hint}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
