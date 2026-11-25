import { useId } from 'react'
import { StarIcon } from './icons'

export interface RatingStarsProps {
  /** 0 ~ max, 0.5 단위 */
  value: number
  max?: number
  /** 별 크기(px) */
  size?: number
  /** 별 사이 간격(px). 기본 2 (모바일 리뷰 입력 M5·S10 은 4, 평균 요약은 1) */
  gap?: number
  /** 지정하면 입력 모드(왼쪽 절반 = x.5, 오른쪽 절반 = x.0) */
  onChange?: (value: number) => void
  /** 입력 모드에서 누르는 영역 높이(px). 모양은 그대로, 보이지 않게 위아래로 넓힌다. 기본은 별 높이 그대로 */
  hitHeight?: number
}

export function RatingStars({ value, max = 5, size = 16, gap = 2, onChange, hitHeight }: RatingStarsProps) {
  const name = useId()
  const v = Math.max(0, Math.min(max, Math.round(value * 2) / 2))

  return (
    <span
      className="inline-flex items-center"
      style={{ gap }}
      role={onChange ? 'radiogroup' : 'img'}
      aria-label={onChange ? '별점 선택' : `별점 ${v}점 / ${max}점`}
    >
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, v - i)) // 0, 0.5, 1
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <StarIcon size={size} className="absolute inset-0 text-star-empty" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon size={size} className="text-star" style={{ maxWidth: 'none' }} />
            </span>
            {onChange &&
              [0.5, 1].map((part) => {
                const score = i + part
                return (
                  <button
                    key={part}
                    type="button"
                    role="radio"
                    aria-checked={v === score}
                    aria-label={`${score}점`}
                    name={name}
                    onClick={() => onChange(score)}
                    className={`absolute cursor-pointer ${hitHeight ? '' : 'top-0 h-full'}`}
                    style={{
                      left: part === 0.5 ? 0 : '50%',
                      width: '50%',
                      ...(hitHeight ? { top: (size - hitHeight) / 2, height: hitHeight } : null),
                    }}
                  />
                )
              })}
          </span>
        )
      })}
    </span>
  )
}
