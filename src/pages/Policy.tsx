import { NavLink } from 'react-router-dom'
import { POLICIES } from './policy/content'

/** B3: /terms·/privacy 공용 페이지. 푸터 링크로 들어온다. */
export default function Policy({ kind }: { kind: 'terms' | 'privacy' }) {
  const doc = POLICIES[kind]
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex h-11 items-center rounded-full px-[18px] text-[14px] font-bold ${isActive ? 'bg-ink text-white' : 'text-ink-muted'}`

  return (
    <div className="mx-auto w-full max-w-content px-6 pb-20 pt-10">
      <h1 className="text-[32px] font-black leading-[1.5] text-ink">약관 및 정책</h1>
      <div className="mt-4 flex items-center justify-between border-b border-line pb-6">
        <nav aria-label="약관 종류" className="flex gap-1">
          <NavLink to="/terms" className={tab}>
            이용약관
          </NavLink>
          <NavLink to="/privacy" className={tab}>
            개인정보처리방침
          </NavLink>
        </nav>
        <p className="text-[13px] text-ink-muted">
          시행일 <b className="text-ink">{doc.effectiveDate}</b>
        </p>
      </div>
      <div className="flex gap-10 pt-7">
        <nav aria-label="조항 목차" className="w-[220px] shrink-0">
          {doc.articles.map((a, i) => (
            <a key={a.title} href={`#article-${i}`} className="block rounded-lg px-[10px] py-[6px] text-[13px] text-ink-muted hover:bg-primary-tint hover:text-primary-ink">
              {a.title}
            </a>
          ))}
        </nav>
        <div className="flex flex-1 flex-col gap-7">
          {doc.articles.map((a, i) => (
            <section key={a.title} id={`article-${i}`}>
              <h2 className="text-[17px] font-bold leading-[1.5] text-ink">{a.title}</h2>
              <p className="pt-1 text-[15px] leading-[1.6] text-ink-muted">{a.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
