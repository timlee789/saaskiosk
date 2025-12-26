import { motion, AnimatePresence } from 'framer-motion';
import { CartItem, ModifierOption } from '@/lib/types';
import { RefObject } from 'react';

// [중요] useKioskLogic에서 사용하는 확장된 CartItem 타입과 일치시켜야 합니다.
interface ExtendedCartItem extends CartItem {
    uniqueCartId: string;
    selectedModifiers: ModifierOption[];
    totalPrice: number;
    groupId?: string;
}

interface Totals {
    subtotal: number;
    tax: number;
    cardFee: number;
    grandTotal: number;
}

interface Props {
    cart: ExtendedCartItem[];
    totals: Totals;
    onRemove: (uniqueId: string) => void;
    onClear: () => void;
    onPayClick: () => void;
    cartEndRef: RefObject<HTMLDivElement>; // 타입 단순화
}

export default function CartSidebar({ cart, totals, onRemove, onClear, onPayClick, cartEndRef }: Props) {
    return (
        <div className="w-[30%] bg-white flex flex-col h-full shadow-2xl z-20">
            {/* 1. 헤더 영역 */}
            <div className="p-6 bg-gray-900 text-white shadow-md flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-3xl font-extrabold">Order List</h2>
                    <p className="text-gray-300 text-lg">{cart.length} items</p>
                </div>
                {cart.length > 0 && (
                    <button
                        onClick={onClear}
                        className="text-base text-red-300 hover:text-white underline font-bold transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* 2. 장바구니 리스트 영역 (스크롤 가능) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                <AnimatePresence initial={false} mode='popLayout'>
                    {cart.map((cartItem) => (
                        <motion.div
                            key={cartItem.uniqueCartId}
                            layout
                            initial={{ opacity: 0, y: -50, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-row gap-3 relative z-0"
                        >
                            {/* 아이템 정보 */}
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-extrabold text-xl text-gray-900 leading-tight">
                                        {cartItem.name}
                                    </h4>
                                </div>

                                {/* 선택된 옵션 표시 */}
                                {cartItem.selectedModifiers && cartItem.selectedModifiers.length > 0 && (
                                    <div className="mt-2 text-base text-gray-600 font-medium bg-gray-50 p-2 rounded-lg">
                                        {cartItem.selectedModifiers.map((opt, i) => (
                                            <span key={i} className="block">
                                                + {opt.name} {opt.price > 0 && `($${opt.price.toFixed(2)})`}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* 개별 가격 */}
                                <div className="mt-3 font-black text-gray-900 text-2xl">
                                    ${cartItem.totalPrice.toFixed(2)}
                                </div>
                            </div>

                            {/* 삭제 버튼 */}
                            <div className="flex flex-col justify-center border-l pl-4 border-gray-100">
                                <button
                                    onClick={() => onRemove(cartItem.uniqueCartId)}
                                    className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {/* 자동 스크롤을 위한 더미 div */}
                <div ref={cartEndRef} />
            </div>

            {/* 3. 푸터 영역 (총액 계산 및 결제 버튼) */}
            <div className="p-6 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0">
                <div className="space-y-2 mb-4 text-gray-600 font-medium">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Sales Tax (7%)</span>
                        <span>${totals.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Card Fee (3%)</span>
                        <span>${totals.cardFee.toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4 pt-4 border-t border-gray-200">
                    <span className="text-2xl font-bold text-gray-800">Total</span>
                    <span className="text-4xl font-black text-red-600">${totals.grandTotal.toFixed(2)}</span>
                </div>

                <button
                    className="w-full h-24 bg-green-600 text-white text-4xl font-black rounded-2xl hover:bg-green-700 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onPayClick}
                    disabled={cart.length === 0}
                >
                    Pay Now
                </button>
            </div>
        </div>
    );
}