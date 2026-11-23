import { useId } from 'react'
import { StarIcon } from './icons'

export interface RatingStarsProps {
  /** 0 ~ max, 0.5 단위 */
  value: number
  max?: number
  /** 별 크기(px) */
  size?: number
  /** 지정하면 입력 모드(왼쪽 절반 = x.5, 오른쪽 절반 = x.0) */
  onChange?: (value: number) => void
}

export function RatingStars({ value, max = 5, size = 16, onChange }: RatingStarsProps) {
  const name = useId()
  const v = Math.max(0, Math.min(max, Math.round(value * 2) / 2))

  return (
    <span
      className="inline-flex items-center gap-[2px]"
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
                    className="absolute top-0 h-full cursor-pointer"
                    style={{ left: part === 0.5 ? 0 : '50%', width: '50%' }}
                  />
                )
              })}
          </span>
        )
      })}
    </span>
  )
}
