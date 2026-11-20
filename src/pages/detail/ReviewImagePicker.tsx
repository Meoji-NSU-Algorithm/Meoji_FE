import { useRef } from 'react'
import { CameraIcon, InfoIcon, XIcon } from './icons'
import { MAX_REVIEW_IMAGES } from './useReviewImages'
import type { useReviewImages } from './useReviewImages'

type State = ReturnType<typeof useReviewImages>

/**
 * 리뷰 사진 첨부 보드 (Figma C2). 88px 썸네일 + 삭제(×) + 'n/5' 추가 칸 + 형식·용량 안내,
 * 규칙에 어긋난 사진은 사진 줄 아래에 안내를 한 줄씩 보여 준다.
 * 사진은 리뷰를 등록·수정할 때 같이 올라간다.
 */
export function ReviewImagePicker({ state, disabled }: { state: State; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const count = state.images.length
  const full = count >= MAX_REVIEW_IMAGES
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
          <li key={img.key} className="relative size-[88px] overflow-hidden rounded-[12px] bg-surface-muted">
            <img src={img.url} alt={`첨부 사진 ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label={`첨부 사진 ${i + 1} 삭제`}
              disabled={disabled}
              onClick={() => state.remove(img.key)}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/80 text-white disabled:opacity-50"
            >
              <XIcon size={12} strokeWidth={2.6} />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-label={`사진 추가 (${count}/${MAX_REVIEW_IMAGES})`}
            disabled={disabled || full}
            onClick={() => input.current?.click()}
            className="flex size-[88px] flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-[#cfc7c2] bg-surface text-ink disabled:cursor-not-allowed disabled:text-ink-disabled"
          >
            <CameraIcon size={22} />
            <span aria-hidden="true" className="text-[12px] font-bold">
              {count}
              <span className="font-normal text-ink-muted">/{MAX_REVIEW_IMAGES}</span>
            </span>
          </button>
        </li>
      </ul>
      <p className="pt-3 text-[12px] leading-[18px] text-ink-subtle">JPG·PNG·WEBP, 한 장에 10MB까지, 최대 {MAX_REVIEW_IMAGES}장</p>
      {state.notices.length > 0 && (
        <div role="alert" className="mt-2 flex flex-col gap-2">
          {state.notices.map((n) => (
            <div key={n.text} className="flex items-start gap-[10px] rounded-[12px] bg-primary-tint px-[14px] py-3">
              <InfoIcon size={18} className="mt-[2px] shrink-0 text-primary-ink" />
              <div>
                <p className="text-[13px] leading-[20.8px] text-[#8a2a0e]">{n.text}</p>
                <p className="text-[12px] leading-[19.2px] text-ink-muted">{n.hint}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
