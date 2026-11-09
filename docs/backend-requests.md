# 백엔드 요청 사항

대상: 최종 프로젝트 발표용 MVP (feature/integration-mvp). 통합 테스트(2026-11-09)에서 확인한 항목 중 FE만으로 해결할 수 없는 4건이다.

각 항목은 FE가 기대하는 기능과 응답 명세다. 구현 방식은 백엔드의 현재 코드 스타일에 맞춰 정하면 된다. "참고 구현"은 롤백 전 코드 위치이며 참고용이다.

공통: 응답은 기존 공통 형식(`{success, data}` / `{success:false, code, message}`)을 따른다. FE는 `code` 로 화면 상태와 문구를 정한다 (`src/api/errors.ts`).

## 요청 목록

| # | 우선순위 | 요청 |
|---|---|---|
| 1 | P1 | 길찾기 API `GET /api/directions/:eventId` |
| 2 | P1 | `GET /api/reviews/my` 항목에 `event` 정보 포함 |
| 3 | P1 | 행사 목록·월간 인기 카드에 `average_rating`, `review_count` 포함 |
| 4 | P2 | 리뷰 작성·수정 시 이미지 key 검증 |

### 1. [P1] 길찾기 API `GET /api/directions/:eventId`

- **요청**: 행사 위치까지의 경로(자동차·대중교통·도보 중 하나)를 반환하는 API가 필요하다.
- **기대 명세**
  - 인증: JWT 필요 (없으면 401). FE는 로그인 상태에서만 호출한다.
  - 쿼리
    - `originLat`: number, 필수, -90~90
    - `originLng`: number, 필수, -180~180
    - `mode`: `car` | `transit` | `walk`, 생략 시 `transit`
  - 응답 `data` (camelCase, `src/api/types.ts` 의 `DirectionsResult`)
    - `eventId`: int
    - `mode`: `car` | `transit` | `walk`
    - `departureTime`: string | null
    - `arrivalTime`: string | null
    - `durationMinutes`: number
    - `distanceMeters`: number
    - `steps`: 배열
      - `stepNumber`: int
      - `type`: `SUBWAY` | `BUS` | `WALK` | `DRIVE` | `OTHER` (그 외 문자열도 허용)
      - `instruction`: string
      - `durationMinutes`: number | null
      - `distanceMeters`: number | null
      - `detail`: string | object | null
  - 상태 코드·에러 코드 (FE가 이미 처리)
    - 200 성공
    - 400 `COMMON_INVALID_INPUT`: 쿼리 값 오류
    - 404 `EVENT_NOT_FOUND`: 행사 없음. FE는 '행사를 찾을 수 없어요' 화면을 띄운다.
    - 404 `ROUTE_NOT_FOUND`: 경로 없음. FE는 '경로 없음' 상태를 띄운다.
    - 502 `DIRECTIONS_API_ERROR`, 504 `DIRECTIONS_API_TIMEOUT`, 500 `DIRECTIONS_API_KEY_MISSING`: 외부 길찾기 서비스 오류. FE는 재시도 문구를 띄운다.
- **현재 동작**: `GET /api/directions/1?originLat=37.5&originLng=127.0&mode=car` → `404 COMMON_NOT_FOUND` (라우트 없음).
- **영향 화면**: `/events/:id/directions` (Figma D1·D2·D3). 항상 오류 상태로 표시된다.
- **참고 구현**: PR #21 (`9f280b8`), 롤백 전 `235c500` 의 `app/domains/directions/` (`routes.py`, `schemas.py`).
- **우선순위**: P1 (발표 전 필요)

### 2. [P1] `GET /api/reviews/my` 항목에 `event` 정보 포함

- **요청**: 내 리뷰 목록의 각 항목에 리뷰가 달린 행사의 요약 정보를 포함한다.
- **기대 명세**
  - 기존 리뷰 필드에 `event` 객체를 추가한다 (`src/api/types.ts` 의 `MyReview.event`).
    - `event.id`: int
    - `event.title`: string
    - `event.image_url`: string | null
    - `event.end_date`: `'YYYY-MM-DD'` | null
  - 상태 코드: 200 (인증 없으면 401, 기존과 같음)
- **현재 동작**: 항목에 `event` 키가 없다. 실제 키는 `author, content, created_at, event_id, id, images, rating, updated_at, user_id` 이다.
- **영향 화면**: `/my/reviews` (Figma E3)
  - 모든 리뷰가 제목 '삭제되었거나 볼 수 없는 행사'와 그라데이션 썸네일로 표시된다 (`src/pages/MyReviews.tsx:28`).
  - `end_date` 가 없어 '종료된 행사' 칩이 표시되지 않는다 (`src/pages/MyReviews.tsx:29`).
