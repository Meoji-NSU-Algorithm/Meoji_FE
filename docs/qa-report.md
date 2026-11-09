# QA 보고서

## 요약

- 날짜: 2026-11-09
- 브랜치: feature/integration-mvp
- 치명 결함 없음. 주요 결함 2건은 모두 백엔드 쪽이다 (reviews/my 의 event 누락, directions 404). FE 결함은 E2E 에서 발견되지 않았다.

## 환경

- 개발: Vite 프록시 `/api` -> `127.0.0.1:5000`
- 브라우저 E2E: headless Chrome (playwright-core), 토큰 주입 방식
- 배포 환경은 미검증

## 단위·통합 테스트

- Vitest: 99개 -> 120개 테스트, 14개 파일, 모두 통과
- lint 통과, build 통과

## 백엔드 통합 테스트 결과

| 항목 | 결과 | 비고 |
|---|---|---|
| 전 엔드포인트 (아래 예외 제외) | PASS | |
| GET /reviews/my 의 event 객체 | FAIL | event 키 없음 |
| 이미지 키 재사용 | FAIL | 서로 다른 리뷰에 같은 키 허용됨 (롤백 영향, 비차단) |
| 카드 평점 (average_rating/review_count) | 없음 | 알려진 상태 |
| GET /directions/:eventId | 404 | 예상된 결과 (복원 예정) |
| 태그 필터 | 판정 불가 | 태그 데이터 없음 |
| 10MB 초과 업로드 | 미테스트 | |
| REVIEW_FORBIDDEN | 미테스트 | |

토큰 (API 수준 검증): 만료 -> AUTH_TOKEN_EXPIRED, refresh 로테이션 정상, 재사용 -> AUTH_TOKEN_REVOKED.

## 브라우저 E2E

완료:
- 홈
- 목록 + 필터 (`?category_id=2&sido_code=11&is_free=true` -> 3건, API 결과와 일치), 정렬, 검색
- 상세
- 찜 추가/해제
- 리뷰 작성(사진 포함)/수정/삭제
- 캘린더, 지도, 프로필
- 404 페이지
- 존재하지 않는 행사 오류 상태
- 길찾기 오류 상태
- 회원 탈퇴

미완료:
- 실제 카카오 로그인/콜백
- 모바일 뷰포트
- 브라우저에서의 만료 토큰 자동 갱신 (API 수준은 검증됨)
- 배포 오리진에서의 CORS
- 스크린샷은 일부만 육안 확인

## 결함 목록

| 심각도 | ID | 내용 |
|---|---|---|
| 치명 | - | 없음 |
| 주요 | D1 | GET /reviews/my 에 event 누락 (대체 제목/썸네일, '종료된 행사' 칩 불가) |
| 주요 | D1' | GET /directions/:eventId 404 (길찾기 화면 항상 오류) |
| 경미 | D2 | 이미지 키 재사용 허용 (REVIEW_IMAGE_ALREADY_ATTACHED 검증 없음) |
| 경미 | D3 | 카드의 평점/리뷰 수 없음 (FE는 숨김) |
| 경미 | D4 | 리뷰 이미지 URL이 HTTP (HTTPS 배포 시 mixed content) |

FE 결함: E2E 에서 발견되지 않음.

## 수동 확인 필요 항목

- [ ] 카카오 로그인 전체 플로우 (약관 동의 단계 포함, 재로그인)
- [ ] 배포 환경 CORS / HTTPS
- [ ] 모바일 뷰포트
- [ ] 길찾기 복원 후 실제 경로 데이터로 재테스트
- [ ] 배포 환경에서의 S3 업로드

## 남은 테스트 데이터

- S3 버킷에 참조되지 않는 테스트 이미지 몇 개가 남아 있다.
- 테스트 사용자는 이미 삭제되었다.
