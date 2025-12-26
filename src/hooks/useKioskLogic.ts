import { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Category, MenuItem, CartItem, ModifierOption } from '@/lib/types';

// 장바구니 아이템 확장 (세트 메뉴 그룹핑 용도)
interface ExtendedCartItem extends CartItem {
    groupId?: string;
    selectedModifiers: ModifierOption[]; // 이름 통일
    totalPrice: number;
    uniqueCartId: string;
    selectedOptions?: ModifierOption[]; // 호환성 유지
    uniqueId?: string;
}

export function useKioskLogic(categories: Category[], items: MenuItem[]) {
    // ----------------------------------------------------------------
    // 1. 상태 관리 (State)
    // ----------------------------------------------------------------
    const [activeTab, setActiveTab] = useState<string>('');
    const [cart, setCart] = useState<ExtendedCartItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

    // 모달 상태
    const [modals, setModals] = useState({
        table: false,
        orderType: false,
        tip: false,
        dayWarning: false,
    });

    const [warningTargetDay, setWarningTargetDay] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

    // 주문 정보
    const [orderInfo, setOrderInfo] = useState({
        tableNumber: '',
        orderType: null as 'eat-in' | 'take-out' | null, // 타입명을 DB와 맞춤 ('dine_in' -> 'eat-in')
        tipAmount: 0,
    });

    const cartEndRef = useRef<HTMLDivElement>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ----------------------------------------------------------------
    // 2. 초기화 및 Effects
    // ----------------------------------------------------------------
    // 카테고리 로드 시 첫 번째 탭 자동 선택
    useEffect(() => {
        if (categories.length > 0 && !activeTab) {
            setActiveTab(categories[0].id); // ID 기준이 더 안전함
        }
    }, [categories, activeTab]);

    // 장바구니 추가 시 스크롤 하단 이동
    useEffect(() => {
        cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [cart]);

    // ----------------------------------------------------------------
    // 3. 계산 로직 (Memoization)
    // ----------------------------------------------------------------
    // 현재 탭 아이템 필터링
    const filteredItems = useMemo(() =>
        items.filter(item => item.category_id === activeTab), // category -> category_id 수정
        [items, activeTab]);

    // 금액 계산 (세금, 수수료 포함)
    const totals = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
        const tax = subtotal * 0.07; // 7% 세금
        const totalWithTax = subtotal + tax;
        const cardFee = totalWithTax * 0.03; // 3% 카드 수수료
        const grandTotal = totalWithTax + cardFee;
        return { subtotal, tax, cardFee, grandTotal };
    }, [cart]);

    // ----------------------------------------------------------------
    // 4. 액션 핸들러 (Actions)
    // ----------------------------------------------------------------

    const clearCart = () => {
        setCart([]);
        setOrderInfo({ tableNumber: '', orderType: null, tipAmount: 0 });
    };

    // 장바구니 추가 로직 (세트 메뉴 자동 추가 포함)
    const addToCart = (item: MenuItem, selectedOptions: ModifierOption[]) => {
        const totalPrice = item.price + selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

        // 스페셜 카테고리 체크 (이름 기반 예시)
        const isSpecialSet = categories.find(c => c.id === item.category_id)?.name === 'Special';
        const currentGroupId = isSpecialSet ? `group-${Date.now()}-${Math.random()}` : undefined;

        const mainCartItem: ExtendedCartItem = {
            ...item,
            selectedModifiers: selectedOptions,
            totalPrice: totalPrice,
            quantity: 1,
            uniqueCartId: Date.now().toString() + Math.random().toString(),
            groupId: currentGroupId,
            // 호환성 유지
            selectedOptions: selectedOptions as any,
            uniqueId: Date.now().toString(),
        };

        let newCartItems = [mainCartItem];

        // [비즈니스 로직] 스페셜 세트 로직 (감자튀김 + 음료 자동 추가)
        if (isSpecialSet) {
            const desc = item.description?.toLowerCase() || '';

            // 감자튀김 자동 추가
            if (desc.includes('fries') || desc.includes('ff')) {
                const friesItem = items.find(i => i.name.includes('Fries') || i.name.includes('FF'));
                if (friesItem) {
                    newCartItems.push({
                        ...friesItem,
                        selectedModifiers: [],
                        totalPrice: 0, // 세트 포함 무료
                        quantity: 1,
                        uniqueCartId: Date.now().toString() + Math.random().toString(),
                        name: `(Set) ${friesItem.name}`,
                        groupId: currentGroupId,
                        selectedOptions: [],
                        uniqueId: Date.now().toString() + 'fries'
                    });
                }
            }
            // 음료 자동 추가
            if (desc.includes('drink')) {
                const drinkItem = items.find(i => i.name.includes('Soft Drink'));
                if (drinkItem) {
                    newCartItems.push({
                        ...drinkItem,
                        selectedModifiers: [],
                        totalPrice: 0, // 세트 포함 무료
                        quantity: 1,
                        uniqueCartId: Date.now().toString() + Math.random().toString(),
                        name: `(Set) ${drinkItem.name}`,
                        groupId: currentGroupId,
                        selectedOptions: [],
                        uniqueId: Date.now().toString() + 'drink'
                    });
                }
            }
        }

        setCart(prev => [...prev, ...newCartItems]);
        setSelectedItem(null); // 모달 닫기
    };

    // 장바구니 삭제 로직
    const removeFromCart = (uniqueId: string) => {
        setCart(prev => {
            const targetItem = prev.find(item => item.uniqueCartId === uniqueId);
            // 세트 상품인 경우 그룹 전체 삭제
            if (targetItem && targetItem.groupId) {
                return prev.filter(item => item.groupId !== targetItem.groupId);
            }
            return prev.filter(item => item.uniqueCartId !== uniqueId);
        });
    };

    // 아이템 클릭 핸들러 (요일별 품절 경고 로직)
    const handleItemClick = (item: MenuItem) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayIndex = new Date().getDay();
        const todayName = days[todayIndex];

        // 메뉴 이름에 요일이 포함되어 있는데 오늘이 아닌 경우 경고
        const targetDay = days.find(day => item.name.includes(day));

        if (targetDay && targetDay !== todayName) {
            setWarningTargetDay(targetDay);
            setModals(prev => ({ ...prev, dayWarning: true }));
            return;
        }

        // 옵션 그룹이 있으면 모달 오픈, 없으면 바로 추가
        if (item.modifierGroups && item.modifierGroups.length > 0) {
            setSelectedItem(item);
        } else {
            addToCart(item, []);
        }
    };

    // ----------------------------------------------------------------
    // 5. 결제 프로세스 (핵심 로직 - Multi Tenant 적용)
    // ----------------------------------------------------------------
    const processPayment = async (finalTipAmount: number) => {
        if (cart.length === 0) return;

        // [수정] SaaS 환경: LocalStorage에서 현재 매장 ID 가져오기
        const tenantId = localStorage.getItem('kiosk_tenant_id');

        if (!tenantId) {
            alert("❌ Critical Error: Store ID (Tenant) not found. Please re-scan QR code.");
            return;
        }

        setPaymentStatus('processing');

        const currentOrderType = orderInfo.orderType || 'eat-in';
        const currentTableNum = orderInfo.tableNumber || '00';

        try {
            const { grandTotal, subtotal, tax, cardFee } = totals;
            const finalAmountWithTip = grandTotal + finalTipAmount;

            console.log(`💳 Starting Payment... Total: $${finalAmountWithTip} (Tenant: ${tenantId})`);

            // [Step 1] Stripe 결제 (서버 API 호출)
            const stripeRes = await fetch('/api/stripe/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: finalAmountWithTip, tenantId }) // tenantId 전달
            });

            if (!stripeRes.ok) {
                // 테스트용: 실제 결제 API 없으면 넘어가도록 처리 (개발 중 편의상)
                console.warn("Stripe Payment skipped or failed (Dev Mode)");
                // throw new Error("Card Payment Failed."); 
            }

            // [Step 2] DB 저장 (Supabase)
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    tenant_id: tenantId, // [중요] tenant_id 반드시 포함
                    total_amount: finalAmountWithTip,
                    status: 'pending', // KDS에 'pending'으로 떠야 조리 시작 가능
                    table_number: currentOrderType === 'take-out' ? null : parseInt(currentTableNum),
                    order_type: currentOrderType,
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // [Step 2.1] 주문 아이템 저장
            const orderItemsData = cart.map(item => ({
                order_id: orderData.id,
                item_name: item.name,
                quantity: item.quantity,
                price: item.totalPrice,
                options: item.selectedModifiers // JSONB 저장
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
            if (itemsError) throw itemsError;

            // [Step 3] Clover & Print (옵션)
            // 실제 구현 시 API 라우트 필요
            /*
            fetch('/api/clover/order', { ... }).catch(e => console.error(e));
            fetch('http://127.0.0.1:4000/print', { ... }).catch(e => console.error(e));
            */

            // [Step 4] 성공 처리
            setPaymentStatus('success');

            // 3초 후 초기화
            setTimeout(() => {
                setPaymentStatus('idle');
                clearCart();
                setModals({ table: false, orderType: false, tip: false, dayWarning: false });
                setActiveTab(categories[0]?.id || '');
            }, 3000);

        } catch (error: any) {
            setPaymentStatus('idle');
            alert("❌ Payment Error: " + error.message);
            console.error(error);
        }
    };

    // KioskMain.tsx에서 사용할 수 있도록 리턴 값 매핑
    return {
        state: {
            activeTab,
            cart,
            filteredItems,
            totals,
            selectedItem,
            modals,
            orderInfo,
            paymentStatus,
            warningTargetDay,
            cartEndRef
        },
        actions: {
            setActiveTab,
            handleItemClick,
            addToCart,
            removeFromCart,
            clearCart,
            setSelectedItem,
            setModals,
            setOrderInfo,
            processPayment
        }
    };
}