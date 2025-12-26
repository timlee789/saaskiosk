"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import KioskMain from '@/components/kiosk/KioskMain';
import { Category, MenuItem, ModifierGroup, StoreInfo } from '@/lib/types';
// [중요] 우리가 만든 강력한 데이터 패처 함수 import
import { fetchMenuData } from '@/lib/dataFetcher';

function KioskDataFetcher() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // KioskMain에 넘겨줄 데이터 상태들
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});

    // [NEW] 가게 정보 상태 추가 (초기값 설정)
    const [storeInfo, setStoreInfo] = useState<StoreInfo>({
        store_name: '',
        logo_url: null,
        address: null,
        phone: null,
        open_hours: null
    });

    useEffect(() => {
        // 1. URL 파라미터나 로컬 스토리지에서 Tenant ID 확인
        let tid = searchParams.get('tid');

        if (tid) {
            // URL에 있으면 로컬스토리지 갱신
            localStorage.setItem('kiosk_tenant_id', tid);
        } else {
            // URL에 없으면 로컬스토리지에서 가져오기
            tid = localStorage.getItem('kiosk_tenant_id');
        }

        if (!tid) {
            setError("No Store ID found. Please scan the QR code again.");
            setLoading(false);
            return;
        }

        // 2. 데이터 가져오기 실행
        loadAllData(tid);
    }, [searchParams]);

    const loadAllData = async (tid: string) => {
        setLoading(true);

        // [핵심] lib/dataFetcher.ts에서 만든 함수 하나로 모든 데이터를 다 가져옵니다.
        const data = await fetchMenuData(tid);

        if (data.categories.length === 0 && data.items.length === 0) {
            // 데이터가 아예 없으면 에러로 간주할 수도 있고, 그냥 빈 가게일 수도 있음.
            // 여기서는 스토어 이름이라도 가져왔으면 성공으로 간주
            if (data.storeInfo.store_name === 'System Error') {
                setError("Failed to load store data.");
            }
        }

        // 상태 업데이트
        setCategories(data.categories);
        setItems(data.items);
        setModifiersObj(data.modifiersObj);
        setStoreInfo(data.storeInfo); // [해결] 여기서 storeInfo를 채워줍니다.

        setLoading(false);
    };

    // --- 화면 렌더링 ---

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-4">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-bold text-lg">Loading Store...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-4">
                <span className="text-6xl">⚠️</span>
                <h1 className="text-2xl font-black text-gray-800">System Error</h1>
                <p className="text-red-500">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold mt-4"
                >
                    Retry
                </button>
            </div>
        );
    }

    // 데이터 준비 완료! KioskMain 실행
    return (
        <KioskMain
            categories={categories}
            items={items}
            modifiersObj={modifiersObj}
            storeInfo={storeInfo} // [완료] 이제 에러가 사라집니다.
        />
    );
}

// Suspense 처리 (Build 에러 방지용)
export default function KioskPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-gray-100"></div>}>
            <KioskDataFetcher />
        </Suspense>
    );
}