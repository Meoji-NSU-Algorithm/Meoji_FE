// BE 좌표(latitude/longitude)가 없는 행사만 장소명을 Kakao Places 키워드 검색으로 좌표로 바꾼다.
// 결과(없음 포함)를 메모리 + localStorage에 캐시한다.
export interface Coord {
  lat: number
  lng: number
}

const STORE_KEY = 'cheonanon.geocode.v1'
const MAX_ENTRIES = 500

let mem: Map<string, Coord | null> | null = null
const inflight = new Map<string, Promise<Coord | null>>()

function store(): Map<string, Coord | null> {
  if (mem) return mem
  mem = new Map()
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Record<string, Coord | null>
    for (const [k, v] of Object.entries(raw)) mem.set(k, v)
  } catch {
    /* 캐시 없음 */
  }
  return mem
}
function persist() {
  try {
    const entries = [...store().entries()].slice(-MAX_ENTRIES)
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* 저장 불가 */
  }
}
/** 테스트용 */
export function resetGeocodeCache() {
  mem = null
  inflight.clear()
}

export function geocodeKey(venue: string, sido?: string | null) {
  return [sido, venue].filter(Boolean).join(' ').trim()
}

/** 캐시에서 즉시 조회. 미조회면 undefined, 조회했으나 없으면 null */
export function getCachedCoord(key: string): Coord | null | undefined {
  return store().get(key)
}

export function geocodeVenue(kakao: any, key: string): Promise<Coord | null> {
  const cached = store().get(key)
  if (cached !== undefined) return Promise.resolve(cached)
  const pending = inflight.get(key)
  if (pending) return pending
  const p = new Promise<Coord | null>((resolve) => {
    try {
      new kakao.maps.services.Places().keywordSearch(key, (data: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK && data?.[0]) {
          const c = { lat: Number(data[0].y), lng: Number(data[0].x) }
          store().set(key, c)
          persist()
          resolve(c)
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
          store().set(key, null)
          persist()
          resolve(null)
        } else {
          resolve(null) // 일시 오류는 캐시하지 않는다
        }
      })
    } catch {
      resolve(null)
    }
  }).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/** 동시 실행 수를 제한해 처리한다. */
export async function geocodeMany(
  kakao: any,
  keys: string[],
  onResult: (key: string, c: Coord | null) => void,
  signal: { cancelled: boolean },
  concurrency = 3,
) {
  const queue = [...new Set(keys)]
  const worker = async () => {
    while (queue.length && !signal.cancelled) {
      const key = queue.shift()!
      const c = await geocodeVenue(kakao, key)
      if (!signal.cancelled) onResult(key, c)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
}
