import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * /api/index-data 는 런타임에 samples/review.csv 파일을 읽습니다.
   * Next.js는 코드에서 정적으로 추적 가능한 파일만 서버리스 번들에 넣기 때문에,
   * path.join(process.cwd(), ...) 처럼 동적으로 읽는 파일은 직접 포함시켜야 합니다.
   * 이 설정이 없으면 배포 환경에서 ENOENT (파일 없음) 오류가 납니다.
   */
  outputFileTracingIncludes: {
    '/api/index-data': ['./samples/**'],
  },
}

export default nextConfig
