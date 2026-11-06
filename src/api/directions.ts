import { api } from './client'
import type { DirectionsQuery, DirectionsResult } from './types'

export const getDirections = (q: DirectionsQuery) =>
  api.get<DirectionsResult>(`/directions/${q.eventId}`, {
    originLat: q.originLat,
    originLng: q.originLng,
    mode: q.mode ?? 'transit',
  })
