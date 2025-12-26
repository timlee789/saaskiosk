import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. 초기 응답 객체 생성
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 2. Supabase 클라이언트 생성 (쿠키 제어 포함)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // 3. 현재 로그인된 유저 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser()

    // -----------------------------------------------------------
    // 🔒 권한 체크 로직 (Role-based Access Control)
    // -----------------------------------------------------------
    const path = request.nextUrl.pathname;

    // 보호된 경로인지 확인 (/super-admin 또는 /admin 으로 시작하는 경로)
    if (path.startsWith('/super-admin') || path.startsWith('/admin')) {

        // A. 비로그인 유저는 로그인 페이지로 팅겨내기
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // B. 유저의 Role 확인 (profiles 테이블 조회)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const userRole = profile?.role;

        // C. [Super Admin] 전용 구역 체크
        if (path.startsWith('/super-admin')) {
            if (userRole !== 'super_admin') {
                // 권한 없으면 홈으로 추방
                return NextResponse.redirect(new URL('/', request.url));
            }
        }

        // D. [Store Admin] 구역 체크 (슈퍼 어드민도 접근 가능하게 함)
        if (path.startsWith('/admin')) {
            if (userRole !== 'super_admin' && userRole !== 'store_admin') {
                // 권한 없으면 홈으로 추방
                return NextResponse.redirect(new URL('/', request.url));
            }
        }
    }

    return response
}