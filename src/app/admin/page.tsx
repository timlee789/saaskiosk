import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// 경로가 ../../라면 그대로 유지하거나, @/components/... 로 사용하셔도 됩니다.
import KioskQRCode from '../../components/admin/KioskQRCode';

export default async function StoreAdminDashboard() {
    const cookieStore = await cookies();

    // 1. Supabase 서버 클라이언트 생성
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Server Component에서 쿠키 설정 시 에러 무시
                    }
                },
            },
        }
    );

    // 2. 사용자 인증 확인
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 3. 사용자 프로필 및 매장(Tenant) 정보 가져오기
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.tenant_id) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <h1 className="text-2xl font-bold text-red-600">Unauthorized Access</h1>
                <p className="text-gray-500">You do not have a store assigned to your account.</p>
                <form action="/auth/signout" method="post">
                    <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Sign Out</button>
                </form>
            </div>
        );
    }

    const tenantId = profile.tenant_id;
    const storeName = profile.store_name || 'My Store';
    // [NEW] 로고 URL 가져오기 (DB에 logo_url 컬럼이 추가되어 있어야 함)
    const logoUrl = profile.logo_url;

    // 4. 간단한 통계 데이터 가져오기 (메뉴 수, 오늘 주문 수)
    // (1) 메뉴 아이템 수
    const { count: itemCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

    // (2) 오늘 들어온 주문 수 (UTC 기준 00:00 이후)
    const todayStr = new Date().toISOString().split('T')[0];
    const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', `${todayStr}T00:00:00`);


    // 5. 키오스크 접속 URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const kioskUrl = `${baseUrl}/kiosk?tid=${tenantId}`;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">

            {/* --- 상단 헤더 (로고 UI 추가됨) --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div className="flex items-center gap-4">
                    {/* [NEW] 로고 이미지 표시 */}
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt="Store Logo"
                            className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm"
                        />
                    ) : (
                        // 로고가 없을 때 기본 아이콘
                        <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white text-3xl shadow-md">
                            🏪
                        </div>
                    )}

                    <div>
                        <h1 className="text-4xl font-black text-slate-900">Dashboard</h1>
                        <p className="text-slate-500 mt-1 text-lg">
                            Welcome back, <span className="font-bold text-blue-600">{storeName}</span> Manager!
                        </p>
                    </div>
                </div>

                {/* 키오스크 바로가기 버튼 */}
                <Link
                    href={`/kiosk?tid=${tenantId}`}
                    target="_blank"
                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2 active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Launch Kiosk
                </Link>
            </div>

            {/* --- 기기 등록용 QR 코드 섹션 --- */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-3xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="bg-blue-600 text-white p-2 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </span>
                        <h2 className="text-2xl font-black text-gray-800">Setup New Device</h2>
                    </div>

                    <p className="text-gray-600 text-lg leading-relaxed">
                        Want to use an iPad or Tablet as a Kiosk?<br />
                        Scan this QR code with the device's camera to <b>automatically link</b> it to this store.
                    </p>

                    <div className="bg-white/80 p-4 rounded-xl border border-blue-100 inline-block">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Direct Link URL</p>
                        <code className="text-sm font-mono text-blue-800 break-all">{kioskUrl}</code>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-300">
                    <KioskQRCode url={kioskUrl} />
                </div>
            </div>

            {/* --- 통계 요약 카드 --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 카드 1: 메뉴 아이템 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Total Menu Items</h3>
                        <span className="p-2 bg-orange-50 text-orange-600 rounded-lg">🍔</span>
                    </div>
                    <p className="text-4xl font-black text-gray-800">{itemCount || 0}</p>
                    <Link href="/admin/menu" className="text-sm text-blue-600 font-bold mt-4 inline-block hover:underline">Manage Menu →</Link>
                </div>

                {/* 카드 2: 오늘 주문 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Orders Today</h3>
                        <span className="p-2 bg-green-50 text-green-600 rounded-lg">🧾</span>
                    </div>
                    <p className="text-4xl font-black text-gray-800">{orderCount || 0}</p>
                    <Link href="/admin/orders" className="text-sm text-blue-600 font-bold mt-4 inline-block hover:underline">View Live Orders →</Link>
                </div>

                {/* 카드 3: 바로가기 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center items-start">
                    <h3 className="text-gray-800 font-bold text-lg mb-2">Quick Actions</h3>
                    <div className="flex flex-col gap-2 w-full">
                        <Link href="/admin/categories" className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 font-medium transition-colors text-sm flex justify-between">
                            <span>Edit Categories</span>
                            <span>→</span>
                        </Link>
                        <Link href="/admin/modifiers" className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 font-medium transition-colors text-sm flex justify-between">
                            <span>Edit Modifiers</span>
                            <span>→</span>
                        </Link>
                    </div>
                </div>
            </div>

        </div>
    );
}