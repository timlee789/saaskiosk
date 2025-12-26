import { createBrowserClient } from '@supabase/ssr';
import { Category, MenuItem, ModifierGroup, StoreInfo } from './types'; // StoreInfo 타입 추가 확인

// Supabase 클라이언트 생성
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const fetchMenuData = async (tenantId: string) => {
  // 1. 유효성 검사
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
    // ---------------------------------------------------------
    // [NEW] 0. 가게 정보(이름, 로고) 가져오기
    // ---------------------------------------------------------
    // profiles 테이블에서 tenant_id가 일치하는 정보를 가져옵니다.
    const { data: profileData } = await supabase
      .from('profiles')
      .select('store_name, logo_url, address, phone, open_hours')
      .eq('tenant_id', tenantId)
      .maybeSingle(); // 데이터가 없어도 에러내지 않고 null 반환

    // 가게 정보 객체 생성 (데이터가 없으면 기본값 사용)
    const storeInfo: StoreInfo = {
      store_name: profileData?.store_name || 'My Kiosk',
      logo_url: profileData?.logo_url || null,
      address: profileData?.address || null,         // [NEW]
      phone: profileData?.phone || null,             // [NEW]
      open_hours: profileData?.open_hours || null,   // [NEW]
    };

    // ---------------------------------------------------------
    // 1. 카테고리 가져오기
    // ---------------------------------------------------------
    const { data: catsData, error: catError } = await supabase
      .from('categories')
      .select('id, name, sort_order')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });

    if (catError) throw catError;

    // ---------------------------------------------------------
    // 2. 아이템 및 옵션 정보 가져오기 (Deep Query)
    // ---------------------------------------------------------
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
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });

    if (itemError) throw itemError;

    // ---------------------------------------------------------
    // 3. 데이터 가공 (DB -> Frontend Type Mapping)
    // ---------------------------------------------------------
    const categories: Category[] = catsData || [];
    const modifiersObj: { [key: string]: ModifierGroup } = {};

    const allItems: MenuItem[] = (itemsData || []).map((item: any) => {

      // 옵션 그룹 매핑
      const groups: ModifierGroup[] = item.item_modifier_groups?.map((relation: any) => {
        const group = relation.modifier_groups;

        // 옵션 아이템 가격순 정렬
        const sortedModifiers = (group.modifiers || []).sort((a: any, b: any) => a.price - b.price);

        const formattedGroup: ModifierGroup = {
          id: group.id,
          name: group.name,
          min_selection: group.min_selection || 0,
          max_selection: group.max_selection || 0,
          is_required: group.is_required || false,
          modifiers: sortedModifiers,
          options: sortedModifiers // 호환성 유지
        };

        // 객체에 저장
        if (group.id) modifiersObj[group.id] = formattedGroup;
        if (group.name) modifiersObj[group.name] = formattedGroup;

        return formattedGroup;
      }) || [];

      // MenuItem 타입 변환
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
        // 레거시 호환성
        modifierGroups: groups.map(g => g.name),
        posName: item.pos_name,
        clover_id: item.clover_id
      };

      return menuItem;
    });

    // [최종 리턴] storeInfo 포함
    return { categories, items: allItems, modifiersObj, storeInfo };

  } catch (error: any) {
    console.error("❌ Data Fetching Failed:", error.message);
    // 에러 발생 시에도 빈 데이터와 기본 가게 정보를 반환하여 멈춤 방지
    return {
      categories: [],
      items: [],
      modifiersObj: {},
      storeInfo: { store_name: 'System Error', logo_url: null }
    };
  }
};