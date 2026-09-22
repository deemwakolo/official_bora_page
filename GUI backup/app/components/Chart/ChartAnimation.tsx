'use client';

import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
} from 'lucide-react';

interface ChartAnimationProps {
  currentRank: number;
  previousRank?: number | null;
  isNew?: boolean;
  isOvertaking?: boolean;
}

// RANK MOVEMENT + OVERTAKE ANIMATION COMPONENT
export default function ChartAnimation({
  currentRank,
  previousRank,
  isNew = false,
  isOvertaking = false,
}: ChartAnimationProps) {

  // KUHESABU KAMA WIMBO UMEPANDA, UMESHUKA AU UMEBAKI
  const movement =
    previousRank == null
      ? 'same'
      : currentRank < previousRank
        ? 'up'
        : currentRank > previousRank
          ? 'down'
          : 'same';

  // KIASI CHA NAFASI AMBAZO WIMBO UMEPANDA AU KUSHUKA
  const movementAmount =
    previousRank != null
      ? Math.abs(previousRank - currentRank)
      : 0;

  // WIMBO MPYA KWENYE CHART
  if (isNew) {
    return (
      <div className="flex items-center gap-1.5 animate-chart-new">
        <Zap
          size={11}
          strokeWidth={2}
          className="text-[#D4AF37]"
        />

        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-[#D4AF37]">
          NEW
        </span>
      </div>
    );
  }

  // WIMBO UMEPANDA
  if (movement === 'up') {
    return (
      <div
        className={`flex items-center gap-1.5 ${
          isOvertaking
            ? 'animate-chart-overtake'
            : 'animate-chart-rise'
        }`}
      >
        <ArrowUp
          size={12}
          strokeWidth={2.5}
          className="text-[#D4AF37]"
        />

        <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#D4AF37]">
          +{movementAmount}
        </span>
      </div>
    );
  }

  // WIMBO UMEANGUKA
  if (movement === 'down') {
    return (
      <div className="flex items-center gap-1.5 animate-chart-fall">
        <ArrowDown
          size={12}
          strokeWidth={2.5}
          className="text-red-500"
        />

        <span className="text-[8px] font-black uppercase tracking-[0.12em] text-red-500">
          -{movementAmount}
        </span>
      </div>
    );
  }

  // WIMBO UMEBAKI KWENYE NAFASI HIYO HIYO
  return (
    <div className="flex items-center gap-1.5 text-white/20">
      <Minus
        size={11}
        strokeWidth={2}
      />

      <span className="text-[8px] font-black uppercase tracking-[0.12em]">
        —
      </span>
    </div>
  );
}

// ANIMATION YA WIMBO MPYA
// Inaonekana kama signal fupi ya kuingia kwenye chart
const chartAnimationStyles = `
  @keyframes chartNew {
    0% {
      opacity: 0;
      transform: translateX(-8px) scale(0.9);
    }

    40% {
      opacity: 1;
      transform: translateX(0) scale(1.05);
    }

    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  @keyframes chartRise {
    0% {
      opacity: 0;
      transform: translateY(6px);
    }

    35% {
      opacity: 1;
      transform: translateY(-3px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes chartFall {
    0% {
      opacity: 0;
      transform: translateY(-6px);
    }

    35% {
      opacity: 1;
      transform: translateY(3px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes chartOvertake {
    0% {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }

    25% {
      opacity: 1;
      transform: translateY(-5px) scale(1.04);
    }

    55% {
      transform: translateY(2px) scale(1.01);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-chart-new {
    animation: chartNew 700ms ease-out both;
  }

  .animate-chart-rise {
    animation: chartRise 600ms ease-out both;
  }

  .animate-chart-fall {
    animation: chartFall 600ms ease-out both;
  }

  .animate-chart-overtake {
    animation: chartOvertake 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
`;

export function ChartAnimationStyles() {
  return <style jsx global>{chartAnimationStyles}</style>;
}