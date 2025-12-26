"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        store_name: '',
        logo_url: '',
        phone: '',
        address: '',
        open_hours: ''
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 초기 데이터 로드
    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('profiles')
                .select('store_name, logo_url, phone, address, open_hours')
                .eq('id', user.id)
                .single();

            if (data) {
                setFormData({
                    store_name: data.store_name || '',
                    logo_url: data.logo_url || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    open_hours: data.open_hours || ''
                });
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    // 저장 핸들러
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('profiles')
                .update(formData)
                .eq('id', user.id);

            if (error) alert("Error saving settings: " + error.message);
            else alert("✅ Settings saved successfully!");
        }
        setSaving(false);
    };

    if (loading) return <div className="p-10">Loading settings...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-black text-slate-900">Store Settings</h1>
                    <Link href="/admin" className="text-blue-600 font-bold hover:underline">← Back to Dashboard</Link>
                </div>

                <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">

                    {/* Store Name */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Store Name</label>
                        <input
                            type="text"
                            value={formData.store_name}
                            onChange={e => setFormData({ ...formData, store_name: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. My Burger Shop"
                        />
                    </div>

                    {/* Logo URL (임시로 텍스트 입력, 추후 이미지 업로드로 변경 가능) */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Logo Image URL</label>
                        <input
                            type="text"
                            value={formData.logo_url}
                            onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="https://..."
                        />
                        <p className="text-xs text-gray-400 mt-1">Paste an image link address here.</p>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. 010-1234-5678"
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. 123 Main St, New York, NY"
                        />
                    </div>

                    {/* Open Hours */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Opening Hours</label>
                        <input
                            type="text"
                            value={formData.open_hours}
                            onChange={e => setFormData({ ...formData, open_hours: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Mon-Sun: 9:00 AM - 10:00 PM"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                </form>
            </div>
        </div>
    );
}