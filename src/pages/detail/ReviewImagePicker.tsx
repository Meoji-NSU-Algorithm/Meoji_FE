import { useRef } from 'react'
import { CameraIcon, InfoIcon, XIcon } from './icons'
import { MAX_REVIEW_IMAGES } from './useReviewImages'
import type { useReviewImages } from './useReviewImages'

type State = ReturnType<typeof useReviewImages>

/**
 * 리뷰 사진 첨부 보드 (Figma C2·E4). 썸네일 + 삭제(×) + 'n/5' 추가 칸 + 형식·용량 안내,
 * 규칙에 어긋난 사진은 사진 줄 아래에 안내를 한 줄씩 보여 준다.
 * 작성 폼은 80px, 수정 모달(compact)은 72px 이다. 사진은 리뷰를 등록·수정할 때 같이 올라간다.
 */
export function ReviewImagePicker({
  state,
  disabled,
  compact: compactProp,
  variant,
}: {
  state: State
  disabled?: boolean
  compact?: boolean
  /**
   * 모바일 모양. 'form' = 상세 작성 폼(Figma M5-2 730:43): 72px 칸 + 'n / 5' + 안내 한 줄,
   * 'sheet' = 리뷰 수정 시트(S10 756:51): 72px 칸 + '+' 만(개수는 시트의 '사진 n/5' 줄에 있다).
   */
  variant?: 'form' | 'sheet'
}) {
  const input = useRef<HTMLInputElement>(null)
  const count = state.images.length
  const full = count >= MAX_REVIEW_IMAGES
  const compact = compactProp || !!variant
  const cell = compact ? 'size-[72px] rounded-[10px]' : 'size-[80px] rounded-[12px]'
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
      <ul className={`flex flex-wrap ${compact ? 'gap-2' : 'gap-[10px]'}`}>
        {state.images.map((img, i) => (
          <li key={img.key} className={`relative overflow-hidden bg-surface-muted ${cell}`}>
            <img src={img.url} alt={`첨부 사진 ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label={`첨부 사진 ${i + 1} 삭제`}
              disabled={disabled}
              onClick={() => state.remove(img.key)}
              className={`absolute right-1 top-1 flex items-center justify-center rounded-full text-white disabled:opacity-50 ${variant ? 'bg-[rgba(20,16,14,0.6)]' : 'bg-ink/80'} ${compact ? 'size-[22px]' : 'size-6'}`}
            >
              <XIcon size={compact ? 11 : 12} strokeWidth={2.6} />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-label={`사진 추가 (${count}/${MAX_REVIEW_IMAGES})`}
            disabled={disabled || full}
            onClick={() => input.current?.click()}
            className={`flex flex-col items-center justify-center border border-dashed bg-surface text-ink disabled:cursor-not-allowed disabled:text-ink-disabled ${variant ? 'border-ink-disabled' : 'border-[#cfc7c2]'} ${cell} ${compact ? 'gap-[2px]' : 'gap-1'}`}
          >
            {variant === 'sheet' ? (
              <span aria-hidden="true" className="text-[20px] leading-none text-ink-muted">+</span>
            ) : variant === 'form' ? (
              <>
                <CameraIcon size={18} className="text-ink-muted" />
                <span aria-hidden="true" className="text-[11px] text-ink-muted">
                  {count} / {MAX_REVIEW_IMAGES}
                </span>
              </>
            ) : (
              <>
                <CameraIcon size={compact ? 20 : 22} />
                <span aria-hidden="true" className="text-[12px] font-bold">
                  {count}
                  <span className="font-normal text-ink-muted">/{MAX_REVIEW_IMAGES}</span>
                </span>
              </>
            )}
          </button>
        </li>
      </ul>
      {variant === 'form' ? (
        <p className="pt-2 text-[11px] tracking-[-0.2px] text-ink-subtle">JPG·PNG·WEBP, 한 장에 10MB까지 · 리뷰를 등록할 때 함께 올라가요</p>
      ) : variant === 'sheet' ? null : (
        <p className="pt-3 text-[12px] leading-[18px] text-ink-subtle">JPG·PNG·WEBP, 한 장에 10MB까지, 최대 {MAX_REVIEW_IMAGES}장{!compact && ' · 리뷰를 등록할 때 함께 올라가요'}</p>
      )}
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
