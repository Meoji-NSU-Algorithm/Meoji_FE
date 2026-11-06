# 백엔드 요청 사항

기준: `CheonanOn_BE` develop (01fdeb3). 찜, 리뷰 작성자·사진, `/reviews/my` 행사 정보, 약관 동의, 카드 좌표·이미지·조회수는 반영되어 프론트가 실제 API로 연동했습니다. 길찾기는 연동했지만 아래 0번 때문에 대중교통·도보가 동작하지 않습니다. 아래는 **아직 남은** 요청입니다. 우선순위 순서입니다.

## 화면 정책 (참고)

- 홈(`/`)과 로그인 화면만 로그아웃 상태로 볼 수 있고, 그 밖의 페이지는 로그인해야 합니다. 따라서 `/sidos`와 목록 필터를 로그인 전용으로 둬도 됩니다.
- 비로그인 홈은 필터 없는 목록(`page`/`size`/`sort`만)을 100건씩 받아 화면에서 분류합니다.

## 0. 길찾기 (긴급: 대중교통·도보가 항상 오류)

### 0-1. ODsay API 키 인증 실패
대중교통과 도보는 항상 502 `DIRECTIONS_API_ERROR`가 납니다. 코드 문제가 아니라 키 문제입니다.

- 재현: 백엔드 `.env`의 `ODSAY_API_KEY`로 ODsay API(도보 `searchWalkPathV2`, 대중교통 계열)를 직접 호출하면 200 응답 본문에 `error: [{"code":"500","message":"[ApiKeyAuthFailed] ApiKey authentication failed."}]`가 옵니다.
- 조치: ODsay 콘솔에서 이 키에 **서버 IP(로컬 개발이면 지금 PC의 공인 IP)를 등록**하거나, 서버용 키를 새로 발급받아 `.env`를 바꿔 주세요. ODsay 키는 등록한 IP(또는 URI)에서만 동작합니다.
- 함께 요청: 키 인증 실패는 `DIRECTIONS_API_ERROR`와 별도 코드(예: `DIRECTIONS_API_AUTH_FAILED`)로 구분해 주세요. 지금은 일시적 장애와 구분되지 않아 사용자에게 같은 문구가 나갑니다.
- 자동차는 카카오 모빌리티 키(`KAKAO_CLIENT_ID`)를 써서 정상 동작합니다.

### 0-2. 경로 좌표 `path` 추가 (지도에 경로선이 안 그려짐)
응답에 경로 좌표가 없어서 프론트는 출발·도착 핀만 표시합니다. 원본 응답에는 좌표가 있는데 백엔드가 버리고 있습니다.

- 요청: 응답에 `path: [[lat, lng], ...]` 추가 (모든 mode 공통, 순서대로)
- 원본 위치:
  - 자동차(카카오 모빌리티): `routes[0].sections[].roads[].vertexes` — `[x1,y1,x2,y2,...]`가 경도, 위도 순서로 이어진 배열
  - 도보(ODsay `searchWalkPathV2`): 경로 구간의 좌표 목록
  - 대중교통(ODsay `maasRP`): 응답의 구간별 좌표 정보(없으면 ODsay 문서의 경로 그래픽 좌표 API 사용)
- 좌표가 많으면 지도에 그릴 수 있는 수준으로 솎아 주세요(자동차 경로는 점이 매우 많을 수 있습니다).

### 0-3. 자동차 안내 단계가 너무 많음
자동차 `steps`가 카카오 `guides`를 회전 지점마다 그대로 내려서 수십 개가 됩니다. 프론트가 같은 안내를 합치고 5개만 보여 준 뒤 "전체 보기"로 펼치도록 처리했지만, 백엔드에서 도로명(`roads[].name`) 단위로 묶거나 직진 안내를 빼 주면 더 좋습니다.

### 0-4. 기타
- step의 `detail`이 도보는 객체(`{point, angle, turn, facility}`), 대중교통은 문자열, 자동차는 null입니다. 형태를 통일하거나 문서화해 주세요.

## 1. 프로필 수정 API (화면 있음, API 없음)

닉네임과 프로필 사진은 카카오에서만 가져오고, **로그인할 때마다 카카오 값으로 덮어씁니다.** 프론트는 프로필 화면을 읽기 전용으로 바꿨습니다.

