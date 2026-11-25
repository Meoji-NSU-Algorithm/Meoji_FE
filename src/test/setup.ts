import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../mocks/server'
import { installMatchMedia, resetViewport } from './viewport'

// jsdom 에는 matchMedia 가 없다. 기본은 데스크톱(1024px) — 모바일 테스트는 setViewportWidth(390).
installMatchMedia()

// jsdom에는 blob URL이 없다. 리뷰 사진 미리보기(useReviewImages)가 쓴다.
URL.createObjectURL ??= (blob: Blob) => `blob:test/${(blob as File).name ?? 'blob'}`
URL.revokeObjectURL ??= () => {}

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
  resetViewport()
})
afterAll(() => server.close())
