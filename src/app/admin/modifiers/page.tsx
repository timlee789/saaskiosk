"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// 타입 정의
interface ModifierGroup {
    id: string;
    name: string;
}
interface ModifierOption {
    id: string;
    name: string;
    price: number;
    sort_order: number;
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

    // 데이터 상태
    const [groups, setGroups] = useState<ModifierGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);

    const [options, setOptions] = useState<ModifierOption[]>([]);
    const [linkedItemIds, setLinkedItemIds] = useState<string[]>([]); 
    const [allItems, setAllItems] = useState<SimpleItem[]>([]); 

    // 옵션 수정용 상태
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
    const [editOptionForm, setEditOptionForm] = useState({ name: '', price: 0 });

    // 로딩 상태
    const [loadingOptions, setLoadingOptions] = useState(false);

    // 초기 데이터 로드
    useEffect(() => {
        fetchGroups();
        fetchItems();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchOptions(selectedGroup.id);
            fetchLinkedItems(selectedGroup.id);
            setEditingOptionId(null); 
        } else {
            setOptions([]);
            setLinkedItemIds([]);
        }
    }, [selectedGroup]);

    // ---------------------------------------------------------
    // Fetch Functions
    // ---------------------------------------------------------
    const fetchGroups = async () => {
        // [수정] tenant_id 기반으로 가져오기 위해 profiles를 먼저 조회하거나, 
        // RLS가 설정되어 있다면 그냥 select 해도 됨. 여기서는 일단 전체 조회.
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
        if(!profile?.tenant_id) return;

        const { data } = await supabase
            .from('modifier_groups')
            .select('*')
            .eq('tenant_id', profile.tenant_id) // tenant_id가 tenant_id 역할을 함 (DB 스키마 확인 필요)
            .order('name');
        
        if (data) setGroups(data);
    };

    const fetchItems = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;
        
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
        if(!profile?.tenant_id) return;

        const { data } = await supabase
            .from('items')
            .select('id, name, category_id')
            .eq('tenant_id', profile.tenant_id)
            .order('name');
            
        if (data) setAllItems(data);
    };

    const fetchOptions = async (groupId: string) => {
        setLoadingOptions(true);
        const { data } = await supabase
            .from('modifiers')
            .select('*')
            .eq('group_id', groupId)
            .order('sort_order', { ascending: true }); 
        if (data) setOptions(data);
        setLoadingOptions(false);
    };

    const fetchLinkedItems = async (groupId: string) => {
        const { data } = await supabase.from('item_modifier_groups').select('item_id').eq('group_id', groupId);
        if (data) {
            setLinkedItemIds(data.map(d => d.item_id));
        }
    };

    // ---------------------------------------------------------
    // Handlers (Groups)
    // ---------------------------------------------------------
    const handleAddGroup = async () => {
        const name = prompt("Enter new Group Name (e.g., 'Steak Temperature')");
        if (!name) return;

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single();

        if (!profile?.tenant_id) return alert("Restaurant not found");

        const { error } = await supabase.from('modifier_groups').insert({
            tenant_id: profile.tenant_id,
            name: name
        });

        if (!error) fetchGroups();
        else alert(error.message);
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("Delete this group? All options inside it will be deleted.")) return;
        await supabase.from('modifier_groups').delete().eq('id', id);
        setSelectedGroup(null);
        fetchGroups();
    };

    // ---------------------------------------------------------
    // Handlers (Options - Add, Edit, Delete, Move)
    // ---------------------------------------------------------
    const handleAddOption = async () => {
        if (!selectedGroup) return;
        const name = prompt("Enter Option Name (e.g., 'Medium Rare')");
        if (!name) return;
        const priceStr = prompt("Enter Price (0 for free)", "0");
        const price = parseFloat(priceStr || "0");

        const maxOrder = options.length > 0 ? Math.max(...options.map(o => o.sort_order || 0)) : 0;

        await supabase.from('modifiers').insert({
            group_id: selectedGroup.id,
            name,
            price,
            sort_order: maxOrder + 1
        });
        fetchOptions(selectedGroup.id);
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm("Delete this option?")) return;
        await supabase.from('modifiers').delete().eq('id', id);
        if (selectedGroup) fetchOptions(selectedGroup.id);
    };

    const startEditingOption = (opt: ModifierOption) => {
        setEditingOptionId(opt.id);
        setEditOptionForm({ name: opt.name, price: opt.price });
    };

    const handleUpdateOption = async () => {
        if (!editingOptionId || !selectedGroup) return;
        if (!editOptionForm.name) return alert("Name is required");

        const { error } = await supabase
            .from('modifiers')
            .update({
                name: editOptionForm.name,
                price: editOptionForm.price
            })
            .eq('id', editingOptionId);

        if (error) {
            alert("Error updating: " + error.message);
        } else {
            setEditingOptionId(null);
            fetchOptions(selectedGroup.id);
        }
    };

    // [수정] 순서 변경 핸들러 (전체 재정렬 방식)
    const handleMoveOption = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === options.length - 1) return;
    
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        // 1. UI 상에서 배열 순서 변경 (Deep Copy)
        const newOptions = [...options];
        // 선택한 아이템을 배열에서 빼내고(splice), 목표 위치에 넣습니다.
        const [movedItem] = newOptions.splice(index, 1);
        newOptions.splice(targetIndex, 0, movedItem);
        
        // UI 즉시 반영 (사용자에게는 바로 바뀐 것처럼 보임)
        setOptions(newOptions);
    
        // 2. DB 업데이트: 전체 리스트의 sort_order를 인덱스 순서대로(1, 2, 3...) 싹 다 업데이트
        // 이렇게 하면 기존 값이 0이든 중복이든 상관없이 무조건 순서가 고정됩니다.
        try {
            const updates = newOptions.map((opt, i) => 
                supabase
                    .from('modifiers')
                    .update({ sort_order: i + 1 }) // 1부터 시작하는 순서 부여
                    .eq('id', opt.id)
            );

            // 모든 업데이트가 끝날 때까지 기다림 (병렬 처리)
            await Promise.all(updates);

        } catch (error) {
            console.error("Reorder failed:", error);
            alert("Failed to save order. Please try again.");
            if (selectedGroup) fetchOptions(selectedGroup.id); // 실패 시 원복
        }
    };

    // ---------------------------------------------------------
    // Handlers (Linking Items)
    // ---------------------------------------------------------
    const toggleItemLink = async (itemId: string, isLinked: boolean) => {
        if (!selectedGroup) return;

        if (isLinked) {
            const { error } = await supabase
                .from('item_modifier_groups')
                .delete()
                .eq('item_id', itemId)
                .eq('group_id', selectedGroup.id);

            if (!error) {
                setLinkedItemIds(prev => prev.filter(id => id !== itemId));
            }
        } else {
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
        <div className="flex h-[calc(100vh-theme(spacing.20))] bg-gray-50 overflow-hidden">
            {/* ... (UI 코드는 제공해주신 코드와 동일하게 사용) ... */}
            {/* 좌측: Groups */}
            <div className="w-1/4 bg-white border-r flex flex-col min-w-[250px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-gray-800">1. Groups</h2>
                    <button onClick={handleAddGroup} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">+ Add</button>
                </div>
                <ul className="flex-1 overflow-y-auto p-2 space-y-1">
                    {groups.map(group => (
                        <li key={group.id} onClick={() => setSelectedGroup(group)} className={`p-3 rounded-lg cursor-pointer flex justify-between group items-center ${selectedGroup?.id === group.id ? 'bg-blue-100 text-blue-800 font-bold border-blue-200 border' : 'hover:bg-gray-50 text-gray-600'}`}>
                            <span>{group.name}</span>
                            {selectedGroup?.id === group.id && <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="text-red-400 hover:text-red-600 px-2">×</button>}
                        </li>
                    ))}
                </ul>
            </div>

            {/* 중앙: Options */}
            <div className="w-1/3 bg-white border-r flex flex-col min-w-[350px]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-gray-800">2. Options: <span className="text-blue-600">{selectedGroup?.name}</span></h2>
                    <button onClick={handleAddOption} disabled={!selectedGroup} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">+ Add</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {!selectedGroup ? <div className="text-center text-gray-400 mt-10">Select a group</div> : 
                     loadingOptions ? <div className="text-center text-gray-400 mt-10">Loading...</div> : (
                        <ul className="space-y-3">
                            {options.map((opt, index) => {
                                const isEditing = editingOptionId === opt.id;
                                return (
                                    <li key={opt.id} className={`bg-white p-3 rounded shadow-sm border flex flex-col gap-2 ${isEditing ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                <input type="text" value={editOptionForm.name} onChange={(e) => setEditOptionForm({...editOptionForm, name: e.target.value})} className="w-full border-b border-blue-500 outline-none text-sm font-bold" />
                                                <input type="number" step="0.01" value={editOptionForm.price} onChange={(e) => setEditOptionForm({...editOptionForm, price: parseFloat(e.target.value)||0})} className="w-20 border-b border-blue-500 outline-none text-sm font-bold" />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingOptionId(null)} className="px-2 py-1 text-xs text-gray-500">Cancel</button>
                                                    <button onClick={handleUpdateOption} className="px-2 py-1 text-xs bg-blue-600 text-white rounded font-bold">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <button onClick={() => handleMoveOption(index, 'up')} disabled={index===0} className="text-gray-300 hover:text-blue-600 disabled:opacity-0 text-[10px]">▲</button>
                                                        <button onClick={() => handleMoveOption(index, 'down')} disabled={index===options.length-1} className="text-gray-300 hover:text-blue-600 disabled:opacity-0 text-[10px]">▼</button>
                                                    </div>
                                                    <div><span className="font-bold">{opt.name}</span>{opt.price > 0 && <span className="text-sm text-green-600 ml-2">(+${opt.price})</span>}</div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => startEditingOption(opt)} className="text-blue-400 text-xs px-2 bg-blue-50 rounded">Edit</button>
                                                    <button onClick={() => handleDeleteOption(opt.id)} className="text-red-400 text-xs px-2 bg-red-50 rounded">Del</button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* 우측: Linked Items */}
            <div className="flex-1 bg-white flex flex-col">
                 <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-gray-800">3. Apply to Items</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {!selectedGroup ? <div className="text-center text-gray-400 mt-10">Select a group</div> : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {allItems.map(item => {
                                const isLinked = linkedItemIds.includes(item.id);
                                return (
                                    <label key={item.id} className={`flex items-center p-3 border rounded cursor-pointer ${isLinked ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}>
                                        <input type="checkbox" className="mr-3" checked={isLinked} onChange={() => toggleItemLink(item.id, isLinked)} />
                                        <span className={`text-sm ${isLinked ? 'font-bold' : ''}`}>{item.name}</span>
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