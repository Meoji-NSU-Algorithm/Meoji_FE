import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useResetProfileImage, useUploadProfileImage } from '../api/hooks'
import { errorMessage } from '../api/errors'
import { useAuth } from '../auth'
import { useToast } from '../components'
import { PhotoIcon } from '../components/icons'
import { cropToFile, type CropArea } from '../lib/cropImage'
import { checkImageFile } from '../lib/imageFile'
import { CameraIcon, TrashIcon } from './detail/icons'
import { Avatar } from './my/Avatar'
import { AvatarCropModal } from './my/AvatarCropModal'
import { LoginRequired } from './my/LoginRequired'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MENU_ITEM = 'flex h-[43px] w-full items-center gap-[10px] rounded-[9px] px-3 text-left text-[14px] leading-[21px] hover:bg-surface-muted'

/** 이름·이메일은 카카오에서 가져오는 읽기 전용이고, 사진만 바꿀 수 있다. */
function Profile() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const upload = useUploadProfileImage()
  const reset = useResetProfileImage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // 고른 원본 사진. 있으면 자르기 모달이 열린다
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const albumRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      badgeRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // 미리보기 blob URL 은 바뀌거나 사라질 때 해제한다
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => () => { if (cropSrc) URL.revokeObjectURL(cropSrc) }, [cropSrc])

  const closeCrop = useCallback(() => setCropSrc(null), [])

  if (!user) return null

  const finish = async (run: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await run()
      await refreshUser()
      toast.show({ message: '프로필을 저장했어요!' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPreview(null)
      setBusy(false)
    }
  }

  // 형식만 먼저 보고, 용량은 잘라낸 결과로 본다 (원본이 커도 잘라서 줄이면 올릴 수 있다)
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setMenuOpen(false)
    if (!file) return
    if (checkImageFile(file) === 'type') {
      setError(errorMessage('IMAGE_INVALID'))
      return
    }
    setError(null)
    setCropSrc(URL.createObjectURL(file))
  }

  const onCropApply = async (area: CropArea) => {
    if (!cropSrc) return
    let cropped: File
    try {
      cropped = await cropToFile(cropSrc, area)
    } catch {
      setCropSrc(null)
      setError(errorMessage('IMAGE_INVALID'))
      return
    }
    setCropSrc(null)
    if (checkImageFile(cropped)) {
      setError(errorMessage('IMAGE_TOO_LARGE'))
      return
    }
    setPreview(URL.createObjectURL(cropped))
    void finish(() => upload.mutateAsync(cropped))
  }

  const onDefault = () => {
    setMenuOpen(false)
    void finish(() => reset.mutateAsync('default'))
  }

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-[22px] border border-line bg-surface px-8 py-9">
      <h1 className="text-[24px] font-black leading-9 tracking-[-0.48px] text-ink">내 프로필</h1>
      <p className="pt-1 text-[14px] leading-[21px] text-ink-muted">다른 사람에게 보이는 이름과 사진이에요</p>

      <div className="flex justify-center pt-6">
        <div ref={anchorRef} className="relative size-[104px]" aria-busy={busy}>
          <Avatar name={user.nickname} src={preview ?? user.profile_image} size={104} />
          <button
            ref={badgeRef}
            type="button"
            aria-label="프로필 사진 변경"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={busy}
            onClick={() => setMenuOpen((o) => !o)}
            className="absolute left-[70px] top-[70px] flex size-[34px] items-center justify-center rounded-full border-[3px] border-white bg-ink text-white disabled:opacity-60"
          >
            <CameraIcon size={16} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-[-58px] top-[112px] z-10 w-[220px] rounded-[14px] border border-line bg-surface p-[6px] shadow-[0_10px_15px_rgba(0,0,0,0.14)]"
            >
              <button type="button" role="menuitem" className={`${MENU_ITEM} text-ink`} onClick={() => albumRef.current?.click()}>
                <PhotoIcon size={18} />
                앨범에서 선택
              </button>
              <button type="button" role="menuitem" className={`${MENU_ITEM} text-ink`} onClick={() => cameraRef.current?.click()}>
                <CameraIcon size={18} />
                사진 촬영
              </button>
              <button type="button" role="menuitem" className={`${MENU_ITEM} text-primary-ink`} onClick={onDefault}>
                <TrashIcon size={18} />
                기본 이미지로 변경
              </button>
            </div>
          )}
          <input ref={albumRef} type="file" accept={ACCEPT} hidden data-testid="profile-album-input" onChange={onPick} />
          <input ref={cameraRef} type="file" accept={ACCEPT} capture="user" hidden data-testid="profile-camera-input" onChange={onPick} />
        </div>
      </div>
      {cropSrc && <AvatarCropModal src={cropSrc} onCancel={closeCrop} onApply={onCropApply} />}
      {/* 아바타와 이름 칸 사이 26px 여백 안에 겹쳐 보여서, 오류가 나도 아래 칸이 밀리지 않는다 */}
      <div className="relative h-0">
        {busy && <p role="status" className="absolute inset-x-0 top-[6px] text-center text-[12px] leading-[18px] text-ink-subtle">사진을 올리고 있어요</p>}
        {error && <p role="alert" className="absolute inset-x-0 top-[6px] text-center text-[12px] leading-[18px] text-primary-ink">{error}</p>}
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
      <p className="pt-[6px] text-[12px] leading-[18px] text-ink-subtle">
        이름과 이메일은 카카오에서 바꾸면 다음 로그인 때 반영돼요.
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
    <div className="px-6 pb-[100px] pt-[60px]">
      <LoginRequired>
        <Profile />
      </LoginRequired>
    </div>
  )
}
