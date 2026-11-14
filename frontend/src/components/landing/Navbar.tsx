"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, Zap } from "lucide-react";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "Comparison", href: "#comparison" },
  { label: "Industries", href: "#industries" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-zinc-800/90 bg-[#09090B]/90 shadow-[0_8px_32px_rgba(0,0,0,0.65)] backdrop-blur-xl"
          : "border-b border-zinc-800/40 bg-[#09090B]/70 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 shadow-[0_0_18px_rgba(132,204,22,0.2)] transition-transform duration-300 group-hover:scale-105">
            <Zap className="h-5 w-5 text-[#84CC16]" />
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#84CC16] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#A3E635]" />
            </span>
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Star<span className="text-[#84CC16]">Eleven</span>
            </span>
            <span className="ml-2 hidden rounded border border-zinc-800 bg-[#121215] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 sm:inline-block">
              Agent OS
            </span>
          </div>
        </Link>

        {/* Desktop Section Links */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-semibold tracking-wide text-zinc-400 transition-colors hover:text-[#A3E635]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Auth CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl border border-zinc-800 bg-[#121215] px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-700 hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/register?plan=byok_free&interval=annual"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-bold text-[#09090B] shadow-[0_0_22px_rgba(132,204,22,0.28)] transition-all hover:bg-[#A3E635]"
          >
            <span>Get Started Free</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] p-2 text-zinc-300 hover:border-[#84CC16]/50 hover:text-white md:hidden"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-zinc-800 bg-[#09090B] px-4 py-5 md:hidden">
          <nav className="flex flex-col space-y-3">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-[#A3E635]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] py-2.5 text-xs font-semibold text-zinc-200"
            >
              Sign In
            </Link>
            <Link
              href="/register?plan=byok_free&interval=annual"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1 rounded-xl bg-[#84CC16] py-2.5 text-xs font-bold text-[#09090B]"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}