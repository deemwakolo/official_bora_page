'use client';

import { motion, useReducedMotion } from 'framer-motion';

import type { LucideIcon } from 'lucide-react';

// BORA MOTION EASE: sawa na --bora-motion-ease kwenye globals.css.
const BORA_EASE = [0.22, 1, 0.36, 1] as const;

interface RoomOptionProps {
  label: string;
  description: string;
  icon: LucideIcon;
  index: number;
  dimmed?: boolean;
  selected?: boolean;
  onClick: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

/*
 * BORA ROOM OPTION
 * Hakuna card, hakuna border, hakuna box.
 * Icon ndiyo interactive anchor; whitespace ni sehemu ya design.
 */
export default function RoomOption({
  label,
  description,
  icon: Icon,
  index,
  dimmed = false,
  selected = false,
  onClick,
  onHoverStart,
  onHoverEnd,
}: RoomOptionProps) {
  const reduceMotion = useReducedMotion();

  return (
    /* ENTRANCE WRAPPER: staggered, subtle.
       IMPORTANT: `initial` haibadiliki kwa reduced-motion — tunabadilisha
       duration/delay pekee. Sababu: useReducedMotion() inasoma client-only
       module value, hivyo initial tofauti inasababisha SSR hydration mismatch. */
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reduceMotion ? 0 : 0.18 + index * 0.07,
        duration: reduceMotion ? 0 : 0.55,
        ease: BORA_EASE,
      }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        onFocus={onHoverStart}
        onBlur={onHoverEnd}
        aria-label={`Enter ${label} room`}
        animate={{ opacity: dimmed ? 0.35 : 1 }}
        whileHover={reduceMotion ? undefined : { y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          duration: reduceMotion ? 0 : 0.34,
          ease: BORA_EASE,
        }}
        className="group relative flex w-full items-center justify-center gap-4 py-3.5 outline-none"
      >
        {/* GOLD GLOW — inawaka kwenye hover / selection */}
        <span
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 h-16 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-opacity duration-500 ${
            selected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{
            background:
              'radial-gradient(circle, var(--bora-gold-glow), transparent 70%)',
          }}
        />

        <Icon
          size={22}
          strokeWidth={1.5}
          className={`relative transition-all duration-300 ${
            selected
              ? 'scale-110 text-[color:var(--bora-gold)]'
              : 'text-[color:var(--bora-text-muted)] group-hover:scale-110 group-hover:text-[color:var(--bora-gold)]'
          }`}
        />

        <span className="relative flex flex-col text-left">
          <span
            className={`font-cinzel text-sm font-black uppercase tracking-[0.16em] transition-colors duration-300 ${
              selected
                ? 'text-[color:var(--bora-gold)]'
                : 'text-[color:var(--bora-text)] group-hover:text-[color:var(--bora-gold)]'
            }`}
          >
            {label}
          </span>

          <span className="mt-1 text-[7px] font-bold uppercase tracking-[0.18em] text-[color:var(--bora-text-muted)] opacity-60">
            {description}
          </span>
        </span>
      </motion.button>
    </motion.div>
  );
}
