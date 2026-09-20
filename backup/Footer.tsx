'use client';

import React from 'react';

import {
  Instagram,
  Facebook,
  MessageCircle,
  Music2,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer
      className="relative w-full overflow-hidden border-t py-5"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
        borderColor: 'var(--bora-border)',
      }}
    >
      {/* TINGA TEXTURE */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-[250px] w-full"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
          WebkitMaskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0) 90%)',
          maskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0) 90%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* BRAND */}
        <div className="flex flex-col items-center text-center">
          <h3 className="text-lg font-black uppercase italic tracking-tighter">
            BORA
            <span style={{ color: 'var(--bora-gold)' }}>.</span>
          </h3>

          <p
            className="mt-1 font-mono text-[8px] uppercase tracking-[0.3em]"
            style={{
              color: 'var(--bora-red)',
            }}
          >
            BORA SOFTWARES
          </p>
        </div>

        {/* NAVIGATION */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a
            href="/"
            className="text-[9px] font-bold uppercase tracking-[0.16em] transition-colors"
            style={{
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
            }}
          >
            Navigation
          </a>

          <span
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            •
          </span>

          <a
            href="/Faq"
            className="text-[9px] font-bold uppercase tracking-[0.16em] transition-colors"
            style={{
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
            }}
          >
            FAQs
          </a>

          <span
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            •
          </span>

          <a
            href="/#top20"
            className="text-[9px] font-bold uppercase tracking-[0.16em] transition-colors"
            style={{
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
            }}
          >
            Charts
          </a>

          <span
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            •
          </span>

          <a
            href="/Faq"
            className="text-[9px] font-bold uppercase tracking-[0.16em] transition-colors"
            style={{
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
            }}
          >
            Disclaimer
          </a>
        </div>

        {/* SOCIALS */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <a
            href="#"
            aria-label="Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200"
            style={{
              borderColor: 'var(--bora-border-strong)',
              backgroundColor:
                'color-mix(in srgb, var(--bora-text) 3%, transparent)',
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
              event.currentTarget.style.borderColor =
                'var(--bora-gold)';
              event.currentTarget.style.backgroundColor =
                'var(--bora-gold-glow)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
              event.currentTarget.style.borderColor =
                'var(--bora-border-strong)';
              event.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--bora-text) 3%, transparent)';
            }}
          >
            <Instagram size={19} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            aria-label="TikTok"
            className="flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200"
            style={{
              borderColor: 'var(--bora-border-strong)',
              backgroundColor:
                'color-mix(in srgb, var(--bora-text) 3%, transparent)',
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
              event.currentTarget.style.borderColor =
                'var(--bora-gold)';
              event.currentTarget.style.backgroundColor =
                'var(--bora-gold-glow)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
              event.currentTarget.style.borderColor =
                'var(--bora-border-strong)';
              event.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--bora-text) 3%, transparent)';
            }}
          >
            <Music2 size={19} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            aria-label="WhatsApp"
            className="flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200"
            style={{
              borderColor: 'var(--bora-border-strong)',
              backgroundColor:
                'color-mix(in srgb, var(--bora-text) 3%, transparent)',
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
              event.currentTarget.style.borderColor =
                'var(--bora-gold)';
              event.currentTarget.style.backgroundColor =
                'var(--bora-gold-glow)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
              event.currentTarget.style.borderColor =
                'var(--bora-border-strong)';
              event.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--bora-text) 3%, transparent)';
            }}
          >
            <MessageCircle size={19} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            aria-label="Facebook"
            className="flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200"
            style={{
              borderColor: 'var(--bora-border-strong)',
              backgroundColor:
                'color-mix(in srgb, var(--bora-text) 3%, transparent)',
              color: 'var(--bora-text-muted)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
              event.currentTarget.style.borderColor =
                'var(--bora-gold)';
              event.currentTarget.style.backgroundColor =
                'var(--bora-gold-glow)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
              event.currentTarget.style.borderColor =
                'var(--bora-border-strong)';
              event.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--bora-text) 3%, transparent)';
            }}
          >
            <Facebook size={19} strokeWidth={1.8} />
          </a>
        </div>

        {/* DIVIDER */}
        <div
          className="mx-auto mt-5 mb-3 h-px w-16 md:w-full"
          style={{
            backgroundColor: 'var(--bora-border)',
          }}
        />

        {/* COPYRIGHT */}
        <div className="flex items-center justify-center">
          <span
            className="whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.2em] glow-red"
            style={{
              color: 'var(--bora-red)',
            }}
          >
            © 2026 BORA SOFTWARES
          </span>
        </div>
      </div>
    </footer>
  );
}