import ChatApp from './ChatApp'
import { getModelLabel } from '@/lib/llm'
import { getChats, getIndexedCount } from '@/lib/queries'
import { EMPTY_SUMMARY, getReviewSummary } from '@/lib/summary'
import type { ChatRoom, ReviewSummary } from '@/types/chat'

// 대화 목록과 리뷰 통계를 매 요청마다 새로 읽습니다.
export const dynamic = 'force-dynamic'

/**
 * 서버 컴포넌트.
 * 초기 데이터를 서버에서 미리 읽어 넘겨주면
 * 화면이 뜨자마자 대화 목록과 요약 카드가 채워져 있습니다.
 */
export default async function Page() {
  let chats: ChatRoom[] = []
  let summary: ReviewSummary = EMPTY_SUMMARY
  let indexedCount = 0
  let initialError: string | null = null

  try {
    ;[chats, summary, indexedCount] = await Promise.all([
      getChats(),
      getReviewSummary(),
      getIndexedCount(),
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    initialError = `수파베이스에 연결하지 못했습니다: ${message}\n.env 설정과 마이그레이션(npx supabase db push)을 확인하세요.`
  }

  // 현재 어떤 LLM으로 답변하는지 화면에 표시합니다.
  let modelLabel = ''
  try {
    modelLabel = getModelLabel()
  } catch {
    modelLabel = '설정 필요'
  }

  return (
    <ChatApp
      initialChats={chats}
      initialSummary={summary}
      initialIndexedCount={indexedCount}
      initialError={initialError}
      modelLabel={modelLabel}
    />
  )
}
