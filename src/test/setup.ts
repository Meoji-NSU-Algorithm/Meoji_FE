import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../mocks/server'

// jsdom에는 blob URL이 없다. 리뷰 사진 미리보기(useReviewImages)가 쓴다.
URL.createObjectURL ??= (blob: Blob) => `blob:test/${(blob as File).name ?? 'blob'}`
URL.revokeObjectURL ??= () => {}

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())
