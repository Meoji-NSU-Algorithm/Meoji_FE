import { useState } from 'react'

/** 작성자 프로필 사진. 사진이 없거나 불러오지 못하면 이름 첫 글자 동그라미로 바꾼다. */
export function ReviewAvatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null)
  const style = { width: size, height: size }
  if (src && failed !== src) {
    return <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" onError={() => setFailed(src)} />
  }
  return (
    <span
      style={{ ...style, fontSize: size >= 36 ? 13 : 12 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-tint-strong font-bold text-primary-ink"
      aria-hidden="true"
      data-testid="avatar-fallback"
    >
      {name.slice(0, 1)}
    </span>
  )
}
