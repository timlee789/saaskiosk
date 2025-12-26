"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSignOut, setIsSignOut] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSignOut = async () => {
    setIsSignOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // 메뉴 목록 정의 (여기서 href를 폴더명과 일치시켜야 합니다)
  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: '🏠' },

    // 주문 관리 섹션
    { section: 'Orders' },
    { name: 'Kitchen (KDS)', href: '/admin/orders', icon: '🍳' },
    { name: 'Sales History', href: '/admin/order_history', icon: '📊' }, // 👈 여기를 수정했습니다!

    // 메뉴 관리 섹션
    { section: 'Menu Management' },
    { name: 'Categories', href: '/admin/categories', icon: 'd📂' },
    { name: 'Menu Items', href: '/admin/menu', icon: '🍔' },
    { name: 'Modifiers', href: '/admin/modifiers', icon: '🥓' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* --- 왼쪽 사이드바 --- */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Store<span className="text-blue-500">Admin</span>
          </h1>
          <p className="text-lg text-slate-400 mt-1">Management System</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item, index) => {
              // 섹션 헤더일 경우
              if (item.section) {
                return (
                  <li key={index} className="mt-6 mb-2 px-3">
                    <span className="text-lg  text-slate-500 uppercase tracking-wider">
                      {item.section}
                    </span>
                  </li>
                );
              }

              // 일반 메뉴일 경우
              const isActive = pathname === item.href;
              return (
                <li key={item.href || index}>
                  <Link
                    href={item.href!}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-bold text-lg
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 하단 로그아웃 버튼 */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            disabled={isSignOut}
            className="flex items-center gap-3 w-full px-3 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
          >
            <span>🚪</span>
            {isSignOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* --- 메인 콘텐츠 영역 --- */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>

    </div>
  );
}