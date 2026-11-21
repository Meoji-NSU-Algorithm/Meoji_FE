import { useState } from 'react'

/** 프로필 사진이 없거나 깨지면 이름 첫 글자 동그라미로 바꾼다. */
export function Avatar({ name, src, size }: { name: string; src?: string | null; size: number }) {
  const [broken, setBroken] = useState(false)
  const initial = name.trim().charAt(0) || '?'
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-tint font-bold text-primary-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} className="size-full object-cover" /> : initial}
    </span>
  )
}
