'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCodeLib from 'qrcode';
import PhonePreview3D from '@/components/ui/PhonePreview3D';
import {
  Download,
  Share2,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Palette,
  Shield,
  Layers,
} from 'lucide-react';

export default function QRStudioTab() {
  const [title, setTitle] = useState('Inventory Asset Tag #402');
  const [targetUrl, setTargetUrl] = useState('https://rosybrown-narwhal-127133.hostingersite.com/s/inv-402');
  const [fgColor, setFgColor] = useState('#17161D');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [ecLevel, setEcLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate QR image data url in real time
  useEffect(() => {
    async function generate() {
      try {
        setIsGenerating(true);
        const url = await QRCodeLib.toDataURL(targetUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: ecLevel,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR generation error:', err);
      } finally {
        setIsGenerating(false);
      }
    }
    generate();
  }, [targetUrl, fgColor, bgColor, ecLevel]);

  const handleDownload = (format: 'png' | 'svg') => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-qr.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presetColors = [
    { label: 'Obsidian', hex: '#17161D' },
    { label: 'Electric Purple', hex: '#5B43D6' },
    { label: 'Emerald Forest', hex: '#16794B' },
    { label: 'Crimson Amber', hex: '#B43B47' },
    { label: 'Deep Indigo', hex: '#3B49DF' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      {/* Left Configuration Column (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Studio Header Card */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-ink tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand" />
              <span>QR Studio & Vector Generator</span>
            </h2>
            <p className="text-xs text-muted mt-1">
              Real-time vector rendering, error correction, and 3D preview inspection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Synced</span>
            </span>
          </div>
        </div>

        {/* Payload & Destination Card */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <span>1. Payload & Dynamic Target</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">QR Asset Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-line text-xs text-ink bg-page focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Dynamic Redirect URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-line text-xs text-ink bg-page focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-2xl border border-line hover:border-brand text-xs font-semibold text-ink hover:text-brand transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1">
              Target destination can be edited anytime without re-printing physical QR codes.
            </p>
          </div>
        </div>

        {/* Visual Styling Card */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-5">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Palette className="w-4 h-4 text-brand" />
            <span>2. Visual Styling & Color Swatches</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-ink mb-2">Preset Brand Colors</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {presetColors.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setFgColor(color.hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-medium transition-all ${
                    fgColor === color.hex
                      ? 'border-brand bg-brand-soft text-brand font-bold shadow-sm'
                      : 'border-line hover:border-gray-300'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.hex }} />
                  <span>{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Custom Foreground</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-line p-0.5"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-mono uppercase"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Background Fill</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-line p-0.5"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Correction & Redundancy */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand" />
            <span>3. Error Correction Level (Reed-Solomon)</span>
          </h3>

          <div className="grid grid-cols-4 gap-2.5">
            {[
              { level: 'L', label: 'Low (7%)', desc: 'Dense data' },
              { level: 'M', label: 'Medium (15%)', desc: 'Recommended' },
              { level: 'Q', label: 'Quartile (25%)', desc: 'Heavy wear' },
              { level: 'H', label: 'High (30%)', desc: 'Logo embed' },
            ].map((item) => (
              <button
                key={item.level}
                onClick={() => setEcLevel(item.level as 'L' | 'M' | 'Q' | 'H')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  ecLevel === item.level
                    ? 'border-brand bg-brand-soft text-brand font-bold shadow-sm'
                    : 'border-line hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-extrabold">{item.level}</div>
                <div className="text-[11px] font-semibold mt-0.5">{item.label}</div>
                <div className="text-[10px] text-muted mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Download & Export Card */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft flex items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-ink">Export High-Resolution Assets</h4>
            <p className="text-xs text-muted">Ready for print, packaging, digital screens, or laser etching</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('png')}
              className="px-5 py-2.5 rounded-2xl bg-brand text-white font-bold text-xs shadow-md shadow-brand/20 hover:bg-[#4d36bd] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PNG (512px)</span>
            </button>
            <button
              onClick={() => handleDownload('svg')}
              className="px-5 py-2.5 rounded-2xl border border-line hover:border-brand font-bold text-xs text-ink hover:text-brand active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Vector SVG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: 3D Interactive Phone Preview (5 cols) */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="sticky top-24 w-full">
          <div className="text-center mb-3">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Interactive 3D Device Inspection
            </span>
          </div>
          <PhonePreview3D qrDataUrl={qrDataUrl} title={title} url={targetUrl} />
        </div>
      </div>
    </motion.div>
  );
}
