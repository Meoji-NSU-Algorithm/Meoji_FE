export interface LogoProps {
  /** 글자 크기(px). 헤더 31, 푸터 24 */
  size?: number
  className?: string
  /** 글자 사이(px). 기본은 크기의 -5% */
  tracking?: number
}

export function Logo({ size = 31, className = '', tracking }: LogoProps) {
  return (
    <span
      className={`font-display font-black text-brand whitespace-nowrap ${className}`}
      style={{ fontSize: size, lineHeight: 1, letterSpacing: `${tracking ?? -0.05 * size}px` }}
    >
      meoji
    </span>
  )
}
