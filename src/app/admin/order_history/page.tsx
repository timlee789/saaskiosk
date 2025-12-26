"use client";
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Order {
    id: string;
    order_number: number;
    total_amount: number;
    status: string;
    table_number: number | null;
    order_type: string;
    created_at: string;
    order_items: any[];
}

export default function OrderHistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]); // 기본값: 오늘
    const [tenantId, setTenantId] = useState<string | null>(null);

    // Supabase 클라이언트
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();

            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id);
                fetchHistory(profile.tenant_id, dateFilter);
            }
        };
        init();
    }, [dateFilter]); // 날짜가 바뀌면 재조회

    const fetchHistory = async (tid: string, date: string) => {
        setLoading(true);

        // 선택한 날짜의 00:00:00 ~ 23:59:59 범위 설정
        const startDate = `${date}T00:00:00`;
        const endDate = `${date}T23:59:59`;

        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('tenant_id', tid)
            .gte('created_at', startDate) // 시작일보다 크거나 같고
            .lte('created_at', endDate)   // 종료일보다 작거나 같음
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setOrders(data as any || []);

        setLoading(false);
    };

    // 총 매출 계산
    const totalSales = orders
        .filter(o => o.status === 'completed') // 완료된 주문만 매출로 집계
        .reduce((sum, order) => sum + order.total_amount, 0);

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-theme(spacing.20))]">

            {/* 헤더 및 컨트롤 */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Sales History</h1>
                    <p className="text-slate-500 mt-1">View past orders and daily revenue.</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <label className="text-sm font-bold text-slate-600 pl-2">Date:</label>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border-none outline-none font-bold text-slate-800 bg-transparent"
                    />
                </div>
            </div>

            {/* 일일 매출 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                    <p className="text-slate-400 font-medium text-sm uppercase">Total Revenue ({dateFilter})</p>
                    <h3 className="text-4xl font-black mt-2">${totalSales.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 font-medium text-sm uppercase">Total Orders</p>
                    <h3 className="text-4xl font-black text-slate-800 mt-2">{orders.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 font-medium text-sm uppercase">Cancelled</p>
                    <h3 className="text-4xl font-black text-red-500 mt-2">
                        {orders.filter(o => o.status === 'cancelled').length}
                    </h3>
                </div>
            </div>

            {/* 주문 내역 테이블 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400">Loading history...</div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No records found for this date.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Time</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Order ID</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Items</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm font-medium text-slate-600">
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-4 text-sm font-mono text-slate-500">
                                            #{order.id.slice(0, 8)}
                                        </td>
                                        <td className="p-4">
                                            {order.table_number ? (
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Table {order.table_number}</span>
                                            ) : (
                                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Take Out</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-700 max-w-xs truncate">
                                            {order.order_items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                          ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-slate-900">
                                            ${order.total_amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}