// 약관 본문. A7 '보기' 모달과 /terms·/privacy 페이지가 같은 내용을 쓴다.
// shortcut: 본문·시행일은 피그마 자리표시 그대로다. 발표 전에 팀이 확정 문구로 바꿔야 한다.
export interface PolicyDoc {
  title: string
  effectiveDate: string
  articles: { title: string; body: string }[]
}

const TERMS_BODY = '[이용약관 본문이 들어가요]'

export const POLICIES = {
  terms: {
    title: '이용약관',
    effectiveDate: 'YYYY.MM.DD',
    articles: [
      '제1조 (목적)',
      '제2조 (정의)',
      '제3조 (약관의 효력)',
      '제4조 (회원 가입)',
      '제5조 (회원 탈퇴)',
      '제6조 (게시물 관리)',
      '부칙',
    ].map((title) => ({ title, body: TERMS_BODY })),
  },
  privacy: {
    title: '개인정보처리방침',
    effectiveDate: 'YYYY.MM.DD',
    articles: [{ title: '개인정보처리방침', body: '[개인정보처리방침 본문이 들어가요]' }],
  },
  marketing: {
    title: '마케팅 정보 수신',
    effectiveDate: 'YYYY.MM.DD',
    articles: [{ title: '마케팅 정보 수신', body: '[마케팅 정보 수신 안내가 들어가요]' }],
  },
} satisfies Record<string, PolicyDoc>
