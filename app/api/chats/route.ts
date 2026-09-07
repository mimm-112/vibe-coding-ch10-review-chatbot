import { NextResponse } from 'next/server'
import { getChats } from '@/lib/queries'

export const runtime = 'nodejs'

/** GET /api/chats — 최근 대화 목록 */
export async function GET() {
  try {
    return NextResponse.json({ chats: await getChats() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ chats: [], error: message }, { status: 500 })
  }
}
