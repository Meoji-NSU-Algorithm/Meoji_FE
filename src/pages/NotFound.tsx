import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../components'
import { useIsMobile } from '../lib/useIsMobile'

export default function NotFound() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  if (isMobile)
    return (
      // M11: 탭바가 보이는 404. 버튼 순서·색이 데스크톱과 반대(행사 둘러보기가 주 버튼)
      <div className="flex flex-col items-center px-7 pb-10 pt-[150px] text-center">
        <p className="font-display text-[88px] font-black leading-[88px] tracking-[-3px] text-brand">404</p>
        <h1 className="pt-[22px] text-[21px] font-black leading-[29px] tracking-[-0.2px] text-ink">페이지를 찾을 수 없어요</h1>
        <p className="pt-[6px] text-[14px] leading-[17px] tracking-[-0.2px] text-ink-muted">주소가 바뀌었거나 삭제된 페이지예요</p>
        <div className="flex w-[334px] max-w-full flex-col gap-2 pt-8">
          <button
            type="button"
            className="h-[50px] w-full rounded-[12px] bg-primary text-[15px] font-bold tracking-[-0.2px] text-white"
            onClick={() => navigate('/events')}
          >
            행사 둘러보기
          </button>
          <button
            type="button"
            className="h-[50px] w-full rounded-[12px] border border-line-strong bg-surface text-[15px] font-bold tracking-[-0.2px] text-ink"
            onClick={() => navigate('/')}
          >
            홈으로 가기
          </button>
        </div>
      </div>
    )
  const secondary = 'h-11 rounded-card border border-line bg-surface px-[18px] text-[14px] font-bold text-ink'
  return (
    <div className="mx-auto mb-20 flex min-h-[60vh] max-w-content items-center justify-center px-4 md:min-h-[620px] md:px-6">
      <ErrorState
        flush
        code="404"
        title="페이지를 찾을 수 없어요"
        message="주소가 바뀌었거나 삭제된 페이지예요"
        actions={
          <>
            <button type="button" className={secondary} onClick={() => navigate('/events')}>
              행사 둘러보기
            </button>
            <button
              type="button"
              className="h-11 rounded-card bg-primary px-[18px] text-[14px] font-bold text-white"
              onClick={() => navigate('/')}
            >
              홈으로 가기
            </button>
          </>
        }
      />
    </div>
  )
}
