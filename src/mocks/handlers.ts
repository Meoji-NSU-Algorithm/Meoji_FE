// 테스트 전용 MSW 핸들러. 앱 런타임에서는 사용하지 않는다.
import { http, HttpResponse } from 'msw'

export const ok = <T,>(data: T, status = 200) =>
  HttpResponse.json({ success: true, message: 'ok', data }, { status })
export const fail = (status: number, code: string, message = code, errors?: Record<string, string[]>) =>
  HttpResponse.json({ success: false, code, message, ...(errors ? { errors } : {}) }, { status })

export const eventCardFixture = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: '테스트 행사',
  category_id: 1,
  category: '공연',
  sido_code: '44',
  sido: '충남',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  venue_name: '천안시민회관',
  image_url: 'https://example.com/a.jpg',
  latitude: 36.8,
  longitude: 127.1,
  view_count: 10,
  price: null,
  is_free: null,
  ...over,
})

export const handlers = [
  http.get('*/api/events/categories', () => ok([{ id: 1, name: '공연', sort_order: 1 }])),
  http.get('*/api/users/me', () => ok({ id: 1, email: 'a@b.c', nickname: '테스터', profile_image: null })),
]
