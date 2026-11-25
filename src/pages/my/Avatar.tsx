/**
 * tone 'mobile' = Figma 모바일 보드(M7·M9·M10)의 아바타: #ffede5 바탕 + #d4431a Black 글자.
 * 기본값은 데스크톱 모양 그대로.
 */
export function Avatar({
  name,
  src,
  size,
  tone = 'default',
}: {
  name: string
  src?: string | null
  size: number
  tone?: 'default' | 'mobile'
}) {
  const initial = name.trim().charAt(0) || '?'
  const color =
    tone === 'mobile' ? 'bg-primary-tint-strong font-black text-primary' : 'bg-primary-tint font-bold text-primary-ink'
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${color}`}
      style={{ width: size, height: size, fontSize: tone === 'mobile' ? Math.round(size * 0.365) : size * 0.36 }}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initial}
    </span>
  )
}
