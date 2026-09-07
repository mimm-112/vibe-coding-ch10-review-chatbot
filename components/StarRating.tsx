import { Star } from 'lucide-react'

/** 5점 만점 별점 표시 */
export default function StarRating({
  rating,
  size = 13,
}: {
  rating: number
  size?: number
}) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`5점 만점에 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={size}
          className={value <= rating ? 'text-amber-400' : 'text-gray-300'}
          fill={value <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  )
}
