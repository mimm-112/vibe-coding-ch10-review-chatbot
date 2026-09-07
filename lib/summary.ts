import { createClient } from '@/lib/supabase/server'
import { PRODUCT_NAME, type ReviewSummary } from '@/types/chat'

/**
 * 리뷰 요약 통계 계산.
 *
 * LLM을 부르지 않고 저장된 리뷰에서 직접 계산합니다.
 * (요약 카드를 그릴 때마다 API 비용을 낼 필요는 없습니다.)
 */
const KEYWORDS: { label: string; patterns: string[] }[] = [
  { label: '배터리', patterns: ['배터리', '충전', '완충'] },
  { label: '노이즈 캔슬링', patterns: ['노이즈 캔슬링', 'ANC', '소음 차단', '차단'] },
  { label: '통화 품질', patterns: ['통화', '마이크', '목소리'] },
  { label: '착용감', patterns: ['착용감', '이어팁', '귀가', '귀 아', '압박'] },
  { label: '운동/방수', patterns: ['운동', '러닝', '땀', '방수', '헬스', '등산'] },
  { label: '연결 안정성', patterns: ['블루투스', '끊', '페어링', '연결'] },
  { label: '음질', patterns: ['음질', '저음', '고음', '베이스', '해상력'] },
  { label: '가격', patterns: ['가격', '가성비', '할인'] },
  { label: '앱/펌웨어', patterns: ['앱', '펌웨어', '이퀄라이저'] },
  { label: '지연 시간', patterns: ['지연', '싱크', '밀려', '저지연'] },
  { label: '케이스', patterns: ['케이스', '뚜껑'] },
]

type ReviewRow = { rating: number; title: string; content: string }

function countKeyword(reviews: ReviewRow[], patterns: string[]) {
  return reviews.filter((review) => {
    const text = `${review.title} ${review.content}`
    return patterns.some((pattern) => text.includes(pattern))
  }).length
}

export const EMPTY_SUMMARY: ReviewSummary = {
  productName: PRODUCT_NAME,
  totalReviews: 0,
  averageRating: 0,
  sentiment: { positive: 0, neutral: 0, negative: 0 },
  pros: [],
  cons: [],
  keywords: [],
}

export function computeSummary(reviews: ReviewRow[]): ReviewSummary {
  if (reviews.length === 0) return EMPTY_SUMMARY

  // 평점 4~5점은 긍정, 3점은 중립, 1~2점은 부정으로 봅니다.
  const positive = reviews.filter((review) => review.rating >= 4)
  const neutral = reviews.filter((review) => review.rating === 3)
  const negative = reviews.filter((review) => review.rating <= 2)

  const averageRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  // 긍정 리뷰에서 많이 언급된 주제 = 장점, 부정/중립 리뷰에서 많이 언급된 주제 = 단점
  const scored = KEYWORDS.map((keyword) => ({
    label: keyword.label,
    positiveCount: countKeyword(positive, keyword.patterns),
    negativeCount: countKeyword([...negative, ...neutral], keyword.patterns),
    totalCount: countKeyword(reviews, keyword.patterns),
  }))

  return {
    productName: PRODUCT_NAME,
    totalReviews: reviews.length,
    averageRating: Math.round(averageRating * 10) / 10,
    sentiment: {
      positive: Math.round((positive.length / reviews.length) * 100),
      neutral: Math.round((neutral.length / reviews.length) * 100),
      negative: Math.round((negative.length / reviews.length) * 100),
    },
    pros: [...scored]
      .sort((a, b) => b.positiveCount - a.positiveCount)
      .filter((item) => item.positiveCount > 0)
      .slice(0, 4)
      .map((item) => item.label),
    cons: [...scored]
      .sort((a, b) => b.negativeCount - a.negativeCount)
      .filter((item) => item.negativeCount > 0)
      .slice(0, 4)
      .map((item) => item.label),
    keywords: [...scored]
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 6)
      .map((item) => item.label),
  }
}

/** 수파베이스에서 리뷰를 읽어 요약 통계를 만듭니다. */
export async function getReviewSummary(): Promise<ReviewSummary> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('rating, title, content')

  if (error) throw new Error(error.message)
  return computeSummary(data ?? [])
}
