'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface PhonePreviewProps {
  qrDataUrl?: string;
  title?: string;
  url?: string;
}

export default function PhonePreview3D({
  qrDataUrl,
  title = 'Inventory Tag #402',
  url = 'https://app.qrmanager.io/s/inv-402',
}: PhonePreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      style={{ perspective: 1200 }}
      className="flex items-center justify-center p-4 select-none"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX,
          rotateY,
          scale: rotateX !== 0 || rotateY !== 0 ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-[300px] h-[580px] bg-[#17161D] rounded-[44px] p-3 shadow-[0_30px_70px_-20px_rgba(23,22,29,0.35),0_0_0_2px_rgba(255,255,255,0.1)] border-4 border-[#2A2838] overflow-hidden"
      >
        {/* Dynamic Specular Glare */}
        <div
          style={{
            background: `radial-gradient(circle 200px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,${glarePos.opacity}), transparent 70%)`,
          }}
          className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300 rounded-[40px]"
        />

        {/* Inner Phone Screen */}
        <div className="w-full h-full bg-white rounded-[36px] overflow-hidden flex flex-col justify-between p-4 relative z-10">
          {/* Top Notch & Status */}
          <div>
            <div className="flex items-center justify-between px-2 pt-1 pb-3 text-[11px] font-semibold text-gray-800">
              <span>9:41</span>
              {/* Dynamic Island / Notch */}
              <div className="w-20 h-4 bg-black rounded-full" />
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span className="w-4 h-2.5 bg-black rounded-sm inline-block" />
              </div>
            </div>

            {/* Scan Header */}
            <div className="text-center mt-3">
              <span className="text-[10px] font-bold text-brand uppercase tracking-wider bg-brand-soft px-2.5 py-0.5 rounded-full">
                Universal QR OS
              </span>
              <h4 className="font-bold text-ink text-sm mt-1.5">{title}</h4>
              <p className="text-[11px] text-muted truncate max-w-[220px] mx-auto mt-0.5">
                {url}
              </p>
            </div>
          </div>

          {/* QR Code Center Showcase */}
          <div className="flex-1 flex flex-col items-center justify-center my-3">
            <div className="p-3.5 bg-white border border-line rounded-2xl shadow-lg relative group">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-44 h-44 object-contain rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 bg-gray-50 flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
                  Generating QR...
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-success font-medium">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Verified 100% Scan Decodable</span>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="space-y-2">
            <button className="w-full py-2.5 rounded-xl bg-brand text-white font-semibold text-xs shadow-md shadow-brand/20 flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <span>Simulate Scan Destination</span>
            </button>
            <div className="w-24 h-1 bg-gray-300 rounded-full mx-auto" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
