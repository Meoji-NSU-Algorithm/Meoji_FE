# 천안온 프론트엔드 (meoji)

전국 축제·전시·공연·체험 행사를 찾아보고, 찜하고, 리뷰를 남기는 서비스의 웹 프론트엔드입니다.
백엔드는 `CheonanOn_BE` 레포(Flask)이고, 디자인은 Figma "NOL 스타일 리디자인" 페이지를 따릅니다.

> **⚠️ 먼저 읽어 주세요: [`docs/backend-requests.md`](docs/backend-requests.md)**
> 기준 백엔드는 `CheonanOn_BE` **develop(01fdeb3)** 입니다. 찜·리뷰 사진·약관·길찾기 등은 실제 API로 연동했고,
> 아직 백엔드에 없는 항목(프로필 수정, 카드 평점·리뷰 수 등)만 [`docs/backend-requests.md`](docs/backend-requests.md)에 남겨 두었습니다.
> 디자인과 백엔드 데이터가 맞지 않는 부분은 [`docs/design-requests.md`](docs/design-requests.md)에 정리했습니다.

## 기술 스택

- React 19 + TypeScript + Vite
- React Router (라우팅), TanStack Query (서버 상태)
- Tailwind CSS v4 (Figma 변수를 `src/index.css`의 `@theme` 토큰으로 옮김)
- Vitest + Testing Library + MSW (테스트), oxlint (린트)
- 카카오 로그인(OAuth), 카카오맵 JS SDK

## 실행 방법

### 1. 사전 준비

- Node.js 20 이상 (개발은 v26에서 진행)
- 백엔드 실행 (백엔드 README 참고)
  ```bash
  # CheonanOn_BE 레포에서
  export FLASK_APP=wsgi.py && flask db upgrade   # DB 생성 + 시드 데이터
  python wsgi.py                                  # http://127.0.0.1:5000
  ```