- **참고 구현**: 롤백 전 `235c500` 의 `app/domains/reviews/service.py:364`.
- **우선순위**: P1 (발표 전 필요)

### 3. [P1] 행사 목록·월간 인기 카드에 `average_rating`, `review_count` 포함

- **요청**: 카드 응답에 평균 평점과 리뷰 수를 포함한다. 의미는 `GET /api/events/:id` 의 같은 필드와 같다.
- **기대 명세**
  - 대상: `GET /api/events` 의 `events[]`, `GET /api/events/monthly-top` 의 카드 항목
  - `average_rating`: number, 소수 첫째 자리. 리뷰가 없으면 `0.0`
  - `review_count`: int. 리뷰가 없으면 `0`
  - 상태 코드: 기존과 같음 (200)
- **현재 동작**: 두 응답 모두 카드에 해당 필드가 없다.
- **영향 화면**: FE는 값이 오면 카드에 '★ 4.7 (128)'을 자동으로 표시한다 (`src/components/EventCard.tsx:59`). 현재는 숨겨진다.
  - 홈 (Figma A1, 로그인 후 A8): '이번 달 인기 행사'(monthly-top), 지역·다가오는 행사·주말 섹션 카드(`/events`)
  - 행사 목록 `/events` (Figma B1) 카드
  - 제외: 캘린더(B3)와 찜 목록 카드는 `/bookmarks` 응답을 쓰므로 이 요청 대상이 아니다. 지도(B4)와 홈의 무료 카드는 평점을 표시하지 않는다.
- **참고 구현**: 커밋 `417deca`, 롤백 전 `235c500` 의 `app/domains/events/schemas.py:148`.
- **우선순위**: P1 (Figma 카드 디자인에 평점 표시가 있다)

### 4. [P2] 리뷰 작성·수정 시 이미지 key 검증

- **요청**: `POST /api/reviews`, `PUT /api/reviews/:id` 의 `images` 에는 요청한 사용자가 직접 업로드했고 다른 리뷰에 붙지 않은 key만 허용한다.
- **기대 명세** (FE가 이미 처리하는 에러 코드)
  - 409 `REVIEW_IMAGE_ALREADY_ATTACHED`: 다른 리뷰에 이미 붙은 key. FE 문구: '다른 리뷰에 쓰인 이미지는 사용할 수 없어요.'
  - 400 `REVIEW_IMAGE_NOT_UPLOADED`: 본인이 업로드하지 않았거나 업로드 기록이 만료된 key. FE는 사진을 다시 올리라고 안내한다.
  - 거부 시 리뷰의 다른 필드도 바뀌지 않아야 한다.
- **현재 동작**: 다른 사용자의 리뷰 이미지 key(리뷰 조회 응답의 `images` 에 노출됨)를 내 리뷰 `images` 에 넣으면 201로 성공한다 (통합 테스트에서 확인).
- **영향**: 그 상태로 내 리뷰를 수정해 이미지를 빼거나 리뷰를 삭제하면 `app/domains/reviews/service.py` 가 `delete_review_images` 로 저장소 원본을 지운다 (현재 `develop` 기준 166·188행). 원래 작성자의 리뷰 사진이 깨진다.
  - FE 정상 UI는 남의 key를 보내지 않으므로 발표 시연을 막지는 않는다. 직접 API를 호출하면 재현되는 보안 문제다.
- **참고 구현**: 커밋 `afb1731` '리뷰 이미지 key 도용 차단과 업로드 검증 보완' (PR #28/#39).
- **우선순위**: P2

## 배포 참고

요청이 아니라 배포할 때 확인할 내용이다.

- **CORS**: 배포 시 직접 설정할 예정이다.
- **이미지 HTTPS**
  - 현재 `S3_PUBLIC_URL` 은 평문 HTTP 자체 호스팅 주소다. 로컬(`http://localhost`)에서는 문제가 없다.
  - FE를 https로 서비스하면 브라우저가 http 이미지를 mixed content로 차단한다.
  - AWS S3를 쓰면 `S3_PUBLIC_URL` 을 `https://<bucket>.s3.<region>.amazonaws.com` 또는 CloudFront 주소로 설정하고 공개 읽기를 허용한다.
  - FE를 S3 정적 웹사이트 호스팅(http만 지원)으로 올리면서 https가 필요하면 CloudFront를 앞에 둔다.
- **카카오 리다이렉트 URI**: FE `.env` 의 `VITE_KAKAO_REDIRECT_URI`, BE `.env`, 카카오 콘솔 설정이 글자 단위로 일치해야 한다.

## 참고 (요청 아님)

- 카카오 실제 로그인 플로우는 아직 검증하지 못했다.
