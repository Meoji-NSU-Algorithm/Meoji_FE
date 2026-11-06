import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCategories, useEvents, useMonthlyTop } from '../api/hooks'
import { useAuth } from '../auth'
import { CheckIcon, KakaoIcon } from '../components/icons'
import { AuthScreen } from './home/AuthScreen'
import { startKakaoLogin } from './home/kakaoLogin'

interface Tile { en: string; ko: string; g: string; img?: string | null }
const G = {
  fest: 'linear-gradient(156deg,#e8461c 8.5%,#f7a04b 91.5%)',
  plum: 'linear-gradient(156deg,#7a2257 8.5%,#e87a9a 91.5%)',
  blue: 'linear-gradient(156deg,#2e6fd8 8.5%,#9cd3f5 91.5%)',
  green: 'linear-gradient(156deg,#2f5d34 8.5%,#b6d27a 91.5%)',
  night: 'linear-gradient(156deg,#1c2147 8.5%,#5b3c8c 91.5%)',
  gold: 'linear-gradient(156deg,#b9771a 8.5%,#f4cf6a 91.5%)',
  dark: 'linear-gradient(156deg,#232323 8.5%,#6c6c6c 91.5%)',
  coral: 'linear-gradient(156deg,#d9483b 8.5%,#ffb49a 91.5%)',
  sky: 'linear-gradient(156deg,#4e7db5 8.5%,#e8f1fa 91.5%)',
}
const COLUMNS: Tile[][] = [
  [
    { en: 'HEUNGTARYEONG', ko: '2026\n천안흥타령춤축제', g: G.fest },
    { en: 'LANTERN', ko: '진주\n남강유등축제', g: G.plum },
    { en: 'LIGHT', ko: '서울빛초롱축제', g: G.blue },
    { en: 'ORCHESTRA', ko: '청소년 오케스트라\n정기연주회', g: G.green },
  ],
  [
    { en: 'FIREWORKS', ko: '부산불꽃축제', g: G.night },
    { en: 'CONCERT', ko: '천안예술의전당 가을\n정기공연', g: G.gold },
    { en: 'MEDIA ART', ko: '수원화성\n미디어아트', g: G.night },
    { en: 'AUTUMN', ko: '천안삼거리공원\n단풍축제', g: G.gold },
  ],
  [
    { en: 'EXHIBITION', ko: '독립기념관 근현대사\n특별전', g: G.dark },
    { en: 'CRAFT', ko: '아우내 가을\n공예체험마켓', g: G.coral },
    { en: 'APPLE', ko: '청송사과축제', g: G.coral },
    { en: 'WINTER', ko: '화천\n산천어축제', g: G.sky },
  ],
]
const OFFSETS = ['0px', '-120px', '-40px']

const GRADIENTS = Object.values(G)

/** 실제 인기 행사 사진으로 콜라주를 채운다. 모자라거나 사진이 없으면 기본 그라디언트 타일로 채운다. */
function useColumns(): Tile[][] {
  const { data } = useMonthlyTop({ size: 12 })
  const events = data?.events ?? []
  if (events.length < 6) return COLUMNS
  const tiles: Tile[] = events.map((e, i) => ({
    en: e.category ?? '',
    ko: e.title,
    g: GRADIENTS[i % GRADIENTS.length],
    img: e.image_url,
  }))
  const cols: Tile[][] = [[], [], []]
  tiles.forEach((t, i) => cols[i % 3].push(t))
  return cols
}

