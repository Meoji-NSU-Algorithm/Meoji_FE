import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper, { type Area } from 'react-easy-crop'
import { CloseIcon } from '../../components/icons'
import type { CropArea } from '../../lib/cropImage'

interface Props {
  src: string
  onCancel: () => void
  /** 자르는 동안 버튼을 막아 두므로 Promise 를 돌려주면 끝날 때까지 기다린다 */
  onApply: (area: CropArea) => Promise<void> | void
}

/** 프로필 사진을 원형으로 자르는 모달. 위치는 드래그, 크기는 슬라이더(또는 핀치·휠)로 맞춘다. */
export function AvatarCropModal({ src, onCancel, onApply }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, busy])

  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const apply = async () => {
    if (!area || busy) return
    setBusy(true)
    try {
      await onApply(area)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(42,35,32,0.48)] px-[22px] py-7"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="사진 자르기"
        className="flex max-h-full min-h-0 w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] bg-surface"
      >
        <div className="flex items-center border-b border-line px-5 py-[18px]">
          <h2 className="flex-1 text-[17px] font-bold text-ink">사진 자르기</h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onCancel}
            disabled={busy}
            className="flex size-9 items-center justify-center rounded-[10px] text-ink-muted disabled:opacity-60"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-[18px]">
          <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-[14px] bg-ink">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              objectFit="cover"
              showGrid={false}
              minZoom={1}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            aria-label="확대"
            disabled={busy}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mx-auto mt-4 block w-full max-w-[320px] accent-primary"
          />
          <p className="mx-auto max-w-[320px] pt-2 text-center text-[12px] leading-[18px] text-ink-subtle">
            드래그해서 위치를 맞추고, 확대해서 크기를 조절하세요
          </p>
        </div>
        <div className="flex gap-2 border-t border-line px-5 pb-[18px] pt-[14px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-12 flex-1 rounded-[12px] border border-line text-[14px] font-bold text-ink disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => void apply()}
            disabled={busy}
            className="h-12 flex-1 rounded-[12px] bg-primary text-[14px] font-bold text-white disabled:opacity-60"
          >
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
