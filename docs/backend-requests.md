# 백엔드 요청 사항

갱신: 2026-11-22. 대상: 최종 프로젝트 발표용 MVP. MVP 기준. 화면을 막거나 서비스가 동작하지 않는 치명적 항목만 요청한다. 나머지는 맨 아래 참고 표에 한 줄로 둔다.

FE가 이미 우회한 것(필드명 camelCase/snake_case 혼재, 북마크 응답에 `is_bookmarked` 없음 등)은 적지 않는다. 2026-11-22에는 BE 저장소(`Meoji_BE`, develop `492a4ca`)의 코드를 직접 읽어 해결 여부를 다시 확인했다. 해결 표의 '코드 확인'은 코드만 읽은 것이고, 실제 서버 동작은 같은 날 QA 보고서(`docs/qa-report-2026-11-22.md`)에서 따로 확인한다. 아래 내용은 2026-11-20·21 QA에서 로컬 BE+MySQL 대상으로 확인했다 (`docs/qa-report-2026-11-20.md` F1~F8, `docs/qa-report-2026-11-21.md`). 응답은 공통 형식(`{success, data}` / `{success:false, code, message}`)을 따르고, FE는 `code` 로 화면 상태와 문구를 정한다 (`src/api/errors.ts`).

## 해결된 항목

해결 표의 `구 B*` 는 번호를 다시 매기기 전의 옛 번호다.

| 항목 | 해결일 | 한 줄 메모 |
|---|---|---|
| 길찾기 API `GET /api/directions/:eventId` | 2026-11-18 | BE #65·#69. 자동차 200. 도보·대중교통은 2026-11-21에 해결 (구 B3 행) |
| `GET /api/reviews/my` 항목에 `event` 정보 | 2026-11-18 | BE #64 |
| 행사 목록·월간 인기 카드의 `average_rating`, `review_count` | 2026-11-18 | BE #66 |
| 리뷰 이미지 key 검증 | 2026-11-18 | BE #66. 업로드 API를 없애고 multipart로 받는 방식으로 해결. FE는 2026-11-18에 대응 |
| 구 B1 개발 DB 마이그레이션 | 2026-11-21 | QA 확인: DB 리비전 `371612cb106c` 가 코드 head 와 일치 |
| 구 B3 도보·대중교통 길찾기 502 | 2026-11-21 | QA 확인: 자동차·도보·대중교통 모두 200, ODsay 정상 |
| 구 B5 `GET /api/events/sidos` 공개 | 2026-11-22 | 2026-11-21 QA에서 토큰 없이 200 확인. BE 커밋 `5864586`·`058d509` 로 반영됨 (코드 확인) |
| 구 B9 행사 상세 `GET /api/events/:id` 500 | 2026-11-22 | 데코레이터 순서를 되돌려 해결, BE에 커밋됨 (`events/routes.py:97-98`, 코드 확인) |
| B1 CORS 헤더 | 2026-11-22 | flask-cors 적용 (`app/__init__.py:35-40`). 허용 출처는 BE `.env` 의 `CORS_ORIGINS`. preflight 테스트 있음 (`tests/integration/test_cors.py`). **운영 `CORS_ORIGINS` 에 `https://meoji.spectodocs.cloud` 를 넣어야 한다** (`docs/deploy.md`) |
| B2 대중교통 `path` 시외 구간(`OTHER`) 누락 | 2026-11-22 | BE `27f427d`: 열차·고속버스·시외버스(trafficType 4·5·6)가 `path` 에 `OTHER` 로 들어온다. `graph` 가 없는 구간은 여전히 빠지므로 FE의 점선 이음은 유지 (코드 확인) |
| B3 태그가 단어 일부에 붙음 | 2026-11-22 | BE `7bd3514`: 태그별 용어·제외어 규칙(`app/domains/tour/tag_terms.py`)과 재태깅 명령 `flask --app wsgi retag-events`. 운영 DB에서 재태깅을 실행했는지는 확인 필요 (코드 확인) |
| 구 B6 프로필 사진 변경 | 2026-11-22 | `PUT /api/users/me/profile-image`(multipart `image`), `PUT /api/users/me/profile-image/source`(`kakao`/`default`). FE 구현 완료. 닉네임 수정 API는 없고 요청하지 않는다 |
| 구 B7 깨진 PNG 업로드 500 | 2026-11-22 | 사진 변환 오류를 400 `IMAGE_INVALID` 로 돌려준다 (`app/core/images.py`, 코드 확인). 오류 코드 이름이 `REVIEW_IMAGE_*` 에서 `IMAGE_*` 로 바뀌었고 FE는 대응함. 실제 깨진 파일로는 QA에서 확인 |

