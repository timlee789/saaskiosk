"use client";
import { useState } from 'react';
import { MenuItem } from '@/lib/types';

interface ItemCardProps {
  item: MenuItem;
  onClick: () => void;
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
  const [imageError, setImageError] = useState(false);

  // 품절이면 클릭 막기
  const handleClick = () => {
    if (!item.is_sold_out) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group bg-white rounded-3xl shadow-sm overflow-hidden transition-all duration-300 border border-gray-200 flex flex-col h-full
        ${item.is_sold_out
          ? 'opacity-60 cursor-not-allowed grayscale'
          : 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:border-red-100'}`}
    >
      {/* 1. 이미지 영역 (1:1 비율) */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden shrink-0">
        {item.image_url && !imageError ? ( // [수정] image -> image_url
          <img
            src={item.image_url}
            alt={item.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
            {/* 아이콘 크기 조정 및 색상 변경 */}
            <span className="text-6xl mb-2 opacity-30">🍽️</span>
          </div>
        )}

        {/* 품절 덮개 */}
        {item.is_sold_out && ( // [수정] !is_available -> is_sold_out
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <span className="text-white font-black text-xl border-4 border-white px-4 py-2 rounded-lg uppercase tracking-widest transform -rotate-12">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* 2. 텍스트 정보 영역 */}
      <div className="p-5 flex flex-col flex-1 bg-white">
        {/* 이름 */}
        <h3 className="font-extrabold text-xl text-gray-900 mb-2 leading-tight line-clamp-2">
          {item.name}
        </h3>

        {/* 설명 (존재할 때만 표시) */}
        {item.description && (
          <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2 mt-auto">
            {item.description}
          </p>
        )}
      </div>

      {/* 3. 가격 영역 */}
      <div className={`px-5 py-4 border-t border-gray-100 flex justify-between items-center transition-colors
          ${item.is_sold_out ? 'bg-gray-50' : 'bg-gray-50 group-hover:bg-red-50'}`}>
        <span className={`text-xs font-bold uppercase tracking-wider transition-colors
          ${item.is_sold_out ? 'text-gray-400' : 'text-gray-400 group-hover:text-red-400'}`}>
          {item.is_sold_out ? 'Unavailable' : 'Order Now'}
        </span>
        <span className={`font-black text-2xl transition-colors
           ${item.is_sold_out ? 'text-gray-400' : 'text-gray-800 group-hover:text-red-600'}`}>
          ${item.price.toFixed(2)}
        </span>
      </div>
    </div>
  );
}