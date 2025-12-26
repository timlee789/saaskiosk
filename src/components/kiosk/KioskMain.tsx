"use client";
import React, { useState } from 'react'; // useState import 추가
import { Category, MenuItem, ModifierGroup, StoreInfo } from '@/lib/types';
import { useKioskLogic } from '@/hooks/useKioskLogic';

import CategoryTabs from './CategoryTabs';
import MenuGrid from './MenuGrid';
import CartSidebar from './CartSidebar';
import PaymentOverlay from './PaymentOverlay';

import ModifierModal from './modals/ModifierModal';
import TableNumberModal from './modals/TableNumberModal';
import OrderTypeModal from './modals/OrderTypeModal';
import TipModal from './modals/TipModal';
import DayWarningModal from './modals/DayWarningModal';
import StoreInfoModal from './modals/StoreInfoModal'; // 모달 import

interface Props {
  categories: Category[];
  items: MenuItem[];
  modifiersObj: { [key: string]: ModifierGroup };
  storeInfo: StoreInfo; // [수정 1] 타입 정의 확인
}

// [수정 2] 여기서 { ... , storeInfo } 를 꼭 꺼내와야 합니다!
export default function KioskMain({ categories, items, modifiersObj, storeInfo }: Props) {
  const { state, actions } = useKioskLogic(categories, items);
  const [showInfo, setShowInfo] = useState(false); // 정보 모달 상태

  return (
    <div className="flex h-full w-full bg-gray-100 relative overflow-hidden">

      {/* 왼쪽 영역 */}
      <div className="w-[70%] flex flex-col border-r border-gray-300 h-full">

        {/* 헤더 (클릭 시 모달 오픈) */}
        <div
          onClick={() => setShowInfo(true)}
          className="bg-white px-6 py-4 flex items-center gap-4 border-b border-gray-200 shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          {storeInfo.logo_url ? (
            <img
              src={storeInfo.logo_url}
              alt="Logo"
              className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl shadow-sm">
              🏪
            </div>
          )}
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">
            {storeInfo.store_name}
          </h1>
        </div>

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

      {/* 오른쪽 장바구니 */}
      <CartSidebar
        cart={state.cart}
        totals={state.totals}
        onRemove={actions.removeFromCart}
        onClear={actions.clearCart}
        onPayClick={() => actions.setModals(prev => ({ ...prev, table: true }))}
        cartEndRef={state.cartEndRef as React.RefObject<HTMLDivElement>}
      />

      {/* --- 모달들 --- */}

      {/* [수정 3] 이제 storeInfo가 존재하므로 빨간 줄이 사라집니다 */}
      {showInfo && (
        <StoreInfoModal
          info={storeInfo}
          onClose={() => setShowInfo(false)}
        />
      )}

      {state.selectedItem && (
        <ModifierModal
          item={state.selectedItem}
          modifiersObj={modifiersObj}
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

      <PaymentOverlay status={state.paymentStatus} />
    </div>
  );
}