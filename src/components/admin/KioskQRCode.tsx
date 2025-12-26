"use client";
import { QRCodeSVG } from 'qrcode.react';

export default function KioskQRCode({ url }: { url: string }) {
    return (
        <div className="flex flex-col items-center">
            <QRCodeSVG value={url} size={150} />
            <span className="text-xs text-gray-400 mt-2 font-bold">SCAN ME</span>
        </div>
    );
}