import { NextResponse } from 'next/server'
import { ensureIndex, getVectorStore } from '@/lib/pinecone'
import { loadReviews, toDocuments } from '@/lib/reviews'
import { getIndexedCount } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'

// 파일 시스템(samples/review.csv)을 읽으므로 Node.js 런타임이 필요합니다.
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/index-data
 *
 * 샘플 리뷰 CSV를 읽어
 *   1) 수파베이스 reviews 테이블에 원문을 저장하고
 *   2) Pinecone에 임베딩 벡터를 저장합니다.
 *
 * 화면의 [샘플 데이터 인덱싱] 버튼이 이 API를 호출합니다.
 */
export async function POST() {
  try {
    // 1) CSV 로드 (LangChain CSVLoader)
    const reviews = await loadReviews()
    if (reviews.length === 0) {
      return NextResponse.json(
        { error: 'samples/review.csv 에서 리뷰를 읽지 못했습니다.' },
        { status: 400 },
      )
    }

    // 2) 수파베이스에 원본 저장 (id 기준 upsert라 여러 번 눌러도 안전합니다)
    const supabase = createClient()
    const { error: supabaseError } = await supabase.from('reviews').upsert(
      reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        author: review.author,
        review_date: review.date || null,
        helpful_votes: review.helpful_votes,
        verified_purchase: review.verified_purchase,
      })),
      { onConflict: 'id' },
    )

    if (supabaseError) {
      return NextResponse.json(
        {
          error: `수파베이스 저장 실패: ${supabaseError.message}. 마이그레이션(npx supabase db push)을 적용했는지 확인하세요.`,
        },
        { status: 500 },
      )
    }

    // 3) Pinecone 인덱스 준비 + 임베딩 업로드
    await ensureIndex()
    const documents = await toDocuments(reviews)
    const vectorStore = await getVectorStore()

    // 같은 id로 다시 넣으면 덮어쓰기 되므로 중복이 쌓이지 않습니다.
    const ids = documents.map(
      (document, index) => `${document.metadata.reviewId}-${index}`,
    )
    await vectorStore.addDocuments(documents, { ids })

    return NextResponse.json({
      ok: true,
      reviewCount: reviews.length,
      vectorCount: documents.length,
      message: `리뷰 ${reviews.length}건을 수파베이스와 Pinecone에 저장했습니다.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: `인덱싱 실패: ${message}`,
        hint: 'Pinecone 인덱스를 콘솔에서 "모델 내장(integrated embedding)" 방식으로 만들었다면 벡터 업로드가 거부됩니다. 인덱스를 지우고 다시 시도하면 코드가 올바른 설정으로 만들어줍니다.',
      },
      { status: 500 },
    )
  }
}

/** GET /api/index-data — 현재 인덱싱된 리뷰 수를 알려줍니다. */
export async function GET() {
  try {
    return NextResponse.json({ indexedCount: await getIndexedCount() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ indexedCount: 0, error: message })
  }
}
