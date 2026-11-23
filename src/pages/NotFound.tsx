import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../components'

export default function NotFound() {
  const navigate = useNavigate()
  const secondary = 'h-11 rounded-card border border-line bg-surface px-[18px] text-[14px] font-bold text-ink'
  return (
    <div className="mx-auto mb-20 flex min-h-[620px] max-w-content items-center justify-center px-6">
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
