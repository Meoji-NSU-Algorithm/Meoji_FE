import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar } from './my/Avatar'
import { LoginRequired } from './my/LoginRequired'

/** 프로필은 카카오에서 가져오며 로그인할 때마다 덮어써지므로 읽기 전용이다. */
function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[22px] border border-line bg-surface px-8 py-9">
      <h1 className="text-[24px] font-black leading-9 tracking-[-0.48px] text-ink">내 프로필</h1>
      <p className="pt-1 text-[14px] leading-[21px] text-ink-muted">카카오 계정에서 가져온 정보예요</p>

      <div className="flex justify-center pt-6">
        <Avatar name={user.nickname} src={user.profile_image} size={104} />
      </div>

      <dl className="pt-[26px]">
        <dt className="text-[13px] font-bold leading-[19.5px] text-ink">이름</dt>
        <dd className="mt-[6px] flex h-12 items-center rounded-[12px] border border-line bg-surface-muted px-[14px] text-[15px] text-ink">
          {user.nickname}
        </dd>
        <dt className="pt-[18px] text-[13px] font-bold leading-[19.5px] text-ink">이메일</dt>
        <dd className="mt-[6px] flex h-12 items-center rounded-[12px] border border-line bg-surface-muted px-[14px] text-[15px] text-ink-muted">
          {user.email ?? '제공되지 않았어요'}
        </dd>
      </dl>
      <p className="pt-3 text-[12px] leading-[18px] text-ink-subtle">
        카카오 프로필과 연동돼요. 이름과 사진은 카카오에서 바꾸면 다음 로그인 때 반영돼요.
      </p>

      <div className="flex gap-2 pt-[26px]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-11 flex-1 rounded-[12px] border border-line text-[14px] font-bold text-ink"
        >
          뒤로
        </button>
        <button
          type="button"
          onClick={() => void logout().then(() => navigate('/'))}
          className="h-11 flex-1 rounded-[12px] bg-surface-muted text-[14px] font-bold text-ink"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}

export default function MyProfile() {
  return (
    <div className="px-6 pb-5 pt-[60px]">
      <LoginRequired>
        <Profile />
      </LoginRequired>
    </div>
  )
}
