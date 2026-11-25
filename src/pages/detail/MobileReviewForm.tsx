import { useRef, useState } from 'react'
import { RatingStars } from '../../components'
import { MAX_CONTENT } from './ReviewEditModal'
import { ReviewImagePicker } from './ReviewImagePicker'
import { CameraIcon, RefreshIcon, SpinnerIcon, WarnIcon } from './icons'
import type { useReviewImages } from './useReviewImages'

interface Props {
  rating: number
  setRating: (v: number) => void
  content: string
  setContent: (v: string) => void
  pics: ReturnType<typeof useReviewImages>
  pending: boolean
  error: string | null
  failure: string | null
  /** 로그인돼 있으면 action 을, 아니면 로그인 유도를 띄운다 */
  requireLogin: (action?: () => void) => void
  onSubmit: () => void
}

/**
 * 모바일 상세의 리뷰 작성 폼.
 * - 접힌 모양(Figma M5 729:148, S8 754:70): 별 26px + 64px 입력칸 + '사진 추가' + 작은 '리뷰 등록'
 * - 펼친 모양(M5-2 730:17): 별·입력·사진 중 하나라도 건드리면 테두리가 진해지고, 72px 사진 칸과 꽉 찬 '리뷰 등록'이 보인다
 * 상태(별점·글·사진·등록)는 ReviewSection 이 들고 있어 데스크톱 폼과 같은 규칙으로 등록된다.
 */
export function MobileReviewForm({ rating, setRating, content, setContent, pics, pending, error, failure, requireLogin, onSubmit }: Props) {
  const [opened, setOpened] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const expanded = opened || rating > 0 || content.length > 0 || pics.images.length > 0 || pending || !!failure

  const open = (then?: () => void) => requireLogin(() => {
    setOpened(true)
    then?.()
  })

  const submitButton = (full: boolean) => (
    <button
      type="button"
      disabled={pending}
      onClick={() => requireLogin(onSubmit)}
      className={
        full
          ? `flex h-[46px] w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-bold text-white ${pending ? 'bg-[#e07a55]' : 'bg-primary'}`
          : "relative flex h-[38px] items-center rounded-[10px] bg-primary px-4 text-[13px] font-bold tracking-[-0.2px] text-white after:absolute after:inset-x-0 after:-inset-y-[3px] after:content-['']"
      }
    >
      {pending && <SpinnerIcon size={16} />}
      {!pending && failure && <RefreshIcon size={16} />}
      {pending ? '등록 중…' : failure ? '다시 등록' : '리뷰 등록'}
    </button>
  )

  const messages = (
    <>
      {error && (
        <p role="alert" className="pt-2 text-[13px] text-primary-ink">
          {error}
        </p>
      )}
      {failure && !pending && (
        <div role="alert" className="mt-3 flex items-start gap-[10px] rounded-[12px] bg-primary-tint px-[14px] py-3">
          <WarnIcon size={18} className="mt-[2px] shrink-0 text-primary-ink" />
          <div>
            <p className="text-[13px] leading-[20.8px] text-[#8a2a0e]">리뷰를 등록하지 못했어요</p>
            <p className="text-[12px] leading-[19.2px] text-ink-muted">{failure}</p>
          </div>
        </div>
      )}
    </>
  )

  if (!expanded) {
    return (
      <div className="rounded-[14px] border border-line p-[14px]" data-testid="review-form" data-expanded="false">
        <h3 className="text-[14px] font-bold leading-[17px] tracking-[-0.2px] text-ink">이 행사는 어떠셨나요?</h3>
        <div className="flex pt-2">
          <RatingStars value={rating} size={26} gap={4} hitHeight={44} onChange={(v) => open(() => setRating(v))} />
        </div>
        <textarea
          aria-label="리뷰 내용"
          value={content}
          maxLength={MAX_CONTENT}
          onChange={(e) => setContent(e.target.value)}
          // 펼친 폼의 입력칸으로 바뀌므로 포커스를 그쪽으로 옮긴다
          onFocus={() => open(() => requestAnimationFrame(() => textarea.current?.focus()))}
          placeholder="방문 후기를 자유롭게 남겨 주세요"
          className="mt-[10px] block h-16 w-full resize-none rounded-[10px] border border-line bg-surface-card px-3 py-[10px] text-[13px] tracking-[-0.2px] text-ink outline-none placeholder:text-ink-subtle"
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          data-testid="review-image-quick-input"
          onChange={(e) => {
            pics.addFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        <div className="flex items-center justify-between pt-[10px]">
          <button
            type="button"
            onClick={() => open(() => fileInput.current?.click())}
            className="relative flex h-[34px] items-center gap-[5px] rounded-[9px] after:absolute after:inset-x-0 after:-inset-y-[6px] after:content-[''] border border-line-strong px-3 text-[12px] tracking-[-0.2px] text-ink-muted"
          >
            <CameraIcon size={14} />
            사진 추가 (최대 5장)
          </button>
          {submitButton(false)}
        </div>
        {messages}
      </div>
    )
  }

  return (
    <div className="rounded-[14px] border border-ink p-[14px]" data-testid="review-form" data-expanded="true">
      <fieldset disabled={pending} aria-busy={pending} className={`m-0 min-w-0 border-0 p-0 ${pending ? 'pointer-events-none opacity-50' : ''}`}>
        <h3 className="text-[14px] font-bold leading-[17px] tracking-[-0.2px] text-ink">이 행사는 어떠셨나요?</h3>
        <div className="flex items-center gap-[10px] pt-2">
          <RatingStars value={rating} size={28} gap={4} hitHeight={44} onChange={(v) => requireLogin(() => setRating(v))} />
          <span className="text-[15px] font-bold tracking-[-0.2px] text-ink">{rating > 0 ? `${rating}점` : '별점을 선택해 주세요'}</span>
        </div>
        <p className="pt-1 text-[11px] tracking-[-0.2px] text-ink-subtle">별의 왼쪽을 누르면 반 개, 오른쪽을 누르면 한 개가 선택돼요</p>
        <div className="relative mt-3">
          <textarea
            ref={textarea}
            aria-label="리뷰 내용"
            value={content}
            maxLength={MAX_CONTENT}
            onChange={(e) => setContent(e.target.value)}
            placeholder="방문 후기를 자유롭게 남겨 주세요"
            className="block h-[112px] w-full resize-none rounded-[10px] border border-line-strong bg-surface px-3 pb-6 pt-[10px] text-[13.5px] leading-[21px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tracking-[-0.2px] text-ink-subtle">
            {content.length} / {MAX_CONTENT}
          </span>
        </div>
        <div className="pt-[10px]">
          <ReviewImagePicker state={pics} disabled={pending} variant="form" />
        </div>
      </fieldset>
      {messages}
      {pending && <p className="pt-3 text-[12px] text-ink-muted">사진이 많으면 몇 초 걸릴 수 있어요</p>}
      <div className="pt-3">{submitButton(true)}</div>
    </div>
  )
}
