import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
function Svg({ size = 16, children, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      {children}
    </svg>
  )
}
export const ChevronLeftIcon = (p: P) => <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>
export const ShareIcon = (p: P) => <Svg {...p}><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></Svg>
export const RouteIcon = (p: P) => <Svg {...p}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></Svg>
export const WarnIcon = (p: P) => <Svg {...p}><path d="m10.3 3.9-8.2 14A2 2 0 0 0 3.8 21h16.4a2 2 0 0 0 1.7-3.1l-8.2-14a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01" /></Svg>
export const BusIcon = (p: P) => <Svg {...p}><rect x="4" y="3" width="16" height="14" rx="3" /><path d="M4 11h16M7 21v-4M17 21v-4" /></Svg>
export const CarIcon = (p: P) => <Svg {...p}><path d="M5 17h14M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6v4H3zM7 17v2M17 17v2" /></Svg>
export const WalkIcon = (p: P) => <Svg {...p}><circle cx="13" cy="4" r="1.5" /><path d="m9 21 3-6 3 2v4M8 12l3-3 3 3 3 1M11 9l-1 6" /></Svg>
export const TargetIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></Svg>
export const PlusIcon = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const MinusIcon = (p: P) => <Svg {...p}><path d="M5 12h14" /></Svg>
export const CameraIcon = (p: P) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>
export const ChevronRightIcon = (p: P) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
export const XIcon = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
export const TrashIcon = (p: P) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Svg>
export const InfoIcon = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5h.01" /></Svg>
