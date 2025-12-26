import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/server-client'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * 아래 경로들을 제외하고 모든 요청에서 미들웨어가 실행됩니다.
         * 제외: _next/static, _next/image, favicon.ico, 이미지 파일들
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}