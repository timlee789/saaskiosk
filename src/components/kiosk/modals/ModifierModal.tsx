"use client";
import { useState, useEffect } from 'react';
import { MenuItem, ModifierGroup, ModifierOption } from '@/lib/types';

interface Props {
    item: MenuItem;
    modifiersObj?: { [key: string]: ModifierGroup }; // 호환성 유지용 (사용 안함)
    onClose: () => void;
    onConfirm: (item: MenuItem, selectedOptions: ModifierOption[]) => void;
}

export default function ModifierModal({ item, onClose, onConfirm }: Props) {
    // 선택된 옵션 상태: { "그룹ID": [선택된옵션객체들] }
    const [selectedOptions, setSelectedOptions] = useState<Record<string, ModifierOption[]>>({});
    const [currentTotal, setCurrentTotal] = useState(item.price);
    const [isClosing, setIsClosing] = useState(false);

    // 가격 실시간 계산
    useEffect(() => {
        let optionTotal = 0;
        Object.values(selectedOptions).forEach((opts) => {
            opts.forEach((opt) => {
                optionTotal += opt.price;
            });
        });
        setCurrentTotal(item.price + optionTotal);
    }, [selectedOptions, item.price]);

    // ⚠️ [개선된 로직] DB 설정(max_selection)에 따른 자동 분기 처리
    const toggleOption = (group: ModifierGroup, option: ModifierOption) => {
        setSelectedOptions((prev) => {
            const currentSelected = prev[group.id] || [];
            const isAlreadySelected = currentSelected.find((o) => o.id === option.id);

            // 1. 이미 선택된 경우 -> 해제
            if (isAlreadySelected) {
                // 단일 선택 필수(Required)인 경우 해제 불가능하게 하려면 여기서 return prev; 하면 됩니다.
                // 현재는 자유롭게 해제 가능 (Add to Order 시점에 유효성 검사)
                return {
                    ...prev,
                    [group.id]: currentSelected.filter((o) => o.id !== option.id),
                };
            }

            // 2. 새로 선택하는 경우
            if (group.max_selection === 1) {
                // ✅ 단일 선택 (Radio): 기존 것 제거하고 새것 선택 (밀크쉐이크 로직 대체 가능)
                return {
                    ...prev,
                    [group.id]: [option],
                };
            } else {
                // ✅ 다중 선택 (Checkbox): 최대 개수 체크
                if (currentSelected.length >= group.max_selection) {
                    // 최대 개수 초과 시 추가 안됨 (필요시 alert)
                    return prev;
                }
                return {
                    ...prev,
                    [group.id]: [...currentSelected, option],
                };
            }
        });
    };

    // 장바구니 담기 전 유효성 검사
    const handleAddToCart = () => {
        // DB에 설정된 필수 옵션 그룹 체크 (이름 하드코딩 없이 모든 메뉴 대응 가능!)
        const groups = item.modifier_groups || [];

        for (const group of groups) {
            const selectedCount = selectedOptions[group.id]?.length || 0;

            // 필수인데 선택 안했거나, 최소 개수보다 적게 선택한 경우
            if (group.is_required && selectedCount < group.min_selection) {
                alert(`⚠️ Please select at least ${group.min_selection} option(s) for "${group.name}".`);

                // 해당 그룹 위치로 스크롤 (UX)
                const element = document.getElementById(`group-${group.id}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        }

        // 모든 옵션을 하나의 배열로 합쳐서 전달
        const flatOptions: ModifierOption[] = [];
        Object.values(selectedOptions).forEach(opts => flatOptions.push(...opts));

        onConfirm(item, flatOptions);
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
                className={`bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-all duration-200 
        ${isClosing ? 'opacity-0 scale-95' : 'animate-in fade-in zoom-in'}`}
            >
                {/* 헤더 */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-800">{item.name}</h2>
                        <p className="text-gray-500 text-sm mt-1">Select your options</p>
                    </div>
                    <span className="text-2xl text-red-600 font-bold">${currentTotal.toFixed(2)}</span>
                </div>

                {/* 옵션 스크롤 영역 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                    {(!item.modifier_groups || item.modifier_groups.length === 0) && (
                        <p className="text-center text-gray-400 py-10">No options available for this item.</p>
                    )}

                    {item.modifier_groups?.map((group) => {
                        // 2열 그리드 여부 (옵션이 많거나 이름이 짧은 Add-on류)
                        const isGrid = group.modifiers.length > 4 || group.name.toLowerCase().includes('add');

                        return (
                            <div key={group.id} id={`group-${group.id}`}>
                                <h3 className="text-lg font-bold mb-3 text-gray-700 border-l-4 border-red-500 pl-3 uppercase flex justify-between">
                                    <span>{group.name}</span>
                                    {group.is_required && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">REQUIRED</span>}
                                </h3>

                                <div className={`grid gap-3 ${isGrid ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {group.modifiers.map((option) => {
                                        const isSelected = selectedOptions[group.id]?.some(o => o.id === option.id);

                                        return (
                                            <div
                                                key={option.id}
                                                onClick={() => toggleOption(group, option)}
                                                className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all
                            ${isSelected
                                                        ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                                                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 shrink-0
                            ${isSelected ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}`}
                                                >
                                                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                                </div>

                                                <span className={`text-lg font-medium flex-1 ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {option.name}
                                                </span>

                                                {option.price > 0 && (
                                                    <span className="text-red-600 font-semibold ml-2">+${option.price.toFixed(2)}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 하단 버튼 */}
                <div className="p-6 border-t bg-white flex gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={handleClose}
                        className="flex-1 bg-gray-200 text-gray-700 text-xl font-bold rounded-xl h-16 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddToCart}
                        className="flex-[2] bg-red-600 text-white text-xl font-bold rounded-xl h-16 hover:bg-red-700 shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                        Add to Order <span className="text-red-200 text-lg">| ${currentTotal.toFixed(2)}</span>
                    </button>
                </div>

            </div>
        </div>
    );
}