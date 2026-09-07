import path from 'node:path'
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'

/** samples/review.csv 한 줄에 해당하는 리뷰 */
export type Review = {
  id: string
  rating: number
  title: string
  content: string
  author: string
  date: string
  helpful_votes: number
  verified_purchase: boolean
}

export const CSV_PATH = path.join(process.cwd(), 'samples', 'review.csv')

/**
 * CSVLoader는 column 옵션을 주지 않으면
 *   id: r001
 *   rating: 5
 *   ...
 * 형태의 문자열을 pageContent로 만들어줍니다. 이걸 다시 객체로 되돌립니다.
 */
function parseKeyValueBlock(pageContent: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of pageContent.split('\n')) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    if (key) result[key] = value
  }

  return result
}

/**
 * 1) Document Loaders — LangChain CSVLoader로 리뷰 CSV를 읽습니다.
 */
export async function loadReviews(): Promise<Review[]> {
  const loader = new CSVLoader(CSV_PATH)
  const rawDocuments = await loader.load()

  return rawDocuments
    .map((document) => parseKeyValueBlock(document.pageContent))
    .filter((row) => Boolean(row.id))
    .map((row) => ({
      id: row.id,
      rating: Number(row.rating) || 0,
      title: row.title ?? '',
      content: row.content ?? '',
      author: row.author ?? '',
      date: row.date ?? '',
      helpful_votes: Number(row.helpful_votes) || 0,
      verified_purchase: row.verified_purchase === 'true',
    }))
}

/**
 * 임베딩할 텍스트를 만듭니다.
 * 제목과 본문을 함께 넣어야 "배터리 오래 가나요?" 같은 질문에 잘 걸립니다.
 */
export function toEmbeddingText(review: Review) {
  return [
    `제목: ${review.title}`,
    `평점: ${review.rating}점`,
    `내용: ${review.content}`,
  ].join('\n')
}

/**
 * 2) Document Transformers — 긴 리뷰는 잘라서 문맥 손실을 줄입니다.
 *    리뷰 한 건은 대부분 짧아서 실제로는 그대로 통과합니다.
 */
export async function toDocuments(reviews: Review[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 80,
  })

  const documents = reviews.map(
    (review) =>
      new Document({
        pageContent: toEmbeddingText(review),
        metadata: {
          reviewId: review.id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          author: review.author,
          date: review.date,
          helpfulVotes: review.helpful_votes,
          verifiedPurchase: review.verified_purchase,
        },
      }),
  )

  return splitter.splitDocuments(documents)
}
