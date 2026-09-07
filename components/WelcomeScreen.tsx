import { Bot } from 'lucide-react'
import type { ReviewSummary } from '@/types/chat'
import ReviewSummaryCard from './ReviewSummaryCard'

const SUGGESTED_QUESTIONS = [
  '운동할 때 써도 돼요?',
  '배터리 오래 가나요?',
  '통화 품질은 어떤가요?',
  '노이즈 캔슬링 성능이 궁금해요',
  '단점이 뭔가요?',
]

/** 처음 접속했을 때 보여주는 환영 화면 */
export default function WelcomeScreen({
  summary,
  onSelectQuestion,
}: {
  summary: ReviewSummary | null
  onSelectQuestion: (question: string) => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Bot size={24} />
        </span>
        <h1 className="text-xl font-bold">쇼핑 리뷰 분석 챗봇</h1>
        <p className="max-w-md text-sm leading-relaxed text-muted">
          실제 구매 리뷰 100건을 벡터 데이터베이스에서 검색해, 근거와 함께 답변합니다.
          궁금한 점을 물어보세요.
        </p>
      </div>

      {summary && summary.totalReviews > 0 && (
        <ReviewSummaryCard summary={summary} />
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelectQuestion(question)}
            className="rounded-full border border-border bg-surface px-3.5 py-2 text-sm text-muted transition hover:border-accent hover:text-accent"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
