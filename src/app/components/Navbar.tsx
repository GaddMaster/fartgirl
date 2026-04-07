"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Tokenomics", href: "#tokenomics" },
  { label: "Gallery", href: "#gallery" },
  { label: "How to Buy", href: "#how-to-buy" },
  { label: "Community", href: "#community" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md shadow-lg shadow-green-500/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-green-400 group-hover:border-yellow-400 transition-colors">
              <Image
                src="/logo.png"
                alt="FartGirl Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl sm:text-2xl font-black text-green-400 group-hover:text-yellow-400 transition-colors tracking-tight">
              $FARTGIRL
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 lg:px-4 py-2 text-sm font-semibold text-gray-300 hover:text-green-400 transition-colors rounded-lg hover:bg-green-400/10"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#how-to-buy"
              className="ml-3 px-5 py-2.5 bg-gradient-to-r from-green-500 to-yellow-500 text-black font-bold rounded-full text-sm hover:from-green-400 hover:to-yellow-400 transition-all hover:scale-105 shadow-lg shadow-green-500/25"
            >
              Buy Now
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-green-400"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          menuOpen ? "max-h-96 bg-black/95 backdrop-blur-md" : "max-h-0"
        }`}
      >
        <div className="px-4 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-gray-300 hover:text-green-400 hover:bg-green-400/10 rounded-lg font-semibold transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#how-to-buy"
            onClick={() => setMenuOpen(false)}
            className="block text-center mt-3 px-5 py-3 bg-gradient-to-r from-green-500 to-yellow-500 text-black font-bold rounded-full hover:from-green-400 hover:to-yellow-400 transition-all"
          >
            Buy Now
          </a>
        </div>
      </div>
    </nav>
  );
}
