// ------------------------------------------------------------------
// 1. Modifier (옵션) 관련 타입
// ------------------------------------------------------------------

export interface ModifierOption {
    id: string;       // DB UUID
    name: string;
    price: number;
}

export interface ModifierGroup {
    id: string;       // DB UUID
    name: string;

    // [NEW] 키오스크 로직 필수 필드 (DB 컬럼과 일치)
    min_selection: number;
    max_selection: number;
    is_required: boolean;

    // [NEW] DB 구조: 그룹 안에 포함된 옵션 리스트
    modifiers: ModifierOption[];

    // [LEGACY] 기존 코드 호환용 (필요시 사용, 아니면 무시됨)
    options?: ModifierOption[];
}

// ------------------------------------------------------------------
// 2. Menu Item (메뉴 상품) 관련 타입
// ------------------------------------------------------------------

export interface MenuItem {
    id: string;       // DB UUID
    name: string;
    price: number;

    // [NEW] DB 컬럼명 (Snake Case)
    description?: string | null;
    image_url?: string | null;
    category_id: string; // 카테고리 연결용 외래키
    is_sold_out: boolean;
    sort_order?: number;

    // [NEW] 아이템에 연결된 옵션 그룹들 (DB Join 결과)
    modifier_groups?: ModifierGroup[];

    // [LEGACY] 기존 코드 호환용 (Optional)
    posName?: string;
    image?: string;       // -> image_url로 대체됨
    is_available?: boolean; // -> is_sold_out으로 대체됨
    category?: string;    // -> category_id로 대체됨
    modifierGroups?: string[]; // -> modifier_groups 객체 배열로 대체됨
    clover_id?: string;
}

// ------------------------------------------------------------------
// 3. Category (카테고리) 관련 타입
// ------------------------------------------------------------------

export interface Category {
    id: string;
    name: string;
    sort_order: number;
    tenant_id?: string;
    items?: MenuItem[]; // 카테고리에 속한 아이템들 (선택적)
}

// [NEW] 가게 기본 정보 타입
export interface StoreInfo {
    store_name: string;
    logo_url: string | null;
}

export interface KioskData {
    categories: Category[];
    items: MenuItem[];
    modifiersObj: { [key: string]: ModifierGroup };
    storeInfo: StoreInfo; // [NEW] 추가됨
}

// ------------------------------------------------------------------
// 4. Cart (장바구니) 관련 타입
// ------------------------------------------------------------------

export interface CartItem extends MenuItem {
    uniqueCartId: string;        // 장바구니 내에서 구분을 위한 고유 ID (Frontend 생성)
    quantity: number;
    totalPrice: number;          // 기본가 + 옵션가 합산

    // 선택된 옵션들
    selectedModifiers: ModifierOption[];

    // 세트 메뉴 등 그룹핑을 위한 ID (Optional)
    groupId?: string;
}

// ------------------------------------------------------------------
// 5. Multi-tenant & Role Types (관리자/인증용)
// ------------------------------------------------------------------

export type UserRole = 'super_admin' | 'store_admin' | 'customer';

export interface Tenant {
    id: string;
    name: string;
    created_at: string;
}

export interface UserProfile {
    id: string;
    email: string | null;
    role: UserRole;
    tenant_id: string | null;
}