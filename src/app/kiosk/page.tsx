"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import KioskMain from '@/components/kiosk/KioskMain';
import { Category, MenuItem, ModifierGroup } from '@/lib/types';

// Supabase 클라이언트 생성
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function KioskDataFetcher() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // KioskMain에 넘겨줄 데이터 상태
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [modifiersObj, setModifiersObj] = useState<{ [key: string]: ModifierGroup }>({});

    useEffect(() => {
        // 1. URL 파라미터나 로컬 스토리지에서 Tenant ID 확인
        let tid = searchParams.get('tid');
        if (tid) {
            localStorage.setItem('kiosk_tenant_id', tid);
        } else {
            tid = localStorage.getItem('kiosk_tenant_id');
        }

        if (!tid) {
            setError("No Store ID found. Please scan the QR code again.");
            setLoading(false);
            return;
        }

        // 2. 데이터 가져오기 시작
        fetchData(tid);
    }, [searchParams]);

    const fetchData = async (tid: string) => {
        try {
            setLoading(true);

            // (1) 카테고리 가져오기
            const { data: catsData, error: catError } = await supabase
                .from('categories')
                .select('*')
                .eq('tenant_id', tid)
                .order('sort_order');

            if (catError) throw catError;

            // (2) 메뉴 아이템 & 옵션 그룹 & 옵션 상세 정보 가져오기 (Deep Query)
            // items -> item_modifier_groups -> modifier_groups -> modifiers 구조
            const { data: itemsData, error: itemError } = await supabase
                .from('items')
                .select(`
          *,
          item_modifier_groups (
            modifier_groups (
              id, name, min_selection, max_selection, is_required,
              modifiers ( id, name, price )
            )
          )
        `)
                .eq('tenant_id', tid)
                .eq('is_sold_out', false) // (선택) 품절 안 된 것만 가져오려면 추가
                .order('sort_order');

            if (itemError) throw itemError;

            // (3) 데이터 가공 (Supabase 응답 -> 프론트엔드 타입 변환)
            // modifiersObj를 만들기 위한 임시 저장소
            const tempModifiersObj: { [key: string]: ModifierGroup } = {};

            const formattedItems: MenuItem[] = (itemsData || []).map((item: any) => {
                // 아이템에 연결된 옵션 그룹들을 추출
                const groups: ModifierGroup[] = item.item_modifier_groups?.map((img: any) => {
                    const groupData = img.modifier_groups;

                    // 옵션들을 가격순 정렬
                    const sortedModifiers = (groupData.modifiers || []).sort((a: any, b: any) => a.price - b.price);

                    const formattedGroup: ModifierGroup = {
                        id: groupData.id,
                        name: groupData.name,
                        min_selection: groupData.min_selection,
                        max_selection: groupData.max_selection,
                        is_required: groupData.is_required,
                        modifiers: sortedModifiers,
                        // 호환성 유지용
                        options: sortedModifiers
                    };

                    // modifiersObj에 그룹 이름(또는 ID)을 키로 저장
                    // (ModifierModal에서 이름으로 찾거나 ID로 찾을 때 사용)
                    tempModifiersObj[groupData.name] = formattedGroup; // 이름 키
                    tempModifiersObj[groupData.id] = formattedGroup;   // ID 키 (권장)

                    return formattedGroup;
                }) || [];

                return {
                    ...item,
                    modifier_groups: groups,
                    // 호환성 유지용
                    modifierGroups: groups.map(g => g.name) // 이름 배열
                };
            });

            setCategories(catsData || []);
            setItems(formattedItems);
            setModifiersObj(tempModifiersObj);

        } catch (err: any) {
            console.error("Data Fetch Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 렌더링 ---

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 flex-col gap-4">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-bold text-lg">Loading Menu...</p>
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