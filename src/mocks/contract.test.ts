import { describe, expect, it } from 'vitest'
import { bookmarkItemFixture, directionsFixture, eventCardFixture, eventDetailFixture, reviewFixture } from './handlers'

// BE(Meoji_BE app/domains/*/schemas.py)의 응답 필드. 목업이 실제 BE 모양과 어긋나면 여기서 잡는다.
const keys = (o: object) => Object.keys(o).sort()

describe('MSW 목업 모양 = 실제 BE 응답 스키마', () => {
  it('EventCardSchema (snake_case)', () => {
    expect(keys(eventCardFixture())).toEqual(
      [
        'id', 'title', 'category_id', 'category', 'sido_code', 'sido', 'start_date', 'end_date', 'venue_name',
        'image_url', 'latitude', 'longitude', 'view_count', 'price', 'is_free', 'average_rating', 'review_count',
      ].sort(),
    )
  })
  it('EventDetailResponseSchema: 카드 + 상세 + reviews/review_count/average_rating', () => {
    expect(keys(eventDetailFixture())).toEqual(
      [
        ...new Set([...keys(eventCardFixture()), 'average_rating', 'review_count']), 'description', 'address', 'address_detail', 'play_time', 'fee_text', 'organizer',
        'contact_phone', 'homepage_url', 'is_permanent', 'reviews',
      ].sort(),
    )
  })
  it('ReviewResponseSchema (snake_case, images 는 {key,url})', () => {
    expect(keys(reviewFixture())).toEqual(
      ['author', 'images', 'id', 'user_id', 'event_id', 'rating', 'content', 'created_at', 'updated_at'].sort(),
    )
    expect(keys(reviewFixture().author)).toEqual(['id', 'nickname', 'profile_image'])
    expect(reviewFixture({ images: [{ key: 'k', url: 'u' }] }).images[0]).toEqual({ key: 'k', url: 'u' })
  })
  it('BookmarkEventSchema 는 camelCase', () => {
    expect(keys(bookmarkItemFixture())).toEqual(['endDate', 'id', 'imageUrl', 'priceType', 'startDate', 'title'])
  })
  it('directions 응답은 camelCase', () => {
    expect(keys(directionsFixture())).toEqual(
      ['arrivalTime', 'departureTime', 'distanceMeters', 'durationMinutes', 'eventId', 'mode', 'path', 'steps'],
    )
    expect(keys(directionsFixture().steps[0])).toEqual(
      ['detail', 'distanceMeters', 'durationMinutes', 'instruction', 'stepNumber', 'type'],
    )
  })
})
