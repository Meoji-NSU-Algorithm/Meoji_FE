# 배포 가이드

대상: 프론트엔드(Vercel) `https://meoji.spectodocs.cloud` + 백엔드(EC2 + Caddy) `https://api.spectodocs.cloud`
작성: 2026-11-22. 처음 배포하는 사람도 순서대로 따라 할 수 있게 썼다.

## 0. 먼저 이해할 것: 출처와 CORS

**출처(origin)** 는 주소에서 `https://도메인:포트` 까지다. 프론트(`https://meoji.spectodocs.cloud`)와 백엔드(`https://api.spectodocs.cloud`)는 도메인이 달라서 **서로 다른 출처**다.

브라우저에는 "다른 출처의 응답은 그 서버가 허락했을 때만 자바스크립트가 읽을 수 있다"는 보안 규칙이 있다. 이 허락을 전달하는 방법이 **CORS** 다.

1. 프론트 코드가 `api.spectodocs.cloud` 를 호출한다.
2. 브라우저가 먼저 백엔드에 "`meoji...` 에서 온 요청인데 받아도 되나요?"라고 묻는다(preflight, OPTIONS 요청).
3. 백엔드가 `Access-Control-Allow-Origin: https://meoji.spectodocs.cloud` 헤더로 답하면 브라우저가 응답을 프론트에 넘긴다. 헤더가 없거나 주소가 다르면 브라우저가 막고, 개발자 도구에 빨간 CORS 에러가 뜨며 화면은 비어 보인다.

백엔드의 `CORS_ORIGINS` 환경변수가 "허락할 출처 명단"이다. **명단은 글자 하나까지 같아야 한다**: `https` 여부, 끝의 `/`, `www.` 모두 다르면 다른 출처다.

**로컬과 운영은 방식이 다르다.**
- 로컬(`npm run dev`): 브라우저는 `localhost:5173` 하고만 통신한다. Vite 개발 서버가 `/api` 요청을 백엔드로 대신 전달(프록시)하므로 출처가 하나뿐이라 CORS가 필요 없다.
- 운영: 프록시가 없다. 브라우저가 `api.spectodocs.cloud` 를 **직접** 호출하므로 백엔드가 `CORS_ORIGINS` 로 프론트를 허락해야 한다. 프론트는 `VITE_API_BASE` 로 백엔드 주소를 안다.

## 1. 배포 전 체크

- [ ] `main` 에 이번 변경이 머지되었다 (PR 확인).
- [ ] 로컬에서 `npm run lint && npm test && npm run build` 가 모두 통과한다.
- [ ] `docs/qa-report-2026-11-22.md` 의 실제 화면 검수 결과에 막는 문제가 없다.

## 2. DNS (spectodocs.cloud 를 관리하는 곳)

| 호스트 | 종류 | 값 | 용도 |
|---|---|---|---|
| `api` | A | EC2의 공인(탄력적) IP | 백엔드. Caddy가 이 도메인으로 HTTPS 인증서를 받는다 |
| `meoji` | CNAME | Vercel이 안내하는 값 (보통 `cname.vercel-dns.com`) | 프론트 |

- Vercel 화면(5단계)에서 안내하는 값이 위와 다르면 Vercel 안내를 따른다.
- 반영까지 몇 분~몇 시간 걸린다. `dig api.spectodocs.cloud +short` 로 EC2 IP가 나오는지 확인한다.

## 3. 백엔드 (EC2) — 백엔드 담당 또는 EC2 접속 가능한 사람

EC2에서 백엔드 저장소 폴더로 이동해서 진행한다.

1. 최신 코드를 받는다: `git pull` (main).
2. `.env` 를 아래처럼 맞춘다. 값은 따옴표 없이 쓴다.
   ```
   API_DOMAIN=api.spectodocs.cloud
   CORS_ORIGINS=https://meoji.spectodocs.cloud
   KAKAO_REDIRECT_URI=https://meoji.spectodocs.cloud/auth/kakao/callback
   ```
   - `CORS_ORIGINS` 는 쉼표로 여러 개 쓸 수 있다. 로컬 개발도 함께 허용하려면 `...,http://localhost:5173`. 끝에 `/` 를 붙이지 않는다.
   - 이전에 `http://meoji.spectodocs.cloud`(https 아님)로 적혀 있었다면 `https://` 로 고친다.
