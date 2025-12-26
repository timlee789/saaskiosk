import { MenuItem } from '@/lib/types';
import ItemCard from './ItemCard';

interface Props {
    items: MenuItem[];
    onItemClick: (item: MenuItem) => void;
}

export default function MenuGrid({ items, onItemClick }: Props) {
    // 아이템이 없을 경우
    if (items.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center pt-20 text-gray-400">
                <span className="text-6xl mb-4 grayscale opacity-30">🍽️</span>
                <p className="text-2xl font-bold">No items available.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100 scrollbar-hide">
            {/* 반응형 그리드 설정:
        - 기본: 2열 (작은 화면)
        - lg (큰 화면): 3열
        - xl (아주 큰 화면): 4열
        - 2xl (초대형 화면): 5열
        이렇게 하면 화면 크기에 따라 카드가 예쁘게 배열됩니다.
      */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 content-start pb-32">
                {items.map((item, index) => (
                    <ItemCard
                        key={`${item.id}-${index}`}
                        item={item}
                        onClick={() => onItemClick(item)}
                    />
                ))}
            </div>
        </div>
    );
}