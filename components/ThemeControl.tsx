"use client";

import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";

const themes = [
  { id: "violet", color: "#7660dc" },
  { id: "blue", color: "#4289df" },
  { id: "emerald", color: "#219c88" },
  { id: "rose", color: "#d86095" },
];
/** Accent + light/dark picker. Saved per browser; the layout script applies it before paint. */
export default function ThemeControl() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("violet");
  const [mode, setMode] = useState("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "violet");
    setMode(document.documentElement.dataset.mode || "light");
  }, []);
  const apply = (key: "theme" | "mode", value: string) => {
    document.documentElement.dataset[key] = value;
    try {
      localStorage.setItem(`qrm-${key}`, value);
    } catch {}
    if (key === "theme") setTheme(value);
    else setMode(value);
  };
  const controls = (
    <>
      <small>Accent colour</small>
      <div className="swatches">
        {themes.map((item) => (
          <button key={item.id} type="button" className="swatch" style={{ background: item.color }} aria-label={`${item.id} theme`} aria-pressed={theme === item.id} onClick={() => apply("theme", item.id)} />
        ))}
      </div>
      <small>Appearance</small>
      <div className="segmented" style={{ marginTop: 8, display: "flex" }}>
        {["light", "dark"].map((value) => (
          <button key={value} type="button" className="grow" aria-pressed={mode === value} onClick={() => apply("mode", value)} style={{ textTransform: "capitalize" }}>
            {value}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <div className="popover-wrap" onKeyDown={(event) => event.key === "Escape" && setOpen(false)} onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}>
      <button type="button" className="icon-button" aria-label="Theme and appearance" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <Palette size={18} /> : mode === "dark" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
        {open && (
          <div className="popover">
            {controls}
          </div>
        )}
    </div>
  );
}