3. **DB 마이그레이션**(필수): `docker compose run --rm api flask db upgrade`
   - 이번 배포에는 프로필 사진 컬럼을 추가하는 `e7a4c9b2d815` 가 들어 있다. 적용하지 않으면 `/api/users/me` 도 500으로 실패해서 로그인 직후 화면이 깨진다.
4. 다시 띄운다: `docker compose up -d`
5. 확인:
   ```
   curl -i https://api.spectodocs.cloud/api/health
   curl -i -X OPTIONS https://api.spectodocs.cloud/api/events \
     -H 'Origin: https://meoji.spectodocs.cloud' \
     -H 'Access-Control-Request-Method: GET' \
     -H 'Access-Control-Request-Headers: authorization'
   ```
   - 첫 번째는 200, 두 번째 응답 헤더에 `Access-Control-Allow-Origin: https://meoji.spectodocs.cloud` 가 있어야 한다. 없으면 `CORS_ORIGINS` 오타 또는 재시작 누락이다.
6. 기타 점검 (`docs/backend-requests.md` 의 '배포 참고'):
   - AWS 보안 그룹에서 80, 443 포트가 열려 있어야 Caddy가 인증서를 받는다.
   - `S3_PUBLIC_URL` 이 비어 있으면 사진 URL은 1시간 뒤 만료되는 임시 주소다. 값을 넣는다면 `https://` 로 시작해야 한다(`http://` 이면 브라우저가 사진을 차단한다).
   - 태그 재분류가 필요하면 `docker compose run --rm api flask --app wsgi retag-events`.

## 4. 외부 콘솔 설정

**카카오 개발자 콘솔** (내 애플리케이션)
1. 앱 설정 > 플랫폼 > Web: 사이트 도메인에 `https://meoji.spectodocs.cloud` 추가. 없으면 지도 SDK가 로드되지 않는다. (로컬용 `http://localhost:5173` 은 그대로 둔다.)
2. 제품 설정 > 카카오 로그인 > Redirect URI: `https://meoji.spectodocs.cloud/auth/kakao/callback` 추가.
3. 이 Redirect URI는 **카카오 콘솔, 백엔드 `KAKAO_REDIRECT_URI`, Vercel `VITE_KAKAO_REDIRECT_URI` 세 곳이 글자 단위로 같아야** 한다. 하나라도 다르면 로그인이 '시간이 지났어요' 류의 오류로 끝난다.

**ODsay 콘솔**: 서버 IP 등록에 EC2 공인 IP를 추가한다 (도보·대중교통 길찾기).

## 5. 프론트엔드 (Vercel)

1. vercel.com 에 GitHub로 로그인 > **Add New > Project** > `Merge-NSU-Algorithm/Merge_FE` 를 Import한다.
   - 조직 저장소가 안 보이면 Vercel의 GitHub 앱 설정에서 조직 접근을 허용한다. 무료(Hobby) 플랜은 조직 저장소 배포에 제한이 있을 수 있다. 막히면 저장소 소유자 계정에서 진행하거나 Pro 플랜을 쓴다.
2. 설정은 자동 감지된다(Framework: Vite, Build: `npm run build`, Output: `dist`). 코드 저장소의 `vercel.json` 이 `/events/1` 같은 주소를 새로고침해도 404가 나지 않게 해 준다.
3. **Environment Variables** (Production)에 넣는다:
   | 이름 | 값 |
   |---|---|
   | `VITE_API_BASE` | `https://api.spectodocs.cloud/api` (끝에 `/` 없이) |
   | `VITE_KAKAO_REST_KEY` | 로컬 `.env` 와 같은 값 |
   | `VITE_KAKAO_JS_KEY` | 로컬 `.env` 와 같은 값 |
   | `VITE_KAKAO_REDIRECT_URI` | `https://meoji.spectodocs.cloud/auth/kakao/callback` |
   - `VITE_API_PROXY` 는 개발 전용이라 넣지 않는다.
   - `VITE_*` 값은 빌드할 때 코드에 박힌다. 값을 바꾸면 **Redeploy** 를 해야 반영된다.
   - 카카오 REST 키와 JS 키는 브라우저에서 보이는 값이라 비밀이 아니지만, 도메인 제한으로 보호된다. 코드나 PR에 붙여 넣지 않는다.
