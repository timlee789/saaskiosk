"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, MenuItem, ModifierGroup, StoreInfo } from '@/lib/types';
import { useKioskLogic } from '@/hooks/useKioskLogic';

// UI 컴포넌트
import ItemCard from './ItemCard';
import PaymentOverlays from './PaymentOverlay';

// 모달들
import ModifierModal from './modals/ModifierModal';
import TableNumberModal from './modals/TableNumberModal';
import OrderTypeModal from './modals/OrderTypeModal';
import TipModal from './modals/TipModal';
import DayWarningModal from './modals/DayWarningModal';
import StoreInfoModal from './modals/StoreInfoModal';

interface Props {
  categories: Category[];
  items: MenuItem[];
  modifiersObj: { [key: string]: ModifierGroup };
  storeInfo: StoreInfo;
}

export default function KioskMain({ categories, items, modifiersObj, storeInfo }: Props) {
  // 1. 비즈니스 로직 (Hook 사용)
  const { state, actions } = useKioskLogic(categories, items);
  
  // 2. UI 상태 (카트 열림 여부, 정보 모달 등)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // 3. 아이들 타이머 (일정 시간 활동 없으면 초기화)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // 결제 중이거나 카트가 비어있으면 리셋 안 함 (정책에 따라 조정 가능)
        if (state.paymentStatus === 'idle' && state.cart.length > 0) {
            actions.clearCart();
            setIsCartOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 180000); // 3분 (180초)
    };

    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    resetIdleTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
    };
  }, [state.paymentStatus, state.cart.length, actions]);

  // 카트가 열릴 때 스크롤 하단으로 이동
  useEffect(() => {
    if (isCartOpen) {
        // 약간의 딜레이 후 스크롤 (애니메이션 고려)
        setTimeout(() => {
            (state.cartEndRef as React.RefObject<HTMLDivElement>).current?.scrollIntoView({ behavior: "smooth" });
        }, 300);
    }
  }, [state.cart, isCartOpen]);


  // --- 핸들러 래퍼 ---
  
  // 아이템 클릭 시 장바구니에 담기면 카트 열기 (선택적)
  const handleItemClickWrapper = (item: MenuItem) => {
    actions.handleItemClick(item);
    // 옵션이 없는 아이템을 바로 담았을 때 카트를 열고 싶다면 아래 주석 해제
    // if (!item.modifier_groups || item.modifier_groups.length === 0) setIsCartOpen(true);
  };

  // 장바구니 추가 후 처리
  const handleAddToCartWrapper = (item: MenuItem, options: any[]) => {
      actions.addToCart(item, options);
      setIsCartOpen(true); // 담고 나서 카트 열어서 보여주기
  };

  // 결제 시작 (Pay Now)
  const handlePayClick = () => {
      setIsCartOpen(false); // 카트 닫기
      actions.setModals(prev => ({ ...prev, table: true })); // 테이블 모달 열기
  };


  return (
    <div className="flex flex-col h-full w-full bg-gray-100 relative overflow-hidden">
      
      {/* 1. 상단 헤더 (Store Info) */}
      <div 
        className="bg-white border-b border-gray-200 shrink-0 z-30 shadow-sm cursor-pointer"
        onClick={() => setShowInfo(true)}
      >
        <div className="pt-8 px-6 pb-4 text-center">
            {/* 로고가 있으면 표시 */}
            {storeInfo.logo_url && (
                <img src={storeInfo.logo_url} alt="Logo" className="w-16 h-16 mx-auto mb-2 rounded-full object-cover border border-gray-100" />
            )}
            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                {storeInfo.store_name}
            </h1>
            <p className="text-gray-400 font-bold tracking-widest text-sm uppercase mt-1">
                {storeInfo.phone || "Welcome"}
            </p>
        </div>

        {/* 카테고리 탭 (가로 스크롤) */}
        <div className="flex overflow-x-auto px-4 py-4 gap-3 scrollbar-hide items-center">
          {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={(e) => {
                    e.stopPropagation();
                    actions.setActiveTab(cat.id);
                }}
                className={`flex-shrink-0 px-6 h-18 rounded-full text-2xl font-extrabold transition-all shadow-sm border-[3px] whitespace-nowrap
                  ${state.activeTab === cat.id 
                    ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {cat.name}
              </button>
          ))}
        </div>
      </div>


      {/* 2. 아이템 리스트 (전체 그리드) */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100 scrollbar-hide">
        {/* 반응형 그리드: 모바일 2열, 태블릿 3열, PC 4열 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-40"> 
          {state.filteredItems.length > 0 ? (
            state.filteredItems.map((item) => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onClick={() => handleItemClickWrapper(item)} 
              />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center pt-20 text-gray-400 opacity-60">
              <span className="text-6xl mb-4">🍽️</span>
              <p className="text-2xl font-bold">No items available.</p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------- */}
      {/* 3. 플로팅 카트 버튼 (Floating Action Button) */}
      {/* ------------------------------------------------------- */}
      <button 
        onClick={() => setIsCartOpen(true)}
        // [수정] bottom-8 -> top-32 (헤더 높이 고려하여 적절히 배치)
        // 헤더가 약 150px 정도 차지하므로 top-36 또는 top-40 정도가 적당합니다.
        // 또는 헤더 안에 넣지 않고 absolute로 띄운다면 z-index 확인 필요.
        className="absolute top-15 right-6 z-40 bg-white border-4 border-gray-100 p-4 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all flex flex-col items-center justify-center gap-1 w-32 h-32"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-12 h-12 text-gray-900">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          
          {state.cart.length > 0 && (
            <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xl font-black w-10 h-10 flex items-center justify-center rounded-full border-4 border-white shadow-md animate-bounce">
              {state.cart.length}
            </span>
          )}
        </div>
        
        {state.cart.length > 0 && (
            <span className="font-black text-gray-900 text-xl tracking-tight">
                ${state.totals.grandTotal.toFixed(0)}
            </span>
        )}
      </button>

      {/* ------------------------------------------------------- */}
      {/* 4. 슬라이드 오버 (Drawer) 카트 */}
      {/* ------------------------------------------------------- */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* 배경 (Backdrop) */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            
            {/* 바텀 시트 (Bottom Sheet) */}
            <motion.div
              initial={{ y: "100%" }} 
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 w-full h-[85%] bg-white z-[60] shadow-2xl flex flex-col rounded-t-[2rem]"
              onClick={(e) => e.stopPropagation()} 
            >
              {/* 카트 헤더 */}
              <div className="p-6 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0 rounded-t-[2rem]">
                <div>
                  <h2 className="text-3xl font-extrabold">Your Order</h2>
                  <p className="text-gray-300 text-lg mt-1">{state.cart.length} items</p>
                </div>
                
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="bg-red-600 p-3 rounded-full hover:bg-red-500 transition-colors shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 카트 아이템 리스트 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {state.cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                    <p className="text-3xl font-bold opacity-30">Cart is empty.</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence initial={false} mode='popLayout'>
                      {state.cart.map((cartItem) => (
                        <motion.div 
                          key={cartItem.uniqueCartId} layout 
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} 
                          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-row gap-4 relative z-0"
                        >
                           <div className="flex-1 flex flex-col justify-center">
                             <h4 className="font-extrabold text-3xl text-gray-900 leading-tight">{cartItem.name}</h4>
                             
                             {cartItem.selectedModifiers.length > 0 && (
                               <div className="mt-3 text-xl text-gray-600 font-medium bg-gray-50 p-3 rounded-xl">
                                 {cartItem.selectedModifiers.map((opt, i) => (
                                   <span key={i} className="block">+ {opt.name} {opt.price > 0 && `($${opt.price.toFixed(2)})`}</span>
                                 ))}
                               </div>
                             )}
                             <div className="mt-4 font-black text-gray-900 text-3xl">${cartItem.totalPrice.toFixed(2)}</div>
                           </div>

                           <div className="flex flex-col justify-center border-l pl-5 border-gray-100">
                             <button onClick={() => actions.removeFromCart(cartItem.uniqueCartId)} className="w-16 h-16 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                             </button>
                           </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {/* 스크롤 하단 자동 이동 타겟 */}
                    <div ref={state.cartEndRef as React.RefObject<HTMLDivElement>} />
                    <div className="text-right pt-2 pb-10">
                        <button onClick={actions.clearCart} className="text-xl text-red-500 hover:text-red-700 underline font-semibold">Clear All Items</button>
                    </div>
                  </>
                )}
              </div>

              {/* 결제 요약 및 버튼 */}
              {state.cart.length > 0 && (
                <div className="p-8 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 pb-10">
                  <div className="space-y-3 mb-6 text-gray-600 font-medium text-xl">
                    <div className="flex justify-between"><span>Subtotal</span><span>${state.totals.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg"><span>Tax (7%)</span><span>${state.totals.tax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-lg"><span>Fee (3%)</span><span>${state.totals.cardFee.toFixed(2)}</span></div>
                  </div>
                  <div className="flex justify-between items-center mb-6 pt-6 border-t border-gray-200">
                    <span className="text-3xl font-bold text-gray-800">Total</span>
                    <span className="text-5xl font-black text-red-600">${state.totals.grandTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handlePayClick}
                    className="w-full h-24 bg-green-600 text-white text-4xl font-black rounded-3xl hover:bg-green-700 shadow-xl active:scale-95 transition-all" 
                  >
                    Pay Now
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. 각종 모달들 (Hook에서 가져온 상태와 액션 연결) */}
      {showInfo && <StoreInfoModal info={storeInfo} onClose={() => setShowInfo(false)} />}
      
      {state.selectedItem && (
        <ModifierModal 
            item={state.selectedItem} 
            modifiersObj={modifiersObj} // (호환성 유지)
            onClose={() => actions.setSelectedItem(null)} 
            onConfirm={handleAddToCartWrapper} 
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

      <PaymentOverlays status={state.paymentStatus} />
    </div>
  );
}