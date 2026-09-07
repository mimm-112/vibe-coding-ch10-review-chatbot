import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ReviewSummary } from '@/types/chat'
import StarRating from './StarRating'

/** 리뷰 요약 대시보드 카드 */
export default function ReviewSummaryCard({ summary }: { summary: ReviewSummary }) {
  const { sentiment } = summary

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-sm font-semibold">{summary.productName}</h2>
        <span className="text-xs text-muted">
          총 리뷰 {summary.totalReviews.toLocaleString()}건
        </span>
      </header>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-4xl leading-none font-bold">
          {summary.averageRating.toFixed(1)}
        </span>
        <StarRating rating={Math.round(summary.averageRating)} size={16} />
      </div>

      {/* 감정 분포 바 */}
      <div className="mt-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <span
            className="bg-emerald-500"
            style={{ width: `${sentiment.positive}%` }}
          />
          <span className="bg-gray-400" style={{ width: `${sentiment.neutral}%` }} />
          <span className="bg-red-500" style={{ width: `${sentiment.negative}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>긍정 {sentiment.positive}%</span>
          <span>중립 {sentiment.neutral}%</span>
          <span>부정 {sentiment.negative}%</span>
        </div>
      </div>

      {/* 장점 / 단점 */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <ThumbsUp size={13} /> 자주 언급된 장점
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
            {summary.pros.map((item) => (
              <li key={item}>· {item}</li>
            ))}
            {summary.pros.length === 0 && <li>데이터 없음</li>}
          </ul>
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <ThumbsDown size={13} /> 자주 언급된 단점
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted">
            {summary.cons.map((item) => (
              <li key={item}>· {item}</li>
            ))}
            {summary.cons.length === 0 && <li>데이터 없음</li>}
          </ul>
        </div>
      </div>

      {/* 주요 키워드 */}
      {summary.keywords.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {summary.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-muted"
            >
              #{keyword}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
