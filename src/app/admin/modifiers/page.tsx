"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// [수정] DB 스키마에 맞춰 타입 확장
interface ModifierGroup {
    id: string;
    name: string;
    is_required: boolean;
    min_selection: number;
    max_selection: number;
}
interface ModifierOption {
    id: string;
    name: string;
    price: number;
}
interface SimpleItem {
    id: string;
    name: string;
    category_id: string;
}

export default function AdminModifiersPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // [New] 내 매장 ID 상태
    const [tenantId, setTenantId] = useState<string | null>(null);

    // 데이터 상태
    const [groups, setGroups] = useState<ModifierGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);

    const [options, setOptions] = useState<ModifierOption[]>([]);
    const [linkedItemIds, setLinkedItemIds] = useState<string[]>([]); // 현재 그룹에 연결된 아이템 ID들
    const [allItems, setAllItems] = useState<SimpleItem[]>([]); // 연결 설정을 위한 전체 아이템 목록

    // 로딩 상태
    const [loadingOptions, setLoadingOptions] = useState(false);

    // 1. 초기 로딩: 내 매장 ID(tenant_id) 찾기 -> 그룹 & 아이템 로딩
    useEffect(() => {
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
                fetchGroups();
                fetchAllItems();
            }
        };
        init();
    }, []);

    // 그룹 선택 시 -> 옵션 목록 & 연결된 아이템 목록 가져오기
    useEffect(() => {
        if (selectedGroup) {
            fetchOptions(selectedGroup.id);
            fetchLinkedItems(selectedGroup.id);
        } else {
            setOptions([]);
            setLinkedItemIds([]);
        }
    }, [selectedGroup]);

    // ---------------------------------------------------------
    // Fetch Functions
    // ---------------------------------------------------------
    const fetchGroups = async () => {
        // RLS가 적용되어 있으므로 자동으로 내 매장 그룹만 가져옵니다.
        const { data } = await supabase.from('modifier_groups').select('*').order('name');
        if (data) setGroups(data);
    };

    const fetchAllItems = async () => {
        // 아이템 리스트 (체크박스용)
        const { data } = await supabase.from('items').select('id, name, category_id').order('name');
        if (data) setAllItems(data);
    };

    const fetchOptions = async (groupId: string) => {
        setLoadingOptions(true);
        const { data } = await supabase.from('modifiers').select('*').eq('group_id', groupId).order('price', { ascending: true });
        if (data) setOptions(data);
        setLoadingOptions(false);
    };

    const fetchLinkedItems = async (groupId: string) => {
        // 연결 테이블(item_modifier_groups) 조회
        const { data } = await supabase.from('item_modifier_groups').select('item_id').eq('group_id', groupId);
        if (data) {
            setLinkedItemIds(data.map(d => d.item_id));
        }
    };

    // ---------------------------------------------------------
    // Handlers (Groups)
    // ---------------------------------------------------------
    const handleAddGroup = async () => {
        if (!tenantId) return alert("System Error: Tenant ID missing"); // [안전장치]

        const name = prompt("Enter new Group Name (e.g., 'Steak Temperature')");
        if (!name) return;

        // [수정] restaurant_id 제거하고 tenant_id 사용
        // 기본값 설정 (필수 아님, 최소 0, 최대 1)
        const { error } = await supabase.from('modifier_groups').insert({
            tenant_id: tenantId,
            name: name,
            is_required: false,
            min_selection: 0,
            max_selection: 1
        });

        if (error) alert("Error: " + error.message);
        else fetchGroups();
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("Delete this group? All options inside it will be deleted.")) return;
        await supabase.from('modifier_groups').delete().eq('id', id);
        setSelectedGroup(null);
        fetchGroups();
    };

    // ---------------------------------------------------------
    // Handlers (Options)
    // ---------------------------------------------------------
    const handleAddOption = async () => {
        if (!selectedGroup) return;
        const name = prompt("Enter Option Name (e.g., 'Medium Rare')");
        if (!name) return;
        const priceStr = prompt("Enter Price (0 for free)", "0");
        const price = parseFloat(priceStr || "0");

        await supabase.from('modifiers').insert({
            group_id: selectedGroup.id,
            name,
            price
        });
        fetchOptions(selectedGroup.id);
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm("Delete this option?")) return;
        await supabase.from('modifiers').delete().eq('id', id);
        if (selectedGroup) fetchOptions(selectedGroup.id);
    };

    // ---------------------------------------------------------
    // Handlers (Linking Items)
    // ---------------------------------------------------------
    const toggleItemLink = async (itemId: string, isLinked: boolean) => {
        if (!selectedGroup) return;

        if (isLinked) {
            // 연결 해제 (Delete)
            const { error } = await supabase
                .from('item_modifier_groups')
                .delete()
                .eq('item_id', itemId)
                .eq('group_id', selectedGroup.id);

            if (!error) {
                setLinkedItemIds(prev => prev.filter(id => id !== itemId));
            }
        } else {
            // 연결 추가 (Insert)
            const { error } = await supabase
                .from('item_modifier_groups')
                .insert({
                    item_id: itemId,
                    group_id: selectedGroup.id
                });

            if (!error) {
                setLinkedItemIds(prev => [...prev, itemId]);
            }
        }
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.20))] bg-gray-100 overflow-hidden">

            {/* ------------------------------------------------ */}
            {/* 1. 좌측: Modifier Groups 목록 */}
            {/* ------------------------------------------------ */}
            <div className="w-1/4 bg-white border-r flex flex-col min-w-[280px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg">1. Groups</h2>
                        <p className="text-xs text-gray-400">e.g. Size, Toppings</p>
                    </div>
                    <button onClick={handleAddGroup} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-bold shadow-sm">+ Add</button>
                </div>
                <ul className="flex-1 overflow-y-auto p-3 space-y-2">
                    {groups.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No groups created.</p>}
                    {groups.map(group => (
                        <li
                            key={group.id}
                            onClick={() => setSelectedGroup(group)}
                            className={`p-4 rounded-xl cursor-pointer flex justify-between group items-center transition-all
                            ${selectedGroup?.id === group.id
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-100'}`}
                        >
                            <div>
                                <span className="font-bold block">{group.name}</span>
                                {/* [New] 필수 여부 표시 */}
                                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${group.is_required ? 'bg-red-500/20 text-red-500' : 'bg-gray-200 text-gray-500'}`}>
                                    {group.is_required ? 'Required' : 'Optional'}
                                </span>
                            </div>
                            {selectedGroup?.id === group.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    className="text-gray-400 hover:text-red-400 px-2 font-bold text-lg"
                                    title="Delete Group"
                                >
                                    ×
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* ------------------------------------------------ */}
            {/* 2. 중앙: Options 관리 */}
            {/* ------------------------------------------------ */}
            <div className="w-1/3 bg-white border-r flex flex-col min-w-[320px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="font-bold text-gray-800 text-lg">2. Options</h2>
                        <p className="text-xs text-gray-500">
                            For: <span className="font-bold text-blue-600">{selectedGroup?.name || '-'}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleAddOption}
                        disabled={!selectedGroup}
                        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Option
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    {!selectedGroup ? (
                        <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
                            <span className="text-2xl mb-2">👈</span>
                            <span>Select a group from the left</span>
                        </div>
                    ) : loadingOptions ? (
                        <div className="text-center text-gray-400 mt-10">Loading...</div>
                    ) : (
                        <ul className="space-y-2">
                            {options.length === 0 && (
                                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-400 text-sm">No options in this group.</p>
                                    <button onClick={handleAddOption} className="text-blue-600 text-sm font-bold mt-1 hover:underline">Add one?</button>
                                </div>
                            )}
                            {options.map(opt => (
                                <li key={opt.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                                    <div>
                                        <span className="font-bold text-gray-800 block">{opt.name}</span>
                                        <span className={`text-xs font-bold ${opt.price > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                            {opt.price > 0 ? `+$${opt.price.toFixed(2)}` : 'Free'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteOption(opt.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                        title="Delete Option"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* ------------------------------------------------ */}
            {/* 3. 우측: 연결된 아이템 (Link Items) */}
            {/* ------------------------------------------------ */}
            <div className="flex-1 bg-white flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-gray-800 text-lg">3. Apply to Items</h2>
                    <p className="text-xs text-gray-500">Check items that use the <span className="font-bold text-blue-600">{selectedGroup?.name || '...'}</span> group.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!selectedGroup ? (
                        <div className="text-center text-gray-400 mt-20">
                            Select a group to manage links
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                            {allItems.map(item => {
                                const isLinked = linkedItemIds.includes(item.id);
                                return (
                                    <label
                                        key={item.id}
                                        className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all select-none
                                        ${isLinked
                                                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm'
                                                : 'hover:bg-gray-50 border-gray-200'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors
                                            ${isLinked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                                            {isLinked && (
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isLinked}
                                            onChange={() => toggleItemLink(item.id, isLinked)}
                                        />
                                        <span className={`text-sm ${isLinked ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                            {item.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}