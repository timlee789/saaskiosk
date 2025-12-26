"use client";
import React from 'react'; // [수정 1] RefObject 타입을 위해 React import
import { Category, MenuItem, ModifierGroup } from '@/lib/types';
import { useKioskLogic } from '@/hooks/useKioskLogic';

// 분리한 컴포넌트들 (경로 확인 필수)
import CategoryTabs from './CategoryTabs';
import MenuGrid from './MenuGrid';
import CartSidebar from './CartSidebar';
import PaymentOverlay from './PaymentOverlay'; // [수정 2] 같은 폴더 내에 있으므로 ./ 로 변경


// 모달들
import ModifierModal from './modals/ModifierModal';
import TableNumberModal from './modals/TableNumberModal';
import OrderTypeModal from './modals/OrderTypeModal';
import TipModal from './modals/TipModal';
import DayWarningModal from './modals/DayWarningModal';

interface Props {
  categories: Category[];
  items: MenuItem[];
  modifiersObj: { [key: string]: ModifierGroup };
}

export default function KioskMain({ categories, items, modifiersObj }: Props) {
  // 1. 모든 비즈니스 로직과 상태는 Hook이 담당합니다.
  const { state, actions } = useKioskLogic(categories, items);

  return (
    <div className="flex h-full w-full bg-gray-100 relative">

      {/* 2. 왼쪽 영역 (카테고리 + 메뉴 그리드) */}
      <div className="w-[70%] flex flex-col border-r border-gray-300 h-full">
        <CategoryTabs
          categories={categories}
          activeTab={state.activeTab}
          onTabChange={actions.setActiveTab}
        />
        <MenuGrid
          items={state.filteredItems}
          onItemClick={actions.handleItemClick}
        />
      </div>

      {/* 3. 오른쪽 영역 (장바구니 사이드바) */}
      <CartSidebar
        cart={state.cart}
        totals={state.totals}
        onRemove={actions.removeFromCart}
        onClear={actions.clearCart}
        onPayClick={() => actions.setModals(prev => ({ ...prev, table: true }))}
        // [수정 3] 타입 단언(as)을 사용하여 확실하게 매칭시킵니다.
        // useKioskLogic은 RefObject<HTMLDivElement>를 반환하고
        // CartSidebar는 RefObject<HTMLDivElement>를 받습니다.
        cartEndRef={state.cartEndRef as React.RefObject<HTMLDivElement>}
      />

      {/* 4. 각종 모달들 (상태에 따라 조건부 렌더링) */}
      {state.selectedItem && (
        <ModifierModal
          item={state.selectedItem}
          modifiersObj={modifiersObj} // (새 로직에서는 안 쓰이지만 호환성 위해 유지)
          onClose={() => actions.setSelectedItem(null)}
          onConfirm={actions.addToCart}
        />
      )}

      {state.modals.table && (
        <TableNumberModal
          onConfirm={(num) => {
            actions.setOrderInfo(prev => ({ ...prev, tableNumber: num }));
            actions.setModals(prev => ({ ...prev, table: false, orderType: true }));
          }}
          onCancel={() => actions.setModals(prev => ({ ...prev, table: false }))}
        />
      )}

      {state.modals.orderType && (
        <OrderTypeModal
          onSelect={(type) => {
            actions.setOrderInfo(prev => ({ ...prev, orderType: type }));
            actions.setModals(prev => ({ ...prev, orderType: false, tip: true }));
          }}
          onCancel={() => actions.setModals(prev => ({ ...prev, orderType: false }))}
        />
      )}

      {state.modals.tip && (
        <TipModal
          subtotal={state.totals.subtotal}
          onSelectTip={(tip) => {
            actions.setModals(prev => ({ ...prev, tip: false }));
            actions.processPayment(tip);
          }}
        />
      )}

      {state.modals.dayWarning && (
        <DayWarningModal
          targetDay={state.warningTargetDay}
          onClose={() => actions.setModals(prev => ({ ...prev, dayWarning: false }))}
        />
      )}

      {/* 5. 결제 상태 오버레이 (로딩/성공 화면) */}
      <PaymentOverlay status={state.paymentStatus} />
    </div>
  );
}