- 카카오 개발자 콘솔 설정 ([developers.kakao.com](https://developers.kakao.com))
  - 카카오 로그인 활성화, Redirect URI에 `http://localhost:5173/auth/kakao/callback` 등록
  - 동의 항목에서 **이메일**을 필수로 설정 (없으면 백엔드가 400 `KAKAO_PROFILE_INVALID`를 반환)
  - 지도: 플랫폼 > Web에 `http://localhost:5173` 등록, 카카오맵 사용 설정 켜기

### 2. 환경 변수

```bash
cp .env.example .env
```

| 변수 | 설명 |
|---|---|
| `VITE_KAKAO_REST_KEY` | 카카오 REST API 키 (백엔드 `KAKAO_CLIENT_ID`와 같은 값) |
| `VITE_KAKAO_JS_KEY` | 카카오 JavaScript 키 (지도용) |
| `VITE_KAKAO_REDIRECT_URI` | `http://localhost:5173/auth/kakao/callback` |
| `VITE_API_PROXY` | 개발 서버가 `/api`를 넘겨줄 백엔드 주소 (기본 `http://127.0.0.1:5000`) |

**Redirect URI는 세 곳이 정확히 같아야 합니다.**
프론트 `.env`의 `VITE_KAKAO_REDIRECT_URI`, 백엔드 `.env`의 `KAKAO_REDIRECT_URI`, 카카오 콘솔에 등록한 값.
다르면 카카오가 `KOE006` 오류를 내거나 백엔드가 401 `KAKAO_TOKEN_REQUEST_FAILED`를 반환합니다.

`.env`는 `.gitignore`에 포함되어 있어 커밋되지 않습니다. 키를 커밋하지 마세요.

### 3. 실행

```bash
npm install
npm run dev        # http://localhost:5173
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 프로덕션 빌드 (`dist/`) |
| `npm run lint` | oxlint |
| `npm test` | Vitest (한 번 실행) |

### macOS에서 5000번 포트가 이미 사용 중일 때

macOS는 5000번 포트를 AirPlay 수신기가 사용합니다. 백엔드를 다른 포트(예: 5001)로 띄우고
`.env`의 `VITE_API_PROXY=http://127.0.0.1:5001`로 바꿔 주세요.

### CORS

백엔드에는 CORS 설정이 없습니다. 개발 중에는 브라우저가 `localhost:5173`으로만 요청하고, Vite 개발 서버가 `/api`를 백엔드로 대신 전달(프록시)하므로 문제가 없습니다.
배포할 때는 같은 도메인 뒤에서 `/api`를 백엔드로 넘기거나 백엔드에 CORS를 추가해야 합니다 (`docs/backend-requests.md` 7번).

## 화면과 접근 정책

- **홈(`/`)과 로그인 관련 화면만 로그아웃 상태로 볼 수 있습니다.**
- 그 밖의 모든 페이지(행사 목록·검색·상세, 지도, 캘린더, 마이페이지)는 로그인해야 들어갈 수 있고, 로그아웃 상태에서 누르면 로그인 유도 모달이 뜹니다. (`src/layout/RequireLogin.tsx`)
- 비로그인 홈은 필터 없는 목록을 전부 받아 화면에서 분류합니다 (백엔드가 필터 목록에 로그인을 요구하기 때문).

| 경로 | 화면 |
|---|---|
| `/` | 홈 |
| `/auth/login`, `/auth/kakao/callback`, `/auth/terms` | 로그인, 카카오 콜백, 약관 |
| `/events` | 행사 목록·검색 (필터는 URL 쿼리로 관리) |
| `/events/:id`, `/events/:id/directions` | 행사 상세·리뷰, 길찾기 |
| `/calendar`, `/map` | 찜 캘린더, 지도 |
| `/my`, `/my/bookmarks`, `/my/reviews`, `/my/profile` | 마이페이지 (프로필은 읽기 전용) |
| `/my/withdraw`, `/my/withdraw/done` | 회원 탈퇴, 탈퇴 완료 |

## 백엔드 연동 현황

| 기능 | 상태 |
|---|---|
| 카카오 로그인, 토큰 갱신, 로그아웃 | 실제 연동 |
| 행사 목록·상세·월간 인기·카테고리·시도 | 실제 연동 (카드에 평점·리뷰 수는 없음) |
| 리뷰 작성·수정·삭제·내 리뷰 | 실제 연동 (작성자 정보, 사진 업로드, 행사 정보 포함) |
| 찜(북마크) | 실제 연동 (`GET/POST/DELETE /api/bookmarks`, 낙관적 업데이트) |
| 약관 동의 | 실제 연동 (`/api/users/me/consents`, 로그인 후 미동의면 약관 화면) |
| 길찾기 | 실제 연동 (대중교통·자동차·도보, 경로선은 응답에 없고 대중교통·도보는 ODsay 키 문제로 오류) |
| 회원 탈퇴 | 실제 연동 (`DELETE /api/users/me`, 탈퇴 사유는 저장하지 않음) |
| 프로필 | **읽기 전용** — 백엔드에 수정 API가 없고 로그인 때마다 카카오 값으로 덮어씀 |

남은 백엔드 요청은 [`docs/backend-requests.md`](docs/backend-requests.md), 디자인 수정 요청은 [`docs/design-requests.md`](docs/design-requests.md)를 보세요.
API 에러는 `code`로 분기하며, 사용자 문구는 `src/api/errors.ts`의 `errorMessage()`에 모여 있습니다.

## 폴더 구조

```
src/
  api/         API 클라이언트(client.ts), 엔드포인트별 함수, 에러 문구(errors.ts), TanStack Query 훅(hooks.ts)
  auth/        AuthProvider/useAuth, 카카오 인가 URL, 토큰 저장, 로그인 가드 훅(useRequireLogin)
  components/  Figma 기반 공통 컴포넌트 (Header, EventCard, Modal, Toast ...)
  layout/      Layout, RequireLogin(라우트 가드), 로그인 유도 모달
  lib/         카카오맵 SDK 로더
  mocks/       MSW 핸들러 (테스트에서만 사용)
  pages/       화면 (home/, events/, map/, detail/, directions/, my/ 하위에 화면별 구성요소)
docs/          백엔드 요청 사항, 디자인 요청 사항
```

## 인증 동작 메모

- 토큰은 JSON 응답으로 받아 localStorage에 저장하고 `Authorization: Bearer`로 보냅니다 (쿠키 미사용).
- access 1시간, refresh 14일. refresh 토큰은 **1회용**이라 동시에 요청이 여러 개 만료되어도 갱신은 한 번만 보냅니다 (`src/api/client.ts`).
- 카카오 인가 코드도 1회용이라 콜백 화면은 StrictMode에서도 교환 요청을 한 번만 보냅니다.
- 로그아웃 상태에서 찜 하트를 누르고 로그인하면, 로그인 직후 그 행사가 자동으로 찜됩니다.

## 알려진 한계

- 카드 응답에 `average_rating`, `review_count`가 없어 카드의 별점 줄은 그리지 않습니다.
- 찜 목록 응답에는 장소·카테고리·시도·가격 금액이 없어 찜 카드는 해당 줄이 비어 있습니다.
- 지도는 카드의 좌표를 쓰고, 좌표가 없는 행사만 `venue_name`을 카카오 장소 검색으로 변환합니다. 최대 100개까지 표시합니다.
- 길찾기 대중교통·도보는 백엔드의 ODsay 키 인증이 실패해(`ApiKeyAuthFailed`) 오류가 납니다. 키에 서버 IP를 등록해야 합니다 (`docs/backend-requests.md` 0번). 자동차는 동작합니다.
- 길찾기 응답에 경로 좌표가 없어 지도에는 출발·도착 핀만 표시합니다.
- 리뷰 사진을 올리고 리뷰에 붙이지 않으면 서버에 고아 파일이 남습니다 (24시간 뒤 서버가 삭제).
- 로그인이 필요한 화면은 실제 카카오 로그인으로만 확인할 수 있습니다.
