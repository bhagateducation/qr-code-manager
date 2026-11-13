"use client";

import { useEffect } from "react";

const TARGETS = ".section-intro, .tile, .step, .plan, .safe-point, .faq details, .cta, .info-card";

/** Fades sections in as they scroll into view. One observer, CSS does the animation. */
export default function ScrollReveal() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const items = Array.from(document.querySelectorAll<HTMLElement>(TARGETS)).filter((el) => el.getBoundingClientRect().top > innerHeight);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of items) {
      // Stagger siblings in the same row.
      el.style.setProperty("--i", String(Array.prototype.indexOf.call(el.parentElement?.children ?? [], el) % 4));
      el.classList.add("reveal");
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
