import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
function svg({ size = 16, ...rest }: P): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...rest,
  }
}

export const ListIcon = (p: P) => (
  <svg {...svg(p)}>
    <path d="M5.5 4H13M5.5 8H13M5.5 12H13M2.8 4H3M2.8 8H3M2.8 12H3" />
  </svg>
)
export const CalendarSmallIcon = (p: P) => (
  <svg {...svg(p)}>
    <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
    <path d="M2.5 6.5H13.5M5.5 2V4.5M10.5 2V4.5" />
  </svg>
)
export const MapSmallIcon = (p: P) => (
  <svg {...svg(p)}>
    <path d="M2 4L5.5 2.5L10.5 4.5L14 3V12L10.5 13.5L5.5 11.5L2 13V4ZM5.5 2.5V11.5M10.5 4.5V13.5" />
  </svg>
)
export const ChevronLeftIcon = (p: P) => (
  <svg {...svg(p)}>
    <path d="M10 3.5L5.5 8L10 12.5" />
  </svg>
)
export const ChevronRightIcon = (p: P) => (
  <svg {...svg(p)}>
    <path d="M6 3.5L10.5 8L6 12.5" />
  </svg>
)
export const HeartOutlineIcon = (p: P) => (
  <svg {...svg(p)}>
    <path d="M8 13C8 13 2.5 9.8 2.5 6C2.5 4.3 3.8 3 5.4 3C6.5 3 7.5 3.6 8 4.6C8.5 3.6 9.5 3 10.6 3C12.2 3 13.5 4.3 13.5 6C13.5 9.8 8 13 8 13Z" />
  </svg>
)
export const WifiOffIcon = ({ size = 24, ...p }: P) => (
  <svg {...svg({ size, ...p })} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M3 3L21 21M8.5 16.4C10.5 14.9 13.5 14.9 15.5 16.4M5 12.9C6.1 12 7.3 11.4 8.6 11M19 12.9C18.2 12.2 17.3 11.7 16.3 11.3M2 8.8C3.6 7.4 5.4 6.5 7.3 6M22 8.8C19.8 6.9 17 5.8 14 5.6M12 20H12.01" />
  </svg>
)
export const SearchBigIcon = ({ size = 24, ...p }: P) => (
  <svg {...svg({ size, ...p })} viewBox="0 0 24 24" strokeWidth={1.8}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20L15.8 15.8" />
  </svg>
)
export const PinBigIcon = ({ size = 24, ...p }: P) => (
  <svg {...svg({ size, ...p })} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M12 21C12 21 19 14.8 19 9.5C19 5.6 15.9 2.5 12 2.5C8.1 2.5 5 5.6 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)
export const LocateIcon = ({ size = 18, ...p }: P) => (
  <svg {...svg({ size, ...p })} viewBox="0 0 18 18" strokeWidth={1.5}>
    <circle cx="9" cy="9" r="3.5" />
    <path d="M9 1.5V4M9 14V16.5M1.5 9H4M14 9H16.5" />
  </svg>
)
export const PlusIcon = ({ size = 18, ...p }: P) => (
  <svg {...svg({ size, ...p })} viewBox="0 0 18 18" strokeWidth={1.5}>
    <path d="M9 3.5V14.5M3.5 9H14.5" />
  </svg>
)
export const MinusIcon = ({ size = 18, ...p }: P) => (
  <svg {...svg({ size, ...p })} viewBox="0 0 18 18" strokeWidth={1.5}>
    <path d="M3.5 9H14.5" />
  </svg>
)

/* ---- 모바일(Figma M2·M3·M4·S1~S6) 아이콘: Figma 내보낸 SVG 경로 그대로, 색은 currentColor ---- */
type M = SVGProps<SVGSVGElement> & { size?: number }
const mob = (box: number, { size = box, ...rest }: M, sw: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: `0 0 ${box} ${box}`,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round',
  'aria-hidden': true,
  ...rest,
})

