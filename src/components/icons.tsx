import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

/** Figma 아이콘 path 를 currentColor 로 옮긴 인라인 아이콘 모음 */
function base({ size, ...rest }: IconProps, defaultSize: number, viewBox: number) {
  const s = size ?? defaultSize
  return {
    width: s,
    height: s,
    viewBox: `0 0 ${viewBox} ${viewBox}`,
    fill: 'none',
    'aria-hidden': true,
    ...rest,
  } as SVGProps<SVGSVGElement>
}

const stroke = { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function SearchIcon(p: IconProps) {
  return (
    <svg {...base(p, 18, 18)}>
      <path d="M13.5 8.25C13.5 11.1495 11.1495 13.5 8.25 13.5C5.35 13.5 3 11.1495 3 8.25C3 5.35 5.35 3 8.25 3C11.1495 3 13.5 5.35 13.5 8.25Z" strokeWidth="1.35" {...stroke} />
      <path d="M15 15L12.375 12.375" strokeWidth="1.35" {...stroke} />
    </svg>
  )
}

export function CalendarIcon(p: IconProps) {
  return (
    <svg {...base(p, 22, 24)}>
      <path d="M6.5 5H17.5C19.157 5 20.5 6.343 20.5 8V17C20.5 18.657 19.157 20 17.5 20H6.5C4.843 20 3.5 18.657 3.5 17V8C3.5 6.343 4.843 5 6.5 5Z" strokeWidth="1.8" {...stroke} />
      <path d="M3.5 10H20.5M8 3V7M16 3V7" strokeWidth="1.8" {...stroke} />
    </svg>
  )
}

export function MapPinIcon(p: IconProps) {
  return (
    <svg {...base(p, 22, 24)}>
      <path d="M12 21C12 21 19 14.8 19 9.5C19 7.643 18.263 5.863 16.95 4.55C15.637 3.238 13.857 2.5 12 2.5C10.143 2.5 8.363 3.238 7.05 4.55C5.738 5.863 5 7.643 5 9.5C5 14.8 12 21 12 21Z" strokeWidth="1.8" {...stroke} />
      <path d="M14.5 9.5C14.5 10.881 13.381 12 12 12C10.619 12 9.5 10.881 9.5 9.5C9.5 8.119 10.619 7 12 7C13.381 7 14.5 8.119 14.5 9.5Z" strokeWidth="1.8" {...stroke} />
    </svg>
  )
}

/** 헤더(22px, 24 viewBox) 하트 */
export function HeartIcon({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(p, 22, 24)}>
      <path
        d="M12 20C12 20 4.5 15.4 4.5 10C4.552 9.153 4.854 8.34 5.367 7.664C5.88 6.988 6.582 6.478 7.384 6.2C8.185 5.922 9.052 5.888 9.873 6.101C10.695 6.315 11.435 6.767 12 7.4C12.565 6.767 13.305 6.315 14.127 6.101C14.948 5.888 15.815 5.922 16.617 6.2C17.419 6.478 18.12 6.988 18.633 7.664C19.147 8.34 19.448 9.153 19.5 10C19.5 15.4 12 20 12 20Z"
        strokeWidth="1.8"
        fill={filled ? 'currentColor' : 'none'}
        {...stroke}
      />
    </svg>
  )
}

/** 카드 위 찜 버튼(18px) 하트 */
export function CardHeartIcon({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(p, 18, 18)}>
      <path
        d="M9 15C9 15 3.375 11.55 3.375 7.5C3.414 6.865 3.64 6.255 4.025 5.748C4.41 5.241 4.936 4.859 5.538 4.65C6.139 4.442 6.789 4.416 7.405 4.576C8.021 4.736 8.576 5.075 9 5.55C9.424 5.075 9.979 4.736 10.595 4.576C11.211 4.416 11.861 4.442 12.462 4.65C13.064 4.859 13.59 5.241 13.975 5.748C14.36 6.255 14.586 6.865 14.625 7.5C14.625 11.55 9 15 9 15Z"
        strokeWidth="1.5"
        fill={filled ? 'currentColor' : 'none'}
        {...stroke}
      />
    </svg>
  )
}

export function KakaoIcon(p: IconProps) {
  return (
    <svg {...base(p, 18, 18)}>
      <path d="M9 3C5.25 3 2.25 5.325 2.25 8.25C2.25 10.125 3.525 11.775 5.4 12.75L4.65 15.45C4.575 15.675 4.875 15.9 5.1 15.75L8.25 13.65H9C12.75 13.65 15.75 11.325 15.75 8.4C15.75 5.475 12.75 3.15 9 3.15V3Z" fill="currentColor" />
    </svg>
  )
}

export function StarIcon(p: IconProps) {
  return (
    <svg {...base(p, 12, 12)}>
      <path d="M6 1.5L7.4 4.4L10.5 4.85L8.25 7.05L8.8 10.15L6 8.7L3.2 10.15L3.75 7.05L1.5 4.85L4.6 4.4L6 1.5Z" fill="currentColor" />
    </svg>
  )
}

export function CheckIcon(p: IconProps) {
  return (
    <svg {...base(p, 12, 12)}>
      <path d="M2.5 6.25L4.75 8.5L9.5 3.75" strokeWidth="1.5" {...stroke} />
    </svg>
  )
}

/** 토스트 실패 아이콘(느낌표) */
export function AlertIcon(p: IconProps) {
  return (
    <svg {...base(p, 12, 12)}>
      <path d="M6 3.5V6.5M6 8.5H6.005" strokeWidth="1.5" {...stroke} />
    </svg>
  )
}

/** 토스트 찜 해제 아이콘(빈 하트 12px) */
export function SmallHeartIcon(p: IconProps) {
  return (
    <svg {...base(p, 12, 12)}>
      <path
        d="M6 10C6 10 2.5 7.8 2.5 5C2.505 4.596 2.632 4.202 2.864 3.872C3.097 3.541 3.424 3.289 3.804 3.148C4.183 3.007 4.595 2.985 4.987 3.083C5.38 3.182 5.733 3.397 6 3.7C6.267 3.397 6.62 3.182 7.013 3.083C7.405 2.985 7.817 3.007 8.197 3.148C8.576 3.289 8.903 3.541 9.136 3.872C9.368 4.202 9.495 4.596 9.5 5C9.5 7.8 6 10 6 10Z"
        strokeWidth="1.2"
        {...stroke}
      />
    </svg>
  )
}

export function CloseIcon(p: IconProps) {
  return (
    <svg {...base(p, 20, 20)}>
      <path d="M6 6L12 12M12 12L18 18M12 12L18 6M12 12L6 18" strokeWidth="1.8" {...stroke} />
    </svg>
  )
}

export function PhotoIcon(p: IconProps) {
  return (
    <svg {...base(p, 34, 24)}>
      <path d="M6 4.5H18C19.381 4.5 20.5 5.619 20.5 7V17C20.5 18.381 19.381 19.5 18 19.5H6C4.619 19.5 3.5 18.381 3.5 17V7C3.5 5.619 4.619 4.5 6 4.5Z" strokeWidth="1.5" {...stroke} />
      <path d="M10.6 10C10.6 10.884 9.884 11.6 9 11.6C8.116 11.6 7.4 10.884 7.4 10C7.4 9.116 8.116 8.4 9 8.4C9.884 8.4 10.6 9.116 10.6 10Z" strokeWidth="1.5" {...stroke} />
      <path d="M4 17L9 12.5L13 16L15.5 14L20 18" strokeWidth="1.5" {...stroke} />
    </svg>
  )
}
