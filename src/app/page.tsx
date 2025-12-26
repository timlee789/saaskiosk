"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // [NEW] 수동 입력을 위한 상태값
  const [manualId, setManualId] = useState('');
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    // 1. 로컬 스토리지 확인
    const savedTid = localStorage.getItem('kiosk_tenant_id');

    if (savedTid) {
      console.log("🔄 Found registered store. Redirecting to Kiosk...");
      router.replace(`/kiosk?tid=${savedTid}`);
    } else {
      setChecking(false);
    }
  }, [router]);

  // [NEW] 수동 입력 제출 핸들러
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    // 입력받은 ID로 이동 (이동하면 자동으로 로컬스토리지에 저장됨)
    router.push(`/kiosk?tid=${manualId.trim()}`);
  };

  if (checking) return <div className="h-screen bg-slate-900" />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="text-center space-y-6 max-w-lg w-full">
        <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Kiosk SaaS
        </h1>
        <p className="text-slate-400 text-lg">
          The Future of Restaurant Ordering.
        </p>

        <div className="flex flex-col gap-4 w-full pt-8">
          <Link
            href="/admin"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-xl transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
          >
            👨‍💼 Store Admin Login
          </Link>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">DEVICE SETUP</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-left">
            <h3 className="font-bold text-lg mb-4 text-white">How to setup this Kiosk?</h3>

            <ol className="list-decimal list-inside text-slate-400 space-y-3 text-sm mb-6">
              <li>Scan the QR Code from Admin Dashboard.</li>
              <li>Or enter the <b>Store ID (UUID)</b> manually below.</li>
            </ol>

            {/* [NEW] 수동 입력 토글 및 폼 */}
            {!showInput ? (
              <button
                onClick={() => setShowInput(true)}
                className="text-blue-400 text-sm font-bold hover:underline"
              >
                👉 I don't have a camera (Enter ID manually)
              </button>
            ) : (
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  placeholder="Paste Store ID (e.g. 123e4567-e89b...)"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 text-white focus:border-blue-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualId}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
                >
                  Connect Device
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}