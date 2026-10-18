"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Languages } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-xl bg-slate-950/80 p-0.5 border border-slate-800 text-xs shadow-inner ${className}`}
      role="group"
      aria-label="Language Switcher"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
          locale === "en"
            ? "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-950"
            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
        }`}
        title="Switch to English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLocale("si")}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
          locale === "si"
            ? "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-950"
            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
        }`}
        title="සිංහල භාෂාවට මාරු වන්න (Switch to Sinhala)"
      >
        <span>🇱🇰</span>
        <span>සිංහල</span>
      </button>
    </div>
  );
}