/** M2 필터 버튼 15px */
export const FilterIcon = (p: M) => (
  <svg {...mob(15, p, 1.25)}>
    <path d="M2.5 3.75H8.75M11.25 3.75H12.5M2.5 7.5H5M7.5 7.5H12.5M2.5 11.25H10" />
    <path d="M11.25 3.75C11.25 4.44036 10.6904 5 10 5C9.30964 5 8.75 4.44036 8.75 3.75C8.75 3.05964 9.30964 2.5 10 2.5C10.6904 2.5 11.25 3.05964 11.25 3.75Z" />
    <path d="M7.5 7.5C7.5 8.19036 6.94036 8.75 6.25 8.75C5.55964 8.75 5 8.19036 5 7.5C5 6.80964 5.55964 6.25 6.25 6.25C6.94036 6.25 7.5 6.80964 7.5 7.5Z" />
    <path d="M12.5 11.25C12.5 11.9404 11.9404 12.5 11.25 12.5C10.5596 12.5 10 11.9404 10 11.25C10 10.5596 10.5596 10 11.25 10C11.9404 10 12.5 10.5596 12.5 11.25Z" />
  </svg>
)
/** S1 검색 결과 없음 28px */
export const SearchMinusIcon = (p: M) => (
  <svg {...mob(28, p, 2.33333)}>
    <path d="M21 12.8333C21 17.3437 17.3437 21 12.8333 21C8.32301 21 4.66667 17.3437 4.66667 12.8333C4.66667 8.32301 8.32301 4.66667 12.8333 4.66667C17.3437 4.66667 21 8.32301 21 12.8333Z" />
    <path d="M23.3333 23.3333L19.25 19.25M9.91667 12.8333H15.75" />
  </svg>
)
/** S2 불러오기 실패 28px */
export const RefreshIcon = (p: M) => (
  <svg {...mob(28, p, 2.33333)} strokeLinejoin="round">
    <path d="M23.3333 12.8333C23.3101 10.6754 22.5398 8.59224 21.1535 6.93834C19.7673 5.28445 17.8507 4.16204 15.73 3.76215C13.6094 3.36226 11.4157 3.70961 9.52226 4.74506C7.62887 5.78052 6.1528 7.44011 5.34527 9.44137C4.53775 11.4426 4.44867 13.6619 5.09321 15.7214C5.73774 17.7809 7.07606 19.5535 8.88038 20.7374C10.6847 21.9212 12.8435 22.4433 14.9894 22.2146C17.1353 21.986 19.1356 21.0208 20.65 19.4833M16.3333 12.8333H23.3333V5.83333" />
  </svg>
)
/** M2-2 기간 버튼 16px */
export const CalendarFieldIcon = (p: M) => (
  <svg {...mob(16, p, 1.33333)} strokeLinecap="butt">
    <path d="M4 3.33333H12C12.7364 3.33333 13.3333 3.93029 13.3333 4.66667V12C13.3333 12.7364 12.7364 13.3333 12 13.3333H4C3.26362 13.3333 2.66667 12.7364 2.66667 12V4.66667C2.66667 3.93029 3.26362 3.33333 4 3.33333Z" />
    <path d="M2.66667 6.66667H13.3333M6 2V4.66667M10 2V4.66667" />
  </svg>
)
/** S3 달 이동 20px / M4 달 이동 16px */
export const ChevronLeft20Icon = (p: M) => (
  <svg {...mob(20, p, 1.66667)}>
    <path d="M12.5 5L7.5 10L12.5 15" />
  </svg>
)
export const ChevronRight20Icon = (p: M) => (
  <svg {...mob(20, p, 1.66667)}>
    <path d="M7.5 5L12.5 10L7.5 15" />
  </svg>
)
export const ChevronLeft16Icon = (p: M) => (
  <svg {...mob(16, p, 1.33333)}>
    <path d="M10 4L6 8L10 12" />
  </svg>
)
export const ChevronRight16Icon = (p: M) => (
  <svg {...mob(16, p, 1.33333)}>
    <path d="M6 4L10 8L6 12" />
  </svg>
)
/** M3 안내 줄 14px */
export const InfoSmallIcon = (p: M) => (
  <svg {...mob(14, p, 1.16667)}>
    <path d="M12.25 7C12.25 9.8995 9.8995 12.25 7 12.25C4.10051 12.25 1.75 9.8995 1.75 7C1.75 4.10051 4.10051 1.75 7 1.75C9.8995 1.75 12.25 4.10051 12.25 7Z" />
    <path d="M7 6.41667V9.33333M7 4.66667H7.00583" />
  </svg>
)
/** M3·S4 내 위치 18px (S5 꺼짐은 off) */
export const LocateMobileIcon = ({ off, ...p }: M & { off?: boolean }) => (
  <svg {...mob(18, p, 1.5)}>
    <path d="M12 9C12 10.6569 10.6569 12 9 12C7.34315 12 6 10.6569 6 9C6 7.34315 7.34315 6 9 6C10.6569 6 12 7.34315 12 9Z" />
    <path d={`M9 1.5V3.75M9 14.25V16.5M1.5 9H3.75M14.25 9H16.5${off ? 'M3 3L15 15' : ''}`} />
  </svg>
)
/** M3 선택 카드 닫기 16px */
export const CloseSmallIcon = (p: M) => (
  <svg {...mob(16, p, 1.33333)}>
    <path d="M4 4L12 12M12 4L4 12" />
  </svg>
)
/** S5 위치 꺼짐 24px */
export const LocationOffIcon = (p: M) => (
  <svg {...mob(24, p, 2)}>
    <path d="M15.6 5.2C14.7086 4.53144 13.6486 4.12431 12.5388 4.02424C11.4291 3.92418 10.3134 4.13512 9.31672 4.63344C8.32008 5.13175 7.4819 5.89776 6.8961 6.84561C6.31029 7.79347 6 8.88573 6 10C6 15.4 12 21 12 21C12 21 18 15.4 18 10" />
    <path d="M3 3L21 21" />
  </svg>
)
/** M4 안내 12px · S6 빈 상태 26px 하트 */
export const HeartLineIcon = ({ size = 12, ...p }: M) => (
  <svg {...mob(26, { size, ...p }, 2.16667)} strokeLinecap="butt">
    <path d="M13 21.6667C13 21.6667 5.41667 16.9 5.41667 10.8333C5.42662 9.95736 5.70184 9.10497 6.20603 8.38858C6.71022 7.67218 7.4197 7.12543 8.24091 6.8204C9.06212 6.51538 9.9565 6.46642 10.8061 6.67998C11.6557 6.89354 12.4206 7.35959 13 8.01667C13.5794 7.35959 14.3443 6.89354 15.1939 6.67998C16.0435 6.46642 16.9379 6.51538 17.7591 6.8204C18.5803 7.12543 19.2898 7.67218 19.794 8.38858C20.2982 9.10497 20.5734 9.95736 20.5833 10.8333C20.5833 16.9 13 21.6667 13 21.6667Z" />
  </svg>
)