- `PUT /api/users/me` `{nickname?, profile_image?}` → 갱신된 사용자
- 사용자가 수정한 값이 있으면 카카오 로그인 때 덮어쓰지 않는 정책
- 닉네임 길이·중복 정책과 에러 코드
- 프로필 이미지 업로드(리뷰 사진 업로드와 공용 권장)

## 2. 카드 응답에 평점·리뷰 수

디자인의 카드에는 `★ 4.7 (128)`가 표시되지만 `GET /api/events`, `monthly-top` 응답에는 `average_rating`, `review_count`가 없습니다(상세에만 있음). 지금은 이 줄을 그리지 않습니다.

- 카드에 `average_rating`, `review_count` 추가 (목록·monthly-top)
- (선택) 카드에 `tags: string[]` → 홈의 "태그로 찾는 기획전" 사진에 사용

## 3. 찜 목록 응답을 행사 카드 형태로

`GET /api/bookmarks`가 `{id, title, imageUrl, startDate, endDate, priceType}`만 주어서 찜 카드·캘린더에 장소, 카테고리, 시도, 가격 금액, 조회수를 그릴 수 없습니다.

- 항목에 `venue_name`, `category`, `sido`, `price`, `view_count` 추가 (이벤트 카드 스키마와 통일 권장)
- 찜 응답만 camelCase, 이벤트·리뷰는 snake_case라 프론트가 변환합니다. 가능하면 케이스를 통일해 주세요(길찾기도 camelCase).
- (선택) 카드·상세에 `is_bookmarked`를 넣으면 목록 화면에서 찜 목록을 따로 조회하지 않아도 됩니다.

## 4. 리뷰 사진·리뷰 응답

- `GET /api/reviews/my`의 `event`에 `is_permanent`를 추가해 주세요(선택). 상설 행사는 종료 여부를 `end_date`로 판단하기 어렵습니다.
- `S3_PUBLIC_URL`을 설정해 주세요. 미설정이면 이미지 URL이 1시간 뒤 만료되는 presigned URL이라 오래 열어 둔 화면에서 사진이 깨집니다.
- 참고: 업로드만 하고 리뷰에 붙이지 않은 이미지는 서버가 24시간 뒤 정리합니다. 프론트는 삭제 API가 없어도 되므로 이 정책을 유지해 주세요. 5장 초과는 400 `COMMON_INVALID_INPUT`(`errors.images`)으로 오는 것을 확인했고, 프론트는 그 전에 막습니다.

## 5. 회원 탈퇴 사유

디자인 E8에 탈퇴 사유 선택이 있지만 `DELETE /api/users/me`에는 사유를 받는 필드가 없어 저장할 수 없습니다. 프론트는 사유를 서버로 보내지 않고 화면에서만 선택하게 했습니다. 사유를 수집하려면 `{reason?: string}` 같은 선택 필드를 받아 주세요.

## 6. 지도용 조회

지도는 `size=100`(최대)로 시작일순 한 번만 조회합니다. 100개를 넘으면 일부 행사가 지도에 나오지 않습니다.

- 좌표가 있는 행사만 조회하는 옵션, 또는 화면 영역(bounds) 기준 조회

## 7. 약관 본문

약관 화면의 "보기" 버튼에 보여 줄 이용약관·개인정보처리방침·마케팅 본문(또는 URL)이 필요합니다.

## 8. 배포용 CORS

개발 중에는 Vite 프록시(`/api` → 백엔드)로 우회합니다. 배포 시 둘 중 하나가 필요합니다.

- FE와 API를 같은 도메인에서 리버스 프록시로 서빙(권장, 백엔드 변경 없음), 또는
- 백엔드에 `flask-cors` 등으로 FE 오리진 허용: `Authorization`, `Content-Type` 헤더와 `GET,POST,PUT,DELETE,OPTIONS`, preflight 응답 포함. 쿠키를 쓰지 않으므로 credentials는 불필요.

## 참고

- 카카오 Redirect URI는 프론트 `.env`의 `VITE_KAKAO_REDIRECT_URI`, 백엔드 `.env`의 `KAKAO_REDIRECT_URI`, 카카오 콘솔 등록 값이 정확히 같아야 합니다(개발: `http://localhost:5173/auth/kakao/callback`).
- 약관 화면은 `GET /api/users/me/consents`의 `terms_agreed_at === null`이면 보여 줍니다(`is_new_user`에 의존하지 않음).
- 카드의 `sido`는 짧은 이름("충남")으로 내려오는 것을 확인했습니다.
