// src/components/kiosk/modals/StoreInfoModal.tsx
import { motion } from 'framer-motion';
import { StoreInfo } from '@/lib/types';

interface Props {
    info: StoreInfo;
    onClose: () => void;
}

export default function StoreInfoModal({ info, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-[500px] p-8 rounded-3xl shadow-2xl relative text-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 로고 */}
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                    {info.logo_url ? (
                        <img src={info.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl">🏪</span>
                    )}
                </div>

                <h2 className="text-3xl font-black text-gray-900 mb-6">{info.store_name}</h2>

                <div className="space-y-4 text-left bg-gray-50 p-6 rounded-2xl">
                    {/* 주소 */}
                    <div className="flex gap-3 items-start">
                        <span className="text-xl">📍</span>
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm uppercase">Address</h4>
                            <p className="text-gray-600">{info.address || "Address not available"}</p>
                        </div>
                    </div>

                    {/* 전화번호 */}
                    <div className="flex gap-3 items-start">
                        <span className="text-xl">📞</span>
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm uppercase">Phone</h4>
                            <p className="text-gray-600">{info.phone || "No phone number"}</p>
                        </div>
                    </div>

                    {/* 영업시간 */}
                    <div className="flex gap-3 items-start">
                        <span className="text-xl">⏰</span>
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm uppercase">Hours</h4>
                            <p className="text-gray-600">{info.open_hours || "Open hours not set"}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-6 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
                >
                    Close
                </button>

            </motion.div>
        </div>
    );
}