## 미해결 요청 목록

| # | 우선순위 | 요청 |
|---|---|---|
| B1 | P2 | 자동차 길찾기가 일부 출발지·도착지에서 404 `ROUTE_NOT_FOUND` (원인 미확인) |
| B2 | P1 | 이미지 저장소(R2) `PutObject` 가 `AccessDenied` — 프로필·리뷰 사진 업로드가 모두 503 |

### B2. [P1] 이미지 저장소(R2) 쓰기 권한 없음

- **재현 (2026-11-22, 로컬 BE, 사용자 승인 후 1회)**: 정상 PNG(256×256, 21KB) 한 장으로 `PUT /api/users/me/profile-image` 를 호출하면 503 `IMAGE_STORAGE_UNAVAILABLE`. BE 로그: `이미지 저장 실패: key=profiles/<uuid>.webp` / `botocore.errorfactory.AccessDenied: An error occurred (AccessDenied) when calling the PutObject operation: Access Denied` (`app/core/storage.py:58`).
- **원인 (확인됨)**: BE `.env` 의 R2 액세스 키가 이 버킷에 쓰기(PutObject) 권한이 없다. 읽기용 토큰이거나 버킷 정책에서 막혔을 가능성이 크다. 사진 변환(webp)까지는 통과했고 저장 단계에서 실패했다.
- **영향**: 프로필 사진 업로드와 리뷰 사진 첨부가 모두 서버에서 실패한다. 이전 QA(11/18~21)는 원격 버킷에 쓰지 않아 이 문제를 발견하지 못했다. **운영 서버가 같은 키를 쓰면 운영에서도 사진 기능이 동작하지 않는다.** FE는 '이미지 저장소를 잠시 사용할 수 없어요. 잠시 후 다시 시도해 주세요.' 를 보여 주고 화면은 막히지 않는다.
- **요청**: R2 API 토큰 권한을 해당 버킷의 **Object Read & Write** 로 바꾸거나 새 토큰을 발급해 BE `.env` 에 넣고, 업로드가 200인지 확인해 달라. 운영 서버 키도 같은 방식으로 확인한다.
- **우선순위**: P1 (사진 기능 전체가 막힘)

### B1. [P2] 자동차 길찾기 404 `ROUTE_NOT_FOUND`

- **재현 (2026-11-22 QA, 로컬 BE, 1회)**: 행사 718(서울 대학로)에 출발지 서울역(37.5547, 126.9707)으로 `GET /api/directions/718?mode=car` 를 호출하면 404 `ROUTE_NOT_FOUND`("경로를 찾을 수 없습니다."). 같은 출발지·도착지로 `mode=transit`(20분)과 `mode=walk`(1시간 20분, 5.2km)는 200 이다. 6km 안팎의 서울 도심 경로라 자동차 경로가 없을 이유가 없어 보인다.
- **원인 후보 (미확인)**: `car_service.py` 가 `ROUTE_NOT_FOUND` 를 던지는 곳이 5군데(routes 비어 있음, `result_code != 0` 등, 118~141행 근처)다. 외부 API 호출 한도를 아끼려고 같은 요청을 다시 보내지 않아 어느 분기인지는 모른다. 카카오 모빌리티가 준 `result_code`·`result_msg` 를 로그에 남기고, 출발지·도착지가 도로에서 떨어져 있을 때(길 위로 보정) 등 응답 코드별로 처리하는지 확인해 달라.
- **영향**: FE는 '이 방법으로는 경로를 찾지 못했어요'(출발지 변경 / 대중교통으로 보기)로 안전하게 처리하므로 화면은 막히지 않는다. 다만 자동차 성공 화면은 이번 QA에서 확인하지 못했다.
- **우선순위**: P2

