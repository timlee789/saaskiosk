import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    status: 'idle' | 'processing' | 'success' | 'failed'; // 'failed' 상태 추가 (확장성 고려)
}

export default function PaymentOverlay({ status }: Props) {
    // idle 상태면 아무것도 렌더링하지 않음
    if (status === 'idle') return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <AnimatePresence mode='wait'>

                {/* 1. 결제 진행 중 (로딩 화면) */}
                {status === 'processing' && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[600px] text-center"
                    >
                        {/* 로딩 스피너 아이콘 */}
                        <div className="mb-6 animate-spin">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-blue-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </div>

                        <h2 className="text-4xl font-black text-gray-900 mb-4">Processing...</h2>
                        <p className="text-2xl text-gray-600">
                            Please follow the instructions<br />on the <b>Card Reader</b>.
                        </p>
                    </motion.div>
                )}

                {/* 2. 결제 성공 화면 */}
                {status === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center w-[600px] text-center"
                    >
                        {/* 체크 아이콘 */}
                        <div className="mb-4 bg-green-100 rounded-full p-6">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-20 h-20 text-green-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>

                        <h2 className="text-5xl font-black text-gray-900 mb-2">Thank You!</h2>
                        <p className="text-2xl text-gray-500 mb-6">
                            Payment Complete.
                        </p>

                        {/* 영수증 안내 박스 */}
                        <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-3xl w-full shadow-md">
                            <p className="text-xl text-gray-800 font-bold leading-tight mb-2">
                                🥤 If you ordered a Drink,
                            </p>
                            <p className="text-2xl text-blue-800 font-black leading-tight">
                                Please <span className="text-red-600 underline decoration-4 underline-offset-4">SHOW YOUR RECEIPT</span><br />
                                to the Cashier to get a cup.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}