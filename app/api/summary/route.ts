import { NextResponse } from 'next/server'
import { EMPTY_SUMMARY, getReviewSummary } from '@/lib/summary'

export const runtime = 'nodejs'

/** GET /api/summary — 리뷰 요약 대시보드 통계 */
export async function GET() {
  try {
    return NextResponse.json(await getReviewSummary())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ...EMPTY_SUMMARY, error: message }, { status: 500 })
  }
}
