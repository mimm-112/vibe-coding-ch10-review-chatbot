import { createClient } from '@/lib/supabase/server'
import type { ChatRoom } from '@/types/chat'

/** 최근 대화 목록 */
export async function getChats(): Promise<ChatRoom[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)
  return data ?? []
}

/** 수파베이스에 저장된 리뷰 수 (= 인덱싱 여부 확인용) */
export async function getIndexedCount(): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(error.message)
  return count ?? 0
}
