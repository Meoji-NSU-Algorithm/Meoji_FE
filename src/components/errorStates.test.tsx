import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { errorKind } from './errorKind'
import { ErrorState } from './states'

describe('errorKind', () => {
  it('오류를 카드 종류로 매핑한다', () => {
    expect(errorKind(new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe('offline')
    expect(errorKind(new TypeError('Failed to fetch'))).toBe('offline')
    expect(errorKind(new ApiError(502, 'DIRECTIONS_API_ERROR', 'x'))).toBe('route')
    expect(errorKind(new ApiError(504, 'DIRECTIONS_API_TIMEOUT', 'x'))).toBe('route')
    expect(errorKind(new ApiError(503, 'COMMON_DB_UNAVAILABLE', 'x'))).toBe('server')
    expect(errorKind(new ApiError(404, 'EVENT_NOT_FOUND', 'x'))).toBeUndefined()
    expect(errorKind(undefined)).toBeUndefined()
  })
})

describe('ErrorState 카드', () => {
  it('route: 길찾기 실패 문구와 보조/재시도 버튼', async () => {
    const retry = vi.fn()
    render(<ErrorState kind="route" onRetry={retry} actions={<button>행사 상세로</button>} />)
    expect(screen.getByRole('alert')).toHaveAttribute('data-kind', 'route')
    expect(screen.getByRole('heading', { name: '경로를 불러오지 못했어요' })).toBeInTheDocument()
    expect(screen.getByText(/길찾기 서버가 잠시 응답하지 않아요\./)).toBeInTheDocument()
    expect(screen.getByText(/잠시 후 다시 시도해 주세요\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '행사 상세로' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(retry).toHaveBeenCalled()
  })

  it('server: 5xx 오류는 새로고침 버튼', () => {
    render(<ErrorState error={new ApiError(503, 'COMMON_DB_UNAVAILABLE', 'x')} onRetry={() => {}} />)
    expect(screen.getByRole('heading', { name: '잠시 문제가 생겼어요' })).toBeInTheDocument()
    expect(screen.getByText(/정보를 불러오지 못했어요\./)).toBeInTheDocument()
    expect(screen.getByText(/잠시 후 다시 접속해 주세요\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
  })

  it('offline: 네트워크 오류는 연결 확인 문구', () => {
    render(<ErrorState error={new ApiError(0, 'NETWORK_ERROR', 'x')} onRetry={() => {}} compact />)
    expect(screen.getByRole('heading', { name: '인터넷 연결을 확인해 주세요' })).toBeInTheDocument()
    expect(screen.getByText(/연결이 끊겨 정보를 불러오지 못했어요\./)).toBeInTheDocument()
    expect(screen.getByText(/연결되면 다시 시도해 주세요\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('kind/error 가 없거나 404 는 기존 모양을 유지한다', () => {
    const { rerender } = render(<ErrorState onRetry={() => {}} />)
    expect(screen.getByRole('heading', { name: '문제가 발생했어요' })).toBeInTheDocument()
    rerender(<ErrorState code="404" title="행사를 찾을 수 없어요" />)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.queryByTestId('error-card')).not.toBeInTheDocument()
  })
})
