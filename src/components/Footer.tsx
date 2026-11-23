import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export interface FooterLink {
  label: string
  href: string
}

export interface FooterProps {
  links?: FooterLink[]
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: '이용약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
]

export function Footer({ links = DEFAULT_LINKS }: FooterProps) {
  return (
    <footer className="border-t border-line bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 pb-[42px] pt-[34px] md:flex-row md:justify-between md:px-6">
        <div>
          <Logo size={24} />
          <p className="mt-[10px] text-[12px] leading-[20.4px] text-ink-muted">
            전국 축제 · 전시 · 공연 · 체험 정보를 한곳에서 찾고 저장하세요.
            <br />
            행사 정보 출처: 한국관광공사 TourAPI · © 2026 머지 · 학기 프로젝트
          </p>
        </div>
        <nav aria-label="푸터 메뉴" className="flex gap-[18px]">
          {links.map((l) => (
            <Link key={l.label} to={l.href} className="whitespace-nowrap text-[12px] font-medium leading-[18px] text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
