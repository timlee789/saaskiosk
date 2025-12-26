import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// [참고] Next.js 서버 컴포넌트에서 쿠키를 사용하기 위한 유틸리티입니다.
// 작성자님이 만드신 'utils/supabase/server-client.ts'는 미들웨어용이라서,
// 여기서는 Page/Layout용 간단한 서버 클라이언트를 즉석에서 만들어 씁니다.
// (보통 utils/supabase/server.ts 로 따로 만들기도 하지만, 코드를 줄이기 위해 여기 포함합니다)

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();

    // 1. 유저 세션 확인 (보안 이중 체크)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. 레이아웃 렌더링
    return (
        <div className="flex h-screen bg-gray-100">
            {/* --- 사이드바 (Navigation) --- */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10">
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-2xl font-black tracking-tight text-white">
                        Admin<span className="text-red-500">Master</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Super Admin Dashboard</p>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <Link
                        href="/super-admin"
                        className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors font-medium"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Dashboard
                    </Link>

                    <Link
                        href="/super-admin/tenants"
                        className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors font-medium"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Tenants (Stores)
                    </Link>

                    {/* 필요한 경우 Users, Settings 메뉴 추가 가능 */}
                </nav>

                {/* 하단 유저 정보 및 로그아웃 */}
                <div className="p-4 border-t border-slate-700 bg-slate-900">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                            {user.email?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{user.email}</p>
                            <span className="text-xs text-green-400 font-medium">● Online</span>
                        </div>
                    </div>

                    {/* 로그아웃 버튼 (간단한 Form Action 사용) */}
                    <form action="/auth/signout" method="post">
                        <button
                            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold transition-colors"
                            type="submit" // 실제 구현 시 로그아웃 로직이 연결되어야 함
                        >
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* --- 메인 컨텐츠 영역 --- */}
            <main className="flex-1 overflow-y-auto p-8 relative">
                {/* 흰색 배경의 카드 효과를 위해 children을 감쌈 */}
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}