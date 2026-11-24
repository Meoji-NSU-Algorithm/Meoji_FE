import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

/** Figma 모바일 보드(M7~M12)의 아이콘 path 를 currentColor 로 옮긴 것. 기본 크기는 Figma 그대로 */
function svg({ size, ...rest }: P, def: number, box: number) {
  const s = size ?? def
  return { width: s, height: s, viewBox: `0 0 ${box} ${box}`, fill: 'none', 'aria-hidden': true, ...rest } as SVGProps<SVGSVGElement>
}
const st = { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** M8 카카오 말풍선 (18px, M8-3 은 17px) */
export function KakaoBubbleIcon(p: P) {
  return (
    <svg {...svg(p, 18, 18)}>
      <path d="M9 3C5.25 3 2.25 5.325 2.25 8.25C2.25 10.125 3.525 11.775 5.4 12.75L4.65 15.45L7.725 13.425C8.175 13.5 8.55 13.5 9 13.5C12.75 13.5 15.75 11.175 15.75 8.25C15.75 5.325 12.75 3 9 3Z" fill="currentColor" />
    </svg>
  )
}

/** M8 혜택 목록 체크 (10px) */
export function SmallCheckIcon(p: P) {
  return (
    <svg {...svg(p, 10, 10)}>
      <path d="M2.08333 5L4.16667 7.08333L7.91667 2.91667" strokeWidth="1.41667" {...st} />
    </svg>
  )
}

/** M8-4·M10 네모 체크박스 안 체크 (12px) */
export function BoxCheckIcon(p: P) {
  return (
    <svg {...svg(p, 12, 12)}>
      <path d="M2.5 6L5 8.5L9.5 3.5" strokeWidth="1.7" {...st} />
    </svg>
  )
}

/** M8-2 로딩 원 (44px) */
export function LoginSpinnerIcon(p: P) {
  return (
    <svg {...svg(p, 44, 44)}>
      <path d="M40 22C40 31.9411 31.9411 40 22 40C12.0589 40 4 31.9411 4 22C4 12.0589 12.0589 4 22 4C31.9411 4 40 12.0589 40 22Z" strokeWidth="5" stroke="#F3E5DE" />
      <path d="M22 4C24.3638 4 26.7044 4.46558 28.8883 5.37017C31.0722 6.27475 33.0565 7.60062 34.7279 9.27208C36.3994 10.9435 37.7252 12.9278 38.6298 15.1117C39.5344 17.2956 40 19.6362 40 22" strokeWidth="5" strokeLinecap="round" stroke="currentColor" />
    </svg>
  )
}

/** M8-3 느낌표 원 (30px) */
export function AlertCircleIcon(p: P) {
  return (
    <svg {...svg(p, 30, 30)}>
      <path d="M26.25 15C26.25 21.2132 21.2132 26.25 15 26.25C8.7868 26.25 3.75 21.2132 3.75 15C3.75 8.7868 8.7868 3.75 15 3.75C21.2132 3.75 26.25 8.7868 26.25 15Z" strokeWidth="2.5" {...st} />
      <path d="M15 9.375V16.25M15 20.625H15.0125" strokeWidth="2.5" {...st} />
    </svg>
  )
}

/** M10-2 완료 체크 (30px) */
export function DoneCheckIcon(p: P) {
  return (
    <svg {...svg(p, 30, 30)}>
      <path d="M6.25 15L12.5 21.25L23.75 8.75" strokeWidth="3" {...st} />
    </svg>
  )
}

/** M9 아바타 배지 카메라 (16px) */
export function BadgeCameraIcon(p: P) {
  return (
    <svg {...svg(p, 16, 16)}>
      <path d="M2.66667 5.33333H4.66667L6 3.33333H10L11.3333 5.33333H13.3333V12.6667H2.66667V5.33333Z" strokeWidth="1.33333" {...st} />
      <path d="M10.3333 8.66667C10.3333 9.95533 9.28866 11 8 11C6.71134 11 5.66667 9.95533 5.66667 8.66667C5.66667 7.378 6.71134 6.33333 8 6.33333C9.28866 6.33333 10.3333 7.378 10.3333 8.66667Z" strokeWidth="1.33333" {...st} />
    </svg>
  )
}

/** M9-2 앨범 (18px) */
export function AlbumIcon(p: P) {
  return (
    <svg {...svg(p, 18, 18)}>
      <path d="M4.125 3.75H13.875C14.7034 3.75 15.375 4.42157 15.375 5.25V12.75C15.375 13.5784 14.7034 14.25 13.875 14.25H4.125C3.29657 14.25 2.625 13.5784 2.625 12.75V5.25C2.625 4.42157 3.29657 3.75 4.125 3.75Z" strokeWidth="1.5" {...st} />
      <path d="M7.95 7.5C7.95 8.16274 7.41274 8.7 6.75 8.7C6.08726 8.7 5.55 8.16274 5.55 7.5C5.55 6.83726 6.08726 6.3 6.75 6.3C7.41274 6.3 7.95 6.83726 7.95 7.5Z" strokeWidth="1.5" {...st} />
      <path d="M3 12.75L6.75 9L9.75 12L11.25 10.5L15 13.5" strokeWidth="1.5" {...st} />
    </svg>
  )
}

/** M9-2 사진 촬영 (18px) */
export function ShootIcon(p: P) {
  return (
    <svg {...svg(p, 18, 18)}>
      <path d="M3 6H5.25L6.75 3.75H11.25L12.75 6H15V14.25H3V6Z" strokeWidth="1.5" {...st} />
      <path d="M11.625 9.75C11.625 11.1997 10.4497 12.375 9 12.375C7.55025 12.375 6.375 11.1997 6.375 9.75C6.375 8.30025 7.55025 7.125 9 7.125C10.4497 7.125 11.625 8.30025 11.625 9.75Z" strokeWidth="1.5" {...st} />
    </svg>
  )
}

/** M9-3 축소 (16px) */
export function ZoomOutIcon(p: P) {
  return (
    <svg {...svg(p, 16, 16)}>
      <path d="M12 7.33333C12 9.91066 9.91066 12 7.33333 12C4.756 12 2.66667 9.91066 2.66667 7.33333C2.66667 4.756 4.756 2.66667 7.33333 2.66667C9.91066 2.66667 12 4.756 12 7.33333Z" strokeWidth="1.33333" {...st} />
      <path d="M5.33333 7.33333H9.33333" strokeWidth="1.33333" {...st} />
    </svg>
  )
}

/** M9-3 확대 (18px) */
export function ZoomInIcon(p: P) {
  return (
    <svg {...svg(p, 18, 18)}>
      <path d="M13.5 8.25C13.5 11.1495 11.1495 13.5 8.25 13.5C5.35051 13.5 3 11.1495 3 8.25C3 5.35051 5.35051 3 8.25 3C11.1495 3 13.5 5.35051 13.5 8.25Z" strokeWidth="1.5" {...st} />
      <path d="M6 8.25H10.5M8.25 6V10.5" strokeWidth="1.5" {...st} />
    </svg>
  )
}

/** M12 목차 펼침 꺾쇠 (18px) */
export function ChevronDownIcon(p: P) {
  return (
    <svg {...svg(p, 18, 18)}>
      <path d="M4.5 6.75L9 11.25L13.5 6.75" strokeWidth="1.5" {...st} />
    </svg>
  )
}

/** S7 찜 없음 하트 외곽선 (20px) */
export function HeartOutlineIcon(p: P) {
  return (
    <svg {...svg(p, 20, 16)}>
      <path d="M8 13.3333C8 13.3333 3.33333 10.4 3.33333 6.66667C3.33946 6.12761 3.50883 5.60306 3.8191 5.1622C4.12937 4.72134 4.56597 4.38488 5.07133 4.19717C5.57669 4.00947 6.12708 3.97934 6.64991 4.11076C7.17274 4.24218 7.64346 4.52898 8 4.93333C8.35654 4.52898 8.82726 4.24218 9.35009 4.11076C9.87292 3.97934 10.4233 4.00947 10.9287 4.19717C11.434 4.38488 11.8706 4.72134 12.1809 5.1622C12.4912 5.60306 12.6605 6.12761 12.6667 6.66667C12.6667 10.4 8 13.3333 8 13.3333Z" strokeWidth="1.33" {...st} />
    </svg>
  )
}
