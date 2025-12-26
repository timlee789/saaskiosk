"use client";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// --- 타입 정의 ---
interface OrderOption {
    name: string;
    price: number;
}

interface OrderItem {
    id: string; // [수정] 고유 키 사용 권장
    item_name: string;
    quantity: number;
    price: number;
    options: OrderOption[] | null;
}

interface Order {
    id: string;
    order_number: number; // [New] 보기 쉬운 짧은 주문 번호 (DB에 없다면 created_at 등으로 대체 가능)
    total_amount: number;
    status: 'pending' | 'cooking' | 'completed' | 'cancelled';
    table_number: number | null;
    order_type: 'eat-in' | 'take-out';
    created_at: string;
    order_items: OrderItem[];
}

export default function AdminOrdersPage() {
    // --- 상태 관리 ---
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'all'>('active');
    const [tenantId, setTenantId] = useState<string | null>(null);

    // 오디오 참조 (알림음)
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Supabase 클라이언트
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    // 1. 초기 로딩: 내 매장 ID 찾기 & 오디오 준비
    useEffect(() => {
        // 간단한 알림음 (Base64 URL) - "띵동" 소리
        audioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id);
                fetchOrders(profile.tenant_id);
                setupRealtimeSubscription(profile.tenant_id);
            }
        };
        init();
    }, []);

    // 2. 주문 데이터 가져오기
    const fetchOrders = async (tid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id,
                    item_name,
                    quantity,
                    price,
                    options
                )
            `)
            .eq('tenant_id', tid) // [중요] 내 매장 주문만!
            .order('created_at', { ascending: false }); // 최신순

        if (error) console.error('Error fetching orders:', error);
        else setOrders(data as any || []);

        setLoading(false);
    };

    // 3. 실시간 구독 설정
    const setupRealtimeSubscription = (tid: string) => {
        const channel = supabase
            .channel('realtime_orders')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tid}` },
                (payload) => {
                    console.log('New order!', payload);
                    playNotificationSound(); // 알림음 재생
                    fetchOrders(tid); // 데이터 갱신
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed (browser policy):", e));
        }
    };

    // 4. 주문 상태 변경 핸들러
    const updateStatus = async (orderId: string, newStatus: string) => {
        // 낙관적 업데이트 (UI 먼저 변경)
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));

        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) {
            alert("Failed to update status");
            if (tenantId) fetchOrders(tenantId); // 실패 시 원복
        }
    };

    // --- 렌더링 헬퍼 ---
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // 필터링 로직
    const filteredOrders = orders.filter(order => {
        if (filterStatus === 'active') return ['pending', 'cooking'].includes(order.status);
        if (filterStatus === 'completed') return ['completed', 'cancelled'].includes(order.status);
        return true;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] bg-gray-100">

            {/* 상단 헤더 & 필터 탭 */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        Kitchen Display System (KDS)
                        {loading && <span className="text-sm font-normal text-gray-400 animate-pulse">Syncing...</span>}
                    </h1>

                    {/* 필터 탭 */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setFilterStatus('active')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Active ({orders.filter(o => ['pending', 'cooking'].includes(o.status)).length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('completed')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'completed' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Completed
                        </button>
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            History
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => tenantId && fetchOrders(tenantId)}
                    className="text-gray-500 hover:text-blue-600 font-bold px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                    ↻ Refresh
                </button>
            </div>

            {/* 주문 목록 영역 (스크롤 가능) */}
            <div className="flex-1 overflow-y-auto p-6">
                {orders.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <p className="text-xl font-bold">No orders yet.</p>
                        <p>Waiting for new orders...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                        {filteredOrders.map((order) => (
                            <div
                                key={order.id}
                                className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden flex flex-col transition-all duration-300
                                    ${order.status === 'pending' ? 'border-red-400 ring-4 ring-red-50' :
                                        order.status === 'cooking' ? 'border-orange-300' : 'border-gray-100 opacity-80'}`}
                            >
                                {/* 카드 헤더 */}
                                <div className={`px-5 py-3 flex justify-between items-start border-b
                                    ${order.status === 'pending' ? 'bg-red-50' :
                                        order.status === 'cooking' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {order.table_number ? (
                                                <span className="bg-slate-800 text-white px-2 py-1 rounded text-lg font-black">
                                                    T-{order.table_number}
                                                </span>
                                            ) : (
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold">
                                                    Take Out
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500 font-mono">
                                                #{order.id.slice(0, 5)}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                            {formatDate(order.created_at)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-black uppercase block mb-1
                                            ${order.status === 'pending' ? 'text-red-600 bg-white' :
                                                order.status === 'cooking' ? 'text-orange-600 bg-white' :
                                                    order.status === 'completed' ? 'text-green-600 bg-green-100' : 'text-gray-500'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>

                                {/* 주문 상세 내용 */}
                                <div className="p-5 flex-1 min-h-[150px]">
                                    <ul className="space-y-4">
                                        {order.order_items.map((item, idx) => (
                                            <li key={idx} className="flex flex-col border-b border-dashed border-gray-100 last:border-0 pb-3 last:pb-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-gray-800 text-lg leading-tight">
                                                        {item.item_name}
                                                    </span>
                                                    <span className="font-black text-slate-900 text-lg ml-3 whitespace-nowrap">
                                                        x {item.quantity}
                                                    </span>
                                                </div>
                                                {/* 옵션 표시 */}
                                                {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                                                    <div className="mt-1 pl-0">
                                                        {item.options.map((opt: any, i: number) => (
                                                            <span key={i} className="text-sm text-gray-500 block">
                                                                + {opt.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* 하단 액션 버튼 */}
                                <div className="p-3 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-2">
                                    {order.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => updateStatus(order.id, 'cancelled')}
                                                className="px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => updateStatus(order.id, 'cooking')}
                                                className="px-4 py-3 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-md active:scale-95 transition-all"
                                            >
                                                Start Cook
                                            </button>
                                        </>
                                    )}

                                    {order.status === 'cooking' && (
                                        <button
                                            onClick={() => updateStatus(order.id, 'completed')}
                                            className="col-span-2 px-4 py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Mark Completed
                                        </button>
                                    )}

                                    {(order.status === 'completed' || order.status === 'cancelled') && (
                                        <div className="col-span-2 text-center py-2 text-gray-400 font-bold text-sm">
                                            Archived
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}