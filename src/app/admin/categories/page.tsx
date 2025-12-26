"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// [수정] 정확한 타입 정의
interface Category {
    id: string;
    name: string;
    sort_order: number;
    tenant_id: string;
    items: [{ count: number }] | null; // Supabase 응답 형태에 맞춤
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);

    // [보완] 클라이언트 생성 방식 (useState 사용 권장)
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    useEffect(() => {
        // 1. 내 매장 ID(tenant_id) 가져오기
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id);
                fetchCategories(); // tenant_id 확인 후 데이터 로드
            } else {
                setLoading(false); // 매장이 없는 경우 로딩 종료
            }
        };
        init();
    }, []);

    // ---------------------------------------------------------
    // 데이터 불러오기
    // ---------------------------------------------------------
    const fetchCategories = async () => {
        setLoading(true);
        // [수정] RLS가 적용되어 있으므로 별도의 filter 없이도 내 매장 것만 가져옵니다.
        const { data, error } = await supabase
            .from('categories')
            .select('*, items(count)')
            .order('sort_order', { ascending: true });

        if (error) {
            alert("Error loading categories");
            console.error(error);
        } else {
            // [수정] Supabase가 반환하는 타입과 맞추기 위해 타입 단언(assertion)을 안전하게 처리
            setCategories(data as unknown as Category[]);
        }
        setLoading(false);
    };

    // ---------------------------------------------------------
    // 기능 핸들러
    // ---------------------------------------------------------

    // 1. 카테고리 추가
    const handleAdd = async () => {
        if (!tenantId) return alert("System Error: Tenant ID missing");

        const name = prompt("Enter new Category Name (e.g., 'Desserts')");
        if (!name) return;

        // 현재 가장 큰 sort_order 찾기
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;

        // [수정] restaurant_id 대신 tenant_id 사용
        const { error } = await supabase.from('categories').insert({
            tenant_id: tenantId, // 필수!
            name: name,
            sort_order: maxOrder + 1
        });

        if (error) {
            alert("Error adding category: " + error.message);
        } else {
            fetchCategories();
        }
    };

    // 2. 이름 수정
    const handleRename = async (id: string, currentName: string) => {
        const newName = prompt("Rename Category:", currentName);
        if (!newName || newName === currentName) return;

        const { error } = await supabase
            .from('categories')
            .update({ name: newName })
            .eq('id', id);

        if (!error) fetchCategories();
    };

    // 3. 삭제
    const handleDelete = async (id: string, itemCount: number) => {
        if (itemCount > 0) {
            alert(`⚠️ Cannot delete!\nThis category contains ${itemCount} items.\nPlease move or delete the items first in 'Menu Management'.`);
            return;
        }

        if (!confirm("Are you sure you want to delete this empty category?")) return;

        const { error } = await supabase.from('categories').delete().eq('id', id);

        if (error) alert("Error deleting: " + error.message);
        else fetchCategories();
    };

    // 4. 순서 변경
    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categories.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // 배열 복사 및 Optimistic UI 업데이트
        const newCategories = [...categories];
        const itemA = newCategories[index];
        const itemB = newCategories[targetIndex];

        newCategories[index] = itemB;
        newCategories[targetIndex] = itemA;
        setCategories(newCategories);

        // DB 업데이트 (서로 sort_order 교환)
        const { error: error1 } = await supabase
            .from('categories')
            .update({ sort_order: itemB.sort_order })
            .eq('id', itemA.id);

        const { error: error2 } = await supabase
            .from('categories')
            .update({ sort_order: itemA.sort_order })
            .eq('id', itemB.id);

        if (error1 || error2) {
            console.error("Reorder failed", error1, error2);
            alert("Error reordering. Refreshing...");
            fetchCategories(); // 실패 시 원상복구
        }
    };

    return (
        <div className="p-10 max-w-4xl mx-auto min-h-[calc(100vh-theme(spacing.20))]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-800">Category Management</h1>
                    <p className="text-gray-500 mt-1">Reorder tabs or rename categories.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 active:scale-95 transition-all"
                >
                    <span>+</span> Create Category
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-400">Loading categories...</div>
                ) : categories.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        No categories found.<br />Click <b>+ Create Category</b> to add one.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {categories.map((cat, index) => {
                            // [수정] 배열 형태의 items에서 count 추출
                            const itemCount = (cat.items && cat.items[0]) ? cat.items[0].count : 0;

                            return (
                                <li key={cat.id} className="p-4 flex items-center hover:bg-gray-50 transition-colors group">

                                    {/* 순서 변경 버튼 */}
                                    <div className="flex flex-col mr-4 gap-1">
                                        <button
                                            onClick={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 'down')}
                                            disabled={index === categories.length - 1}
                                            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ▼
                                        </button>
                                    </div>

                                    {/* 카테고리 정보 */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-gray-800">{cat.name}</span>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${itemCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {itemCount} Items
                                            </span>
                                        </div>
                                    </div>

                                    {/* 액션 버튼 */}
                                    <div className="flex gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleRename(cat.id, cat.name)}
                                            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-white hover:border-gray-400 transition-all text-sm bg-white"
                                        >
                                            Rename
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id, itemCount)}
                                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all
                                                ${itemCount > 0
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}