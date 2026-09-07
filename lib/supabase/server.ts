import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * 서버(라우트 핸들러)에서 사용하는 수파베이스 클라이언트.
 *
 * 이 프로젝트는 로그인 없이 사용하는 챗봇이라 세션 쿠키가 필요 없습니다.
 * 그래서 @supabase/ssr 대신 기본 클라이언트를 사용합니다.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      '.env 에 NEXT_PUBLIC_SUPABASE_URL 과 ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY(또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)를 설정하세요.',
    )
  }

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false },
  })
}
