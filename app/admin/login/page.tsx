'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { LockKeyhole, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [entering, setEntering] = useState(false);

  const handleEnter = () => {
    setEntering(true);

    setTimeout(() => {
     router.push('/admin/control-room');
    }, 900);
  };

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      {/* TINGA */}

      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[50vh] w-full max-w-6xl -translate-x-1/2 opacity-[0.55]"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          maskImage:
            'linear-gradient(to top, transparent 0%, black 45%, black 100%)',
          WebkitMaskImage:
            'linear-gradient(to top, transparent 0%, black 45%, black 100%)',
        }}
      />

      {/* DARK FADE */}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, var(--bora-background) 58%, var(--bora-background) 100%)',
        }}
      />

      {/* TOP GOLD ATMOSPHERE */}

      <div
        className="pointer-events-none absolute left-1/2 top-[-100px] h-[320px] w-[700px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, var(--bora-gold-glow) 0%, transparent 70%)',
          opacity: 1.5,
        }}
      />

      {/* LOGIN CONTENT */}

      <div className="relative z-10 w-full max-w-md -translate-y-12">

        {/* BRAND */}

        <div className="mb-7 text-center">
          <div className="flex items-center justify-center">

            <div
              className="font-cinzel text-3xl font-black tracking-[0.18em]"
              style={{
                color: 'var(--bora-text)',
                textShadow:
                  '0 0 20px var(--bora-gold-glow)',
              }}
            >
              BORA
            </div>

            <span
              className="ml-1.5 mt-4 h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: 'var(--bora-gold)',
                boxShadow:
                  '0 0 5px var(--bora-gold), 0 0 15px var(--bora-gold-glow)',
              }}
            />

          </div>

          <div
            className="mt-1.5 text-[7px] font-black uppercase tracking-[0.35em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Control Room
          </div>
        </div>

        {/* CARD WRAPPER */}

        <div className="relative">

          {/* LARGE SOFT GOLD BLOOM */}

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[90%] w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-[40px] blur-[100px]"
            style={{
              background:
                'radial-gradient(circle, var(--bora-gold-glow) 0%, transparent 68%)',
              opacity: 2,
            }}
          />

          {/* SOFT RED BLOOM */}

          <div
            className="pointer-events-none absolute bottom-[-80px] left-[-80px] h-[220px] w-[220px] rounded-full blur-[110px]"
            style={{
              background:
                'radial-gradient(circle, var(--bora-red-glow) 0%, transparent 70%)',
              opacity: 1.2,
            }}
          />

          {/* CARD */}

          <div
            className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
            style={{
              borderColor:
                'color-mix(in srgb, var(--bora-gold) 28%, var(--bora-border-strong))',

              background:
                'linear-gradient(145deg, color-mix(in srgb, var(--bora-surface) 78%, transparent), color-mix(in srgb, var(--bora-background-deep) 82%, transparent))',

              backdropFilter: 'blur(28px) saturate(120%)',
              WebkitBackdropFilter: 'blur(28px) saturate(120%)',

              boxShadow:
                '0 30px 100px rgba(0,0,0,0.5), 0 0 60px var(--bora-gold-glow), inset 0 1px 0 color-mix(in srgb, var(--bora-text) 9%, transparent), inset 0 0 50px color-mix(in srgb, var(--bora-gold) 3%, transparent)',
            }}
          >

            {/* GLASS TOP REFLECTION */}

            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[45%]"
              style={{
                background:
                  'linear-gradient(to bottom, color-mix(in srgb, var(--bora-text) 5%, transparent), transparent)',
                opacity: 0.8,
              }}
            />

            {/* SOFT INNER GOLD LIGHT */}

            <div
              className="pointer-events-none absolute left-1/2 top-0 h-[180px] w-[70%] -translate-x-1/2 rounded-full blur-[70px]"
              style={{
                backgroundColor: 'var(--bora-gold-glow)',
                opacity: 0.8,
              }}
            />

            {/* SUBTLE GRID */}

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'linear-gradient(var(--bora-text) 1px, transparent 1px), linear-gradient(90deg, var(--bora-text) 1px, transparent 1px)',
                backgroundSize: '34px 34px',
                maskImage:
                  'linear-gradient(to bottom, black, transparent 80%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, black, transparent 80%)',
              }}
            />

            {/* GOLD TOP EDGE */}

            <div
              className="absolute left-[8%] right-[8%] top-0 h-[2px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--bora-gold), transparent)',
                boxShadow:
                  '0 0 10px var(--bora-gold), 0 0 25px var(--bora-gold-glow)',
              }}
            />

            {/* CORNER LIGHTS */}

            <div
              className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l border-t"
              style={{
                borderColor: 'var(--bora-gold)',
                opacity: 0.7,
              }}
            />

            <div
              className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b border-r"
              style={{
                borderColor: 'var(--bora-gold)',
                opacity: 0.35,
              }}
            />

            {/* WATERMARK */}

            <div
              className="pointer-events-none absolute bottom-[-35px] right-[-10px] font-cinzel text-[110px] font-black"
              style={{
                color: 'var(--bora-gold)',
                opacity: 0.025,
              }}
            >
              B
            </div>

            {/* CONTENT */}

            <div className="relative z-10">

              {/* HEADER */}

              <div className="mb-7 flex items-center gap-3">

                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg border"
                  style={{
                    borderColor:
                      'color-mix(in srgb, var(--bora-red) 65%, var(--bora-border))',

                    background:
                      'radial-gradient(circle at center, var(--bora-red-glow), transparent 75%)',

                    color: 'var(--bora-red)',

                    boxShadow:
                      '0 0 18px var(--bora-red-glow), inset 0 0 15px var(--bora-red-glow)',
                  }}
                >
                  <LockKeyhole size={15} />
                </div>

                <div>

                  <p
                    className="font-cinzel text-sm font-black uppercase tracking-[0.12em]"
                    style={{
                      color: 'var(--bora-text)',
                    }}
                  >
                    Admin Access
                  </p>

                  <p
                    className="mt-1 text-[7px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      color: 'var(--bora-text-subtle)',
                    }}
                  >
                    Restricted Area
                  </p>

                </div>

              </div>

              {/* EMAIL */}

              <div className="mb-5">

                <label
                  htmlFor="email"
                  className="mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
                  style={{
                    color: 'var(--bora-text-muted)',
                  }}
                >
                  Email
                </label>

                <div className="relative">

                  <input
                    id="email"
                    type="email"
                    placeholder="admin@bora..."
                    className="w-full rounded-lg border px-3 py-3 text-xs outline-none transition-all duration-300"
                    style={{
                      borderColor:
                        'var(--bora-border-strong)',

                      backgroundColor:
                        'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',

                      color: 'var(--bora-text)',

                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',

                      boxShadow:
                        'inset 0 1px 0 color-mix(in srgb, var(--bora-text) 4%, transparent), inset 0 0 25px rgba(0,0,0,0.15)',
                    }}
                  />

                  <div
                    className="pointer-events-none absolute inset-x-3 bottom-0 h-px opacity-40"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, var(--bora-gold), transparent)',
                    }}
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="mb-7">

                <label
                  htmlFor="password"
                  className="mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
                  style={{
                    color: 'var(--bora-text-muted)',
                  }}
                >
                  Password
                </label>

                <div className="relative">

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border px-3 py-3 pr-20 text-xs outline-none transition-all duration-300"
                    style={{
                      borderColor:
                        'var(--bora-border-strong)',

                      backgroundColor:
                        'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',

                      color: 'var(--bora-text)',

                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',

                      boxShadow:
                        'inset 0 1px 0 color-mix(in srgb, var(--bora-text) 4%, transparent), inset 0 0 25px rgba(0,0,0,0.15)',
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-[0.12em] transition-all duration-200"
                    style={{
                      color: 'var(--bora-text-subtle)',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>

                </div>

              </div>

              {/* ENTER */}

              <button
                type="button"
                onClick={handleEnter}
                disabled={entering}
                className="group flex w-full items-center justify-between rounded-lg border px-4 py-3.5 transition-all duration-300"
                style={{
                  borderColor: 'var(--bora-gold)',
                  background:
                    'linear-gradient(135deg, var(--bora-gold), color-mix(in srgb, var(--bora-gold) 78%, white))',
                  color: 'var(--bora-background)',
                  boxShadow:
                    '0 0 25px var(--bora-gold-glow), inset 0 1px 0 rgba(255,255,255,0.22)',
                  opacity: entering ? 0.85 : 1,
                }}
              >

                <span className="font-cinzel text-[9px] font-black uppercase tracking-[0.14em]">
                  {entering
                    ? 'Entering Control Room'
                    : 'Enter Control Room'}
                </span>

                <ArrowRight
                  size={14}
                  className={`transition-transform duration-300 ${
                    entering
                      ? 'translate-x-1'
                      : 'group-hover:translate-x-1'
                  }`}
                />

              </button>

              {/* STATUS */}

              <div className="mt-6 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        'var(--bora-green)',
                      boxShadow:
                        '0 0 7px var(--bora-green)',
                    }}
                  />

                  <span
                    className="text-[6px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      color:
                        'var(--bora-text-subtle)',
                    }}
                  >
                    System Ready
                  </span>

                </div>

                <span
                  className="font-mono text-[6px] uppercase tracking-[0.12em]"
                  style={{
                    color:
                      'var(--bora-text-subtle)',
                  }}
                >
                  AUTH_01
                </span>

              </div>

            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="mt-5 text-center">

          <p
            className="text-[6px] uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            BORA // MATITU NATION
          </p>

        </div>
      </div>

      {/* TEST ENTRY TRANSITION */}

      {entering && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'var(--bora-background)',
            animation: 'boraSectionIn 0.3s ease-out',
          }}
        >
          <div className="text-center">

            <div
              className="font-cinzel text-3xl font-black tracking-[0.18em]"
              style={{
                color: 'var(--bora-text)',
                textShadow:
                  '0 0 25px var(--bora-gold-glow)',
              }}
            >
              BORA
            </div>

            <div
              className="mt-3 text-[7px] font-black uppercase tracking-[0.3em]"
              style={{
                color: 'var(--bora-gold)',
              }}
            >
              Entering Control Room
            </div>

            <div
              className="mx-auto mt-5 h-px w-20"
              style={{
                backgroundColor: 'var(--bora-gold)',
                boxShadow:
                  '0 0 15px var(--bora-gold)',
              }}
            />

          </div>
        </div>
      )}

    </main>
  );
}