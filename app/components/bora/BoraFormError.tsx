import type { ReactNode } from 'react';

import { useFormContext } from 'react-hook-form';

/*
 * BORA FORM ERROR — form-level (not field-level) message.
 *
 * Used for problems that belong to the submission as a whole: a Server
 * Action refusal, an authorization failure, an RPC error.
 *
 * THIS IS THE CRITICAL RULE IN CODE:
 *
 *   A form error is NOT proof that a write failed, and a successful
 *   submit is NOT proof that a write succeeded.
 *
 * BORA decides. The BORA Server Action returns its result, BORA maps
 * that result to a message, and only then does anything render here.
 * React Hook Form never learns what the database said, and neither
 * does this component.
 *
 * Visual treatment matches the BORA save bars (role="alert" +
 * aria-live="polite") so an announced result reads as BORA, not as a
 * library default.
 */

export interface BoraFormErrorProps {
  /**
   * BORA's own message, derived from the Server Action result.
   * Renders nothing when null/undefined — absence of an error is never
   * rendered as a success.
   */
  message?: string | null;

  /** Visual intent. BORA decides which one applies. */
  tone?: 'error' | 'info';

  /** Rendered before the message (e.g. an icon). */
  children?: ReactNode;
}

export default function BoraFormError({
  message,
  tone = 'error',
  children,
}: BoraFormErrorProps) {
  // Consumes the BoraForm context, so this component MUST be rendered
  // inside a BoraForm. That is intentional: a form error outside a
  // form boundary is a BORA wiring mistake, not a runtime case.
  useFormContext();

  if (!message) return null;

  const color =
    tone === 'error'
      ? 'var(--bora-red)'
      : 'var(--bora-text-muted)';

  return (
    <p
      role="alert"
      aria-live="polite"
      className="text-[6px] font-black uppercase tracking-[0.14em]"
      style={{ color }}
    >
      {children}
      {message}
    </p>
  );
}
