import { Category } from '@/lib/types';

interface Props {
    categories: Category[];
    activeTab: string; // ID값
    onTabChange: (id: string) => void; // ID를 전달
}

export default function CategoryTabs({ categories, activeTab, onTabChange }: Props) {
    return (
        <div className="flex overflow-x-auto bg-white p-2 gap-3 shadow-sm h-24 scrollbar-hide items-center border-b border-gray-200">
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onTabChange(cat.id)} // [중요] 이름을 넘기지 않고 ID를 넘깁니다.
                    className={`flex-shrink-0 px-6 h-14 rounded-full text-xl font-extrabold transition-all duration-200 border-2
            ${activeTab === cat.id
                            ? 'bg-red-600 text-white border-red-600 shadow-md scale-105' // Active: Red Style
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300' // Inactive
                        }`}
                >
                    {/* 화면에 보여지는 이름 (특정 카테고리명 변경 로직 유지) */}
                    {cat.name === "Plates & Salads" ? "Salads" : cat.name}
                </button>
            ))}
        </div>
    );
}