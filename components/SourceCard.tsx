'use client'

import { BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import type { SourceReview } from '@/types/chat'
import StarRating from './StarRating'

/** AI 답변의 근거가 된 리뷰 한 건 */
export default function SourceCard({ review }: { review: SourceReview }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = review.content.length > 70

  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StarRating rating={review.rating} />
        <span className="text-xs font-medium">{review.title}</span>
        {review.verifiedPurchase && (
          <span className="flex items-center gap-0.5 text-[11px] text-emerald-600">
            <BadgeCheck size={12} /> 구매 확인
          </span>
        )}
      </div>

      <p
        className={`mt-1.5 text-xs leading-relaxed text-muted ${
          expanded ? '' : 'line-clamp-2'
        }`}
      >
        {review.content}
      </p>

      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
        <span>{review.author}</span>
        <span>·</span>
        <span>{review.date}</span>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="ml-auto text-accent hover:underline"
          >
            {expanded ? '접기' : '더 보기'}
          </button>
        )}
      </div>
    </li>
  )
}
