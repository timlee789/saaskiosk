"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Category, MenuItem } from '@/lib/types';

export default function AdminMenuPage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Omit<MenuItem, 'price'> & { price: string | number }>>({});

  // 1. 초기 로딩: 내 매장 ID(tenant_id) 찾기 -> 카테고리 불러오기
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
        fetchCategories(); // tenant_id를 알았으니 카테고리 로딩
      }
    };
    init();
  }, []);

  // 2. 카테고리 선택 시 아이템 불러오기
  useEffect(() => {
    if (selectedCatId) fetchItems(selectedCatId);
  }, [selectedCatId]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');

    if (data && data.length > 0) {
      setCategories(data);
      if (!selectedCatId) setSelectedCatId(data[0].id);
    } else {
      setCategories([]); // 데이터가 없으면 빈 배열
    }
  };

  const fetchItems = async (catId: string) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('category_id', catId)
      .order('sort_order', { ascending: true });

    if (data) setItems(data);
    else setItems([]);
  };

  // ---------------------------------------------------------
  // [Category] 카테고리 추가 기능
  // ---------------------------------------------------------
  const handleAddCategory = async () => {
    if (!tenantId) return alert("System Error: Tenant ID missing");
    const name = prompt("Enter new Category Name (e.g., Coffee, Dessert):");
    if (!name) return;

    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) : 0;

    const { error } = await supabase.from('categories').insert({
      name: name,
      tenant_id: tenantId, // 내 매장 ID 필수!
      sort_order: maxOrder + 1
    });

    if (error) alert("Error: " + error.message);
    else fetchCategories();
  };


  // ---------------------------------------------------------
  // [Item] 아이템 추가 기능
  // ---------------------------------------------------------
  const handleAddNewItem = async () => {
    if (!selectedCatId || !tenantId) return;
    const name = prompt("Enter new Item Name:");
    if (!name) return;

    // 현재 리스트의 가장 큰 순서 번호 찾기
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) : 0;

    const { error } = await supabase.from('items').insert({
      tenant_id: tenantId,
      category_id: selectedCatId,
      name: name,
      description: '', // [수정] 새 아이템 추가 시 설명 필드 초기화
      price: 0,
      is_sold_out: false,
      sort_order: maxOrder + 1
    });

    if (error) alert("Error adding item: " + error.message);
    else fetchItems(selectedCatId);
  };

  const startEditing = (item: MenuItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveItem = async () => {
    if (!editForm.name) return alert("Name is required");

    const { error } = await supabase
      .from('items')
      .update({
        name: editForm.name,
        description: editForm.description, // [수정] 설명 필드 업데이트 추가
        price: Number(editForm.price) || 0,
        is_sold_out: editForm.is_sold_out,
        category_id: editForm.category_id
      })
      .eq('id', editingId);

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      setEditingId(null);
      fetchItems(selectedCatId!);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from('items').delete().eq('id', itemId);
    fetchItems(selectedCatId!);
  };

  // ---------------------------------------------------------
  // [Image] 이미지 업로드 (Storage Bucket 필요)
  // ---------------------------------------------------------
  const handleImageUpload = async (itemId: string, file: File) => {
    if (!confirm("Upload image?")) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/${Date.now()}.${fileExt}`; // 폴더 구분
    const filePath = `${fileName}`;

    // 1. 업로드
    const { error: uploadError } = await supabase.storage
      .from('menu-images') 
      .upload(filePath, file);

    if (uploadError) return alert("Upload Failed: " + uploadError.message);

    // 2. 공개 URL 가져오기
    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(filePath);

    // 3. DB 업데이트
    await supabase.from('items').update({ image_url: urlData.publicUrl }).eq('id', itemId);
    alert("Image uploaded!");
    fetchItems(selectedCatId!);
  };

  const handleMoveItem = async (index: number, direction: 'prev' | 'next') => {
    if (direction === 'prev' && index === 0) return;
    if (direction === 'next' && index === items.length - 1) return;

    const targetIndex = direction === 'prev' ? index - 1 : index + 1;

    // UI 낙관적 업데이트
    const newItems = [...items];
    const itemA = newItems[index];
    const itemB = newItems[targetIndex];

    newItems[index] = itemB;
    newItems[targetIndex] = itemA;
    setItems(newItems);

    // DB 업데이트
    const { error: e1 } = await supabase.from('items').update({ sort_order: itemB.sort_order }).eq('id', itemA.id);
    const { error: e2 } = await supabase.from('items').update({ sort_order: itemA.sort_order }).eq('id', itemB.id);

    if (e1 || e2) {
      console.error("Reorder failed", e1, e2);
      fetchItems(selectedCatId!);
    }
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.20))] bg-gray-50">

      {/* --- 왼쪽: 카테고리 관리 --- */}
      <div className="w-72 bg-white border-r flex flex-col shadow-sm z-10">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-800">Categories</h2>
          <button
            onClick={handleAddCategory}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm font-bold text-xl pb-1"
            title="Add Category"
          >
            +
          </button>
        </div>
        <ul className="overflow-y-auto flex-1 p-3 space-y-2">
          {categories.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              No categories yet.<br />Click + to add one.
            </div>
          )}
          {categories.map(cat => (
            <li
              key={cat.id}
              onClick={() => {
                setSelectedCatId(cat.id);
                setEditingId(null);
              }}
              className={`p-4 cursor-pointer rounded-xl font-bold transition-all flex justify-between items-center group
                ${selectedCatId === cat.id
                  ? 'bg-slate-900 text-white shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{cat.name}</span>
              {selectedCatId === cat.id && <span className="text-blue-400">●</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* --- 오른쪽: 메뉴 아이템 관리 --- */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Menu Items</h1>
            <p className="text-slate-500 mt-1">
              Category: <span className="font-bold text-blue-600 underline decoration-2 underline-offset-4">{categories.find(c => c.id === selectedCatId)?.name || 'None'}</span>
            </p>
          </div>
          <button
            onClick={handleAddNewItem}
            disabled={!selectedCatId}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <span>+</span> Add New Item
          </button>
        </div>

        {!selectedCatId ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p className="text-xl font-bold mb-2">👈 Select a Category</p>
            <p>Choose a category from the left to manage items.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium text-lg">No items in this category yet.</p>
            <button onClick={handleAddNewItem} className="text-blue-600 font-bold mt-2 hover:underline">Add your first item here</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            {items.map((item, index) => {
              const isEditing = editingId === item.id;
              const displayData = isEditing ? editForm : item;

              return (
                <div key={item.id} className={`bg-white p-5 rounded-3xl shadow-sm border transition-all duration-300
                  ${isEditing ? 'ring-4 ring-blue-100 border-blue-500 shadow-xl z-10 scale-[1.02]' : 'border-slate-100 hover:shadow-md'}`}>

                  {/* 순서 변경 버튼 */}
                  {!isEditing && (
                    <div className="flex justify-between mb-3 bg-slate-50 rounded-lg p-1">
                      <button
                        onClick={() => handleMoveItem(index, 'prev')}
                        disabled={index === 0}
                        className="text-slate-400 hover:text-blue-600 disabled:opacity-20 px-3 font-black hover:bg-white rounded-md transition-all"
                      >
                        ◀
                      </button>
                      <span className="text-xs text-slate-400 font-mono py-1">#{index + 1}</span>
                      <button
                        onClick={() => handleMoveItem(index, 'next')}
                        disabled={index === items.length - 1}
                        className="text-slate-400 hover:text-blue-600 disabled:opacity-20 px-3 font-black hover:bg-white rounded-md transition-all"
                      >
                        ▶
                      </button>
                    </div>
                  )}

                  {/* 이미지 영역: [수정] aspect-video -> aspect-square (1:1 비율) */}
                  <div className="aspect-square bg-slate-100 rounded-2xl relative overflow-hidden group mb-5 flex items-center justify-center border border-slate-100">
                    {displayData.image_url ? (
                      <img
                        src={displayData.image_url}
                        alt={displayData.name || 'Item'}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="text-slate-300 flex flex-col items-center">
                        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-bold">No Image</span>
                      </div>
                    )}

                    <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white font-bold text-sm z-20 backdrop-blur-sm">
                      <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Upload Photo
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(item.id, e.target.files[0])} />
                    </label>
                  </div>

                  {/* 입력 폼 */}
                  <div className="space-y-4">
                    {/* 카테고리 이동 (수정 모드일 때만) */}
                    {isEditing && (
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <label className="text-xs text-orange-800 font-bold uppercase block mb-1">Move Category</label>
                        <select
                          value={editForm.category_id}
                          onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                          className="w-full p-2 bg-white border border-orange-200 rounded-lg text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">Name</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={displayData.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={`w-full text-lg font-black bg-transparent outline-none border-b-2 py-1 transition-colors
                          ${isEditing ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-800'}`}
                      />
                    </div>

                    {/* [수정] Description 필드 추가 */}
                    <div>
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">Description</label>
                      <textarea
                        disabled={!isEditing}
                        value={displayData.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className={`w-full text-sm font-medium bg-transparent outline-none border-b-2 py-1 transition-colors resize-none
                          ${isEditing ? 'border-blue-500 text-slate-600' : 'border-transparent text-slate-500'}`}
                        rows={2}
                        placeholder={isEditing ? "Add a short description..." : ""}
                      />
                    </div>

                    <div className="flex justify-between gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">Price</label>
                        <div className="flex items-center">
                          <span className="text-lg font-bold text-slate-400 mr-1">$</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={!isEditing}
                            value={displayData.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            className={`w-full text-xl font-black bg-transparent outline-none border-b-2 py-1 transition-colors font-mono
                                  ${isEditing ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-800'}`}
                          />
                        </div>
                      </div>

                      {/* 품절 버튼 */}
                      <button
                        disabled={!isEditing}
                        onClick={() => setEditForm({ ...editForm, is_sold_out: !editForm.is_sold_out })}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all border
                            ${displayData.is_sold_out
                            ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                      >
                        {displayData.is_sold_out ? '🔴 SOLD OUT' : '🟢 IN STOCK'}
                      </button>
                    </div>
                  </div>

                  {/* 하단 버튼 (수정/저장/삭제) */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 text-sm font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveItem}
                            className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-black shadow-lg text-sm transform active:scale-95 transition-all"
                          >
                            Save Changes
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => startEditing(item)}
                        className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 border border-slate-200 text-sm hover:border-slate-300 transition-all"
                      >
                        Edit Details
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}