4. **Deploy**. 끝나면 `xxx.vercel.app` 주소가 생긴다. 이 주소는 백엔드 CORS 명단에 없으므로 여기서는 API가 막힌다. 정상이다.
5. **Settings > Domains** 에서 `meoji.spectodocs.cloud` 를 추가하고, 안내된 DNS 값을 2단계에 넣는다. 'Valid Configuration' 표시가 나오면 완료.

## 6. 배포 후 확인 (실제 브라우저)

`https://meoji.spectodocs.cloud` 에서 개발자 도구(F12) 콘솔·네트워크 탭을 열어 두고 확인한다.

- [ ] 홈이 열리고 행사 목록이 보인다. 콘솔에 CORS 에러가 없다.
- [ ] `/events` 처럼 하위 주소에서 새로고침해도 404가 나지 않는다.
- [ ] 카카오 로그인 > 약관 동의 > 홈으로 돌아와 로그인 상태가 유지된다.
- [ ] 지도 화면에서 카카오 지도가 보인다.
- [ ] 행사 상세에서 사진이 보인다(자물쇠 아이콘 경고 없음).
- [ ] 마이페이지 > 프로필에서 사진을 올리고, 새로고침해도 유지된다. '기본 이미지로 변경'도 동작한다.
- [ ] 길찾기(대중교통)가 열린다. 외부 API 한도를 아끼려고 한두 번만 확인한다.

## 7. 문제가 생기면

| 증상 | 원인과 확인 |
|---|---|
| 콘솔에 `blocked by CORS policy` | 백엔드 `CORS_ORIGINS` 가 정확히 `https://meoji.spectodocs.cloud` 인지, 재시작했는지. 3단계 5번 curl로 확인 |
| 모든 API가 `404` 이고 주소가 `meoji.../api/...` | Vercel에 `VITE_API_BASE` 를 넣지 않았거나 넣고 나서 Redeploy를 안 했다 |
| 요청 주소에 `//` 가 겹침 | `VITE_API_BASE` 끝에 `/` 가 있다 (코드가 제거하지만 값을 고쳐 두는 게 좋다) |
| 로그인 후 화면이 비거나 `/users/me` 500 | 마이그레이션 `flask db upgrade` 미적용 |
| 카카오 로그인 중 오류 | Redirect URI 세 곳 불일치(4단계 3번) |
| 지도 영역이 회색/빈 화면 | 카카오 콘솔 Web 플랫폼 도메인에 `https://meoji.spectodocs.cloud` 누락, 또는 `VITE_KAKAO_JS_KEY` 오타 |
| 사진이 안 보이고 콘솔에 mixed content | `S3_PUBLIC_URL` 이 `http://` |
| 사진이 한 시간 뒤 사라짐 | `S3_PUBLIC_URL` 이 비어 임시 주소를 쓰는 중 |
| 길찾기 502 | ODsay 콘솔에 EC2 IP 미등록 |
| 새로 배포했는데 예전 화면 | 브라우저 캐시. 강력 새로고침(Cmd+Shift+R) |

## 8. 되돌리기

- 프론트: Vercel > Deployments 에서 이전 배포의 **Promote to Production** (즉시 반영, 코드를 되돌릴 필요 없음).
- 백엔드: 이전 커밋으로 `git checkout` 후 `docker compose up -d --build`. 마이그레이션 `e7a4c9b2d815` 는 컬럼 추가라서 되돌려도 이전 코드가 동작한다.
