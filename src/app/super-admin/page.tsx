import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Tenant } from '@/lib/types'; // 아까 정의한 타입

export default async function SuperAdminDashboard() {
    const cookieStore = await cookies();

    // 1. Supabase Server Client 생성 (데이터 조회용)
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

    // 2. Tenants(매장) 목록 가져오기 (최신순 정렬)
    const { data: tenants, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    // 에러 처리 (필요시)
    if (error) {
        console.error("Error fetching tenants:", error);
    }

    const tenantList: Tenant[] = tenants || [];

    return (
        <div className="space-y-8">
            {/* --- 상단 헤더 및 액션 버튼 --- */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Dashboard</h2>
                    <p className="text-slate-500 mt-1">Welcome back, Super Admin.</p>
                </div>
                <Link
                    href="/super-admin/tenants/create"
                    className="inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-95"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Store
                </Link>
            </div>

            {/* --- 요약 통계 카드 (Stats) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Stores</p>
                            <h3 className="text-3xl font-black text-slate-800">{tenantList.length}</h3>
                        </div>
                    </div>
                </div>

                {/* 추후 추가될 통계 (예시) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 opacity-60">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                            <h3 className="text-3xl font-black text-slate-800">$0.00</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- 매장 리스트 (Recent Stores) --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Recent Stores</h3>
                    <Link href="/super-admin/tenants" className="text-sm text-blue-600 hover:underline font-semibold">
                        View All
                    </Link>
                </div>

                {tenantList.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {tenantList.map((tenant) => (
                            <div key={tenant.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl">
                                        🏪
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{tenant.name}</h4>
                                        <p className="text-sm text-slate-500">
                                            Created: {new Date(tenant.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-400">
                                    ID: {tenant.id.slice(0, 8)}...
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-500">
                        <p className="mb-4 text-lg">No stores found.</p>
                        <Link
                            href="/super-admin/tenants/create"
                            className="text-blue-600 font-bold hover:underline"
                        >
                            Create your first store &rarr;
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}