function Collage() {
  const columns = useColumns()
  return (
    <div aria-hidden className="absolute -left-[101px] -top-[113px] flex h-[1047px] w-[957px] items-center justify-center">
      <div className="grid w-[834px] -rotate-[8deg] grid-cols-3 gap-[14px] opacity-95">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[14px]" style={{ marginTop: OFFSETS[ci] }}>
            {[...col, ...col].map((t, i) => (
              <div
                key={i}
                className="relative h-[358px] shrink-0 overflow-hidden rounded-[14px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                style={{ background: t.g }}
              >
                {t.img && <img src={t.img} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
                {t.img && <span className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />}
                <div className="absolute left-[14px] top-[15px] w-[241px]">
                  <p className="font-display text-[10.5px] font-extrabold leading-[12.8px] tracking-[1.05px] opacity-85">{t.en}</p>
                  <p className="whitespace-pre-line pt-1 text-[17px] font-black leading-[20.7px] tracking-[-0.34px]">{t.ko}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 로그인 화면 하단 숫자는 실제 데이터에서 가져온다(행사 수, 시·도 수는 BE 시드 기준 16, 분류 수). */
function useStats(): string[][] {
  const total = useEvents({ page: 1, size: 1 }).data?.total_count
  const categories = useCategories().data?.length
  return [
    [total != null ? total.toLocaleString() : '-', '진행 중·예정 행사'],
    ['16', '전국 시·도'],
    [categories != null ? String(categories) : '-', '행사 분류'],
  ]
}

export default function Login() {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const stats = useStats()
  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true })
  }, [isLoggedIn, navigate])

  return (
    <AuthScreen>
      <div className="grid min-h-[820px] min-h-full grid-cols-1 lg:grid-cols-[754fr_686fr]">
        <div className="relative hidden overflow-hidden bg-brand lg:block">
          <Collage />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(240,86,44,0.1) 0%, rgba(215,71,31,0.213) 13.75%, rgba(207,67,27,0.325) 27.5%, rgba(201,63,24,0.55) 55%, rgba(183,55,20,0.642) 66.25%, rgba(169,49,16,0.735) 77.5%, rgba(150,40,12,0.92) 100%)',
            }}
          />
          <div className="absolute bottom-[44px] left-[44px] right-[44px] text-white">
            <p className="font-display text-[22px] font-black leading-[33px] tracking-[-0.88px] opacity-90">meoji</p>
            <h2 className="pt-[10px] text-[40px] font-black leading-[50px] tracking-[-1.2px]">
              오늘 행사 뭐지?
              <br />
              고민될 땐 머지에서
            </h2>
            <p className="pt-2 text-[15px] leading-[22.5px] opacity-90">전국 축제 · 전시 · 공연 · 체험을 한곳에서</p>
            <div className="mt-6 flex gap-7 border-t border-white/30 pt-5">
              {stats.map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-[26px] font-black leading-[39px]">{n}</p>
                  <p className="text-[12px] leading-[18px] opacity-85">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-10">
          <div className="w-[380px] max-w-full">
            <p className="font-display text-[40px] font-black leading-[40px] tracking-[-2px] text-brand">meoji</p>
            <h1 className="pt-[26px] text-[28px] font-black leading-[42px] tracking-[-0.56px] text-ink">3초 만에 시작하기</h1>
            <p className="pt-[6px] text-[14px] leading-[21px] text-ink-muted">카카오 계정 하나면 가입과 로그인이 한 번에 끝나요</p>
            <button
              type="button"
              onClick={startKakaoLogin}
              className="mt-[26px] flex h-[54px] w-full items-center justify-center gap-[7px] rounded-card bg-kakao px-4 text-[16px] font-bold leading-6 text-kakao-ink"
            >
              <KakaoIcon />
              카카오로 시작하기
            </button>
            <div className="flex items-center gap-3 pt-[16px]">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[12px] leading-[18px] text-ink-subtle">또는</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <Link
              to="/"
              className="mt-4 flex h-11 w-full items-center justify-center rounded-card border border-line bg-surface px-[18px] text-[14px] font-bold leading-[21px] text-ink"
            >
              로그인 없이 둘러보기
            </Link>
            <ul className="mt-[26px] flex flex-col gap-[10px] border-t border-line pt-[18px]">
              {['관심 행사 찜 · 캘린더 정리', '다녀온 행사 리뷰 작성', '별도 비밀번호 없이 카카오로 로그인'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] leading-[19.5px] text-ink-muted">
                  <span className="text-brand">
                    <CheckIcon size={16} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="pt-[22px] text-[12px] leading-[19.2px] text-ink-subtle">
              로그인하면 <u>이용약관</u> 및 <u>개인정보처리방침</u>에 동의한 것으로 봐요.
            </p>
          </div>
        </div>
      </div>
    </AuthScreen>
  )
}