## 참고 (요청 아님)

MVP 기준으로 요청하지 않는 항목이다.

| 기존 ID | 한 줄 내용 | Figma 화면 |
|---|---|---|
| 구 B4 | 길찾기 응답 구조화 (path 형태 통일, 대중교통 단계 객체화, turnType, 합계 필드). FE가 문자열 파싱 등으로 우회 중 | 2차 A2 D1 길찾기 펼침형 경로 안내(586:2), A3 자동차·도보(587:2) — 시안의 '천안역 승차', '천안역 방면', '6개 정류장 이동', '1개 역 이동', 회전 화살표 |
| 신규 | 사용자 응답에 `profile_image_source` 가 없다. 그래서 FE는 '기본 이미지'와 '카카오 계정에 사진이 없음'을 구분할 수 없다. FE는 '기본 이미지로 변경'만 제공하므로 막히지 않는다 | E6 프로필 사진 변경(435:2) |
| 신규 | 대중교통 열차·고속버스·시외버스 단계의 `instruction` 이 모두 '이동' 이다. 어디서 어디로 가는지 알 수 없다. FE는 그대로 '이동' 으로 보여 준다 | D1 길찾기(586:2) |
| 구 B6 일부 | 닉네임 수정 API(`PATCH /api/users/me`)는 없다. 디자인이 닉네임 편집을 요구하지 않으므로 요청하지 않는다 | E5 프로필 편집(434:2) |
| 구 B8 | 지도 영역 조회(`min_lat` 등). 카드 `tags` 는 필요 없으므로 목록 응답에 `tags` 를 요청하지 않는다 | B4 지도(419:2), 2차 A5 지도(589:2) — 앞 100건만 표시 |

## 배포 참고 (요청 아님)

- **이미지 URL**: BE `.env` 의 `S3_ENDPOINT` 가 원격 R2 를 가리키고 `S3_PUBLIC_URL` 이 비어 있으면 `images[].url` 이 1시간짜리 presigned URL 이거나 null 이 된다. 공개 URL 설정을 확인한다. 이 환경에서는 정상 이미지 업로드(PNG/JPG/WEBP)를 원격 버킷에 쓰지 않아 검증하지 못했다.
- **이미지 HTTPS**: `S3_PUBLIC_URL` 이 평문 HTTP 이면 FE를 https로 서비스할 때 브라우저가 mixed content로 차단한다. AWS S3는 `https://<bucket>.s3.<region>.amazonaws.com` 또는 CloudFront 주소로 설정하고 공개 읽기를 허용한다. FE를 S3 정적 웹사이트 호스팅(http만 지원)으로 올리면서 https가 필요하면 CloudFront를 앞에 둔다.
- **카카오 리다이렉트 URI**: FE 환경변수 `VITE_KAKAO_REDIRECT_URI`, BE `.env` 의 `KAKAO_REDIRECT_URI`, 카카오 콘솔 설정이 글자 단위로 일치해야 한다. 운영 값은 `https://meoji.spectodocs.cloud/auth/kakao/callback` 이다.
- **ODsay**: 로컬에서 도보·대중교통이 정상 동작한다 (2026-11-21). 배포 서버 IP를 ODsay 콘솔에 등록해야 한다.
- **KOPIS**: 2026-11-21 User-Agent 수정 반영 (BE 커밋 `b0e8880`, 브라우저 User-Agent 추가). 수집 재개 여부는 미확인이다. 개발 DB 에는 KOPIS 행사 586건이 있다 (전체 720건 중, QA 읽기 전용 집계). 발표 전에 수집된 데이터 양을 확인한다.
- **마이그레이션**: BE 코드 head 는 `e7a4c9b2d815`(프로필 사진 컬럼 추가)다. 운영 DB는 `docker compose run --rm api flask db upgrade` 를 실행해야 하며, 적용 전에는 `/users/me` 도 실패한다.
- **사진 URL 만료**: `S3_PUBLIC_URL` 이 비어 있으면 리뷰·프로필 사진 URL이 1시간짜리 presigned URL 이다. 공개 URL 을 설정하면 만료되지 않는다.
- 카카오 실제 로그인 플로우는 아직 검증하지 못했다.
