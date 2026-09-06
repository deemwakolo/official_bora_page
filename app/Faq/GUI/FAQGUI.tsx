'use client';

import React, { useState } from 'react';
import faqTheme from './FAQTheme';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface CreditItem {
  role: string;
  name: string;
}

interface FAQGUIProps {
  faqData: FaqItem[];
  credits: CreditItem[];
}

export default function FAQGUI({
  faqData,
  credits,
}: FAQGUIProps) {
  const [activeId, setActiveId] = useState<string | null>('01');

  const toggle = (id: string): void => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  const sortedFaq = [...faqData];

  return (
    <main
      className="min-h-screen pt-16 pb-20 px-6 relative overflow-hidden antialiased"
      style={{
        backgroundColor: faqTheme.background,
        color: faqTheme.text,
      }}
    >
      {/* BACKGROUND DEPTH */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full -z-10"
        style={{
          backgroundColor: faqTheme.redGlow,
        }}
      />

      <div
        className="absolute bottom-0 left-0 w-[300px] h-[300px] blur-[100px] rounded-full -z-10"
        style={{
          backgroundColor: faqTheme.goldGlow,
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* HEADER SECTION */}
        <header className="mb-16 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="h-[1px] w-12"
              style={{
                backgroundColor: faqTheme.gold,
              }}
            />

            <span
              className="text-[10px] font-mono uppercase tracking-[0.5em] font-bold"
              style={{
                color: faqTheme.gold,
              }}
            >
              System_Information
            </span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
            INTEL{' '}
            <span
              style={{
                color: faqTheme.red,
              }}
            >
              &
            </span>{' '}
            FAQ
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* FAQ INTERFACE */}
          <div className="lg:col-span-7 space-y-2">
            {sortedFaq.map((item) => {
              const isOpen = activeId === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    borderBottom: `1px solid ${faqTheme.border}`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="w-full py-8 flex items-center justify-between group outline-none"
                  >
                    <div className="flex items-center gap-6">
                      <span
                        className="text-[10px] font-mono font-bold"
                        style={{
                          color: faqTheme.red,
                          opacity: 0.6,
                        }}
                      >
                        {item.id}
                      </span>

                      <h3
                        className="text-sm md:text-lg font-bold tracking-widest uppercase group-hover:opacity-80 transition-all duration-300 text-left"
                        style={{
                          color: faqTheme.text,
                        }}
                      >
                        {item.question}
                      </h3>
                    </div>

                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${
                        isOpen
                          ? 'scale-150'
                          : ''
                      }`}
                      style={{
                        backgroundColor: isOpen
                          ? faqTheme.gold
                          : faqTheme.textSubtle,

                        boxShadow: isOpen
                          ? `0 0 15px ${faqTheme.gold}`
                          : 'none',
                      }}
                    />
                  </button>

                  {/* ACCORDION CONTENT */}
                  <div
                    className={`grid transition-all duration-500 ease-in-out ${
                      isOpen
                        ? 'grid-rows-[1fr] opacity-100 mb-8'
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="pl-10 pr-6 border-l-2 ml-[10px]"
                        style={{
                          borderColor: faqTheme.redGlow,
                        }}
                      >
                        <p
                          className="text-xs md:text-sm leading-relaxed italic"
                          style={{
                            color: faqTheme.textMuted,
                          }}
                        >
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* STUDIO CREDITS SIDEBAR */}
          <aside className="lg:col-span-5 space-y-12">
            <div
              className="p-8 backdrop-blur-sm relative overflow-hidden group"
              style={{
                border: `1px solid ${faqTheme.borderStrong}`,
                backgroundColor:
                  'color-mix(in srgb, var(--bora-surface) 60%, transparent)',
              }}
            >
              {/* Decorative corner */}
              <div
                className="absolute top-0 right-0 w-8 h-8 border-t border-r"
                style={{
                  borderColor: faqTheme.goldGlow,
                }}
              />

              <h4
                className="text-[10px] font-bold uppercase tracking-[0.3em] mb-8"
                style={{
                  color: faqTheme.gold,
                }}
              >
                Studio_Credits
              </h4>

              <div className="space-y-5">
                {credits.map((credit, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-end pb-2"
                    style={{
                      borderBottom: `1px solid ${faqTheme.border}`,
                    }}
                  >
                    <span
                      className="text-[9px] font-mono uppercase font-bold"
                      style={{
                        color: faqTheme.textSubtle,
                      }}
                    >
                      {credit.role}
                    </span>

                    <span
                      className="text-[11px] font-black uppercase tracking-wider"
                      style={{
                        color: faqTheme.text,
                      }}
                    >
                      {credit.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 px-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{
                    backgroundColor: faqTheme.red,
                    boxShadow: `0 0 10px ${faqTheme.red}`,
                  }}
                />

                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    color: faqTheme.textMuted,
                  }}
                >
                  Global Node Active
                </span>
              </div>

              <div
                className="p-4 border-l"
                style={{
                  borderColor: faqTheme.borderStrong,
                }}
              >
                <p
                  className="text-[10px] font-mono leading-relaxed uppercase italic"
                  style={{
                    color: faqTheme.textSubtle,
                  }}
                >
                  Matitu Nation operates as a multimodal creative hub.
                  <br />
                  All systems operating within defined parameters.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}