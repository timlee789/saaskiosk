"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function CreateTenantPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // 클라이언트 컴포넌트용 Supabase
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        // 1. 유효성 검사
        if (!name.trim()) {
            setErrorMsg("Store Name is required.");
            setIsLoading(false);
            return;
        }

        try {
            // 2. Tenants 테이블에 insert
            const { data, error } = await supabase
                .from('tenants')
                .insert({ name: name.trim() })
                .select()
                .single();

            if (error) throw error;

            // 3. 성공 시 처리
            alert(`🎉 Store "${name}" has been created!`);
            router.push('/super-admin'); // 대시보드로 이동
            router.refresh(); // 데이터 갱신

        } catch (error: any) {
            console.error("Error creating tenant:", error);
            setErrorMsg(error.message || "Failed to create store.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-10">
            {/* 헤더 부분 */}
            <div className="mb-8">
                <Link
                    href="/super-admin"
                    className="text-sm text-slate-500 hover:text-slate-800 flex items-center mb-2"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-black text-slate-900">Create New Store</h1>
                <p className="text-slate-500 mt-2">
                    Add a new location/tenant to your system.
                </p>
            </div>

            {/* 폼 부분 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* 매장 이름 입력 */}
                    <div>
                        <label htmlFor="storeName" className="block text-sm font-bold text-slate-700 mb-2">
                            Store Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="storeName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Gangnam Branch"
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            disabled={isLoading}
                        />
                    </div>

                    {/* 에러 메시지 표시 */}
                    {errorMsg && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errorMsg}
                        </div>
                    )}

                    {/* 버튼 영역 */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <Link
                            href="/super-admin"
                            className="px-6 py-3 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center
                ${isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </>
                            ) : (
                                'Create Store'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}