import { createBrowserClient } from '@supabase/ssr';
import { Category, MenuItem, ModifierGroup, StoreInfo } from './types';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const fetchMenuData = async (tenantId: string) => {
  if (!tenantId) {
    console.error("❌ fetchMenuData Error: tenantId is missing.");
    return { 
        categories: [], 
        items: [], 
        modifiersObj: {}, 
        storeInfo: { store_name: 'Kiosk', logo_url: null } 
    };
  }

  try {
    // 0. 가게 정보 가져오기
    const { data: profileData } = await supabase
        .from('profiles')
        .select('store_name, logo_url, address, phone, open_hours')
        .eq('tenant_id', tenantId)
        .maybeSingle();

    const storeInfo: StoreInfo = {
        store_name: profileData?.store_name || 'My Kiosk',
        logo_url: profileData?.logo_url || null,
        address: profileData?.address || null,
        phone: profileData?.phone || null,
        open_hours: profileData?.open_hours || null,
    };

    // 1. 카테고리 가져오기
    const { data: catsData, error: catError } = await supabase
      .from('categories')
      .select('id, name, sort_order')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });

    if (catError) throw catError;

    // 2. 아이템 및 옵션 정보 가져오기
    const { data: itemsData, error: itemError } = await supabase
      .from('items')
      .select(`
        *,
        item_modifier_groups (
          modifier_groups (
            id, name, min_selection, max_selection, is_required,
            modifiers ( id, name, price, sort_order )  
          )
        )
      `) // ✨ [수정 1] modifiers 안에 sort_order 필드를 꼭 가져와야 합니다!
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });

    if (itemError) throw itemError;

    // 3. 데이터 가공
    const categories: Category[] = catsData || [];
    const modifiersObj: { [key: string]: ModifierGroup } = {};

    const allItems: MenuItem[] = (itemsData || []).map((item: any) => {

      const groups: ModifierGroup[] = item.item_modifier_groups?.map((relation: any) => {
        const group = relation.modifier_groups;

        // ✨ [수정 2] 기존의 가격순 정렬을 제거하고, sort_order 순으로 변경!
        // (sort_order가 없으면 가격순, 그것도 같으면 이름순으로 안전장치 추가)
        const sortedModifiers = (group.modifiers || []).sort((a: any, b: any) => {
             // 1순위: sort_order (오름차순)
             if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                 return (a.sort_order || 0) - (b.sort_order || 0);
             }
             // 2순위: 가격 (오름차순)
             return a.price - b.price;
        });

        const formattedGroup: ModifierGroup = {
          id: group.id,
          name: group.name,
          min_selection: group.min_selection || 0,
          max_selection: group.max_selection || 0,
          is_required: group.is_required || false,
          modifiers: sortedModifiers,
          options: sortedModifiers
        };

        if (group.id) modifiersObj[group.id] = formattedGroup;
        if (group.name) modifiersObj[group.name] = formattedGroup;

        return formattedGroup;
      }) || [];

      const menuItem: MenuItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        image_url: item.image_url || item.image,
        category_id: item.category_id,
        is_sold_out: item.is_sold_out ?? !item.is_available,
        sort_order: item.sort_order,
        modifier_groups: groups,
        modifierGroups: groups.map(g => g.name),
        posName: item.pos_name,
        clover_id: item.clover_id
      };

      return menuItem;
    });

    return { categories, items: allItems, modifiersObj, storeInfo };

  } catch (error: any) {
    console.error("❌ Data Fetching Failed:", error.message);
    return { 
        categories: [], 
        items: [], 
        modifiersObj: {}, 
        storeInfo: { store_name: 'System Error', logo_url: null } 
    };
  }
};