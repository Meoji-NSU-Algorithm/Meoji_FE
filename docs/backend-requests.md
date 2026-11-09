# 백엔드 요청 사항

대상: 최종 프로젝트 발표용 MVP (feature/integration-mvp). 프론트엔드가 BE 없이는 동작시킬 수 없는 항목만 정리했다. 기능 개선 요청은 포함하지 않는다. 큰 결함만 다룬다.

## 요청 목록 (우선순위 순)

### 1. [P1, 발표 전 필수] GET /api/directions/:eventId 복원

- **요청**: directions 블루프린트를 복원한다. 백엔드에서 이번 주 중 복원하겠다고 답했다.
- **재현**
  - 요청: `GET /api/directions/:eventId?originLat=..&originLng=..&mode=car`
  - 응답: `404 COMMON_NOT_FOUND`. 롤백(PR #21)으로 directions 블루프린트가 제거되었다.
- **기대 응답 형태** (FE가 이미 소비하는 형태)
  - 쿼리: `originLat`, `originLng`, `mode`
  - 응답: `{eventId, mode(car|transit|walk), departureTime, durationMinutes, distanceMeters, arrivalTime, steps:[{stepNumber, type, instruction, durationMinutes, distanceMeters, detail}]}`
- **영향 화면**: `/events/:id/directions` 는 항상 오류 상태로 표시된다.
- **우선순위**: P1

### 2. [P1, 발표 전 필수] GET /api/reviews/my 응답에 event 객체 포함

- **요청**: 리뷰마다 `event: {id, title, image_url, end_date}` 를 포함한다.
- **재현**
  - 요청: `GET /api/reviews/my` (인증)
  - 응답: 리뷰 객체에 `event` 키가 없다. 실제 키: `author, content, created_at, event_id, id, images, rating, updated_at, user_id`.
- **영향 화면**: `/my/reviews`. 모든 리뷰가 대체 제목 '삭제되었거나 볼 수 없는 행사' 와 그라데이션 썸네일로 표시된다. '종료된 행사' 칩은 절대 표시될 수 없다. FE 타입은 `src/api/types.ts` 의 `MyReview.event`.
- **참고**: FE가 행사를 별도로 조회하는 대안은 가능하지만 리뷰 수만큼 N회 요청이 늘어난다. BE 수정을 선호한다.
- **우선순위**: P1

### 3. [P2, 배포 시 필수 확인] CORS

- **요청**: BE에 CORS 설정이 없다. 개발 환경은 Vite 프록시(`/api` -> `127.0.0.1:5000`)로만 동작한다. 배포 시 다음 중 하나가 필요하다.
  - `/api` 를 같은 오리진으로 묶는 리버스 프록시, 또는
  - FE 오리진에 대한 flask-cors 설정 (Authorization 헤더 허용, 메서드 GET/POST/PUT/DELETE/OPTIONS)
- **재현**: 배포 오리진에서는 미검증이다.
- **영향 화면**: 전체 (모든 API 호출)
- **우선순위**: P2

### 4. [P2, 배포 시 필수 확인] 리뷰 이미지 URL의 HTTPS

- **요청**: 리뷰 이미지 URL이 `http://merge.scenarie.xyz:52964/images/reviews/<id>.webp` 로 내려온다 (평문 HTTP, 비표준 포트). HTTPS 배포에서는 브라우저가 mixed content 로 차단한다. https 인 `S3_PUBLIC_URL` 이 필요하다.
- **영향 화면**: 행사 상세 리뷰 사진, 내 리뷰
- **우선순위**: P2

## 참고: 카카오 리다이렉트 URI

BE `.env` 의 리다이렉트 URI는 FE 의 `VITE_KAKAO_REDIRECT_URI` 및 카카오 콘솔 설정과 글자 단위로 일치해야 한다 (README 기준).

## 요청하지 않는 항목 (참고)

아래는 요청이 아니다. 현황 공유용이다.

- 목록·이달의 TOP 카드에 `average_rating` / `review_count` 가 없다. FE는 해당 표시를 숨기며, BE가 복원하면 자동으로 표시된다. (커밋 417deca 가 롤백되었다.)
- `REVIEW_IMAGE_ALREADY_ATTACHED` 검증이 없다. 같은 이미지 키를 여러 리뷰에 붙일 수 있다. (PR #28/#39 롤백.) FE는 해당 에러 코드를 이미 처리한다.
- 카카오 로그인 실제 플로우는 아직 테스트하지 못했다.
