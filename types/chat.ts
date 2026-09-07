/** 챗봇 화면에서 사용하는 타입 */

export type SourceReview = {
  id: string
  rating: number
  title: string
  content: string
  author: string
  date: string
  verifiedPurchase: boolean
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceReview[] | null
  created_at?: string
}

export type ChatRoom = {
  id: string
  title: string
  created_at: string
}

export type ReviewSummary = {
  productName: string
  totalReviews: number
  averageRating: number
  sentiment: { positive: number; neutral: number; negative: number }
  pros: string[]
  cons: string[]
  keywords: string[]
}

export const PRODUCT_NAME = '프리미엄 무선 이어폰 Pro'
